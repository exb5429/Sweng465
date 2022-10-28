var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');

var homePageRouter = require('./routes/homePage');
var usersRouter = require('./routes/users');
var studyGuideRouter = require('./routes/studyGuide');
var postQuestionRouter = require('./routes/postQuestion');
var loginRouter = require('./routes/login');

var app = express();

/*
var mongoose = require("mongoose");
var Auth_passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;

app.use(Auth_passport.initialize());

var LoginSchema = mongoose.Schema({
  username :String,
  password :String
});

LoginSchema.methods.getUsername = function () {
  return this.username;
}

LoginSchema.methods.getPassword = function () {
  return this.password;
}

var LoginModel = mongoose.model("logins",LoginSchema);

var currentUser;
var currentPassword;
var loggedIn = false;

mongoose.connect("mongodb+srv://test:test@cluster0.flru2.mongodb.net/?retryWrites=true&w=majority");

Auth_passport.use('local', new LocalStrategy(
    async function (checkUsername, checkPassword, done) {
      try {
        console.log("Author Info to Display: " + checkUsername);
        let User = await LoginModel.findOne({username: checkUsername,password: checkPassword});

        if (User == undefined || User == null) {
          console.log("Incorrect username or password");
          return done(null, false, {message: 'Incorrect username or password.'});
        }
        else {
          console.log("User: " + User.username + " has logged in");
          loggedIn = true;
          currentUser = User.username;
          currentPassword = User.password;
          return done(null, User);
        }
      } catch (e) {
        console.log(e)
      }
    }
));
*/



// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', homePageRouter);
app.use('/users', usersRouter);
app.use('/studyGuide', studyGuideRouter);
app.use('/postQuestion', postQuestionRouter);
app.use('/login', loginRouter);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

app.get("/", async function(req,res){

  res.render("homePage")

})

app.get("/studyGuide", async function(req,res){

  res.render("studyGuide")

})

app.get("/postQuestion", async function(req,res){

  res.render("postQuestion")

})

app.get("/login", async function(req,res){

  res.render("login")

})

app.get('*',function(req,response){
  response.status(404).render("error");
})

app.post("/login",Auth_passport.authenticate('local',{
      successRedirect: '/account',
      failureRedirect: '/login',
      session: false
    })
);



app.post("/signin", async function(req, res){
  var newUser = req.body.newusername;
  var newPassword = req.body.password;
  let New = await LoginModel({username:newUser,password:newPassword});
  New.save(function (err) {
    if (err) return console.error(err);
    console.log(newUser + " saved to logins collection.");
  });
  res.render("login");
})



app.listen(3000,function (req,resp) {
  console.log("Server Running");
});


