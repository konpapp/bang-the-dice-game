const passport = require('passport');
const bcrypt = require('bcrypt');
const shortid = require('shortid');

var roomId;

function main(app, myDataBase) {
  app.route('/').get((req, res) => {
    
    if(req.isAuthenticated()) {
      res.render('pug', { title: '', message: '', showLogin: false, showRegistration: false, showSocialAuth: false, showCreateGame: true });
    } else {
    // Change the response to render the Pug template
      res.render('pug', { title: '', message: '', showLogin: true, showRegistration: true, showSocialAuth: false });
    }
  });
  app.route('/login').post(passport.authenticate('local', { failureRedirect: '/' }), (req, res) => {
    res.redirect('/');
  });
  app.route('/create').post(ensureAuthenticated, (req, res) => {
    let shid = shortid.generate()
    roomId = shid;
    res.redirect(`/chat?roomid=${shid}`);
  });
  app.route('/join').post(ensureAuthenticated, (req, res) => {
    roomId = req.body.gameId;
    res.redirect(`/chat?roomid=${roomId}`);
  });
  app.route('/profile').get(ensureAuthenticated, (req, res) => {
    res.render('pug/profile', { username: req.user.username });
  });
  app.route('/chat').get(ensureAuthenticated, (req, res) => {
    res.render('pug/chat', { user: req.user });
  });
  app.route('/logout').get((req, res) => {
    req.logout();
    res.redirect('/');
  });
  app.route('/register').post(
    (req, res, next) => {
      const hash = bcrypt.hashSync(req.body.password, 12);
      myDataBase.findOne({ username: req.body.username }, function (err, user) {
        if (err) {
          next(err);
        } else if (user) {
          res.redirect('/');
        } else {
          myDataBase.insertOne({ username: req.body.username, password: hash }, (err, doc) => {
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
      res.redirect('/profile');
    }
  );

  app.route('/auth/github').get(passport.authenticate('github'));
  app.route('/auth/github/callback').get(passport.authenticate('github', { failureRedirect: '/' }), (req, res) => {
    req.session.user_id = req.user.id;
    res.redirect('/chat');
  });

  app.use((req, res, next) => {
    res.status(404).type('text').send('Not Found');
  });
};

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