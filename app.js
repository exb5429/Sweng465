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

var QuestionSchema = mongoose.Schema({
    id : Number,
    askId : Number,
    username : String,
    question :String,
    subject :String
});

/*QuestionSchema.methods.getID = function () {
    return this.ID;
}*/

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

app.post("/postQuestion", async function(req, res){
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
})

app.get("/login", function (req, response){
    response.render("login", {accountName: currentUser});
});

app.get("/loginFail", function (req, response){
    response.render("loginFail", {accountName: currentUser});
});

app.get("/searchQuestion", function (req, response){
    response.render("searchQuestion", {
        questions: PostQuestionModel, accountName: currentUser
    });
});

app.post("/searchQuestion", async function(req, res){
    var subjectRequest = req.body.subject;


    PostQuestionModel.countDocuments({},function(err,count){
        const uri = "mongodb+srv://test:test@cluster0.flru2.mongodb.net/?retryWrites=true&w=majority";
        const client = new MongoClient(uri);
        async function run() {
            try {
                await client.connect();
                // database and collection code goes here
                const db = client.db("test");
                const coll = db.collection("questions");
                // find code goes here
                const cursor = coll.find({ subject: subjectRequest}).project({question:1, _id:0} );
                //await cursor.forEach(console.log);
                //const cursor = coll.find({ subject: subjectRequest}).project({question:1, _id:0} );
                // iterate code goes here
                await cursor.forEach(function(myDoc) {

                    console.log(myDoc)
                    var size = Object.keys(myDoc).length;
                    res.header("searchQuestion", {accountName: currentUser, questionList: myDoc, size:size});




                });
            } finally {
                // Ensures that the client will close when you finish/error
                await client.close();
            }

        }
        run().catch(console.dir);



    });







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
