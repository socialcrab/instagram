var { instagramDb } = require("../appmodel.js");
var { Schema } = require('mongoose');

var fullprofileSchema = new Schema(
  {
    uniqueId: { type: String, required: true, unique: true },
    secUid: { type: String, required: true },
    userId: { type: String, required: true },
    nickName: { type: String, required: true },
    signature: { type: String },
    covers: { type: [String] },
    verified: { type: Boolean, required: true, default: false },

    following: { type: Number, required: true },
    fans: { type: Number, required: true },

    totalVideoFromTiktok: { type: Number, required: true },
    availableVideo: { type: Number, required: true },

    heart: { type: Number, required: true },
    digg: { type: Number, required: true },
    totalLike: { type: Number, required: true },
    totalComment: { type: Number, required: true },
    totalShare: { type: Number, required: true },
    totalView: { type: Number, required: true },

    likeRate: { type: Number, required: true },
    commentRate: { type: Number, required: true },
    shareRate: { type: Number, required: true },
    viewRate: { type: Number, required: true },
    engagementRate: { type: Number, required: true },

    likePerPost: { type: Number, required: true },
    commentPerPost: { type: Number, required: true },
    engagementPerPost: { type: Number, required: true },

    postPerDay: { type: Number, required: true },
    postPerWeek: { type: Number, required: true },
    postPerMonth: { type: Number, required: true },

    mostWord: { type: Schema.Types.Mixed, required: true },
    mostTag: { type: Schema.Types.Mixed, required: true },
    mostMention: { type: Schema.Types.Mixed, required: true },
    mostUsedMusic: { type: Schema.Types.Mixed, required: true },

    likeByDate: { type: Number, required: true },
    commentByDate: { type: Number, required: true },
    viewByDate: { type: Number, required: true },
    postByDate: { type: Number, required: true },

    postByDay: { type: Schema.Types.Mixed, required: true },
    viewByDay: { type: Schema.Types.Mixed, required: true },
    engByDay: { type: Schema.Types.Mixed, required: true },
    engRateByDay: { type: Schema.Types.Mixed, required: true },
    sumAllByDay: { type: Schema.Types.Mixed, required: true },

    postHeatMap: { type: Number, required: true },
    engHeatMap: { type: Number, required: true },

    topPost: { type: Schema.Types.Mixed, required: true },

    captchaExists: { type: Boolean },
    hasMore: { type: Boolean },

    createdAt: Date,
    updatedAt: Date,

    manuallyMarkedAsDoneAt: Date,
  },
  { timestamps: true }
);
var Fullprofile = instagramDb.model(
  "full-profile-tiktok",
  fullprofileSchema,
  "tiktokProfiles"
);

module.exports = Fullprofile;
