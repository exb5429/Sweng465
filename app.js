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

var studySchema = mongoose.Schema({
    user: String,
    userId: Number,
    question: String,
    questionId: Number,
    answer: String,
    answerId: Number,
    id: Number
})

var studyModel = mongoose.model("studyGuide",studySchema);

var subjectSchema = mongoose.Schema({
    subject: String

})

var subjectModel = mongoose.model("subjects",subjectSchema);


var answerSchema = mongoose.Schema({
    user: String,
    userId: Number,
    questionID: Number,
    answer: String,
    answerId: Number
})

var answerModel = mongoose.model("answers",answerSchema);

var LoginSchema = mongoose.Schema({
    username :String,
    password :String,
    id: Number,
    isAdmin: Boolean
});

var LoginModel = mongoose.model("logins",LoginSchema);

var currentUser = "Account";
var currentPassword;
var loggedIn = false;
var currentId;
var admin = false;

var QuestionSchema = mongoose.Schema({
    id : Number,
    askId : Number,
    username : String,
    question :String,
    subject :String
});

var PostQuestionModel = mongoose.model("questions",QuestionSchema);

var likesSchema = mongoose.Schema({
    likes: Number,
    userId: Number,
    answerId: Number
});

var likesModel = mongoose.model("likes",likesSchema);

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
                if (User.isAdmin === true){
                    admin = true
                }
                else admin = false;
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
    response.render("homePage", {accountName: currentUser, admin: admin});
});

app.post("/addStudy", async function(req, res) {
    if (loggedIn) {
        var user = currentUser;
        var userId = currentId;
        var answerId = req.body.studySelect;
        var idNum = 1;
        var idAvailable = false;
        var answer;
        var question;
        var questionId;

        const Question = mongoose.model('questions', QuestionSchema);
        const Answer = mongoose.model('answers', answerSchema);
        Answer.find({'answerId': answerId}, { _id:0, __v:0},function (err, answerDocs) {
            answer = answerDocs[0].answer;
            Question.find({'id': answerDocs[0].questionID},{ _id:0, __v:0},function(err, questionDocs){
                question = questionDocs[0].question;
                questionId = questionDocs[0].id;
            });
        });

        studyModel.countDocuments({}, function (err, count) {

            const uri = "mongodb+srv://test:test@cluster0.flru2.mongodb.net/?retryWrites=true&w=majority";
            const client = new MongoClient(uri);
            async function run() {
                try {
                    await client.connect();
                    // database and collection code goes here
                    const db = client.db("test");
                    const coll = db.collection("studyguides");
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
                    let New = studyModel({
                        user: currentUser,
                        userId: currentId,
                        question: question,
                        questionId: questionId,
                        answer: answer,
                        answerId: answerId,
                        id: idNum
                    });

                    New.save(function (err) {
                        if (err) return console.error(err);
                        console.log(user + " with ID " + currentId + " " + "saved a " + idNum + " study entry to " +
                            "studyguides collection. The study with id: " + idNum + " is as follows: " + question);
                    });

                    // Ensures that the client will close when you finish/error
                    await client.close();
                }

            }

            run().catch(console.dir);

        });

        res.render("homePage", {accountName: currentUser, admin: admin});
    }
    else {
        res.render("login", {accountName: currentUser, admin: admin});
    }
});

app.post("/studyDel", function (req, response){
    var studyRequestId = req.body.studyId;

    const Study = mongoose.model('studyguides', studySchema);

    async function run() {
        try {
            await Study.find({'id': studyRequestId}, function(err, docs){
                if (err) return console.error(err);
                if (docs[0] == null || docs[0] == undefined){
                    return console.log("Could not find study guide entry (Should never show up)");
                }
                else{

                    Study.findOneAndDelete({'id': studyRequestId}, function (errThree, studyDocs) {
                        if (errThree) return console.error(errThree);
                        console.log("Deleted study" + studyDocs);
                        Study.find({'userId': currentId},  {_id:0, __v:0} ,function (err, docs) {
                            console.log(docs);
                            response.render("studyGuide", {
                                accountName: currentUser,
                                studyDocs: docs,
                                admin: admin
                            });
                        });
                    });
                }
            });

        } catch (e) {

        }
    }

    run().catch(console.dir);
});

