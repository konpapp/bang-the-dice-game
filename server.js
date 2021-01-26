'use strict';
require('dotenv').config();
const express = require('express');
const myDB = require('./connection');
const session = require('express-session');
const passport = require('passport');
const routes = require('./routes.js');
const auth = require('./auth.js');
const game = require('./game.js');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const passportSocketIo = require('passport.socketio');
const cookieParser = require('cookie-parser');
const { read } = require('fs');
const MongoStore = require('connect-mongo')(session);
const URI = process.env.MONGO_URI;
const store = new MongoStore({ url: URI });

app.set('view engine', 'pug');

app.use('/public', express.static(process.cwd() + '/public'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: true,
  saveUninitialized: true,
  cookie: { secure: false },
  key: 'express.sid',
  store: store
}));

app.use(passport.initialize());
app.use(passport.session());

io.use(
  passportSocketIo.authorize({
    cookieParser: cookieParser,
    key: 'express.sid',
    secret: process.env.SESSION_SECRET,
    store: store,
    success: onAuthorizeSuccess,
    fail: onAuthorizeFail
  })
);

myDB(async (client) => {
  const myDataBase = await client.db('database').collection('users')
  routes.main(app, myDataBase);
  auth(app, myDataBase);
  let rooms = {};
  let readyUsers = {};
  let players = {};
  io.on('connection', (socket) => {
    let roomId = routes.getRoomId();
    socket.join(roomId);
    if (rooms[roomId]) {
      for (let i=0; i < rooms[roomId].length; i++) {
        if (socket.request.user.username == rooms[roomId][i]) {
          io.to(roomId).emit('disconnection', { socket: socket.id, msg: 'Username already exists.'});
          socket.disconnect();
          console.log('Disconnecting existing user.');
          return false;
        }
      }
      if (rooms[roomId].length === 8) {
        io.to(roomId).emit('disconnection', { msg: 'Player limit reached.' });
        socket.disconnect();
        console.log('Player limit reached. Unable to connect.');
        return false;
      }
      rooms[roomId].push(socket.request.user.username);
      routes.addPlayer(roomId);
      if (rooms[roomId].length === 8) {
        routes.noCapacity(roomId);
      }
    } else {
      rooms[roomId] = [socket.request.user.username];
      routes.addPlayer(roomId);
    }
    console.log(`User list in room ${roomId}: ${rooms[roomId]}`);
    io.to(roomId).emit('user', {
      name: socket.request.user.username,
      users: rooms[roomId],
      readyUsers: readyUsers[roomId],
      roomId,
      connected: true
    });
    console.log('A user has connected.');
    
    socket.on('chat message', (message) => {
      io.to(roomId).emit('chat message', { 
        name: socket.request.user.username, message });
    });

    socket.on('ready button', (id) => {
      if (readyUsers[id]) {
        let ids = readyUsers[id].map(elem => elem[0]);
        if (ids.indexOf(socket.id) == -1) {
          if (socket.request.user.username == rooms[id][0]) {
            readyUsers[id].unshift([socket.id, socket.request.user.username]);
          } else {
            readyUsers[id].push([socket.id, socket.request.user.username]);
          }
        } else {
          readyUsers[id] = readyUsers[id].filter(elem => elem[0] != socket.id);
        }
      } else {
        readyUsers[id] = [[socket.id, socket.request.user.username]];
      }
      let posNum = rooms[id].indexOf(socket.request.user.username);
      if (readyUsers[id].length > 3 && readyUsers[id].length === rooms[id].length) {
        routes.gameOn(id);
        io.to(id).emit('start game', { creatorId: readyUsers[id][0][0] });
      }
      io.to(id).emit('ready button', {  
        name: socket.request.user.username, 
        readyUsers: readyUsers[id], posNum });
    });

    socket.on('assign roles', (id) => {
      players[id] = game.getRoles(rooms[id]);
      let chars = game.getChars(rooms[id]);
      let ids = readyUsers[id].map(elem => elem[0]);
      let usernames = readyUsers[id].map(elem => elem[1]);
      for (let i=0; i < usernames.length; i++) {
        players[id][i].socketId = ids[usernames.indexOf(players[id][i].name)];
        players[id][i].char = chars[i];
      }
      io.to(id).emit('assign roles', { players: players[id] });
    })

    socket.on('start turn', (data) => {
      let dice;
      let arrowIndices, gatlingIndices;
      if (data.currentDice) {
        arrowIndices = data.currentDice
                            .map((elem, i) => elem == 'arrow' ? i : '')
                            .filter(elem => elem !== '')
                            .filter(diePos => !data.dicePositions.includes(diePos));
        gatlingIndices = data.currentDice
                            .map((elem, i) => elem == 'gatling' ? i : '')
                            .filter(elem => elem !== '')
                            .filter(diePos => !data.dicePositions.includes(diePos));
        if (gatlingIndices.length < 3) { gatlingIndices = ''; }
        for (let i=0; i < data.dicePositions.length; i++) {
          data.currentDice[data.dicePositions[i]] = game.rollDice(1)[0];
          data.reRolls--;
        }
        dice = data.currentDice;
      } else {
        dice = game.rollDice(5);
      }
      io.to(data.id).emit('start turn', { 
        players: players[data.id],
        dice, arrowIndices, gatlingIndices,
        reRolls: data.reRolls,
        roller: data.roller,
        dicePos: data.dicePositions,
        playerPos: players[data.id]
                    .map(player => player.socketId)
                    .indexOf(data.roller),
        alivePlayerPos: players[data.id]
                    .filter(player => player.alive)
                    .map(player => player.socketId)
                    .indexOf(data.roller)
      });
    })

    socket.on('turn transition', (data) => {
      io.to(data.id).emit('turn transition', data);
    })

    socket.on('lose health', (data) => {
      players[data.id][data.playerPos].health--;
      if (players[data.id][data.playerPos].health <= 0) {
        players[data.id][data.playerPos].alive = false;
        io.to(data.id).emit('player eliminated', {
          players: players[data.id],
          playerPos: data.playerPos,
          left: players[data.id].filter(player => player.alive).length - 1
        });
      } 
      io.to(data.id).emit('lose health', {
        players: players[data.id],
        playerPos: data.playerPos,
        dmgType: data.dmgType
      });
    })

    socket.on('gain health', (data) => {
      if (players[data.id][data.playerPos].health < players[data.id][data.playerPos].maxHealth) {
        players[data.id][data.playerPos].health++;
        io.to(data.id).emit('gain health', {
          players: players[data.id],
          playerPos: data.playerPos
        })
      }
    })

    socket.on('get arrow', (data) => {
      let emptyArrows, eliminated, left;
      emptyArrows, eliminated = false;
      players[data.id][data.pos].arrows += data.arrowsHit;
      if (data.arrowCount <= data.arrowsHit) {
        emptyArrows = true;
        io.to(data.id).emit('get arrow', {
          pos: players[data.id].map(player => player.socketId).indexOf(data.roller),
          arrowCount: data.arrowCount,
          arrowsHit: data.arrowCount
        })
      } else {
        io.to(data.id).emit('get arrow', {
          pos: players[data.id].map(player => player.socketId).indexOf(data.roller),
          arrowCount: data.arrowCount,
          arrowsHit: data.arrowsHit
        })
      }
      if (emptyArrows) {
        setTimeout(() => {
          for (let i = 0; i < players[data.id].length; i++) {
            if (players[data.id][i].alive) {
              players[data.id][i].health -= players[data.id][i].arrows;
              players[data.id][i].arrows = 0;
            }
            if (players[data.id][i].health <= 0) {
              if (players[data.id][i].socketId == data.roller) {
                eliminated = true;
                left = players[data.id].filter(player => player.alive).length - 2;
              } else {
                players[data.id][i].alive = false;
                left = players[data.id].filter(player => player.alive).length - 1;
              }
              io.to(data.id).emit('player eliminated', { players: players[data.id], playerPos: i, left });
            }
          }
          if (eliminated) {
            let alivePlayers = players[data.id].filter(player => player.alive);
            let idx = alivePlayers.map(player => player.socketId).indexOf(data.roller);
            let newRoller;
            if (idx + 1 >= alivePlayers.length) {
              newRoller = alivePlayers[0].socketId;
            } else { newRoller = alivePlayers[idx + 1].socketId; }
            players[data.id][data.pos].alive = false;
            let playerPos = players[data.id].map(player => player.socketId).indexOf(newRoller);
            io.to(data.id).emit('turn transition', {
              id: data.id,
              name: players[data.id][playerPos].name,
              diceNum: 5,
              roller: newRoller,
              playerPos
            });
          }
          io.to(data.id).emit('refill arrows', { players: players[data.id] });
          if (!eliminated) {
            setTimeout(() => {
              io.to(data.id).emit('get arrow', {
                pos: players[data.id].map(player => player.socketId).indexOf(data.roller),
                arrowCount: 9,
                arrowsHit: data.arrowsHit - data.arrowCount
              })
            }, 50);
          }
        }, 250);
      }
    })

    socket.on('trigger dynamite', (data) => {
      setTimeout(() => {
        players[data.id][data.pos].health--;
        if (players[data.id][data.pos].health <= 0) {
          if (players[data.id][data.pos].socketId == data.roller) {
            let alivePlayers = players[data.id].filter(player => player.alive);
            let idx = alivePlayers.map(player => player.socketId).indexOf(data.roller);
            let newRoller;
            if (idx + 1 >= alivePlayers.length) {
              newRoller = alivePlayers[0].socketId;
            } else { newRoller = alivePlayers[idx + 1].socketId; }
            let playerPos = players[data.id].map(player => player.socketId).indexOf(newRoller);
            io.to(data.id).emit('turn transition', {
              id: data.id,
              name: players[data.id].filter(player => player.alive)[playerPos].name,
              diceNum: 5,
              roller: newRoller,
              playerPos
            });
          }
          players[data.id][data.pos].alive = false;
          io.to(data.id).emit('player eliminated', {
            players: players[data.id],
            playerPos: data.pos
          });
        }
        io.to(data.id).emit('lose health', {
          players: players[data.id],
          playerPos: data.pos,
          dmgType: data.dmgType
        })
      }, 1000);
    })

    socket.on('fire gatling', (data) => {
      setTimeout(() => {
        for (let i=0; i < players[data.id].length; i++) {
          if (players[data.id][i].alive && i !== data.pos) {
            players[data.id][i].health--;
            if (players[data.id][i].health <= 0) {
              players[data.id].alive = false;
              io.to(data.id).emit('player eliminated', {
                players: players[data.id],
                playerPos: i
              });
            }
            io.to(data.id).emit('lose health', {
              players: players[data.id],
              playerPos: i,
              dmgType: data.dmgType
            });
          }
        }
        io.to(data.id).emit('fire gatling', {
          pos: data.pos,
          arrows: players[data.id][data.pos].arrows
        })
        players[data.id][data.pos].arrows = 0;
      }, 500);
    })

    socket.on('win check', (data) => {
      let winMessage = game.winCheck(players[data.id]);
      if (winMessage) {
        io.to(data.id).emit('win check', { winMessage });
      }
    })

    socket.on('disconnect', () => {
      let ongoingGame = false;
      let posIndex;
      console.log('A user has disconnected.');
      routes.removePlayer(roomId);
      rooms[roomId] = rooms[roomId].filter(user => user !== socket.request.user.username);
      if (readyUsers[roomId]) {
        if (players[roomId]) {
          posIndex = players[roomId].map(player => player.socketId).indexOf(socket.id);
        }
        readyUsers[roomId] = readyUsers[roomId].filter(elem => elem[0] != socket.id);
        if (players[roomId] && readyUsers[roomId].length === rooms[roomId].length) {
          ongoingGame = true;
        }
      }
      if (rooms[roomId].length == 0) {
        routes.removeRoom(roomId);
        delete rooms[roomId];
        delete readyUsers[roomId];
      }
      let removedUsername = socket.request.user.username;
      routes.remove(myDataBase, removedUsername);
      io.to(roomId).emit('user', {
        name: socket.request.user.username,
        users: rooms[roomId],
        readyUsers: readyUsers[roomId],
        roomId,
        connected: false,
        ongoingGame,
        posIndex,
        players: players[roomId]
      });
      if (ongoingGame) {
        setTimeout(() => {
          players[roomId][posIndex].alive = false;
          players[roomId][posIndex].health = 0;
          io.to(roomId).emit('player eliminated', {
            players: players[roomId],
            playerPos: posIndex
          });
        }, 500);
      }
    });
  });

}).catch((e) => {
  app.route('/').get((req, res) => {
    res.render('pug', { title: e, message: 'Unable to login' });
  });
});

function onAuthorizeSuccess(data, accept) {
  console.log('Successful connection to socket.io.');
  accept(null, true);
}

function onAuthorizeFail(data, message, error, accept) {
  if (error) throw new Error(message);
  console.log('Failed connection to socket.io:', message);
  accept(null, false);
}

http.listen(process.env.PORT || 3000, () => {
  console.log('Listening on port ' + process.env.PORT);
});
