var { instagramDb } = require('../appmodel.js');
var { Schema } = require('mongoose');

var videoSchema = new Schema({
    uniqueId		: { type: String, required: true},
    id 				: String,
    text 			: String,
    createTime 		: Number,
    author          : String,
    authorId        : String,
    authorSecId     : String,
    authorStats     : Schema.Types.Mixed,
    avatarThumb     : String,
    nickname        : String,
    uniqueId 		: String,
    musicData       : Schema.Types.Mixed,
    covers  		: Schema.Types.Mixed,
    coversOrigin 	: Schema.Types.Mixed,
    coversDynamic 	: Schema.Types.Mixed,
    url 			: Schema.Types.Mixed,
    diggCount 		: Number,
    shareCount 		: Number,
    commentCount 	: Number,
    playCount       : Number,
    isActivityItem 	: String,
    hashtag         : { type: Schema.Types.Mixed, index: true },
},
{ timestamps: true }
);
var Video = instagramDb.model('Video', videoSchema, 'tiktokVideos');

module.exports = Video;
