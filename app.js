require("dotenv").config();
const ejs = require("ejs");
const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const findOrCreate = require("mongoose-findorcreate");

const app = express();

app.use(express.static("public"));
app.use(bodyParser.urlencoded({ extended: true }));
app.set("view engine", "ejs");

app.use(session({
    secret: "Our little secret.",
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
    password: String,
    googleId: String,
    secret: String
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

const User = new mongoose.model("User", userSchema);

// use static authenticate method of model in LocalStrategy
passport.use(User.createStrategy());

// use static serialize and deserialize of model for passport session support
passport.serializeUser(function(user, cb) {
    process.nextTick(function() {
      cb(null, { id: user.id, username: user.username });
    });
  });
  
  passport.deserializeUser(function(user, cb) {
    process.nextTick(function() {
      return cb(null, user);
    });
  });

// implement Google Auth 2.0
passport.use(new GoogleStrategy({
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: "http://localhost:3000/auth/google/secrets",
        // userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
    },
    async (accessToken, refreshToken, profile, cb) => {
        console.log(profile);
        await User.findOrCreate({ googleId: profile.id }, (err, user) => {
            return cb(err, user);
        });
    }
));


// PAGES
app.get("/", (req, res) => {
    res.render("home");
});

app.get("/auth/google", 
    passport.authenticate("google", { scope: ["profile"] })
);

app.get("/auth/google/secrets",
    passport.authenticate("google", { failureRedirect: "/login" }),
    (req, res) => {
        console.log("Redirecting to secrets page...")
        res.redirect("/secrets");
    }
);

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

app.get("/secrets", async (req, res) => {
    // if (req.isAuthenticated()) {
    //     res.render("secrets");
    // } else {
    //     res.redirect("/login");
    // }
    try {
        const foundUsers = await User.find( { "secret": {$ne: null} } );
        res.render("secrets", {usersWithSecrets: foundUsers})
    } catch(err) {
         console.log(err);
    }
});

app.get("/submit", (req, res) => {
    if (req.isAuthenticated()) {
        res.render("submit");
    } else {
        res.redirect("/login");
    }
});

app.post("/submit", async (req, res) => {
    const submittedSecret = req.body.secret;

    try {
        const foundUser = await User.findById(req.user.id);
        if (foundUser) {
            foundUser.secret = submittedSecret;
            await foundUser.save();
            res.redirect("/secrets");
        }
    } catch(err) {
        console.log(err)
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