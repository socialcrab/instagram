var { instagramDb } = require("./appmodel");
var { Schema } = require('mongoose');

var specialCharSchema = new Schema(
  {
    unicode: { type: String, required: true },
    character: String,
    utf8: String,
    name: String,
    country: String,
  },
  { timestamps: true }
);
var specialChar = instagramDb.model("specialChar", specialCharSchema, "specialChar");

module.exports = specialChar;
