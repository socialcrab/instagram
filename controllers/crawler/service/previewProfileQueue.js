module.exports = function() {
    const Sentry = require("@sentry/node");
    const Bull = require("bull");
    let request = require("request");
    const config = require("../../../config/config.js");
    const Logger = require("../../../helpers/logger.js");
    const { crawlPreviewProfile } = require("../data/crawlPreviewProfile.js");
    const logQuery = require("../data/logQuery.js");
    let instagramQueuePreview;
    let maxRetryPreview = 5;
    if (config.worker.includes("guest"))
        instagramQueuePreview = new Bull("guestProfileIGQueueNew", {
            redis: config.redis,
        });
    else 
        instagramQueuePreview = new Bull("previewProfileIGQueueNew", {
            redis: config.redis,
        });
    instagramQueuePreview.process(async function(job, callback) {
        try {
            Logger.info(`start processing ${job.data.type} query : ${job.data.profile}`);
            job.data.type = "preview-profile";
            let query = encodeURIComponent(job.data.profile);
            let loop;
            //try to get data 1st page
            logQuery.insertLogProcess(query, job.data.type);
            for (loop = 1; loop < maxRetryPreview; loop++) {
                profileData = await getProfileFirstPage(query, job.data.type, job.data.limit);
                if (profileData && profileData.result && profileData.meta == "exists") break;
                Logger.warn(`Trying to process full crawling # ${job.data.profile} attempt : ${loop}`);
            }

            if (profileData == null || !profileData.result || profileData.meta != "exists"){
                if(loop == maxRetryPreview && profileData.meta == "not-found") profileData.meta = "unknown-error";
                Logger.err(`Getting Error from crawler with info meta : ${profileData.meta}`);
                await triggerError(job.data.type, query, 0, profileData.meta);
                return callback(null, null);
            }

            await triggerFinish(profileData.result, job.data.type);
            logQuery.insertLogFinish(query, profileData.result.availableVideo, job.data.type);
            return callback(null, profileData.result.username);
        } catch (e) {
            Sentry.captureException(e);
            Logger.err(e)
            return callback(null, null);
        }
    });
    instagramQueuePreview.on("completed", function(id, data) {
        Logger.info("Finish calculating", data);
        instagramQueuePreview.clean(0);
    });

    async function getProfileFirstPage(profile, type, limit) {
        let limitPost = (type == "full-profile" ? limit : 12);
        try {
            let firstPage = await crawlPreviewProfile(profile, limitPost, type);
            if(firstPage == null) return { meta: "unknown-error" };

            return firstPage;
        } catch (err) {
            Sentry.captureException(err);
            Logger.err(`Error occurs at getProfileFirstPage Full: ${err}`);
            return { meta: "unknown-error" };
        }
    }

    async function triggerFinish(data, type) {
        var profile = encodeURIComponent(data.username).toLowerCase();
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
                    resolve(response);
                }
            });
        });
    }

    function triggerError(analyze, query, trigger, message) {
        let profile = encodeURIComponent(query).toLowerCase();
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
