const fake_ig = require("../models/fake_ig.js");
const loginCache = require("../models/loginCache.js");
const Sentry = require("@sentry/node");

async function getClone() {
    let igClone = await fake_ig.find({
        status: 1
    });
    let seed = new Date() % igClone.length;
    var data = {
        username: 'bunch.star',
        password: 'koro890'
    }
    return data;
}
async function getLoginCache() {
    try{
        let igCache = await loginCache.findOne(
                { 
                    retryCount: { $lte: 20 },
                    status: "igp" 
                }
            ).sort({ updatedAt: 1 });

        let statusCache = await loginCache.find(
            { 
                retryCount: { $lte: 20 },
                status: "igp" 
            }
            ).sort({ updatedAt: 1 });
        
        var data = {
            username: igCache.username,
            password: igCache.password,
            loginContext: igCache.loginContext,
            retryCount: igCache.retryCount,
            retryLogin: igCache.retryLogin ? igCache.retryLogin : 0,
        }

        if(data.retryCount >= 15){
            Sentry.captureMessage(`WARNING !! IG CLONE ${data.username} sudah di retry lebih dari 15 kali`, { level: "warning" });
        }

        if(statusCache.length <= 7){
            Sentry.captureMessage(`WARNING !! IG CLONE yang aktif tersisa kurang dari 7`, { level: "warning" });
        }

        return data;
    } catch(e) {
        console.log(e);
        Sentry.captureMessage("IG CLONE LOGIN HABIS !!");
        Sentry.captureException(e);
    }
}
async function updateRetryCount(data) {
    var total = data.retryCount + 1;
    var update = loginCache.updateOne({
        username: data.username,
        password: data.password,
    }, {
        $set: {
            retryCount: total
        }
    }, {
        upsert: true
    }, function(err, result) {
        if (err) console.log(err);
        console.log(`Update retryCount ${data.username} : ${total}x`);
        return result;
    });

    return update;
}

async function updateRetryLogin(data) {
    var total = data.retryLogin + 1;
    var update = loginCache.updateOne({
        username: data.username,
        password: data.password,
    }, {
        $set: {
            retryLogin: total
        }
    }, {
        upsert: true
    }, function(err, result) {
        if (err) console.log(err);
        console.log(`Update retryLogin ${data.username} : ${total}x`);
        return result;
    });

    return update;
}

async function updateRelogin(data) {
    var update = loginCache.updateOne({
        username: data.username,
        password: data.password,
    }, {
        $set: {
            status: "relogin"
        }
    }, {
        upsert: true
    }, function(err, result) {
        if (err) console.log(err);
        console.log(`status akun ${data.username} diubah menjadi RELOGIN`);
        return result;
    });

    return update;
}

module.exports = {
    getClone,
    getLoginCache,
    updateRetryCount,
    updateRetryLogin,
    updateRelogin
}
