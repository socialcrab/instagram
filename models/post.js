var { instagramDb } = require("./appmodel");
var { Schema } = require('mongoose');

var postSchema = new Schema(
  {
    id: { type: String, required: true },
    caption: String,
    createTime: Number,
    authorId: String,
    username: Schema.Types.Mixed,
    hashtag: Schema.Types.Mixed,
    isVideo: Boolean,
    isAd: String,
    commentCount: Number,
    likeCount: Number,
    playCount: Number,
    covers: Schema.Types.Mixed,
    coversOrigin: Schema.Types.Mixed,
    coversDynamic: Schema.Types.Mixed,
    location: Schema.Types.Mixed,
    tagged: Schema.Types.Mixed,
    comment: Schema.Types.Mixed,
    musicInfo: Schema.Types.Mixed,
    owner: Schema.Types.Mixed,
    ownerProfPic: Schema.Types.Mixed,
    coAuthorProducers: Schema.Types.Mixed,
    productType: String,
    shortcode: {type: String, required: true, unique: true},
    videoDuration: Number,
    mediaPreview: String
  },
  { timestamps: true }
);
var Post = instagramDb.model("Post", postSchema, "apiPost");

module.exports = Post;
