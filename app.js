var express = require('express');
var path = require('path');
var morgan = require('Morgan');

var app = express();

// NEW
var Auth_passport = require('passport');
var AuthSignUp_passport = require('passport');
const bodyParser = require("body-parser");
var LocalStrategy = require('passport-local').Strategy;
var LocalStrategyTwo = require('passport-local').Strategy;
var mongoose = require("mongoose");
const http = require("http");
const { MongoClient } = require("mongodb");

app.use(bodyParser.urlencoded({extended: false}));
app.use(Auth_passport.initialize());
app.use(AuthSignUp_passport.initialize());



app.set("views", path.resolve(__dirname, "views"));
app.set("view engine", "ejs")

var subjectSchema = mongoose.Schema({
    subject: String

})

var subjectModel = mongoose.model("subjects",subjectSchema);


var answerSchema = mongoose.Schema({
    user: String,
    userId: String,
    questionID: Number,
    answer: String,
    answerId: Number
})

var answerModel = mongoose.model("answers",answerSchema);

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

AuthSignUp_passport.use('localTwo', new LocalStrategyTwo(
    async function (checkUsername, checkPassword, done) {
        try {
            console.log("Username: " + checkUsername);
            let Username = await LoginModel.findOne({username: checkUsername});

            if ((Username == undefined || Username == null) && (checkPassword.length >= 8)) {
                console.log("User: " + checkUsername + " has signed up");
                let Username = {
                    username : "1",
                    password : "1",
                    id: 0
                };
                return done(null, Username);
            }
            else if (checkPassword.length < 8) {
                console.log("Password not long enough.");
                return done(null, false, {message: 'Password not long enough.'});
            }
            else{
                console.log("Username not available.");
                return done(null, false, {message: 'Username not available.'});
            }
        } catch (e) {
            console.log(e)
        }
    }
));

app.use(morgan('dev'));
app.use(express.static(path.join(__dirname, "/public")));

app.get("/", function (req, response){
    response.render("homePage", {accountName: currentUser});
});

app.get("/studyGuide", function (req, response){
    response.render("studyGuide", {accountName: currentUser});
});

app.get("/postQuestion", function (req, response){
    response.render("postQuestion", {accountName: currentUser});
});

app.post("/postQuestion", async function(req, res) {
    if (loggedIn) {
        var user = currentUser;
        var subject = req.body.subject;
        var question = req.body.question;
        var idNum = 1;
        var idAvailable = false;
        PostQuestionModel.countDocuments({}, function (err, count) {

            const uri = "mongodb+srv://test:test@cluster0.flru2.mongodb.net/?retryWrites=true&w=majority";
            const client = new MongoClient(uri);
            async function run() {
                try {
                    await client.connect();
                    // database and collection code goes here
                    const db = client.db("test");
                    const coll = db.collection("questions");
                    // find code goes here

                    while(!idAvailable) {
                        const cursor = coll.find({id: idNum});
                        //await cursor.forEach(console.log);
                        //const cursor = coll.find({ subject: subjectRequest}).project({question:1, _id:0} );
                        // iterate code goes here
                        if (await cursor.count() > 0) {
                            idNum += 1;
                        }
                        else{
                            idAvailable = true;
                        }
                    }
                } finally {
                    let New = PostQuestionModel({
                        id: idNum,
                        askId: currentId,
                        username: currentUser,
                        question: question,
                        subject: subject
                    });

                    New.save(function (err) {
                        if (err) return console.error(err);
                        console.log(user + " with ID " + currentId + " " + "saved a " + subject + " question to " +
                            "questions collection. The question with id: " + idNum + " is as follows: " + question);
                    });

                    // Ensures that the client will close when you finish/error
                    await client.close();
                }

            }

            run().catch(console.dir);

        });

        res.render("postQuestion", {accountName: currentUser});
    }
    else {
        alert("Log in");
        res.render("homePage", {accountName: currentUser});
    }
});

app.get("/questionDel", function (req, response){
    response.render("questionDel", {accountName: currentUser});
});