app.get("/studyGuide", function (req, response){
    if(loggedIn == true){
        const Study = mongoose.model('studyGuide', studySchema);

        Study.find({'userId': currentId},  {_id:0, __v:0} ,function (err, docs) {
            console.log(docs);
            response.render("studyGuide", {
                accountName: currentUser,
                studyDocs: docs,
                admin: admin
            });
        });
    }
    else{
        response.render("studyGuideLogin", {
            accountName: currentUser,
            admin: admin
        });
    }

});

app.get("/postQuestion", function (req, response){
    const Subject = mongoose.model('subjects', subjectSchema);


    Subject.find({},  {_id:0, __v:0} ,function (err, docs) {


        response.render("postQuestion", {
            accountName: currentUser,
            docs: docs,
            admin: admin
        });

    });

});

app.get("/questionGet", function (req, response){
    response.render("questionGet", {accountName: currentUser, admin: admin});
});

app.get("/getQuestions", function (req, response){
    const Question = mongoose.model('questions', QuestionSchema);
    var user = req.body.user;
    let test;

    Question.find({'username': user},  {_id:0, __v:0} ,function (err, docs) {

        test = docs;
        console.log(test);
        response.render("homePage", {accountName: currentUser,
            docs: test,
            admin: admin})
    });

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

        res.render("homePage", {accountName: currentUser, admin: admin});
    }
    else {
        res.render("login", {accountName: currentUser, admin: admin});
    }
});

app.get("/questionDel", function (req, response){
    response.render("questionDel", {accountName: currentUser, admin: admin});
});

