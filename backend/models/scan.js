const mongoose = require("mongoose");

const scanSchema = new mongoose.Schema({
  url: String,
  score: Number,
  risk: String
},{ timestamps:true });

module.exports = mongoose.model("Scan", scanSchema);
