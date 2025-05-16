const moment = require("moment");
const s3Image = require("../../../helpers/putS3Images.js");
const Post = require("../../../models/post.js");
const logger = require("../../../helpers/logger.js");
const logQuery = require("./logQuery.js");
const {
  calcVideoEngagement,
  calcVideoImpression,
  calcVideoReach,
  getAudienceActivity,
  getAvgEngagementPerDay,
  getCommentPerDate,
  getContributors,
  getEngagementRatePerDay,
  getFollowerReachPerDay,
  getLikePerDate,
  getMostHashtags,
  getMostWords,
  getParticipations,
  getPotentialInfluencer,
  getReachPerDate,
  getTopEngagementContributor,
  getTopReachContributor,
  getTopVideoCountContributor,
  getVideoActivity,
  getVideoPerDate,
  getVideoPerDay,
  getViewPerDate,
  getViewPerDay,
  mapVideoInfo,
} = require("./partialHashtagCalculation.js");

	async function getListVideoFull(hashtag, dateFrom = null, dateTo = null){
		let searchParams = {
			hashtag: hashtag,
		};
	
		if (dateFrom && dateTo) {
			searchParams["createTime"] = {
				$gte: Number(dateFrom),
				$lte: Number(dateTo),
			};
		}
	
		return await Post.find(searchParams).limit(10000).exec();
	}

	async function processFullHashtag(hashtagInfo, limit){
		let dataVideo = await getListVideoFull(hashtagInfo.name);
		dataVideo.sort(function (a, b) {
		  return b.createTime - a.createTime;
		});

		  logger.info("calculating full hashtag", JSON.stringify(hashtagInfo.name));
		  const videos = await getListVideoFull(hashtagInfo.name);

		  //filter data post yang tidak memiliki detail follower
		  const filteredVideos = videos.filter(video => video.owner && video.owner.follower > 0);

		  const reportData = arrangeHashtagReport(hashtagInfo, filteredVideos);
		  return reportData;

	}

	function arrangeHashtagReport(hashtagInfo, videos){
	  return {
	  	id: hashtagInfo.id,
	    hashtag: hashtagInfo.name,
	    hashtagLink: "https://instagram.com/tag/" + hashtagInfo.name,
	    hashtagPict: hashtagInfo.profile_pic_url,

	    publicMetrics: {
	      postCount: hashtagInfo.media_count,
	    },

	    keyMetrics: getKeyMetrics(videos),
	    chartData: getChartData(videos),
	    influencersReport: getInfluencerReport(videos),
	    topPosts: getTopPostsReport(videos),
	  };
	};

	function getKeyMetrics (videos){
	  logger.info("getting key metrics");

	  const keyMetrics = {
	    analyzedVideoCount: 0,

	    totalComments: 0,
	    totalLikes: 0,
	    totalViews: 0,
	    totalEngagement: 0,

	    avgViews: 0,

	    contributors: 0,
	    followerImpression: 0,
	    followerReach: 0,
	  };

	  const contributors = {};

	  for (const video of videos) {
	    keyMetrics.analyzedVideoCount++;

	    keyMetrics.totalComments += video.commentCount;
	    keyMetrics.totalLikes += video.likeCount;
	    keyMetrics.totalViews += video.playCount;
	    keyMetrics.totalEngagement += video.likeCount + video.commentCount;

	    keyMetrics.avgViews = keyMetrics.totalViews / keyMetrics.analyzedVideoCount;

	    contributors[video.owner.username] = video.owner;
	    keyMetrics.followerImpression += video.owner.follower;
	  }

	  keyMetrics.contributors = Object.values(contributors).length;
	  keyMetrics.followerReach = Object.values(contributors).reduce(
	    (total, contributor) => total + contributor.follower,
	    0
	  );

	  return keyMetrics;
	};

	function getChartData (videos){
	  return {
	    postPerDates: getVideoPerDate(videos),
	    reachPerDates: getReachPerDate(videos),
	    commentPerDates: getCommentPerDate(videos),
	    likePerDates: getLikePerDate(videos),
	    viewPerDates: getViewPerDate(videos),

	    participations: getParticipations(videos),
	    mostWords: getMostWords(videos),
	    mostHashtags: getMostHashtags(videos),

	    postActivity: getVideoActivity(videos),
	    audienceActivity: getAudienceActivity(videos),

	    postPerDay: getVideoPerDay(videos),
	    viewPerDay: getViewPerDay(videos),
	    totalEngagementPerDay: getEngagementRatePerDay(videos),
	    avgEngagementPerDay: getAvgEngagementPerDay(videos),
	    totalFollowerReachPerDay: getFollowerReachPerDay(videos),
	  };
	};

	function getInfluencerReport (videos){
	  const contributors = getContributors(videos);
	  // console.log("contributors",contributors);

	  return {
	    potentialInfluencer: getPotentialInfluencer(contributors),
	    totalFollowerReach: getTopReachContributor(contributors),
	    totalEngagements: getTopEngagementContributor(contributors),
	    totalPost: getTopVideoCountContributor(contributors),
	  };
	};

	function getTopPostsReport(videos){
	  return {
	    mostViewed: videos
	      .sort((a, b) => b.playCount - a.playCount)
	      .map(mapVideoInfo),

	    mostLikes: videos
	      .sort((a, b) => b.likeCount - a.likeCount)
	      .map(mapVideoInfo),

	    mostCommented: videos
	      .sort((a, b) => b.commentCount - a.commentCount)
	      .map(mapVideoInfo),

	    highestEngagement: videos
	      .sort(
	        (a, b) => calcVideoEngagement(b) - calcVideoEngagement(a)
	      )
	      .map(mapVideoInfo),

	    highestFollowerReach: videos
	      .sort(
	        (a, b) =>
	          calcVideoReach(b, b.owner) -
	          calcVideoReach(a, b.owner)
	      )
	      .map(mapVideoInfo),

	    highestFollowerImpression: videos
	      .sort(
	        (a, b) => calcVideoImpression(b) - calcVideoImpression(a)
	      )
	      .map(mapVideoInfo),
	  };
	};



module.exports = {
	processFullHashtag,
	getListVideoFull,
	getInfluencerReport,
	getTopPostsReport
}


