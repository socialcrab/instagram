var { instagramDb } = require('./appmodel');
var { Schema } = require('mongoose');

var da_cacheSchema = new Schema({
    "insta_id": {type: String, required: true, unique: true},
    "insta_nickname": {type: String, required: true},
    "da_day_numb": {type: Number, required: false},
    "req_time": { type: Number, required: true },
    daData: [{}]
},
{
    timestamps: true
});

da_cacheSchema.pre('save', function(next) {
    this.updatedAt = Date.now();
    return next();
});

var DACache = instagramDb.model('DACache', da_cacheSchema, 'da_cache');

module.exports = DACache;