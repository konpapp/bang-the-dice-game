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

  // Rooms object: roomId as key, users array as value
  let rooms = {};

  // roomId as key, ready users array
  let readyUsers = {};

  io.on('connection', (socket) => {

    let roomId = routes.getRoomId();
    socket.join(roomId);
    
    if (rooms[roomId]) {
      // Do not allow double sessions
      for (let i=0; i < rooms[roomId].length; i++) {
        if (socket.request.user.username == rooms[roomId][i]) {
          socket.disconnect();
          console.log('Disconnecting existing user.');
          return false;
        }
      }

      // Game is played with max 8 players
      if (rooms[roomId].length === 8) {
        socket.disconnect();
        console.log('Player limit reached. Unable to connect.');
        return false;
      }
    }

    // Assign user to room
    if (rooms[roomId]) {
      rooms[roomId].push(socket.request.user.username);
    } else {
      rooms[roomId] = [socket.request.user.username];
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
        if (readyUsers[id].indexOf(socket.request.user.username) == -1) {
          readyUsers[id].push(socket.request.user.username);
        } else {
          readyUsers[id] = readyUsers[id].filter(user => user != socket.request.user.username);
        }
      } else {
        readyUsers[id] = [socket.request.user.username];
      }

      let posNum = rooms[id].indexOf(socket.request.user.username);

      // If all users ready and more than 3 users connected, start the game
      if (readyUsers[id].length > 3) {
        let arr1 = readyUsers[id].sort();
        let arr2 = rooms[id].sort();
        if (JSON.stringify(arr1) == JSON.stringify(arr2)) {
          let players = game.getRoles(rooms[id]);
          io.to(id).emit('start game', { players });
        }
      }

      io.to(id).emit('ready button', {  
        name: socket.request.user.username, 
        readyUsers: readyUsers[id], posNum });
    });

    socket.on('disconnect', () => {
      console.log('A user has disconnected.');
      rooms[roomId] = rooms[roomId].filter(user => user !== socket.request.user.username);
      if (readyUsers[roomId]) {
        readyUsers[roomId] = readyUsers[roomId].filter(user => user !== socket.request.user.username);
      }
      io.to(roomId).emit('user', {
        name: socket.request.user.username,
        users: rooms[roomId],
        readyUsers: readyUsers[roomId],
        roomId,
        connected: false
      });
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