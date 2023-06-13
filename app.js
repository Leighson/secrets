require("dotenv").config();
const ejs = require("ejs");
const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
// const encrypt = require("mongoose-encryption");
// const md5 = require("md5");
const bcrypt = require("bcrypt");
const saltRounds = 10;

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

mongoConnect();

const userSchema = new mongoose.Schema({
    email: String,
    password: String
});

// userSchema.plugin(encrypt, {
//     secret: process.env.SECRET_KEY,
//     encryptedFields: ["password"] });

const User = new mongoose.model("User", userSchema);

// PAGES
app.get("/", (req, res) => {
    res.render("home");
});

app.route("/login")
    .get( async (req, res) => {
        res.render("login");
    })

    .post( async (req, res) => {

        const password = req.body.password;
        const foundUser = await User.findOne( {email: req.body.username} );

        if (foundUser) {
            console.log(foundUser.password);
            bcrypt.compare(password, foundUser.password, (err, result) => {
                if (result === true) {
                    res.render("secrets");
                } else {
                    console.log("Password incorrect!");
                    res.send("Password incorrect!");
                }
            });
        } else {
            console.log("User not found!");
            res.send("User not found!");
        }
    
    });

app.route("/register")

    .get(async (req, res) => {
        res.render("register");
    })

    .post(async (req, res) => {

        bcrypt.hash(req.body.password, saltRounds, (err, hash) => {
            const newUser = new User({
                email: req.body.username,
                password: hash
            });

            try {
                newUser.save();
            } catch(err) {
                console.log(err);
            } finally {
                console.log("New user saved!");
            }

            res.render("secrets");
        })

    });


// DEPLOYMENT
const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server started on port ${PORT}`);
});