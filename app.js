require("dotenv").config();
const ejs = require("ejs");
const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");

const app = express();

app.use(express.static("public"));
app.use(bodyParser.urlencoded({ extended: true }));
app.set("view engine", "ejs");

app.use(session({
    secret: "Out little secret.",
    resave: false,
    saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

// MONGODB CONNECTION
async function mongoConnect() {
    const URI = "mongodb+srv://origin.howe4yr.mongodb.net/";
    const SERVER_USERID = process.env.ORIGIN_USERID;
    const SERVER_KEY = process.env.ORIGIN_KEY;
    const DATABASE = "userDB";

    try {
        await mongoose.connect(URI, {
            user: SERVER_USERID,
            pass: SERVER_KEY,
            dbName: DATABASE
        });
    } catch(err) {
        console.log(err);
    } finally {
        console.log(`Successfully connected to database: ${DATABASE}`)
    }
};

mongoConnect();

// SCHEMAS and INIT SESSIONS
const userSchema = new mongoose.Schema({
    email: String,
    password: String
});

userSchema.plugin(passportLocalMongoose);

const User = new mongoose.model("User", userSchema);

// use static authenticate method of model in LocalStrategy
passport.use(User.createStrategy());

// use static serialize and deserialize of model for passport session support
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

// PAGES
app.get("/", (req, res) => {
    res.render("home");
});

app.route("/login")
    .get( async (req, res) => {
        res.render("login");
    })

    .post( async (req, res) => {

        const user = new User({
            username: req.body.username,
            password: req.body.password
        });

        req.login(user, (err) => {
            if (err) {
                console.log(err);
            } else {
                passport.authenticate("local")(req, res, () => {
                    res.redirect("/secrets");
                });
            }
        });
    
    });

app.get("/secrets", (req, res) => {
    if (req.isAuthenticated()) {
        res.render("secrets");
    } else {
        res.redirect("/login");
    }
});

app.get("/logout", (req, res) => {
    req.logout( () => {
        res.redirect("/");
    });
});

app.route("/register")

    .get(async (req, res) => {
        res.render("register");
    })

    .post(async (req, res) => {

        User.register({username: req.body.username}, req.body.password, (err) => {
            if (err) {
                console.log(err);
                res.redirect("/register");
            } else {
                passport.authenticate("local")(req, res, () => {
                    res.redirect("/secrets");
                });
            }

        });

    });


// DEPLOYMENT
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server started on port ${PORT}`);
});