app.post("/questionDel", function (req, response){
    var questionRequestId = req.body.question;

    const Question = mongoose.model('questions', QuestionSchema);

    const Answer = mongoose.model('answers', answerSchema);

    const Study = mongoose.model('studyguides', studySchema);

    const Like = mongoose.model('like', likesSchema);

    async function run() {
        try {
            await Question.find({'id': questionRequestId}, function(err, docs){
                if (err) return console.error(err);
                if (docs[0] == null || docs[0] == undefined){
                    return console.log("Could not find question");
                }
                else{
                    async function find() {
                        await Answer.find({'questionID': docs[0].id}, {_id: 0, __v: 0}, function (err, answerDocs) {
                            if (err) return console.error(err);
                            if (answerDocs[0] == null || answerDocs[0] == undefined) {
                                return console.log("Could not find answers");
                            }
                            else{
                                for(var i = 0; i < answerDocs.length; i++){
                                    Like.deleteMany({'answerId': answerDocs[i].answerId}, function (errTwo, docsThree) {
                                        if (errTwo) return console.error(errTwo);
                                        console.log("Deleted likes" + docsThree);
                                    });

                                    Study.deleteMany({'answerId': answerDocs[i].id}, function (errOne, docsThree) {
                                        if (errOne) return console.error(errOne);
                                        console.log("Deleted first" + docsThree);
                                    });
                                }
                            }
                        });
                    }

                    find().catch(console.dir);

                    Answer.deleteMany({'questionID': docs[0].id}, function (errOne, docsThree) {
                        if (errOne) return console.error(errOne);
                        console.log("Deleted first" + docsThree);
                    });

                    Study.deleteMany({'questionId': docs[0].id}, function (errTwo, docsTwo) {
                        if (errTwo) return console.error(errTwo);
                        console.log("Deleted second" + docsTwo);
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

    response.render("questionDel", {accountName: currentUser, admin: admin});
});

app.get("/login", function (req, response){
    response.render("login", {accountName: currentUser, admin: admin});
});

app.get("/signup", function (req, response){
    response.render("signup", {accountName: currentUser, admin: admin});
});

app.get("/loginFail", function (req, response){
    response.render("loginFail", {accountName: currentUser, admin: admin});
});

app.get("/searchQuestion", function (req, response){
    const Subject = mongoose.model('subjects', subjectSchema);
    let subjects;

    Subject.find({},  {_id:0, __v:0} ,function (err, docs) {

        subjects = docs;
        response.render("searchQuestion", {
            questions: PostQuestionModel,
            accountName: currentUser,
            docs: subjects,
            admin: admin
        });

    });

});

app.get("/selectedQuestion", function (req, response){
    response.render("selectedQuestion", {accountName: currentUser, admin: admin});
});

app.post("/searchQuestions", function (req, response){
    var subjectRequest = req.body.subject;
    const Question = mongoose.model('questions', QuestionSchema);

    Question.find({'subject': subjectRequest}, { _id:0, __v:0},function (err, docs) {
        if (err) return console.error(err);
        if (docs[0] == null || docs[0] == undefined){
            console.log("Could not find questions in this subject.");
            response.render("subjectNo", {
                accountName: currentUser,
                admin: admin
            })
        }
        else {
            console.log(docs[0].username)
            response.render("questionList", {
                accountName: currentUser,
                docs: docs,
                subject: subjectRequest,
                admin: admin
            })
        }
    });

});

app.get("/subjectNo", function (req, response){
    response.render("subjectNo", {accountName: currentUser, admin: admin});
});

app.get("/subjectGet", function (req, response){
    response.render("subjectGet", {accountName: currentUser, admin: admin});
});

app.get("/subjectPost", function (req, response){
    response.render("subjectPost", {accountName: currentUser, admin: admin});
});

app.get("/subjectDel", function (req, response){
    response.render("subjectDel", {accountName: currentUser, admin: admin});
});

app.get("/getSubjects", function (req, response){
    const Subject = mongoose.model('subjects', subjectSchema);
    let test;

    Subject.find({},  {_id:0, __v:0} ,function (err, docs) {

       test = docs;
       console.log(test);
       response.render("homePage", {accountName: currentUser,
           docs: test,
           admin: admin})
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
    response.render("homePage", {accountName: currentUser, admin: admin})
});

app.post("/delSubject", function (req, response){
    var subjectRequest = req.body.subject;
    const Subject = mongoose.model('subjects', subjectSchema);

    Subject.findOneAndDelete({ 'subject': subjectRequest }, function (err, subject) {
        if (err) return handleError(err);
        console.log("Deleted " + subject);
    });
    response.render("homePage", {accountName: currentUser, admin: admin})
});

app.get("/answerGet", function (req, response){
    response.render("answerGet", {accountName: currentUser, admin: admin});
});

app.get("/answerPost", function (req, response){
    response.render("answerPost", {accountName: currentUser, admin: admin});
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



    response.render("homePage", {accountName: currentUser, admin: admin})
});

app.post("/addAnswer", function (req, response){
    if (loggedIn) {
        var answer = req.body.answer;
        var questionId = req.body.questionId;

        var idNum = 1;
        var idAvailable = false;
        answerModel.countDocuments({}, function (err, count) {

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
                        const cursor = coll.find({answerId: idNum});
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

        response.render("homePage", {accountName: currentUser, admin: admin});
    }
    else {

        response.render("login", {accountName: currentUser, admin: admin});
    }
});

app.get("/answerDel", function (req, response){
    response.render("answerDel", {accountName: currentUser, admin: admin});
});

app.post("/answerDel", function (req, response){
    var answerRequestId = req.body.answer;

    const Answer = mongoose.model('answers', answerSchema);

    const Study = mongoose.model('studyguides', studySchema);

    const Like = mongoose.model('like', likesSchema);

    async function run() {
        try {
            await Answer.find({'answerId': answerRequestId}, function(err, docs){
                if (err) return console.error(err);
                if (docs[0] == null || docs[0] == undefined){
                    return console.log("Could not find answer");
                }
                else{

                    Study.deleteMany({'answerId': answerRequestId}, function (errTwo, docsTwo) {
                        if (errTwo) return console.error(errTwo);
                        console.log("Deleted second" + docsTwo);
                    });

                    Like.deleteMany({'answerId': answerRequestId}, function (errTwo, docsThree) {
                        if (errTwo) return console.error(errTwo);
                        console.log("Deleted likes" + docsThree);
                    });

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

    response.render("answerDel", {accountName: currentUser, admin: admin});
});

app.get("/userGet", function (req, response){
    response.render("userGet", {accountName: currentUser, admin: admin});
});

app.get("/getUsers", function (req, response){
    const User = mongoose.model('logins', LoginSchema);
    let test;

    User.find({},  {_id:0, __v:0} ,function (err, docs) {

        test = docs;
        console.log(test);
        response.render("homePage", {accountName: currentUser,
            docs: test,
            admin: admin})
    });

});

app.get("/userDel", function (req, response){
    response.render("userDel", {accountName: currentUser,
        admin: admin});
});

app.post("/userDel", function (req, response){
    var userRequest = req.body.user;

    const User = mongoose.model('logins', LoginSchema);

    const Question = mongoose.model('questions', QuestionSchema);

    const Answer = mongoose.model('answers', answerSchema);

    const Study = mongoose.model('studyguides', studySchema);

    const Like = mongoose.model('like', likesSchema);

    async function run() {
        try {
            await User.find({'username': userRequest}, function(err, docs){
                if (err) return console.error(err);
                if (docs[0] == null || docs[0] == undefined){
                    return console.log("Could not find user");
                }
                else{

                    async function findOne() {

                        await Question.find({'askId': docs[0].id}, function(err, docsQuest){
                            if (err) return console.error(err);
                            if (docs[0] == null || docs[0] == undefined){
                                return console.log("Could not find any questions");
                            }
                            else{
                                for(var i = 0; i < docsQuest.length; i++) {
                                    async function findTwo() {

                                        await Answer.find({'questionID': docsQuest[i].id}, {
                                            _id: 0,
                                            __v: 0
                                        }, function (err, answerDocs) {
                                            if (err) return console.error(err);
                                            if (answerDocs[0] == null || answerDocs[0] == undefined) {
                                                return console.log("Could not find answers");
                                            } else {
                                                for (var j = 0; j < answerDocs.length; j++) {
                                                    Like.deleteMany({'answerId': answerDocs[j].answerId}, function (errTwo, docsThree) {
                                                        if (errTwo) return console.error(errTwo);
                                                        console.log("Deleted likes" + docsThree);
                                                    });

                                                    Study.deleteMany({'answerId': answerDocs[j].answerId}, function (errOne, docsThree) {
                                                        if (errOne) return console.error(errOne);
                                                        console.log("Deleted first" + docsThree);
                                                    });
                                                }
                                            }
                                        });
                                    }

                                    findTwo().catch(console.dir);

                                    Answer.deleteMany({'questionID': docsQuest[i].id}, function (errOne, docsThree) {
                                        if (errOne) return console.error(errOne);
                                        console.log("Deleted first" + docsThree);
                                    });

                                    Study.deleteMany({'questionID': docsQuest[i].id}, function (errOne, docsThree) {
                                        if (errOne) return console.error(errOne);
                                        console.log("Deleted first" + docsThree);
                                    });
                                }
                            }
                        });

                    }

                    findOne().catch(console.dir);

                    Question.deleteMany({'askId': docs[0].id}, function (errTwo, docsThree) {
                        if (errTwo) return console.error(errTwo);
                        console.log("Deleted question" + docsThree);
                    });

                    async function findThree() {

                        await Answer.find({'userId': docs[0].id}, {
                            _id: 0,
                            __v: 0
                        }, function (err, answerDocs) {
                            if (err) return console.error(err);
                            if (docs[0] == null || docs[0] == undefined) {
                                return console.log("Could not find answers");
                            } else {
                                for (var j = 0; j < answerDocs.length; j++) {

                                    Answer.find({'answerId': answerDocs[j].answerId}, function (errTwo, docsThree) {
                                        if (errTwo) return console.error(errTwo);
                                        console.log("Deleted answers" + docsThree);
                                        async function findFive() {
                                            Like.deleteMany({'answerId': docsThree[0].answerId}, function (errTwo, docsTwo) {
                                                if (errTwo) return console.error(errTwo);
                                                console.log("Deleted likes" + docsTwo);
                                            });

                                            Study.deleteMany({'answerId': docsThree[0].answerId}, function (errOne, docsFour) {
                                                if (errOne) return console.error(errOne);
                                                console.log("Deleted first" + docsFour);
                                            });
                                        }

                                        findFive().catch(console.dir);

                                        Answer.findOneAndDelete({'answerId': docsThree[0].answerId}, function (errThree, docsFive) {
                                            if (errTwo) return console.error(errThree);
                                            console.log("Deleted answer" + docsFive);
                                        });
                                    });
                                }
                            }
                        }).clone();
                    }

                    findThree().catch(console.dir);

                    Like.deleteMany({'userId': docs[0].id}, function (errTwo, docsThree) {
                        if (errTwo) return console.error(errTwo);
                        console.log("Deleted likes" + docsThree);
                    });

                    Study.deleteMany({'userId': docs[0].id}, function (errTwo, docsTwo) {
                        if (errTwo) return console.error(errTwo);
                        console.log("Deleted study guide entries" + docsTwo);
                    });

                    User.findOneAndDelete({'username': userRequest}, function (errThree, username) {
                        if (errThree) return console.error(errThree);
                        console.log("Deleted user" + username);
                    });
                }
            });

        } catch (e) {

        }
    }

    run().catch(console.dir);

    response.render("userDel", {accountName: currentUser,
        admin: admin});
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
                let New = LoginModel({username:newUser,password:newPassword, id:idNum, isAdmin: false});

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

    res.render("login", {accountName: currentUser, admin: admin});
});

var currentQuestion;

app.post("/findQuestion", function (req, response){
    var questionSelected = req.body.questionSelect;
    currentQuestion = questionSelected;

    const Like = mongoose.model('like', likesSchema);
    const Question = mongoose.model('questions', QuestionSchema);
    const Answer = mongoose.model('answers', answerSchema);
    Question.find({'id': questionSelected}, { _id:0, __v:0},function (err, questionDocs) {

        Answer.find({'questionID': questionSelected},{ _id:0, __v:0},function(err, answerDocs){

            Like.find({},{ likes:1,_id:0, __v:0},function(err, likeDocs){
                console.log(likeDocs)
                response.render("selectedQuestion", {

                    accountName: currentUser,
                    questionDocs: questionDocs,
                    answerDocs: answerDocs,
                    admin: admin,
                    likeDocs: likeDocs
                })
            })
        });
    });

});

app.post("/likePost", function (req, response) {
    var questionSelected = currentQuestion;
    let likeCount
    var answerSelected = req.body.like;


    const Question = mongoose.model('questions', QuestionSchema);
    const Answer = mongoose.model('answers', answerSchema);
    const Like = mongoose.model('like', likesSchema);

    Like.countDocuments({answerId: answerSelected}, function(err, count){
        likeCount = count
    });

    Question.find({'id': questionSelected}, { _id:0, __v:0},function (err, questionDocs) {

        Answer.find({'questionID': questionSelected},{ _id:0, __v:0},function(err, answerDocs){

            Like.find({userId: currentId, answerId: answerSelected},{ _id:0, __v:0},function(err, likeDocs){

                if (likeDocs.length){
                    console.log("delete")
                    Like.findOneAndDelete({userId: currentId}, function (errThree, deletingLikes) {
                            if (errThree) return console.error(errThree);
                            console.log("Deleted " + deletingLikes);
                        });

                        response.render("selectedQuestion", {

                            accountName: currentUser,
                            questionDocs: questionDocs,
                            answerDocs: answerDocs,
                            admin: admin,
                            likeDocs: likeDocs
                        })

                }  else {
                    console.log("add")
                    let New = likesModel({
                                likes: (likeCount + 1),
                                userId: currentId,
                                answerId: answerSelected
                            });

                            New.save(function (err) {
                                if (err) return console.error(err);

                            });
                    response.render("selectedQuestion", {

                        accountName: currentUser,
                        questionDocs: questionDocs,
                        answerDocs: answerDocs,
                        admin: admin,
                        likeDocs: likeDocs
                    })
                }

            })
        });
    });


});

app.get("*", function (req, response){
    response.render("error", {accountName: currentUser, admin: admin});
});

app.listen(3000, function(req,resp){
    console.log("Server Running");
});
