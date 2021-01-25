const passport = require('passport');
const shortid = require('shortid');

var roomId;

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
    let shid = shortid.generate()
    roomId = shid;
    res.redirect(`/game?id=${shid}`);
  });
  app.route('/join').post(ensureAuthenticated, (req, res) => {
    roomId = req.body.gameId;
    res.redirect(`/game?id=${roomId}`);
  });
  app.route('/profile').get(ensureAuthenticated, (req, res) => {
    res.render('pug/profile', { username: req.user.username });
  });
  app.route('/game').get(ensureAuthenticated, (req, res) => {
    res.render('pug/game', { user: req.user });
  });
  app.route('/logout').get((req, res) => {
    if (req.user != undefined) {
      myDataBase.findOneAndDelete({ username: req.user.username }, function (err, user) {
        if (err) { console.log(err); }
        console.log(user.value.username, 'removed')
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
        console.log(user.value.username, 'removed')
      })
    }
    res.status(404).type('text').send('Not Found');
  });
};

async function remove(app, myDataBase, user) {
  await myDataBase.findOneAndDelete({ username: user }, function(err, doc) {
    if (err) { console.log(err); }
    console.log(doc.value.username, 'removed')
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