const moment = require("moment");
const Sentry = require("@sentry/node");
const fullProfile = require("../../models/fullProfile");
const previewProfile = require("../../models/previewProfile");
const datePickProfile = require("../../models/datePickProfile.js");
const config = require("../../config/config.js");
const parser = require("./data/parser");
const parserNew = require("./data/fullProfileParser");
const logQuery = require("./data/logQuery.js");
const USER_AGENT = config.scraper.CHROME_WIN_UA;
let request = require("request");
const Bull = require("bull");
const Logger = require("../../helpers/logger.js");
const INSTAGRAM_URL = config.scraper.BASE_URL;

const instagramQueue = new Bull("fullProfileIGQueueNew", {
    redis: config.redis
});
const instagramQueuePreview = new Bull("previewProfileIGQueueNew", {
    redis: config.redis
});
const instagramQueueGuest = new Bull("guestProfileIGQueueNew", {
    redis: config.redis
});
const instagramQueueRefresh = new Bull("refreshFullProfileIGQueueNew", {
    redis: config.redis
});

const apiResponse = require("../../helpers/helper.js");
const helper = require("../../helpers/helper.js");
const proxy = require("../../helpers/proxyHelper");
const userAgent = require("../../helpers/userAgentRotation.js");
let queueBalanceLimit = config.queueBalanceLimit || 20;
module.exports = {
    getIndex,
    getIndexPreview
};

async function addIGFullProfileQueue (data){
    const job = await instagramQueue.add(data, 
        { 
            jobId: `${data.profile}|${data.limit}`,
            priority: data.priority
        });
    if (await job.isFailed()) await job.retry();
};

async function addIGPreviewProfileQueue (data, type){
    if (type === "preview-profile"){
        const job = await instagramQueuePreview.add(data, 
            { 
                jobId: `${data.profile}|${data.limit}`,
                priority: data.priority
            });
        if (await job.isFailed()) await job.retry();
    } else {
        const job = await instagramQueueGuest.add(data, 
            { 
                jobId: `${data.profile}|${data.limit}`,
                priority: data.priority
            });
        if (await job.isFailed()) await job.retry();
    }
};

async function addIGFullProfileQueueRefresh (data){
    const job = await instagramQueueRefresh.add(data, 
        { 
            jobId: `${data.profile}|${data.limit}`,
            priority: data.priority
        });
    if (await job.isFailed()) await job.retry();
};

async function init(profile, type, limit, refresh, priority) {
    try {
        let pushFlag = true;
        let currentRefreshQueue = await instagramQueueRefresh.getJobs();
        let currentFullQueue = await instagramQueue.getJobs();
        let queueDifference = currentRefreshQueue.length - currentFullQueue.length;
        let jobs;
        if (type === "full-profile") {
            jobs = currentFullQueue;
            refresh = false;
        } else if (type === "preview-profile") {
            jobs = await instagramQueuePreview.getJobs();
        } else return;
        if (queueDifference > queueBalanceLimit){
            jobs = currentFullQueue;
            refresh = false;
        }

        if (!jobs.length || jobs.length === 0) {
            await pushItem(type, profile, limit, refresh, priority);
            logQuery.insertLogQueue(profile, type);
        } else {
            for (let job of jobs) {
                if (job && job.data && profile === job.data.profile) pushFlag = false;
            }
            if (pushFlag) {
                await pushItem(type, profile, limit, refresh, priority);
                logQuery.insertLogQueue(profile, type);
            }
        }
        return;
    } catch (err) {
        Logger.err(e);
        Sentry.captureException(e);
    }
}

