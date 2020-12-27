'use strict';
require('dotenv').config();
const express = require('express');
const myDB = require('./connection');
const session = require('express-session');
const passport = require('passport');
const routes = require('./routes');

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
  
  routes(app, myDataBase);
  auth(app, myDataBase);

  let currentUsers = 0;
  let finalUsers = [];
  
  // loggedUsers -> Object with users as keys and ready status as values
  // example: { alice: true }
  let loggedUsers = {};
  io.on('connection', (socket) => {
    ++currentUsers;
    // Do not allow double sessions
    for (let user in loggedUsers) {
      if (socket.request.user.username == user) {
        socket.disconnect();
        return false;
      }
    }
    
    // Game is played with max 8 players
    if (currentUsers > 8) {
      if (Object.keys(loggedUsers).length > 8) {
        io.emit('max users', { message: 'Player limit reached' });
        --currentUsers;
        console.log('Player limit reached. User attempted to connect');
        return false;
      }
    }

    loggedUsers[socket.request.user.username] = false;
    io.emit('user', {
      name: socket.request.user.username,
      loggedUsers,
      currentUsers,
      connected: true
    });
    console.log('A user has connected');
    socket.on('chat message', (message) => {
      io.emit('chat message', { 
        name: socket.request.user.username, message });
    });
    
    socket.on('ready button', () => {
      let posNum = 0;
      for (let user in loggedUsers) {
        posNum++;
        if (user == socket.request.user.username) {
          if (loggedUsers[user]) {
            loggedUsers[user] = false; 
          } else { loggedUsers[user] = true; }
          break;
        }
      }
      io.emit('ready button', { 
        name: socket.request.user.username, posNum, loggedUsers });
    });

    socket.on('start game', (loggedUsers) => {
      let finalUsers = [];
      let creatorId;
      for (let user in loggedUsers) {
        finalUsers.push(user)
      }
      if (socket.request.user.username == finalUsers[0]) {
        let players = game.getRoles(finalUsers);
        io.emit('start game', { players });
      }   
    })

    socket.on('disconnect', () => {
      console.log('A user has disconnected');
      --currentUsers;
      delete loggedUsers[socket.request.user.username];
      io.emit('user', {
        name: socket.request.user.username,
        loggedUsers,
        currentUsers,
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
  console.log('Successful connection to socket.io');
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