var { instagramDb } = require('./appmodel');
var { Schema } = require('mongoose');

var loginCacheSchema = new Schema({
    "username": { type: String, required: true },
    "password": { type: String, required: true },
    "loginContext": { type: Schema.Types.Mixed, required: true},
    "lastUsed": { type: Number, required: false },
    "status": { type: String, required: false },
    "retryCount": { type: Number, required: false },
    "retryLogin": { type: Number, required: false }
},
{
    timestamps: true
});

var loginCache = instagramDb.model('loginCache', loginCacheSchema, 'loginCache');

module.exports = loginCache;