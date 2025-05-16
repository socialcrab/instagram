var { instagramDb } = require('./appmodel');
var { Schema } = require('mongoose');

var list_proxySchema = new Schema({
    "proxy_str": {type: String, required: true, unique: true},
    "last_used": { type: Number, required: false }
},
{
    timestamps: true
});

var list_proxy = instagramDb.model('list_proxy', list_proxySchema, 'list_proxy');

module.exports = list_proxy;