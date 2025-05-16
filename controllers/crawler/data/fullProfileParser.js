const moment = require("moment");
const s3Image = require("../../../helpers/putS3Images.js");
const Post = require("../../../models/post.js");
const Logger = require("../../../helpers/logger.js");
const logQuery = require("./logQuery.js");
const Parsing = require("./partialCalculation.js");

module.exports = {
	processNewFullProfile: async (user, username, limit, typeData) => {
		let dataVideo = await getListVideoFull(username);
		dataVideo.sort(function (a, b) {
		  return b.createTime - a.createTime;
		});

		console.log('body post parser', user);
		try {
			let urlImage;
			if (user.profile_pic_url || user.profile_pic_url !== "") {
				urlImage = await s3Image.copyImageToOSS(user.profile_pic_url, 'profilePicture', user.id);
				console.log(urlImage);
			}

			let data = {};
			let totalLike = 0;
			let totalComment = 0;
			let totalView = 0;

			let totalPost = dataVideo.length;
			if (limit === 1000 && dataVideo.length > 1000)
				totalPost = 1000;
			if (limit !== 1000 && dataVideo.length > 5000)
				totalPost = 5000;
			if (typeData === "preview-profile" && dataVideo.length > 12)
				totalPost = 12;
			dataVideo.length = totalPost; //cut data video elements to the specified total post limit
			
			for (let video of dataVideo) {
				if (video) {
					Logger.info("Handling video data " + video.shortcode);
					totalLike += video.likeCount ?? 0;
					totalComment += video.commentCount ?? 0;
					if (video.playCount) totalView += video.playCount;
				}
			}

			Logger.info("Build Calculation Data profile @" + username + ", with " + dataVideo.length + " data");
			let postByDate = dataVideo.map((x) => moment.unix(x.createTime).format("YYYY-MM-DD"));
			let dayDifference = Math.abs(moment(postByDate[postByDate.length - 1]).diff(postByDate[0], "days"));
			dayDifference = dayDifference == 0 ? Math.abs(moment().diff(postByDate[0], "days")) : dayDifference;
			console.log("dayDifference", dayDifference);
			//Start Parsing Data
			data.userId = user.id;
			data.username = encodeURIComponent(user.username).toLowerCase();
			data.name = user.full_name;
			data.profileImageUrl = urlImage;
			data.profileLink = "https://www.instagram.com/"+encodeURIComponent(user.username).toLowerCase();
			data.description = user.biography;
			data.website = user.external_url ?? null;
			data.email = user.business_email ?? null;
			data.pronouns = user.pronouns ?? null;
			data.is_verified = user.is_verified;
			data.is_business_account = user.is_business;
			data.is_private = user.is_private;
			data.is_professional_account = user.is_professional_account ?? null;
			data.is_joined_recently = user.is_joined_recently ?? null;
			data.category = {
				"business_category": user.business_category_name ?? null,
				"instagram_category": user.category ?? null,
			};
			data.publicMetrics = {
				"followerCount": user.follower_count,
				"followingCount": user.following_count,
				"availablePost": user.media_count,
			};

			data.keyMetrics = {
			    "analyzedPostCount": 0,
			    "totalComments": 0,
			    "totalLikes": 0,
			    "totalViews": 0,
			    "commentRates": 0,
			    "likeRates": 0,
			    "viewRates": 0,
			    "avgComment": 0,
			    "avgLikes": 0,
			    "avgViews": 0,
			    "engagementRates": 0,
			    "avgEngagement": 0,
			    "avgPostPerDay": 0,
			    "avgPostPerWeek": 0,
			    "avgPostPerMonth": 0
		  	};


		  	data.keyMetrics.analyzedPostCount = dataVideo.length;
		  	data.keyMetrics.totalComments = totalComment;
		  	data.keyMetrics.totalLikes = totalLike;
		  	data.keyMetrics.totalViews = totalView;
		  	data.keyMetrics.commentRates = Math.round((totalComment / (user.follower_count ? user.follower_count : 0) / dataVideo.length) * 10000) / 100 || 0;
		  	data.keyMetrics.likeRates = Math.round((totalLike / (user.follower_count ? user.follower_count : 0) / dataVideo.length) * 10000) / 100 || 0;
		  	data.keyMetrics.viewRates = Math.round((totalView / (user.follower_count ? user.follower_count : 0) / dataVideo.length) * 10000) / 100 || 0;
		  	data.keyMetrics.avgComment = Math.round(totalComment / dataVideo.length) || 0;
		  	data.keyMetrics.avgLikes = Math.round(totalLike / dataVideo.length) || 0;
		  	data.keyMetrics.avgViews = Math.round(totalView / dataVideo.length) || 0;
		  	data.keyMetrics.engagementRates = Math.round(((totalComment + totalLike) / user.follower_count / dataVideo.length) * 1000000 / 10000);
		  	data.keyMetrics.avgEngagement = Math.round((totalComment + totalLike) / dataVideo.length);
		  	data.keyMetrics.avgPostPerDay = Math.round((dataVideo.length / dayDifference) * 100) / 100 || 0;
		  	data.keyMetrics.avgPostPerWeek = Math.round((dataVideo.length / dayDifference) * 7 * 100) / 100 || 0;
		  	data.keyMetrics.avgPostPerMonth = Math.round((dataVideo.length / dayDifference) * 30 * 100) / 100 || 0;
		  	data.chartData = Parsing.getProfileChartData(user, dataVideo);
			data.topPost = Parsing.topPosts(data.username, dataVideo);


			return data;
		} catch (err) {
			Logger.err(err);
			return;
		}
	}, 

	processFullProfile: async (user, username, limit, typeData) => {
		let dataVideo = await getListVideoFull(username);
		dataVideo.sort(function (a, b) {
		  return b.createTime - a.createTime;
		});

		console.log('body post parser', user);
		try {
			let splitName;
			let countSplit;
			let imageUri;
			let urlImage = "";
			let image = "";

			if (user.profile_pic_url || user.profile_pic_url !== "") {
				splitName = user.profile_pic_url.split("/");
				countSplit = splitName.length;
				splitName = splitName[countSplit - 1].split("?");
				imageUri = user.profile_pic_url;

				image = "instagram/profpic/" + splitName[0];
				urlImage = "localhost:3000/" + image;

				// s3Image.putS3Image({
				// 	uri: imageUri,
				// 	image: image,
				// });
			}

			let data = {
				username: encodeURIComponent(user.username).toLowerCase(),
				bio: user.biography,
				followers: user.follower_count,
				following: user.following_count,
				fullname: user.full_name,
				profpic: urlImage,
				userId: user.id,
				website: user.external_url,
				is_verified: user.is_verified,
				is_business_account: user.is_business,
				is_private: user.is_private,
				is_professional_account: user.is_professional_account ?? null,
				is_joined_recently: user.is_joined_recently ?? null,
				category: {
					business_category: user.business_category_name ?? null,
					instagram_category: user.category ?? null,
				},
				email: user.business_email,
			};

			let duetVideos = [];
			let videos = [];
			let tags = [];
			let type = [];
			let words = [];
			let mentions = [];
			let totalLike = 0;
			let totalComment = 0;
			let totalView = 0;
			let loc = [];

			let totalPost = dataVideo.length;
			if (limit === 1000 && dataVideo.length > 1000)
				totalPost = 1000;
			if (limit !== 1000 && dataVideo.length > 5000)
				totalPost = 5000;
			if (typeData === "preview-profile" && dataVideo.length > 12)
				totalPost = 12;
			dataVideo.length = totalPost; //cut data video elements to the specified total post limit
			
			for (let video of dataVideo) {
				let hashtags = [];
				if (video) {
					if(video.productType){
			          let typeProduct;
			            switch(video.productType){
			              case "clips":
			                typeProduct = "reel";
			                break;
			              case "carousel_container":
			                typeProduct = "carousel";
			                break;
			              case "feed":
			                typeProduct = "photo";
			                break;    
			              default:
			                typeProduct = video.productType;
			            }
			          type.push(typeProduct);
			        }
					Logger.info("Handling video data " + video.shortcode);
					video.author = user.username;
					totalLike += video.likeCount ?? 0;
					totalComment += video.commentCount ?? 0;
					if (video.location && video.location.name) loc.push(video.location.name);
					if (video.playCount) totalView += video.playCount;
					video.date = moment.unix(video.createTime).format("YYYY-MM-DD");
					video.day = moment.unix(video.createTime).format("dddd");
					video.hour = moment.unix(video.createTime).format("hA");
					let textSplitted = video.caption
						? video.caption
							.replace(/\n/g, " ")
							.replace(/\ufeff/g, " ")
							.split(" ")
						: [];
					for (let word of textSplitted) {
						if (word[0] === "@") {
							if (word.length > 1) {
								mentions.push(deleteRandomChar(word));
							}
						} else if (word[0] == "#") {
							if (word.length > 1) {
								if ((word.match(/#/g) || []).length > 1) {
									word.split("#").map((tag) => {
										if (tag.length > 1) {
											tag = deleteRandomChar(tag);
											hashtags.push(`#${tag}`);
										}
									});
								} else {
									hashtags.push(deleteRandomChar(word));
								}
							}
						} else {
							let regex =
								"\u00a9|\u00ae|[\u2000-\u3300]|\ud83c[\ud000-\udfff]|\ud83d[\ud000-\udfff]|\ud83e[\ud000-\udfff]|#";
							let replace = word.replace(new RegExp(regex, "g"), "");
							if (replace.length >= 4) {
								words.push(replace);
							}
						}
					}
					tags.push.apply(tags, hashtags);
					video.hashtag = hashtags;
				}
				if (video && video.coAuthorProducers && video.coAuthorProducers.length != 0) {
					var element = {
						username: username === video.username ? video.coAuthorProducers[0] : video.username,
						likeCount: video.likeCount,
						commentCount: video.commentCount,
						shortcode: video.shortcode,
						isVideo: video.isVideo,
						covers: video.covers,
						caption: video.caption,
						createTime: video.createTime,
						playCount: video.playCount,
						count: 1,
					};
					duetVideos.push(element);
					Logger.info("Duet post : ", video.shortcode);
				}
				if (video)
					videos.push(video);
			}
			logQuery.insertDetailLog({ 
                query: username,
                mode: typeData,
                detail: "Build Calculation",
                postCount: user.media_count,
                postCountDB: videos.length,
                status: "prossesing"
              });
			Logger.info("Build Calculation Data profile @" + username + ", with " + videos.length + " data");
			let postByDate = videos.map((x) => x.date);
			let postByDay = videos.map((x) => x.day);
			let dayDifference = Math.abs(moment(postByDate[postByDate.length - 1]).diff(postByDate[0], "days"));
			dayDifference = dayDifference == 0 ? Math.abs(moment().diff(postByDate[0], "days")) : dayDifference;
			let heatmapData = processHeatmap(videos);
			let engagementByDay = countOccurence(postByDay, "engagementDay", videos);
			let topPostData = topPosts(videos, duetVideos);

			data.availableVideo = user.media_count;
			data.totalUniquePost = videos.length;
			data.totalLike = totalLike;
			data.totalComment = totalComment;
			data.totalView = totalView;
			data.likeRate =
				Math.round((totalLike / (data.followers ? data.followers : 0) / dataVideo.length) * 10000) / 100 || 0;
			data.commentRate =
				Math.round((totalComment / (data.followers ? data.followers : 0) / dataVideo.length) * 10000) / 100 || 0;
			data.engagementRate = Math.round((data.likeRate + data.commentRate) * 100) / 100 || 0;
			data.likePerPost = Math.round(totalLike / dataVideo.length) || 0;
			data.commentPerPost = Math.round(totalComment / dataVideo.length) || 0;
			data.engagementPerPost = data.likePerPost + data.commentPerPost;
			data.postPerDay = Math.round((dataVideo.length / dayDifference) * 100) / 100 || 0;
			data.postPerWeek = Math.round((dataVideo.length / dayDifference) * 7 * 100) / 100 || 0;
			data.postPerMonth = Math.round((dataVideo.length / dayDifference) * 30 * 100) / 100 || 0;
			data.mostWord = countOccurence(words, "word", [])
				.sort(function (a, b) {
					return b[1] - a[1];
				})
				.slice(0, 20);

			data.mostType = countOccurence(type, "type", type)
				.sort(function (a, b) {
					return b[1] - a[1];
				})
				.slice(0, 20);

			data.mostTag = countOccurence(tags, "tag", [])
				.sort(function (a, b) {
					return b[1] - a[1];
				})
				.slice(0, 20);

			data.location = countOccurence(loc, "location", [])
				.sort(function (a, b) {
					return b[1] - a[1];
				})
				.slice(0, 20);
			data.mostMention = countOccurence(mentions, "mention", [])
				.sort(function (a, b) {
					return b[1] - a[1];
				})
				.slice(0, 20);

			data.duetEngagementRate = calculateDuetEngagement(
				duetVideos,
				username,
				data.followers,
				dataVideo.length
			)
				.sort(function (a, b) {
					return b[2] - a[2];
				})
				.slice(0, 20);

			data.likeByDate = countOccurence(postByDate, "like", videos).sort(function (a, b) {
				return a[0] - b[0];
			});
			data.viewByDate = countOccurence(postByDate, "view", videos).sort(function (a, b) {
				return a[0] - b[0];
			});
			data.commentByDate = countOccurence(postByDate, "comment", videos).sort(function (a, b) {
				return a[0] - b[0];
			});
			data.postByDate = countOccurence(postByDate, "post", []).sort(function (a, b) {
				return a[0] - b[0];
			});
			data.postByDay = countOccurence(postByDay, "postDay", []);
			data.viewByDay = countOccurence(postByDay, "viewDay", videos);
			data.engByDay = calculateER(engagementByDay, null, data.postByDay);
			data.engRateByDay = calculateER(engagementByDay, data.followers || null, data.postByDay);
			data.postHeatMap = heatmapData[0];
			data.engHeatMap = heatmapData[1];
			data.topPost = topPostData;
			data.averageAllByDay = {
				postByDay: Number((data.postByDay.reduce((a, b) => a + b.y, 0) / 7).toFixed(2)),
				engByDay: Number((data.engByDay.reduce((a, b) => a + b.y, 0) / 7).toFixed(2)),
				engRateByDay: Number((data.engRateByDay.reduce((a, b) => a + b.y, 0) / 7).toFixed(2)),
			};

			return data;
		} catch (err) {
			Logger.err(err);
			return;
		}
	}, 

	getListVideoFull : async (username, dateFrom = null, dateTo = null) => {
		let searchParams = {
			$or: [{ username: username }, { coAuthorProducers: username }],
		};
	
		if (dateFrom && dateTo) {
			searchParams["createTime"] = {
				$gte: Number(dateFrom),
				$lte: Number(dateTo),
			};
		}
	
		return await Post.find(searchParams).limit(10000).exec();
	}
}

const getListVideoFull = async (username, dateFrom = null, dateTo = null) => {
	let searchParams = {
		$or: [{ username: username }, { coAuthorProducers: username }],
	};

	if (dateFrom && dateTo) {
		searchParams["createTime"] = {
			$gte: Number(dateFrom),
			$lte: Number(dateTo),
		};
	}

	return await Post.find(searchParams).limit(10000).exec();
};

function topPosts(videos, duetVideos) {
	let result = {};
	result.mostDuetEng = duetVideos
		.slice(0)
		.sort((a, b) => (a.likeCount + a.commentCount > b.likeCount + b.commentCount ? -1 : 1))
		.slice(0, 5);
	result.mostEng = videos
		.slice(0)
		.sort((a, b) => (a.likeCount + a.commentCount > b.likeCount + b.commentCount ? -1 : 1))
		.slice(0, 5);
	result.mostLike = videos
		.slice(0)
		.sort((a, b) => (a.likeCount > b.likeCount ? -1 : 1))
		.slice(0, 5);
	result.mostComment = videos
		.slice(0)
		.sort((a, b) => (a.commentCount > b.commentCount ? -1 : 1))
		.slice(0, 5);
	result.mostViewed = videos
		.slice(0)
		.filter(video => video.playCount > 0)
		.sort((a, b) => (b.playCount - a.playCount))
		.slice(0, 5);
	result.mostRecent = videos
		.slice(0)
		.sort((a, b) => (a.createTime > b.createTime ? -1 : 1))
		.slice(0, 5);

	return result;
}

const calculateDuetEngagement = (postDuet, username, follower, totalPost) => {
	let dataTempDuet = [];
	for (let dataPost of postDuet) {
		if (dataTempDuet.some((e) => e.username === dataPost.username)) {
			for (let dataTemp of dataTempDuet) {
				if (dataPost.username == dataTemp.username && dataPost.shortcode != dataTemp.shortcode) {
					dataTempDuet[dataTempDuet.indexOf(dataTemp)].count++;
					dataTempDuet[dataTempDuet.indexOf(dataTemp)].likeCount += dataPost.likeCount;
					dataTempDuet[dataTempDuet.indexOf(dataTemp)].commentCount += dataPost.commentCount;
				}
			}
		} else {
			dataTempDuet.push(dataPost);
		}
	}
	let resultDuet = [];
	for (let dataDuet of dataTempDuet) {
		var engDuetRate = (((dataDuet.likeCount + dataDuet.commentCount) / (follower * dataDuet.count)) * 100).toFixed(2);

		resultDuet.push([dataDuet.username, dataDuet.count, Number(engDuetRate) <= 0.009 ? 0.01 : engDuetRate]);
	}
	return resultDuet;
};

