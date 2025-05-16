var { instagramDb } = require("./appmodel");
var { Schema } = require('mongoose');

var logQuerySchema = new Schema(
  {
    query: String,
    email: String,
    mode: String,
    postCount: Number,
    status: Number,
    queue: Number,
    process: Number,
    finish: Number,
    engagement: Schema.Types.Mixed,
    refresh: Number,
  },
  { timestamps: true }
);
var logQuery = instagramDb.model(
  "logQueryInstagram",
  logQuerySchema,
  "apiLogQuery"
);

module.exports = logQuery;
