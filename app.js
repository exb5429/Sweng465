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
const { MongoClient } = require("mongodb");

app.use(bodyParser.urlencoded({extended: false}));
app.use(Auth_passport.initialize());




app.set("views", path.resolve(__dirname, "views"));
app.set("view engine", "ejs")

var subjectSchema = mongoose.Schema({
    subject: String

})

var subjectModel = mongoose.model("subjects",subjectSchema);

var LoginSchema = mongoose.Schema({
    username :String,
    password :String,
    id: Number
});

LoginSchema.methods.getUsername = function () {
    return this.username;
}

LoginSchema.methods.getPassword = function () {
    return this.password;
}

LoginSchema.methods.getPassword = function () {
    return this.id;
}

var LoginModel = mongoose.model("logins",LoginSchema);

var currentUser = "Account";
var currentPassword;
var loggedIn = false;
var currentId;
/*
var searchedQuestions;
 */

var QuestionSchema = mongoose.Schema({
    id : Number,
    askId : Number,
    username : String,
    question :String,
    subject :String
});


QuestionSchema.methods.getUsername = function () {
    return this.username;
}

QuestionSchema.methods.getQuestion = function () {
    return this.question;
}

QuestionSchema.methods.getSubject = function () {
    return this.subject;
}

var PostQuestionModel = mongoose.model("questions",QuestionSchema);

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
                currentId = User.id;
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
    response.render("homePage", {accountName: currentUser})


});

app.get("/studyGuide", function (req, response){
    response.render("studyGuide", {accountName: currentUser})
});

app.get("/postQuestion", function (req, response){
    response.render("postQuestion", {accountName: currentUser});
});

app.post("/postQuestion", async function(req, res) {

    if (loggedIn) {
        var user = currentUser;
        //var ID = req.body.ID;
        var subject = req.body.subject;
        var question = req.body.question;
        PostQuestionModel.countDocuments({}, function (err, count) {
            idNum = count + 1;
            let New = PostQuestionModel({
                id: idNum,
                askId: currentId,
                username: currentUser,
                question: question,
                subject: subject
            });

            New.save(function (err) {
                if (err) return console.error(err);
                console.log(user + /*"with ID " + ID + */" " + "saved a " + subject + " question saved to questions " +
                    "collection. The question is as follows: " + question);
            });

            res.render("postQuestion", {accountName: currentUser});


        });
    }
    //     let New = await PostQuestionModel({username:user/*,ID:ID*/, subject:subject, question:question});
    //     New.save(function (err) {
    //         if (err) return console.error(err);
    //         console.log(user + /*"with ID " + ID + */" " + "saved a " + subject + " question saved to questions " +
    //             "collection. The question is as follows: " + question);
    //     });
    //     res.render("postQuestion");
    // }
    else {
        alert("Log in")
    }
});

app.get("/login", function (req, response){
    response.render("login", {accountName: currentUser});
});

app.get("/signup", function (req, response){
    response.render("signup", {accountName: currentUser});
});

app.get("/loginFail", function (req, response){
    response.render("loginFail", {accountName: currentUser});
});

app.get("/searchQuestion", function (req, response){
    response.render("searchQuestion", {
        questions: PostQuestionModel, accountName: currentUser
    });
});

app.get("/selectedQuestion", function (req, response){
    response.render("selectedQuestion", {accountName: currentUser});
});

app.post("/searchQuestions", function (req, response){
    var subjectRequest = req.body.subject;
    const Question = mongoose.model('questions', QuestionSchema);

    Question.find({ 'subject' : subjectRequest}, { _id:0, __v:0},function (err, docs) {
        console.log(docs)
    });
    response.render("homePage", {accountName: currentUser})
});

app.get("/subjectGet", function (req, response){
    response.render("subjectGet", {accountName: currentUser});
});

app.get("/subjectPost", function (req, response){
    response.render("subjectPost", {accountName: currentUser});
});

app.get("/subjectDel", function (req, response){
    response.render("subjectDel", {accountName: currentUser});
});

app.get("/getSubjects", function (req, response){
    const Subject = mongoose.model('subjects', subjectSchema);


    Subject.find({}, 'subject' ,function (err, docs) {
       console.log(docs)
    });
    response.render("homePage", {accountName: currentUser})
});

app.post("/addSubject", function (req, response){
    var subjectRequest = req.body.subject;
    console.log(subjectRequest)
    let New = subjectModel({
        subject: subjectRequest
    });

    New.save(function (err) {
        if (err) return console.error(err);
        console.log(subjectRequest + " added");
    });
    console.log("Add Subject:  " + subjectRequest)
    response.render("homePage", {accountName: currentUser})
});

app.post("/delSubject", function (req, response){
    var subjectRequest = req.body.subject;
    const Subject = mongoose.model('subjects', subjectSchema);

    Subject.findOneAndDelete({ 'subject': subjectRequest }, function (err, subject) {
        if (err) return handleError(err);
        console.log("Deleted " + subject);
    });
    response.render("homePage", {accountName: currentUser})
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
    var idNum;

    LoginModel.countDocuments({}, function (err, count) {
        idNum = count+1;
        let New = LoginModel({username:newUser,password:newPassword, id:idNum});

        New.save(function (err) {
            if (err) return console.error(err);
            console.log(newUser + " saved to logins collection.");
        });
    });


    res.render("login", {accountName: currentUser});
})

app.get("*", function (req, response){
    response.render("error", {accountName: currentUser});
});

app.listen(3000, function(req,resp){
    console.log("Server Running");
});
