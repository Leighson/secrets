require("dotenv").config();
const ejs = require("ejs");
const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const encrypt = require("mongoose-encryption");

const app = express();

app.use(express.static("public"));
app.use(bodyParser.urlencoded({ extended: true }));
app.set("view engine", "ejs");

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

const userSchema = new mongoose.Schema({
    email: String,
    password: String
});

userSchema.plugin(encrypt, {
    secret: process.env.SECRET_KEY,
    encryptedFields: ["password"] });

const User = new mongoose.model("User", userSchema);

// PAGES
app.get("/", (req, res) => {
    mongoConnect();
    res.render("home");
});

app.get("/login", (req, res) => {
    res.render("login");
});

app.post("/login", async (req, res) => {
    const username = req.body.username;
    const password = req.body.password;
    let foundUser;

    mongoConnect();
    try {
        foundUser = await User.findOne({email: username});
    } catch(err) {
        console.log(err);
    } finally {
        if (foundUser) {
            if (foundUser.password == password) {
                res.render("secrets");
            } else {
                res.send("Password incorrect!");
            }
        } else {
            res.send("User not found!");
        }
    }
});

app.route("/register")

    .get(async (req, res) => {
        res.render("register");
    })

    .post(async (req, res) => {
        const newUser = new User({
            email: req.body.username,
            password: req.body.password
        });

        try {
            await newUser.save();
        } catch(err) {
            console.log(err);
        } finally {
            console.log("New user saved!");
            res.render("secrets");
        }
    });


// DEPLOYMENT
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server started on port ${PORT}`);
});