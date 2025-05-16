var { instagramDb } = require('./appmodel');
var { Schema } = require('mongoose');

var fullHashtagDataSchema = new Schema({
    id: String,
    hashtag: { type: String, required: true},
    hashtagLink: String,
    publicMetrics: Schema.Types.Mixed,
    keyMetrics: Schema.Types.Mixed,
    chartData: Schema.Types.Mixed,
    topPost: Schema.Types.Mixed,
    influencersReport: Schema.Types.Mixed,
    manuallyMarkedAsDoneAt: Date,
},
{ timestamps: true }
);
var FullHashtagData = instagramDb.model('FullHashtagData', fullHashtagDataSchema, 'FullHashtagData');

module.exports = FullHashtagData;