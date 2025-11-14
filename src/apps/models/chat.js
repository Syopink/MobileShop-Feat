// models/Chat.js
const mongoose = require("mongoose");

const chatSchema = new mongoose.Schema({
  userId: String,
  message: String,
  reply: String,
  createdAt: { type: Date, default: Date.now },
});

const Chat = mongoose.model("Chat", chatSchema);
module.exports = Chat;
