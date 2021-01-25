const passport = require('passport');
const mongoose = require('mongoose');

var roomId;

const roomSchema = new mongoose.Schema({
  room_id: {type: String, required: true},
  open: {type: Boolean, default: true},
  has_capacity: { type: Boolean, default: true }
})

var Room = mongoose.model('Room', roomSchema);

function main(app, myDataBase) {
  app.route('/').get((req, res) => {
    setTimeout(() => {
      if (req.isAuthenticated()) {
        res.render('pug', { title: '', message: '', showLogin: false, showCreateGame: true });
      } else {
        res.render('pug', { title: '', message: '', showLogin: true });
      }
    }, 100);
    
  });
  app.route('/create').post(ensureAuthenticated, (req, res) => {
    let shid = (Math.floor(1000 + Math.random() * 9000)).toString();
    roomId = shid;
    let room = new Room({
      room_id: roomId,
      open: true,
      has_capacity: true
    })
    if (!req.body.allow) {
      room.open = false;
    }
    console.log(room);
    room.save();
    res.redirect(`/game?id=${shid}`);
  });
  app.route('/join-rand').post(ensureAuthenticated, (req, res) => {
    roomId = req.body.gameId;
    res.redirect(`/game?id=${roomId}`);
  });
  app.route('/join-id').post(ensureAuthenticated, (req, res) => {
    roomId = req.body.gameId;
    Room.findOne({ room_id: roomId }, (err, data) => {
      if (err) { console.log(err); }
      if (!data) { return res.render('pug', { title: '', message: `No room found with ID ${roomId}` , showLogin: false, showCreateGame: true }) };
      res.redirect(`/game?id=${roomId}`);
    })
  });
  app.route('/game').get(ensureAuthenticated, (req, res) => {
    res.render('pug/game', { user: req.user });
  });
  app.route('/logout').get((req, res, done) => {
    if (req.user != undefined) {
      myDataBase.findOneAndDelete({ username: req.user.username }, function (err, user) {
        if (err) { console.log(err); }
      })
    }
    req.logout();
    res.redirect('/');
  });
  app.route('/login').post((req, res, next) => {
    myDataBase.findOne({ username: req.body.username }, function (err, user) {
      if (err) {
        next(err);
      } else if (user) {
        res.render('pug', { title: '', message: `The name '${req.body.username}' is in use.`, showLogin: true });
      } else {
        myDataBase.insertOne({ username: req.body.username, password: ' ' }, (err, doc) => {
          if (err) {
            res.redirect('/');
          } else {
            next(null, doc.ops[0]);
          }
        });
      }
    });
    },
    passport.authenticate('local', { failureRedirect: '/' }),
    (req, res, next) => {
      res.redirect('/');
    }
  );
  app.use((req, res, next) => {
    if (req.user != undefined) {
      myDataBase.findOneAndDelete({ username: req.user.username }, function (err, user) {
        if (err) { console.log(err); }
      })
    }
    res.status(404).type('text').send('Not Found');
  });
};

async function remove(myDataBase, user) {
  await myDataBase.findOneAndDelete({ username: user }, function(err, doc) {
    if (err) { console.log(err); }
  })
}

function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.redirect('/');
}

function getRoomId () {
  return roomId;
}

exports.main = main;
exports.getRoomId = getRoomId;
exports.remove = remove;