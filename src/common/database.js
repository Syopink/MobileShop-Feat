const mongoose = require("mongoose");
require("dotenv").config();

module.exports = () => {
  mongoose
    .connect(
      process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/vp_shop_project"
    )
    .then(() => console.log("Connected to MongoDB Atlas!"))
    .catch((err) => console.error("MongoDB connection error:", err));
  return mongoose;
};
