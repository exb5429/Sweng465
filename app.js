//Setting up for using dependencies--------------------
var express = require('express');
var path = require('path');
var morgan = require('Morgan');

var app = express();

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
//-----------------------------------------------------------------------------------------------------

//------------------------------ Schemas and Models---------------------------------------------------------------
//Study Guide Related Schema and Model
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

//Subject Related Schema and Model
var subjectSchema = mongoose.Schema({
    subject: String

})

var subjectModel = mongoose.model("subjects",subjectSchema);

//Answer Related Schema and Model
var answerSchema = mongoose.Schema({
    user: String,
    userId: Number,
    questionID: Number,
    answer: String,
    answerId: Number
})

var answerModel = mongoose.model("answers",answerSchema);

//Login Related Schema and Model
var LoginSchema = mongoose.Schema({
    username :String,
    password :String,
    id: Number,
    isAdmin: Boolean
});

var LoginModel = mongoose.model("logins",LoginSchema);

//Variables for when the user logs in
var currentUser = "Account";
var loggedIn = false;
var currentId;
var admin = false;

//Question Related Schema and Model
var QuestionSchema = mongoose.Schema({
    id : Number,
    askId : Number,
    username : String,
    question :String,
    subject :String
});

var PostQuestionModel = mongoose.model("questions",QuestionSchema);

//Like Related Schema and Model
var likesSchema = mongoose.Schema({
    likes: Number,
    userId: Number,
    answerId: Number
});

var likesModel = mongoose.model("likes",likesSchema);
//------------------------------ End of Schemas and Models---------------------------------------------------------------

//Connect to mongodb collections
mongoose.connect("mongodb+srv://test:test@cluster0.flru2.mongodb.net/?retryWrites=true&w=majority");

