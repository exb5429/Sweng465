var express = require('express');
var path = require('path');
var morgan = require('Morgan');

var app = express();

// NEW
var Auth_passport = require('passport');
const bodyParser = require("body-parser");
var LocalStrategy = require('passport-local').Strategy;
var mongoose = require("mongoose");
const http = require("http");


app.use(bodyParser.urlencoded({extended: false}));
app.use(Auth_passport.initialize());




app.set("views", path.resolve(__dirname, "views"));
app.set("view engine", "ejs")





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
            console.log("Username: " + checkUsername);
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

app.get("/loginFail", function (req, response){
    response.render("loginFail");
});

app.post("/login",Auth_passport.authenticate('local',{
        successRedirect: '/',
        failureRedirect: '/loginFail',
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

app.get("*", function (req, response){
    response.render("error");
});

app.listen(3000, function(req,resp){
    console.log("Server Running");
});