async function pushItem(type, profile, limit, refresh, priority) {
    var data = {
        profile: profile,
        type: type,
        limit: limit,
        priority: priority
    }
    if (type === "full-profile" && refresh === false) {
        await addIGFullProfileQueue(data).then(function(job) {
            Logger.info("masuk queue full-profile");
            return;
        }).catch(function(err) {
            Logger.err(err);
            return;
        });
    } else if (type === "full-profile" && refresh === true) {
        await addIGFullProfileQueueRefresh(data).then(function(job) {
            Logger.info("masuk queue refresh full-profile");
            return;
        }).catch(function(err) {
            Logger.err(err);
            return;
        });
    } else {
        await addIGPreviewProfileQueue(data,type).then(function(job) {
            Logger.info("masuk queue preview");
            return;
        }).catch(function(err) {
            Logger.err(err);
            return;
        });
    }
}
async function getIndex(req, res) {
    // try {
    console.log(req.params.username);
        let profile = req.params.username;
        let body = req.query;
        let dateFrom = req.query.dateFrom;
        let dateTo = req.query.dateTo;
        let refresh = req.query.refresh == 1 ? true : false;
        let limit = req.query.limit ? req.query.limit : 100;
        let priority = req.query.priority ? req.query.priority : 1;
        let needToRecalculate = false;

        if (refresh) {
            logQuery.insertDetailLog({ 
                query: profile,
                mode: "full-profile",
                detail: "Start refresh and Update data with limit "+limit,
                postCount: 0,
                postCountDB: 0,
                status: "refresh"
              });
            init(profile, "full-profile", limit, refresh, priority);
            return res.json({
                crawling: 1,
            });
        }
        fullProfile.findOne({
            username: encodeURIComponent(profile).toLowerCase()
        }, {
            _id: false,
            __v: false,
            createdAt: false
        }, async function(err, result) {
            if (!result || !result.averageAllByDay) {
                if (result && !result.averageAllByDay) needToRecalculate = true;
                init(profile, "full-profile", limit, refresh, priority);
                return res.json({
                    crawling: 1,
                });
            } else {
                let data = result.toObject();
                if (data && dateFrom && dateTo) {
                    logQuery.insertDetailLog({
                        query: profile,
                        mode: "full-profile",
                        detail: "Get Datepicker Data From" + dateFrom + " To " + dateTo,
                        postCount: 0,
                        postCountDB: 0,
                        status: "datepicker"
                    });
                    let checkDatepicker = await parser.getDatepickerData(
                        profile,
                        dateFrom,
                        dateTo
                    );
                    if(checkDatepicker){
                      if(moment().diff(moment(checkDatepicker.updatedAt), "minutes") > 3){
                        let listVideoByDate = await parserNew.getListVideoFull(
                          profile,
                          dateFrom,
                          dateTo
                        );
        
                        let fullProfile = await parserNew.processFullProfileDatePicker(data, profile, listVideoByDate, "full-profile", dateFrom, dateTo);
                        let resultDate = await saveDataDatepicker(fullProfile);
                        if(resultDate.totalUniquePost < 1){
                          triggerFinishDatePicker(profile, dateFrom, dateTo, 0);
                        } else {
                          triggerFinishDatePicker(profile, dateFrom, dateTo, 1);
                        }
                        
                        return res.json(fullProfile);
                      } else {
                        triggerFinishDatePicker(profile, dateFrom, dateTo, 1);
                      }
                    } else {
                        let listVideoByDate = await parserNew.getListVideoFull(
                            profile,
                            dateFrom,
                            dateTo
                        );
        
                      let fullProfile = await parserNew.processFullProfileDatePicker(data, profile, listVideoByDate, "full-profile", dateFrom, dateTo);    
                      let resultDate = await saveDataDatepicker(fullProfile);
                      if(resultDate.totalUniquePost < 1){
                        await triggerFinishDatePicker(profile, dateFrom, dateTo, 0);
                      } else {
                        await triggerFinishDatePicker(profile, dateFrom, dateTo, 1);
                      }
                      
                      return res.json(fullProfile);
                    }
                }
                const recentPost = data.topPost.mostRecent[0];
                data.updateData = recentPost ? (moment().diff(moment(recentPost.createTime * 1000), 'mintues') > config.cacheAge) : false;
                triggerFinish("full-profile", profile, 1, "success");
                return res.json(data);
            }
        });
    // } catch (e) {
    //     Logger.err(e);
    //     Sentry.captureException(e);
    // }
}
async function getIndexPreview(req, res) {
    try {
        let profile = req.params.username;
        let dateFrom = req.query.dateFrom;
        let dateTo = req.query.dateTo;
        let refresh = req.query.refresh ? true : false;
        let limit = req.query.limit ? req.query.limit : 12;
        let needToRecalculate = false;
        let priority = req.query.priority ? req.query.priority : 1;
        let validQuery = await logQuery.isValid(profile);
        if (!validQuery)
            return res.json({
                crawling: 1,
            });
        previewProfile.findOne({
            username: encodeURIComponent(profile).toLowerCase()
        }, {
            _id: false,
            __v: false,
            createdAt: false
        }, async function(err, result) {
            if (!result || !result.averageAllByDay || !result.engagementRate || !result.totalUniquePost) {
                if (result && !result.averageAllByDay) needToRecalculate = true;
                init(profile, "preview-profile", limit, refresh, priority);
                return res.json({
                    crawling: 1,
                });
            } else {
                let data = result.toObject();
                if (refresh) {
                    logQuery.insertDetailLog({ 
                        query: profile,
                        mode: "preview-profile",
                        detail: "Start refresh and Update data with limit "+limit,
                        postCount: 0,
                        postCountDB: 0,
                        status: "refresh"
                      });
                    init(profile, "preview-profile", limit, refresh, priority);
                    return res.json(data);
                }
                if (moment().diff(moment(result.updatedAt), "minutes") > config.cacheAge) {
                    triggerFinish("preview-profile", profile, 1, "success");
                    data.updateData = true;
                    return res.json(data);
                } else {
                    triggerFinish("preview-profile", profile, 1, "success");
                    data.updateData = false;
                    Logger.info("cached ", profile);
                    return res.json(data);
                }
            }
        });
    } catch (e) {
        Logger.err(e);
        Sentry.captureException(e);
    }
}

