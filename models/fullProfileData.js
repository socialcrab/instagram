var { instagramDb } = require('./appmodel');
var { Schema } = require('mongoose');

var fullProfileDataSchema = new Schema({
    userId: String,
    username: { type: String, required: true},
    name: String,
    profileImageUrl: String,
    profileLink: String,
    description: String,
    website: String,
    email: String,
    pronouns : Schema.Types.Mixed, 
    verified: Boolean,
    is_verified: Boolean,
    is_business_account: Boolean,
    is_private: Boolean,
    is_professional_account: Boolean,
    is_joined_recently: Boolean,
    category : Schema.Types.Mixed,
    userType: Schema.Types.Mixed,
    publicMetrics: Schema.Types.Mixed,
    keyMetrics: Schema.Types.Mixed,
    chartData: Schema.Types.Mixed,
    topPost: Schema.Types.Mixed,
    hasMore: { type: Boolean, default: false },
    missingHolePost: { type: Boolean, default: false },
    manuallyMarkedAsDoneAt: Date,
},
{ timestamps: true }
);
var FullProfileData = instagramDb.model('FullProfileData', fullProfileDataSchema, 'DataFullProfile');

module.exports = FullProfileData;