var express = require('express');
var path = require('path');
var morgan = require('Morgan');

var app = express();

app.set("views", path.resolve(__dirname, "views"));
app.set("view engine", "ejs");

app.use(morgan('dev'));
app.use(express.static(path.join(__dirname, "/public")));

app.get("/", function (req, response){
    response.render("homePage");
});

app.get("/studyGuide", function (req, response){
    response.render("studyGuide");
});

app.get("/postQuestion", function (req, response){
    response.render("postQuestion");
});

app.get("/login", function (req, response){
    response.render("login");
});

app.get("*", function (req, response){
    response.render("error");
});

app.listen(3000, function(req,resp){
    console.log("Server Running");
});
