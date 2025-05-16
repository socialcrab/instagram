const moment = require("moment");
const logQuery = require("../../../models/logQuery.js");
const detailLogQuery = require("../../../models/detailLogQuery.js");
const datePickProfile = require("../../../models/datePickProfile.js");
const Logger = require("../../../helpers/logger.js");

module.exports = {
  insertLogQueue,
  insertLogProcess,
  insertLogFinish,
  insertDetailLog,
  updateLogEngagement,
  isValid
};

async function insertDetailLog(data) {
  let insert = { 
              query: data.query,
              mode: data.mode,
              detail: data.detail,
              postCount: data.postCount,
              postCountDB: data.postCountDB,
              status: data.status
            }

  const logQuery = new detailLogQuery(insert);
  await logQuery.save(function (err) {
    if (err) return false;
    // saved!
  });
  return true;
}

async function insertLogQueue(query, type) {
  let condition = { query: encodeURIComponent(query).toLowerCase(), mode: type, status: 2 }
  let upsert = { multi: true }

  await logQuery.updateMany(
    condition,
    { $set: { queue: +moment() } 
	},
    upsert,
    function (err) {
      if (err) Logger.err(err);
    }
  );
  return true;
}

async function insertLogProcess(query, type) {
  let condition = { query: encodeURIComponent(query).toLowerCase(), mode: type, status: 2}
  let upsert = { multi: true }

  await logQuery.updateMany(
    condition,
    { $set: 
      { 
        process: +moment(), 
      } 
	},
    upsert,
    function (err) {
      if (err) Logger.err(err);
    }
  );
  return true;
}

async function updateLogEngagement(profileData) {
	Logger.info(`updating engagement of ${profileData.username}`);
	return await logQuery.updateMany(
		{
			query: encodeURIComponent(profileData.username).toLowerCase(),
			mode: "full-profile",
		},
		{
			$set: {
				engagement: {
					profpic: profileData.profpic,
					followers: profileData.followers,
					following: profileData.following,
					totalPost: profileData.totalUniquePost,
					totalLike: profileData.totalLike,
					totalComment: profileData.totalComment,
					totalVideoView: profileData.totalView,
					likeRate: profileData.likeRate,
					commentRate: profileData.commentRate,
					engagementRate: profileData.engagementRate,
					lastUpdateOn: new Date(),
				},
			},
		}
	);
}

async function insertLogFinish(query, postCount, type) {
  let condition = { query: query, mode: type, status: 2 };
  let upsert = { multi: true };
  
  await logQuery.updateMany(
    condition,
    { $set: { 
        status: 1,
        finish: +moment(),
        refresh: 0,
        postCount: postCount 
      } 
	},
    upsert,
    function (err) {
      if (err) Logger.err(err);
    }
  );

  await datePickProfile.deleteMany({ username: query }, function (err) {
    if (err) return false;
    // deleted
  });
  return true;
}

async function isValid(query){
  let wasteQuery = await logQuery.findOne({query:query,email:"xxxaaa"}).exec();
  let valid = wasteQuery ? false : true;
  return valid;
}
