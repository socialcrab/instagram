module.exports = function() {
    const Sentry = require("@sentry/node");
    const moment = require("moment");
    const Bull = require("bull");
    let request = require("request");
    const proxy = require("../../../helpers/proxyHelper");
    const igClones = require("../../../helpers/igClone");
    const Logger = require("../../../helpers/logger.js");
    const playwrightService = require("../../../helpers/playwright");
    const Post = require("../../../models/post");
    const fullProfile = require("../../../models/fullProfile.js");
    const previewProfile = require("../../../models/previewProfile.js");
    const config = require("../../../config/config.js");
    const INSTAGRAM_URL = config.scraper.BASE_URL;
    const USER_AGENT = config.scraper.CHROME_WIN_UA;
    const instagramQueue = new Bull("fullProfileIGQueueNew", {
        redis: config.redis,
    });
    const instagramQueuePreview = new Bull("previewHProfileIGQueueNew", {
        redis: config.redis,
    });
    const userAgent = require("../../../helpers/userAgentRotation.js");
    const helper = require("../../../helpers/helper.js");
    const { crawlFullProfile } = require("../data/crawlFullProfile.js");
    const logQuery = require("../data/logQuery.js");
    let timeout = config.timeout || 5000;
    instagramQueue.process(async function(job, callback) {
        // try {
            Logger.info(`start processing ${job.data.type} query : ${job.data.profile}`);
            var query = encodeURIComponent(job.data.profile).toLowerCase();
            var profile;
            var missingPost = false;
            //try to get data 1st page
            await logQuery.insertLogProcess(query, job.data.type);
            await logQuery.insertDetailLog({ 
                query: query,
                mode: job.data.type,
                detail: "Start Crawling & Open 1st Page",
                postCount: 0,
                postCountDB: 0,
                status: "processing"
              });

            // for (var i = 1; i < 4; i++) {
            //     profileData = await getProfileFirstPage(query, job.data.type, job.data.limit);
            //     if (profileData && profileData.result && profileData.meta == "exists"){
            //       if(profileData.postInstagram && profileData.postInstagram >= 1000){
            //         if(profileData.totalPostGetted > 800) {
            //             missingPost = false;
            //             break;
            //         } else {
            //             await logQuery.insertDetailLog({ 
            //                 query: query,
            //                 mode: job.data.type,
            //                 detail: "Missing post",
            //                 postCount: profileData.postInstagram,
            //                 postCountDB: profileData.totalPostGetted,
            //                 status: "error"
            //             });
            //             missingPost = true;
            //         }
            //       } else {
            //         var percentage = (profileData.totalPostGetted/profileData.postInstagram) * 100;
            //         if(percentage > 90){
            //             missingPost = false;
            //             break;
            //         } else {
            //             await logQuery.insertDetailLog({ 
            //                 query: query,
            //                 mode: job.data.type,
            //                 detail: "Missing post",
            //                 postCount: profileData.postInstagram,
            //                 postCountDB: profileData.totalPostGetted,
            //                 status: "error"
            //             });
            //             missingPost = true;
            //         }
            //       }
            //     } 
            //     Logger.warn(`Trying to process full crawling # ${job.data.profile} attempt : ${i}`);
            // }

            profileData = await getProfileFirstPage(query, job.data.type, job.data.limit);
            if (profileData && profileData.result && profileData.meta == "exists"){
                await logQuery.updateLogEngagement(profileData.result);
                await logQuery.insertLogFinish(query, profileData.result.availableVideo, job.data.type);
                await logQuery.insertDetailLog({ 
                    query: query,
                    mode: job.data.type,
                    detail: "Finish Calculating",
                    postCount: profileData.result.availableVideo,
                    postCountDB: profileData.result.totalUniquePost,
                    status: "finish"
                  });

                if(missingPost){
                    await fullProfile.updateOne({ username: query }, 
                        { $set: {
                            hasMore : missingPost
                        } }, 
                        {
                            new: true,
                            upsert: true,
                        });
                }

                var response = await triggerFinish(profileData.result, job.data.type);
                return callback(null, profileData.result);
            } else if (profileData == null || !profileData.result || profileData.meta != "exists"){
                var checkProfile = await fullProfile.findOne({ username: query}).lean().exec();
                    //check apakah pernah di simpan dalam DB dalam fullprofile
                    if(checkProfile){
                        //check apakah datanya lengkap
                        if(!checkProfile.averageAllByDay) {
                            await fullProfile.deleteOne({ username: query });
                            await triggerError(job.data.type, query, 0, profileData.meta);
                            return callback(null, null);
                        } 

                        //kalau pernah di simpan, maka di anggap bad-gateway
                        await triggerError(job.data.type, query, 4, "bad-gateway");
                        return callback(null, null);
                    } else if(profileData.meta == "not-found"){
                        //check apakah ada preview profile
                        var checkPreview = await previewProfile.findOne({ username: query}).lean().exec();
                        
                        //jika tidak ada preview dalam DB maka dianggap data nya kosong
                        if(!checkPreview) {
                            await triggerError(job.data.type, query, 0, profileData.meta);
                            return callback(null, null);
                        }

                        //kalau pernah di simpan, maka di anggap bad-gateway
                        await triggerError(job.data.type, query, 4, "bad-gateway");
                        return callback(null, null);
                    }

                    await triggerError(job.data.type, query, 0, profileData.meta);
                    return callback(null, null);
            }

        // } catch (e) {
        //     Sentry.captureException(e);
        //     Logger.err(e)
        //     return callback(null, null);
        // }
    });
    instagramQueue.on("completed", function(id, data) {
        Logger.info("Finish calculating");
        instagramQueue.clean(0);
    });

    async function getProfileFirstPage(profile, type, limit) {
        var limitPost = (type == "full-profile" ? limit : 6);
        try {
            var firstPage = await crawlFullProfile(profile, limitPost, type);
            if(firstPage == false) return null;

            return firstPage;
        } catch (err) {
            Sentry.captureException(err);
            Logger.err(`Error occurs at getProfileFirstPage Full: ${err}`);
            return { meta: "bad-gateway" };
        }
    }

    async function triggerFinish(data, type) {
        var profile = data.username;
        return new Promise(function(resolve) {
            request({
                url: `${config.url}/trigger/instagram/${type}/${profile}`,
                method: "GET",
                json: true, // <--Very important!!!
                body: {
                    query: profile,
                    analyze: type,
                }
            }, function(error, response, body) {
                if (error) {
                    Logger.err(`Error occurs at trigger finish queue profile: ${error}`);
                    resolve(error);
                } else if (response.statusCode == 200) {
                    Logger.info(`Finish crawling instagram`);
                    resolve(body);
                }
            });
        });
    }

    function wait_for_a_while(s) {
        return new Promise(function(resolve) {
            setTimeout(function() {
                Logger.info("wait for a while " + s);
                resolve("resolve");
            }, s);
        });
    }

    function isJson(str) {
        try {
            JSON.parse(str);
        } catch (e) {
            return false;
        }
        return true;
    }

    function triggerError(analyze, query, trigger, message) {
        let profile = query;
        request({
            url: `${config.url}/trigger/queryInstagram/${analyze}/${profile}/${trigger}`,
            method: "GET",
            json: true, // <--Very important!!!
            body: {
                message: message,
            }
        }, function(error, response, body) {
            if (error) {
                Logger.err(`Error occurs at trigger finish controller profile: ${error}`);
            } else if (response.statusCode == 200) {
                Logger.info("Finish crawling instagram profile");
            }
        });
    }
};
