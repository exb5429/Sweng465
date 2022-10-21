var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');

var homePageRouter = require('./routes/homePage');
var usersRouter = require('./routes/users');
var studyGuideRouter = require('./routes/studyGuide');
var postQuestionRouter = require('./routes/postQuestion');

var app = express();

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

app.get('*',function(req,response){
  response.status(404).render("error");
})


app.listen(3000,function (req,resp) {
  console.log("Server Running");
});


