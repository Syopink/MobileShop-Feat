// models/Training.js
const mongoose = require("mongoose");

const trainingSchema = new mongoose.Schema({
  question: String,
  answer: String,
});

const Training = mongoose.model("Training", trainingSchema);
module.exports = Training;
