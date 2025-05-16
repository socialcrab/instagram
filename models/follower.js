var { instagramDb } = require('./appmodel');
var { Schema } = require('mongoose');

var followerSchema = new Schema({
    username: { type: String, required: true, index: true },
    profpicUrl: String,
    bio: String,
    age: Number,
    gender: String,
    category: Number,
    following: String,
    location: String,
    score: Number,
    noBio: Boolean,
    noFullname: Boolean,
    noProfilepic: Boolean,
    ffRatio: Boolean,
    lowPost: Boolean,
    hiFollowing: Boolean
},
{ timestamps: true }
);

var Follower = instagramDb.model('Follower', followerSchema);

module.exports = Follower;