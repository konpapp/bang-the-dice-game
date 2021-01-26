const passport = require('passport');
const LocalStrategy = require('passport-local');
const ObjectID = require('mongodb').ObjectID;

module.exports = function (app, myDataBase) {

  passport.serializeUser((user, done) => {
    done(null, user._id);
  });
  passport.deserializeUser((id, done) => {
    myDataBase.findOne({ _id: new ObjectID(id) }, (err, doc) => {
      if (err) return console.error(err);
      done(null, doc);
    });
  });
  passport.use(new LocalStrategy(function (username, password, done) {
      myDataBase.findOne({ username: username, password: ' ' }, function (err, user) {
        console.log('User ' + username + ' attempted to log in.');
        if (err) { return done(err); }
        if (!user) { return done(null, false); }
        return done(null, user);
      });
    }
  ));
};