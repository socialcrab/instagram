var { appDb } = require("./appmodel");
var { Schema } = require('mongoose');

var historiesSchema = new Schema(
  {
    key: {type: String, required: true, unique: true},
    email: String,
    service: String,
    query: String,
    postCount: Number,
    postCrawl: Number,
    startDate: Date,
    endDate: Date,
    status: String,
    statusLog: Schema.Types.Mixed,
    engagement: Schema.Types.Mixed,
    refresh: Boolean,
  },
  { timestamps: true }
);
var history = appDb.model(
  "histories",
  historiesSchema,
  "histories"
);

module.exports = history;