app.post("/questionDel", function (req, response){
    var questionRequestId = req.body.question;

    const Question = mongoose.model('questions', QuestionSchema);

    const Answer = mongoose.model('answers', answerSchema);

    async function run() {
        try {
            await Question.find({'id': questionRequestId}, function(err, docs){
                if (err) return console.error(err);
                if (docs[0] == null || docs[0] == undefined){
                    return console.log("Could not find question");
                }
                else{

                    Answer.deleteMany({'questionID': docs[0].id}, function (errTwo, docsThree) {
                        if (errTwo) return console.error(errTwo);
                        console.log("Deleted second" + docsThree);
                    });

                    Question.findOneAndDelete({'id': questionRequestId}, function (errThree, question) {
                        if (errThree) return console.error(errThree);
                        console.log("Deleted third" + question);
                    });
                }
            });

        } catch (e) {

        }
    }

    run().catch(console.dir);

    response.render("questionDel", {accountName: currentUser});
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
    const Subject = mongoose.model('subjects', subjectSchema);
    let subjects;

    Subject.find({},  {_id:0, __v:0} ,function (err, docs) {

        subjects = docs;
        response.render("searchQuestion", {
            questions: PostQuestionModel,
            accountName: currentUser,
            docs: subjects
        });

    });

});

app.get("/selectedQuestion", function (req, response){
    response.render("selectedQuestion", {accountName: currentUser});
});

