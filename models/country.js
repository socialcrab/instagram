var { instagramDb } = require('./appmodel');
var { Schema } = require('mongoose');

var countrySchema = new Schema({
    country_name: { type: String, required: true, unique: true },
    phone_code: { type: Number, required: true },
    cities: [ { type: mongoose.Schema.Types.Mixed } ]
},
{
    timestamps: true
});

var Country = instagramDb.model('Country', countrySchema);

module.exports = Country;