//Authentication for loggin in
Auth_passport.use('local', new LocalStrategy(
    async function (checkUsername, checkPassword, done) {
        try {
            console.log("Username: " + checkUsername);
            //Try to find if there is a user with this info
            let User = await LoginModel.findOne({username: checkUsername,password: checkPassword});
            //If user is not found, then login will fail
            if (User == undefined || User == null) {
                console.log("Incorrect username or password");
                return done(null, false, {message: 'Incorrect username or password.'});
            }
            else {
                //Set variables according to the user that is logging in
                console.log("User: " + User.username + " has logged in");
                loggedIn = true;
                currentUser = User.username;
                currentId = User.id;
                //Check if the user is an admin
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

//Authentication for signing up
AuthSignUp_passport.use('localTwo', new LocalStrategyTwo(
    async function (checkUsername, checkPassword, done) {
        try {
            console.log("Username: " + checkUsername);
            //Find if the username already exists
            let Username = await LoginModel.findOne({username: checkUsername});

            //If the name is available and password 8 or more characters, continue with sign up process
            if ((Username == undefined || Username == null) && (checkPassword.length >= 8)) {
                console.log("User: " + checkUsername + " has signed up");
                //Pass a dummy object to send a success to the post method when the authentication is run
                let Username = {
                    username : "1",
                    password : "1",
                    id: 0
                };
                return done(null, Username);
            }
            else if (checkPassword.length < 8) {
                console.log("Password not long enough.");
                //If password is not long enough, send a failure to the post method when this authentication is used
                return done(null, false, {message: 'Password not long enough.'});
            }
            else{
                console.log("Username not available.");
                //If username is not available, send a failure to the post method when this authentication is used
                return done(null, false, {message: 'Username not available.'});
            }
        } catch (e) {
            console.log(e)
        }
    }
));

app.use(morgan('dev'));
app.use(express.static(path.join(__dirname, "/public")));

// ----------------------------- Miscellaneous HTTP Methods --------------------------------------------------------
//Homepage
app.get("/", function (req, response){
    response.render("homePage", {accountName: currentUser, admin: admin});
});

//This application uses localhost:3000
app.listen(3000, function(req,resp){
    console.log("Server Running");
});
// ----------------------------- End of Miscellaneous HTTP Methods --------------------------------------------------------



//-------------------------------- Study Guide HTTP Methods ------------------------------------------------
//Post for adding a study guide entry from an answer that the user selects on a given question
app.post("/addStudy", async function(req, res) {
    if (loggedIn) {
        //Variables we need to make object
        var user = currentUser;
        var userId = currentId;
        var answerId = req.body.studySelect;
        var idNum = 1;
        var idAvailable = false;
        var answer;
        var question;
        var questionId;

        //Refer to mongodb collections
        const Question = mongoose.model('questions', QuestionSchema);
        const Answer = mongoose.model('answers', answerSchema);

        //Find the answer based off of the answerId from HTML page
        Answer.find({'answerId': answerId}, { _id:0, __v:0},function (err, answerDocs) {
            answer = answerDocs[0].answer;
            //Find the question based off of the questionId from answer object
            Question.find({'id': answerDocs[0].questionID},{ _id:0, __v:0},function(err, questionDocs){
                question = questionDocs[0].question;
                questionId = questionDocs[0].id;
            });
        });

        //Process for creating the id and object for the new entry
        studyModel.countDocuments({}, function (err, count) {

            const uri = "mongodb+srv://test:test@cluster0.flru2.mongodb.net/?retryWrites=true&w=majority";
            const client = new MongoClient(uri);
            async function run() {
                try {
                    await client.connect();
                    // database and collection code
                    const db = client.db("test");
                    const coll = db.collection("studyguides");

                    //Create unique id for object (finds the lowest value id that is available)
                    while(!idAvailable) {
                        const cursor = coll.find({id: idNum});

                        if (await cursor.count() > 0) {
                            idNum += 1;
                        }
                        else{
                            idAvailable = true;
                        }
                    }
                } finally {
                    //Create object for collection
                    let New = studyModel({
                        user: currentUser,
                        userId: currentId,
                        question: question,
                        questionId: questionId,
                        answer: answer,
                        answerId: answerId,
                        id: idNum
                    });
                    //Save to collection
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
        //Send to this page when finished
        res.render("homePage", {accountName: currentUser, admin: admin});
    }
    else {
        //If user tries to add an entry without logging in, send straight to login page
        res.render("login", {accountName: currentUser, admin: admin});
    }
});

//Method for deleting a study guide entry
app.post("/studyDel", function (req, response){
    //Get the study guide entry id from HTML page
    var studyRequestId = req.body.studyId;
    //Refer to collection
    const Study = mongoose.model('studyguides', studySchema);

    async function run() {
        try {
            await Study.find({'id': studyRequestId}, function(err, docs){
                if (err) return console.error(err);
                if (docs[0] == null || docs[0] == undefined){
                    return console.log("Could not find study guide entry (Should never show up)");
                }
                else{
                    //Delete that entry
                    Study.findOneAndDelete({'id': studyRequestId}, function (errThree, studyDocs) {
                        if (errThree) return console.error(errThree);
                        console.log("Deleted study" + studyDocs);
                        Study.find({'userId': currentId},  {_id:0, __v:0} ,function (err, docs) {
                            console.log(docs);
                            //Render the study guide page to refresh
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
    //Show study guide depending on if user is logged in
    if(loggedIn == true){
        const Study = mongoose.model('studyGuide', studySchema);
        //Find all study guide entries for that user and send HTML page that info
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
        //Page for if they are not logged in
        response.render("studyGuideLogin", {
            accountName: currentUser,
            admin: admin
        });
    }

});
//-------------------------------- End of Study Guide HTTP Methods ------------------------------------------------



//-------------------------------- Question HTTP Methods ------------------------------------------------
//Get for getting subjects to post a question page
app.get("/postQuestion", function (req, response){
    const Subject = mongoose.model('subjects', subjectSchema);

    //Give the page the list of subjects
    Subject.find({},  {_id:0, __v:0} ,function (err, docs) {


        response.render("postQuestion", {
            accountName: currentUser,
            docs: docs,
            admin: admin
        });

    });

});

//Question get admin page
app.get("/questionGet", function (req, response){
    let docs
    response.render("questionGet", {accountName: currentUser, admin: admin, docs: docs});
});
//Post for finding questions based on the user inputted
app.post("/getQuestions", function (req, response){
    const Question = mongoose.model('questions', QuestionSchema);
    var user = req.body.user;
    let test;

    Question.find({'username': user},  {_id:0, __v:0} ,function (err, docs) {

        test = docs;
        console.log(test);
        response.render("questionGet", {accountName: currentUser,
            docs: test,
            admin: admin})
    });

});
//Post for user posting a question
app.post("/postQuestion", async function(req, res) {
    //Can only post if you are logged in
    if (loggedIn) {
        //Variables for object
        var user = currentUser;
        var subject = req.body.subject;
        var question = req.body.question;
        var idNum = 1;
        var idAvailable = false;
        //Process for id and object creation
        PostQuestionModel.countDocuments({}, function (err, count) {

            const uri = "mongodb+srv://test:test@cluster0.flru2.mongodb.net/?retryWrites=true&w=majority";
            const client = new MongoClient(uri);
            async function run() {
                try {
                    await client.connect();
                    // database and collection code
                    const db = client.db("test");
                    const coll = db.collection("questions");
                    //Gives the lowest value id that is available
                    while(!idAvailable) {
                        const cursor = coll.find({id: idNum});

                        if (await cursor.count() > 0) {
                            idNum += 1;
                        }
                        else{
                            idAvailable = true;
                        }
                    }
                } finally {
                    //Object to be added to the collection
                    let New = PostQuestionModel({
                        id: idNum,
                        askId: currentId,
                        username: currentUser,
                        question: question,
                        subject: subject
                    });
                    //Save the object to the collection
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
        //On success, send to this page
        res.render("homePage", {accountName: currentUser, admin: admin});
    }
    else {
        //Send here if user is not logged in
        res.render("login", {accountName: currentUser, admin: admin});
    }
});
//Question delete admin page
app.get("/questionDel", function (req, response){
    response.render("questionDel", {accountName: currentUser, admin: admin});
});
//Deletes a question based off of the question id inputted on admin page
app.post("/questionDel", function (req, response){
    //Get id from HTML page
    var questionRequestId = req.body.question;

    //Refer to collections
    const Question = mongoose.model('questions', QuestionSchema);

    const Answer = mongoose.model('answers', answerSchema);

    const Study = mongoose.model('studyguides', studySchema);

    const Like = mongoose.model('like', likesSchema);

    async function run() {
        try {
            //Find the question
            await Question.find({'id': questionRequestId}, function(err, docs){
                if (err) return console.error(err);
                if (docs[0] == null || docs[0] == undefined){
                    return console.log("Could not find question");
                }
                else{
                    async function find() {
                        //Find all answers in that question
                        await Answer.find({'questionID': docs[0].id}, {_id: 0, __v: 0}, function (err, answerDocs) {
                            if (err) return console.error(err);
                            if (answerDocs[0] == null || answerDocs[0] == undefined) {
                                return console.log("Could not find answers");
                            }
                            else{
                                //For each answer in that question, delete its likes and study guide entries
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
                    //Delete all the answers to that question
                    Answer.deleteMany({'questionID': docs[0].id}, function (errOne, docsThree) {
                        if (errOne) return console.error(errOne);
                        console.log("Deleted first" + docsThree);
                    });
                    //Delete all study guide entries for that question
                    Study.deleteMany({'questionId': docs[0].id}, function (errTwo, docsTwo) {
                        if (errTwo) return console.error(errTwo);
                        console.log("Deleted second" + docsTwo);
                    });
                    //Delete the question
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
    //Render the page again to refresh
    response.render("questionDel", {accountName: currentUser, admin: admin});
});
//Page for searching a question by subject
app.get("/searchQuestion", function (req, response){
    //Refer to collection
    const Subject = mongoose.model('subjects', subjectSchema);
    let subjects;
    //Find all the subjects for search page
    Subject.find({},  {_id:0, __v:0} ,function (err, docs) {

        subjects = docs;
        //Hand off the subjects to HTML page
        response.render("searchQuestion", {
            questions: PostQuestionModel,
            accountName: currentUser,
            docs: subjects,
            admin: admin
        });

    });

});
//Page for the selected question
app.get("/selectedQuestion", function (req, response){
    response.render("selectedQuestion", {accountName: currentUser, admin: admin});
});
//Post method for searching by subject
app.post("/searchQuestions", function (req, response){
    //Get subject from HTML page
    var subjectRequest = req.body.subject;
    //Refer to collection
    const Question = mongoose.model('questions', QuestionSchema);
    //Find the question based off of the subject
    Question.find({'subject': subjectRequest}, { _id:0, __v:0},function (err, docs) {
        if (err) return console.error(err);
        if (docs[0] == null || docs[0] == undefined){
            console.log("Could not find questions in this subject.");
            //Show if there are no questions in that subject
            response.render("subjectNo", {
                accountName: currentUser,
                admin: admin
            })
        }
        else {
            //Render list of questions otherwise
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

var currentQuestion;
//Post for getting info for selected question page based off of which one is selected
app.post("/findQuestion", function (req, response){
    //User selected question from HTML page
    var questionSelected = req.body.questionSelect;
    currentQuestion = questionSelected;
    //Refer to collections
    const Like = mongoose.model('like', likesSchema);
    const Question = mongoose.model('questions', QuestionSchema);
    const Answer = mongoose.model('answers', answerSchema);
    //Find the question
    Question.find({'id': questionSelected}, { _id:0, __v:0},function (err, questionDocs) {
        //Find all answers
        Answer.find({'questionID': questionSelected},{ _id:0, __v:0},function(err, answerDocs){
            //Find all likes
            Like.find({},{ likes:1,_id:0, __v:0},function(err, likeDocs){
                console.log(likeDocs)
                response.render("selectedQuestion", {
                    //Hand off info to the HTML page to render
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
//-------------------------------- End of Question HTTP Methods ------------------------------------------------



//-------------------------------- Login/Sign Up/User Related HTTP Methods ------------------------------------------------
//Send to page for logging in
app.get("/login", function (req, response){
    response.render("login", {accountName: currentUser, admin: admin});
});
//Send to page for signing up
app.get("/signup", function (req, response){
    response.render("signup", {accountName: currentUser, admin: admin});
});
//If the login attempt fails
app.get("/loginFail", function (req, response){
    response.render("loginFail", {accountName: currentUser, admin: admin});
});
//Admin page for user GET
app.get("/userGet", function (req, response){
    let docs
    response.render("userGet", {accountName: currentUser, admin: admin, docs: docs});
});
//GET method for getting list of all users in collection
app.post("/getUsers", function (req, response){
    const User = mongoose.model('logins', LoginSchema);
    let test;
    //Finds all users
    User.find({},  {_id:0, __v:0} ,function (err, docs) {

        test = docs;
        console.log(test);
        response.render("userGet", {accountName: currentUser,
            docs: test,
            admin: admin})
    });

});
//Admin page for user delete
app.get("/userDel", function (req, response){
    response.render("userDel", {accountName: currentUser,
        admin: admin});
});
//Post for admins to user delete based off of inputted username (can not delete admin accounts)
app.post("/userDel", function (req, response){
    //Get username from HTML page
    var userRequest = req.body.user;
    //Connect to collections
    const User = mongoose.model('logins', LoginSchema);

    const Question = mongoose.model('questions', QuestionSchema);

    const Answer = mongoose.model('answers', answerSchema);

    const Study = mongoose.model('studyguides', studySchema);

    const Like = mongoose.model('like', likesSchema);

    async function run() {
        try {
            //Find the user
            await User.find({'username': userRequest}, function(err, docs){
                if (err) return console.error(err);
                if (docs[0] == null || docs[0] == undefined){
                    return console.log("Could not find user");
                }
                else{
                    if (docs[0].isAdmin == true){
                        //Will not do anything if the user being deleted is an admin
                        console.log("Can not delete an admin account")
                    }
                    else {
                        async function findOne() {
                            //Find all questions that user posted
                            await Question.find({'askId': docs[0].id}, function(err, docsQuest){
                                if (err) return console.error(err);
                                if (docs[0] == null || docs[0] == undefined){
                                    return console.log("Could not find any questions");
                                }
                                else{
                                    //For every question
                                    for(var i = 0; i < docsQuest.length; i++) {
                                        async function findTwo() {
                                            //Find all answers to that question
                                            await Answer.find({'questionID': docsQuest[i].id}, {
                                                _id: 0,
                                                __v: 0
                                            }, function (err, answerDocs) {
                                                if (err) return console.error(err);
                                                if (answerDocs[0] == null || answerDocs[0] == undefined) {
                                                    return console.log("Could not find answers");
                                                } else {
                                                    //For each answer
                                                    for (var j = 0; j < answerDocs.length; j++) {
                                                        //Delete all related likes
                                                        Like.deleteMany({'answerId': answerDocs[j].answerId}, function (errTwo, docsThree) {
                                                            if (errTwo) return console.error(errTwo);
                                                            console.log("Deleted likes" + docsThree);
                                                        });
                                                        //Delete all related study guide entries
                                                        Study.deleteMany({'answerId': answerDocs[j].answerId}, function (errOne, docsThree) {
                                                            if (errOne) return console.error(errOne);
                                                            console.log("Deleted first" + docsThree);
                                                        });
                                                    }
                                                }
                                            });
                                        }

                                        findTwo().catch(console.dir);
                                        //Delete all the answers for that question
                                        Answer.deleteMany({'questionID': docsQuest[i].id}, function (errOne, docsThree) {
                                            if (errOne) return console.error(errOne);
                                            console.log("Deleted first" + docsThree);
                                        });
                                        //Delete all study guide entries related to the question
                                        Study.deleteMany({'questionID': docsQuest[i].id}, function (errOne, docsThree) {
                                            if (errOne) return console.error(errOne);
                                            console.log("Deleted first" + docsThree);
                                        });
                                    }
                                }
                            });

                        }

                        findOne().catch(console.dir);
                        //Delete the questions after everything related to them was deleted
                        Question.deleteMany({'askId': docs[0].id}, function (errTwo, docsThree) {
                            if (errTwo) return console.error(errTwo);
                            console.log("Deleted question" + docsThree);
                        });

                        async function findThree() {
                            //Find all answers that user posted
                            await Answer.find({'userId': docs[0].id}, {
                                _id: 0,
                                __v: 0
                            }, function (err, answerDocs) {
                                if (err) return console.error(err);
                                if (docs[0] == null || docs[0] == undefined) {
                                    return console.log("Could not find answers");
                                } else {
                                    //For each answer they posted
                                    for (var j = 0; j < answerDocs.length; j++) {
                                        //Find the answer based off of the id
                                        Answer.find({'answerId': answerDocs[j].answerId}, function (errTwo, docsThree) {
                                            if (errTwo) return console.error(errTwo);
                                            console.log("Deleted answers" + docsThree);
                                            async function findFive() {
                                                //Delete likes related to that answer
                                                Like.deleteMany({'answerId': docsThree[0].answerId}, function (errTwo, docsTwo) {
                                                    if (errTwo) return console.error(errTwo);
                                                    console.log("Deleted likes" + docsTwo);
                                                });
                                                //Delete study guide entries related to the answer
                                                Study.deleteMany({'answerId': docsThree[0].answerId}, function (errOne, docsFour) {
                                                    if (errOne) return console.error(errOne);
                                                    console.log("Deleted first" + docsFour);
                                                });
                                            }

                                            findFive().catch(console.dir);
                                            //Delete that answer
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
                        //Delete all likes that user posted
                        Like.deleteMany({'userId': docs[0].id}, function (errTwo, docsThree) {
                            if (errTwo) return console.error(errTwo);
                            console.log("Deleted likes" + docsThree);
                        });
                        //Delete all study guide entries that user had
                        Study.deleteMany({'userId': docs[0].id}, function (errTwo, docsTwo) {
                            if (errTwo) return console.error(errTwo);
                            console.log("Deleted study guide entries" + docsTwo);
                        });
                        //Delete that user
                        User.findOneAndDelete({'username': userRequest}, function (errThree, username) {
                            if (errThree) return console.error(errThree);
                            console.log("Deleted user" + username);
                        });
                    }

                }
            });

        } catch (e) {

        }
    }

    run().catch(console.dir);
    //Refresh page
    response.render("userDel", {accountName: currentUser,
        admin: admin});
});
//Post for login that utilizes authentication (send to login fail page if failure in authentication)
app.post("/login",Auth_passport.authenticate('local',{
        successRedirect: '/',
        failureRedirect: '/loginFail',
        session: false
    })
);
//Post for sign up that utilizes authentication (send to login fail page if failure in authentication)
app.post("/signin", AuthSignUp_passport.authenticate('localTwo',{
    failureRedirect: '/loginFail',
    session: false
}), async function(req, res){
    //Variables for new object
    var newUser = req.body.username;
    var newPassword = req.body.password;
    var idNum = 1;
    var idAvailable = false;
    //Process for creating id
    LoginModel.countDocuments({}, function (err, count) {

        const uri = "mongodb+srv://test:test@cluster0.flru2.mongodb.net/?retryWrites=true&w=majority";
        const client = new MongoClient(uri);
        async function run() {
            try {
                await client.connect();
                // database and collection code
                const db = client.db("test");
                const coll = db.collection("logins");
                //Lowest value id that is available
                while(!idAvailable) {
                    const cursor = coll.find({id: idNum});
                    if (await cursor.count() > 0) {
                        idNum += 1;
                    }
                    else{
                        idAvailable = true;
                    }
                }
            } finally {
                //Create object
                let New = LoginModel({username:newUser,password:newPassword, id:idNum, isAdmin: false});
                //Save to collection
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
    //Send the user to the login page
    res.render("login", {accountName: currentUser, admin: admin});
});
//-------------------------------- End of Login/Sign Up/User Related HTTP Methods ------------------------------------------------



//-------------------------------- Subject Related HTTP Methods -----------------------------------------------------------
//Send user to this page when there are no questions for a searched subject
app.get("/subjectNo", function (req, response){
    response.render("subjectNo", {accountName: currentUser, admin: admin});
});
//Admin subject get page
app.get("/subjectGet", function (req, response){
    let docs
    response.render("subjectGet", {accountName: currentUser, admin: admin, docs: docs});
});
//Admin subject post page
app.get("/subjectPost", function (req, response){
    response.render("subjectPost", {accountName: currentUser, admin: admin});
});
//Admin subject delete page
app.get("/subjectDel", function (req, response){
    response.render("subjectDel", {accountName: currentUser, admin: admin});
});
//Gets all subjects for admin subject get
app.get("/getSubjects", function (req, response){
    const Subject = mongoose.model('subjects', subjectSchema);
    let test;
    //Find al subjects
    Subject.find({},  {_id:0, __v:0} ,function (err, docs) {

       test = docs;
       console.log(test);
       response.render("subjectGet", {accountName: currentUser,
           docs: test,
           admin: admin})
    });

});
//Post for adding a subject for admin
app.post("/addSubject", function (req, response){
    //Get subject to add from HTML page
    var subjectRequest = req.body.subject;
    console.log(subjectRequest)
    //Create new object
    let New = subjectModel({
        subject: subjectRequest
    });
    //Save to collection
    New.save(function (err) {
        if (err) return console.error(err);
        console.log(subjectRequest + " added");
    });
    //Send to this page afterward
    console.log("Add Subject:  " + subjectRequest)
    response.render("homePage", {accountName: currentUser, admin: admin})
});
//Admin deleting a subject
app.post("/delSubject", function (req, response){
    //Get subject from HTML page
    var subjectRequest = req.body.subject;
    const Subject = mongoose.model('subjects', subjectSchema);
    //Find the subject and delete it
    Subject.findOneAndDelete({ 'subject': subjectRequest }, function (err, subject) {
        if (err) return handleError(err);
        console.log("Deleted " + subject);
    });
    //Send to this page afterward
    response.render("homePage", {accountName: currentUser, admin: admin})
});
//-------------------------------- End of Subject Related HTTP Methods -----------------------------------------------------------



//-------------------------------- Answer Related HTTP Methods -----------------------------------------------------------
//Admin answer get page
app.get("/answerGet", function (req, response){
    let answerDocs, questionDocs
    response.render("answerGet", {accountName: currentUser, admin: admin, answerDocs: answerDocs, questionDocs: questionDocs});
});
//Admin answer post page
app.get("/answerPost", function (req, response){
    response.render("answerPost", {accountName: currentUser, admin: admin});
});
//Admin POST for getting answers based off of questionId
app.post("/getAnswers", function (req, response){
    const Answer = mongoose.model('answers', answerSchema);
    const Question = mongoose.model('questions', QuestionSchema);
    var questionId = req.body.questionId;
    //Find all answers to that question
    Answer.find({ 'questionID': questionId}, { _id:0, __v:0} ,function (err, answerDocs) {
        console.log(answerDocs)
        Question.find({ 'id': questionId}, { id: 0, askId:0, username:0, subject:0,_id:0, __v:0} ,function (err, questionDocs) {
            console.log(questionDocs)
            response.render("answerGet", {accountName: currentUser, admin: admin, answerDocs: answerDocs, questionDocs: questionDocs})
        });
    });



    //Find that question





});
//Post for adding an answer, when user puts in an answer
app.post("/addAnswer", function (req, response){
    //Only works if logged in
    if (loggedIn) {
        //Get information from HTML page
        var answer = req.body.answer;
        var questionId = req.body.questionId;

        var idNum = 1;
        var idAvailable = false;
        //Process for creating id
        answerModel.countDocuments({}, function (err, count) {

            const uri = "mongodb+srv://test:test@cluster0.flru2.mongodb.net/?retryWrites=true&w=majority";
            const client = new MongoClient(uri);
            async function run() {
                try {
                    await client.connect();
                    // database and collection
                    const db = client.db("test");
                    const coll = db.collection("answers");
                    //Lowest available id is given
                    while(!idAvailable) {
                        const cursor = coll.find({answerId: idNum});

                        if (await cursor.count() > 0) {
                            idNum += 1;
                        }
                        else{
                            idAvailable = true;
                        }
                    }
                } finally {
                    //Create new object
                    let New = answerModel({
                        user: currentUser,
                        userId: currentId,
                        questionID: questionId,
                        answerId: idNum,
                        answer: answer
                    });
                    //Save to the collection
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
        //Send to this page afterward
        response.render("homePage", {accountName: currentUser, admin: admin});
    }
    else {
        //Send to login page if the user is not logged in
        response.render("login", {accountName: currentUser, admin: admin});
    }
});
//Admin page for deleting an answer
app.get("/answerDel", function (req, response){
    response.render("answerDel", {accountName: currentUser, admin: admin});
});
//POST for admin deletion of an answer
app.post("/answerDel", function (req, response){
    //Get answer id from HTML page
    var answerRequestId = req.body.answer;
    //Refer to collections
    const Answer = mongoose.model('answers', answerSchema);

    const Study = mongoose.model('studyguides', studySchema);

    const Like = mongoose.model('like', likesSchema);

    async function run() {
        try {
            //Find the answer
            await Answer.find({'answerId': answerRequestId}, function(err, docs){
                if (err) return console.error(err);
                if (docs[0] == null || docs[0] == undefined){
                    return console.log("Could not find answer");
                }
                else{
                    //Delete study guide entries for that answer
                    Study.deleteMany({'answerId': answerRequestId}, function (errTwo, docsTwo) {
                        if (errTwo) return console.error(errTwo);
                        console.log("Deleted second" + docsTwo);
                    });
                    //Delete likes for that answer
                    Like.deleteMany({'answerId': answerRequestId}, function (errTwo, docsThree) {
                        if (errTwo) return console.error(errTwo);
                        console.log("Deleted likes" + docsThree);
                    });
                    //Delete answer
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
    //Render this page afterward
    response.render("answerDel", {accountName: currentUser, admin: admin});
});

//-------------------------------- End of Answer Related HTTP Methods -----------------------------------------------------------



//--------------------------------- Like Related HTTP Methods ----------------------------------------------------------------
//Post for giving or deleting a like when button is pressed by user on page
app.post("/likePost", function (req, response) {
    //Get info from HTML page
    var questionSelected = currentQuestion;
    let likeCount
    var answerSelected = req.body.like;

    //Refer to collections
    const Question = mongoose.model('questions', QuestionSchema);
    const Answer = mongoose.model('answers', answerSchema);
    const Like = mongoose.model('like', likesSchema);
    //Count likes
    Like.countDocuments({answerId: answerSelected}, function(err, count){
        likeCount = count
    });
    //Find question
    Question.find({'id': questionSelected}, { _id:0, __v:0},function (err, questionDocs) {
        //Find answers
        Answer.find({'questionID': questionSelected},{ _id:0, __v:0},function(err, answerDocs){
            //Try to find if like already exists for user
            Like.find({userId: currentId, answerId: answerSelected},{ _id:0, __v:0},function(err, likeDocs){
                //If there is a like and button is pressed, delete it
                if (likeDocs.length){
                    console.log("delete")
                    Like.findOneAndDelete({userId: currentId}, function (errThree, deletingLikes) {
                            if (errThree) return console.error(errThree);
                            console.log("Deleted " + deletingLikes);
                        });
                        //Refresh page
                        response.render("selectedQuestion", {

                            accountName: currentUser,
                            questionDocs: questionDocs,
                            answerDocs: answerDocs,
                            admin: admin,
                            likeDocs: likeDocs
                        })

                }  else {
                    console.log("add")
                    //If the like does not exist, make a new object for it
                    let New = likesModel({
                                likes: (likeCount + 1),
                                userId: currentId,
                                answerId: answerSelected
                            });
                            //Save it to collection
                            New.save(function (err) {
                                if (err) return console.error(err);

                            });
                            //Refresh page
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

//----------------------------------Error Page ---------------------------------------
app.get("*", function (req, response){
    response.render("error", {accountName: currentUser, admin: admin});
});
//--------------------------------- End of Like Related HTTP Methods ----------------------------------------------------------------
