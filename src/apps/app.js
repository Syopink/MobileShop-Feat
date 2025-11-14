require("dotenv").config();
const express = require("express");
const app = express();
const config = require("config");
const session = require("express-session");
const { populate } = require("./models/product");
const cookieParser = require("cookie-parser");
const chatbotRoute = require("../routers/chatbot");
const MongoStore = require("connect-mongo");

require("../common/passport");
app.use(cookieParser());
app.use(express.urlencoded({ extended: true }));
app.use("/static", express.static(config.get("app.static_folder")));
app.use(express.json());
app.set("views", config.get("app.views_folder"));
app.set("view engine", config.get("app.view_engine"));
app.use("/api/chatbot", chatbotRoute);

app.set("trust proxy", 1); // trust first proxy

app.use(
  session({
    secret: config.get("app.session_key"),
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl: process.env.MONGODB_URI,
    }),
    cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 },
  })
);

app.use(require(`${__dirname}/middlewares/cart`)); // chưa config đường dẫn vào file config
app.use(require(`${__dirname}/middlewares/share`)); // chưa config đường dẫn vào file config

app.use(require(`${__dirname}/../routers/web`)); // chua congif
module.exports = app;