function triggerFinish(analyze, query, trigger, message){
  let profile = encodeURIComponent(query).toLowerCase();
  request(
    {
      url: `${config.url}/trigger/Instagram/${analyze}/${profile}/${trigger}`,
      method: "GET",
      json: true, // <--Very important!!!
      body: {
        message: message,
      }
    },
    function (error, response, body) {
      if (error) {
        Logger.err(
          `Error occurs at trigger finish controller profile: ${error}`
        );
      } else if (response.statusCode == 200) {
        Logger.info("Finish crawling instagram full profile");
      }
    }
  );
}

async function saveDataDatepicker(data) {
    return new Promise(function (resolve) {
      datePickProfile.updateOne(
        { username: data.username, dateFrom: data.dateFrom, dateTo: data.dateTo},
        { $set: data },
        { upsert: true },
        async function (err, result) {
          if (err) {
            Sentry.captureException(err);
            Logger.err(err);
          } else {
            Logger.info("Data datepicker @" + data.username + " saved");
            return resolve(data);
          }
        }
      );
    });
  }

  function triggerFinishDatePicker(username, dateFrom, dateTo, status){
    request(
      {
        url: `${config.url}/trigger/instagram/datepicker/${username}/${dateFrom}/${dateTo}`,
        method: "GET",
        json: true, // <--Very important!!!
        body: {
          query: username,
          analyze: "profile",
          status: status
        }
      },
      function (error, response, body) {
        if (error) {
          Sentry.captureException(error);
          Logger.err(
            `Error occurs at calculating datepicker : ${error}`
          );
        } else if (response.statusCode == 200) {
          Logger.info("Finish calculating datepicker @" + username);
        }
      }
    );
  }

// const {
// 	saveJsonToFile,
// } = require("../../helpers/playwright");

// module.exports = {
// 	getIndex: async (req, res) => {
// 		const query = req.params.username;

// 		let context;
// 		let page;

// 		try {
// 			context = await global.browser.newContext({
// 				storageState: "playwright.json",
// 			});
// 			page = await context.newPage();

// 			let i = 1;
// 			page.on("response", async (response) => {
// 				const request = response.request();
// 				if (
// 					request
// 						.url()
// 						.includes(
// 							`https://i.instagram.com/api/v1/tags/web_info/?tag_name=${query}`
// 						)
// 				) {
// 					const json = await response.json();
// 					Logger.info(`got initial data ${json.data.recent.sections.length}`)
// 					saveJsonToFile(json, query);
// 				} else if (
// 					request
// 						.url()
// 						.includes(`https://i.instagram.com/api/v1/tags/minecraft/sections/`)
// 				) {
// 					const json = await response.json();
// 					Logger.info(`got another ${json.sections.length}`)
// 					saveJsonToFile(json, query + i++);
// 				}
// 			});

// 			let tryCount = 0;
// 			let valid = false;
// 			while (!valid && tryCount < 5) {
// 				try {
// 					await page.goto("https://www.instagram.com/explore/tags/" + query);
// 					await page.waitForResponse(
// 						`https://i.instagram.com/api/v1/tags/web_info/?tag_name=${query}`
// 					);
// 					await page.waitForTimeout(5000);
// 					valid = true;
// 				} catch (error) {
// 					Logger.err('error on opening page', error.message);
// 					valid = false;
// 					tryCount++;
// 				}
// 			}

// 			await page.evaluate(async () => {
// 				return await new Promise((resolve) => {
// 					let totalHeight = 0;
// 					let distance = 100;

// 					let interval = setInterval(() => {
// 						let scrollHeight = document.body.scrollHeight;
// 						window.scrollBy(0, distance);
// 						totalHeight += distance;

// 						if (totalHeight >= scrollHeight) {
// 							clearInterval(interval);
// 							resolve();
// 						}
// 					}, 500);
// 				});
// 			});

// 			await page.waitForTimeout(5000);
// 			await page.close();
// 			await context.close();

// 			return res.json({ message: "done ?" });
// 		} catch (error) {
// 			Logger.err('error on getIndex', error)
// 			return res.status(500).json({ error: error.getMessage() });
// 		}
// 	},
// };