app.post("/searchQuestions", function (req, response){
    var subjectRequest = req.body.subject;
    const Question = mongoose.model('questions', QuestionSchema);

    Question.find({}, { _id:0, __v:0},function (err, docs) {
        console.log(docs[0].username)
        response.render("questionList", {accountName: currentUser,
        docs: docs,
        subject: subjectRequest})
    });

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
    let test;

    Subject.find({},  {_id:0, __v:0} ,function (err, docs) {

       test = docs;
       console.log(test);
       response.render("homePage", {accountName: currentUser, docs: test})
    });

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

app.get("/answerGet", function (req, response){
    response.render("answerGet", {accountName: currentUser});
});

app.get("/answerPost", function (req, response){
    response.render("answerPost", {accountName: currentUser});
});

app.post("/getAnswers", function (req, response){
    const Answer = mongoose.model('answers', answerSchema);
    var questionId = req.body.questionId;

    Answer.find({ 'questionID': questionId}, { _id:0, __v:0} ,function (err, docs) {
        console.log(docs)
    });

    const Question = mongoose.model('questions', QuestionSchema);


    Question.find({ 'id': questionId}, { id: 0, askId:0, username:0, subject:0,_id:0, __v:0} ,function (err, docs) {
        console.log(docs)
    });



    response.render("homePage", {accountName: currentUser})
});

app.post("/addAnswer", function (req, response){
    if (loggedIn) {
        var answer = req.body.answer;
        var questionId = req.body.questionId;

        var idNum = 1;
        var idAvailable = false;
        PostQuestionModel.countDocuments({}, function (err, count) {

            const uri = "mongodb+srv://test:test@cluster0.flru2.mongodb.net/?retryWrites=true&w=majority";
            const client = new MongoClient(uri);
            async function run() {
                try {
                    await client.connect();
                    // database and collection code goes here
                    const db = client.db("test");
                    const coll = db.collection("answers");
                    // find code goes here

                    while(!idAvailable) {
                        const cursor = coll.find({id: idNum});
                        //await cursor.forEach(console.log);
                        //const cursor = coll.find({ subject: subjectRequest}).project({question:1, _id:0} );
                        // iterate code goes here
                        if (await cursor.count() > 0) {
                            idNum += 1;
                        }
                        else{
                            idAvailable = true;
                        }
                    }
                } finally {
                    let New = answerModel({
                        user: currentUser,
                        userId: currentId,
                        questionID: questionId,
                        answerId: idNum,
                        answer: answer
                    });

                    New.save(function (err) {
                        if (err) return console.error(err);
                        console.log("Answer added is " + answer);
                        console.log("Question id is " + questionId);
                        console.log("Answer id is " + idNum);
                        console.log("User is " + currentUser);
                    });

                    // Ensures that the client will close when you finish/error
                    await client.close();
                }

            }

            run().catch(console.dir);

        });

        response.render("homePage", {accountName: currentUser});
    }
    else {
        alert("Log in")
        response.render("homePage", {accountName: currentUser});
    }
});

app.get("/answerDel", function (req, response){
    response.render("answerDel", {accountName: currentUser});
});

app.post("/answerDel", function (req, response){
    var answerRequestId = req.body.answer;

    const Answer = mongoose.model('answers', answerSchema);

    async function run() {
        try {
            await Answer.find({'answerId': answerRequestId}, function(err, docs){
                if (err) return console.error(err);
                if (docs[0] == null || docs[0] == undefined){
                    return console.log("Could not find answer");
                }
                else{

                    Answer.findOneAndDelete({'answerId': answerRequestId}, function (errThree, answer) {
                        if (errThree) return console.error(errThree);
                        console.log("Deleted third" + answer);
                    });
                }
            });

        } catch (e) {

        }
    }

    run().catch(console.dir);

    response.render("answerDel", {accountName: currentUser});
});

app.get("/userGet", function (req, response){
    response.render("subjectGet", {accountName: currentUser});
});

app.get("/userDel", function (req, response){
    response.render("userDel", {accountName: currentUser});
});

app.post("/userDel", function (req, response){
    var userRequest = req.body.user;

    const User = mongoose.model('logins', LoginSchema);

    const Question = mongoose.model('questions', QuestionSchema);

    const Answer = mongoose.model('answers', answerSchema);

    async function run() {
        try {
            await User.find({'username': userRequest}, function(err, docs){
                if (err) return console.error(err);
                if (docs[0] == null || docs[0] == undefined){
                    return console.log("Could not find user");
                }
                else{
                    Question.deleteMany({'askId': docs[0].id}, function (errTwo, docsThree) {
                        if (errTwo) return console.error(errTwo);
                        console.log("Deleted first" + docsThree);
                    });

                    Answer.deleteMany({'userId': docs[0].id}, function (errTwo, docsThree) {
                        if (errTwo) return console.error(errTwo);
                        console.log("Deleted second" + docsThree);
                    });

                    User.findOneAndDelete({'username': userRequest}, function (errThree, username) {
                        if (errThree) return console.error(errThree);
                        console.log("Deleted third" + username);
                    });
                }
            });

        } catch (e) {

        }
    }

    run().catch(console.dir);

    response.render("userDel", {accountName: currentUser});
});

app.post("/login",Auth_passport.authenticate('local',{
        successRedirect: '/',
        failureRedirect: '/loginFail',
        session: false
    })
);

app.post("/signin", AuthSignUp_passport.authenticate('localTwo',{
    failureRedirect: '/loginFail',
    session: false
    }), async function(req, res){
    var newUser = req.body.username;
    var newPassword = req.body.password;
    var idNum = 1;
    var idAvailable = false;

    LoginModel.countDocuments({}, function (err, count) {

        const uri = "mongodb+srv://test:test@cluster0.flru2.mongodb.net/?retryWrites=true&w=majority";
        const client = new MongoClient(uri);
        async function run() {
            try {
                await client.connect();
                // database and collection code goes here
                const db = client.db("test");
                const coll = db.collection("logins");
                // find code goes here

                while(!idAvailable) {
                    const cursor = coll.find({id: idNum});
                    //await cursor.forEach(console.log);
                    //const cursor = coll.find({ subject: subjectRequest}).project({question:1, _id:0} );
                    // iterate code goes here
                    if (await cursor.count() > 0) {
                        idNum += 1;
                    }
                    else{
                        idAvailable = true;
                    }
                }
            } finally {
                let New = LoginModel({username:newUser,password:newPassword, id:idNum});

                New.save(function (err) {
                    if (err) return console.error(err);
                    console.log(newUser + " saved to logins collection.  " + "with id: " + idNum);
                });

                // Ensures that the client will close when you finish/error
                await client.close();
            }

        }

        run().catch(console.dir);
    });

    res.render("login", {accountName: currentUser});
});

app.post("/findQuestion", function (req, response){
    var questionSelected = req.body.questionSelect;



    const Question = mongoose.model('questions', QuestionSchema);

    Question.find({'id': questionSelected}, { _id:0, __v:0},function (err, docs) {

        response.render("selectedQuestion", {
            accountName: currentUser,
            docs: docs
            })
    });

});

app.get("*", function (req, response){
    response.render("error", {accountName: currentUser});
});

app.listen(3000, function(req,resp){
    console.log("Server Running");
});
