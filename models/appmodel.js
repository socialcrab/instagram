var mongoose = require('mongoose');
var config = require('../config/config.js');

const appDb = mongoose.createConnection(config.database.app, { 
    promiseLibrary: global.Promise,
    useNewUrlParser: true,
    useUnifiedTopology: true
});

const instagramDb = mongoose.createConnection(config.database.instagram, { 
    promiseLibrary: global.Promise,
    useNewUrlParser: true,
    useUnifiedTopology: true
});


appDb.set('useCreateIndex', true);
instagramDb.set('useCreateIndex', true);

module.exports = { appDb, instagramDb };