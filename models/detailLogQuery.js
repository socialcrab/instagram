var { instagramDb } = require('./appmodel');
var { Schema } = require('mongoose');

var detalLogQuerySchema = new Schema(
  {
    email: String,
    query: String,
    mode: String,
    postCount: Number,
    postCountDB: Number,
    status: String,
    detail: String,
  },
  { timestamps: true }
);
var detailLogQuery = instagramDb.model(
  "apiDetailLogQuery",
  detalLogQuerySchema,
  "apiDetailLogQuery",
);

module.exports = detailLogQuery;
