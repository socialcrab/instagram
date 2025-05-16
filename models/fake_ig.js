var { instagramDb } = require('./appmodel');
var { Schema } = require('mongoose');

var fake_igSchema = new Schema({
    "username": {type: String, required: true, unique: true},
    "password": {type: String, required: true},
    "last_used": { type: Number, required: false },
    "trial_counter": { type: Number, required: false },
    "last_try": { type: Date, required: false },
    "session_string": {type: String, required: false},
    "status": Number
},
{
    timestamps: true
});

var fake_ig = instagramDb.model('fake_ig', fake_igSchema, 'fake_ig');

module.exports = fake_ig;