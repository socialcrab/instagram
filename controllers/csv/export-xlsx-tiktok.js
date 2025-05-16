const XLSX = require("xlsx");
const moment = require("moment");

const FullProfile = require("../../models/tiktok/full-profile-tiktok");
const PreviewProfile = require("../../models/tiktok/preprofiles");
// const FullHashtag = require("../../models/tiktok/fullhashtag");
// const PreviewHashtag = require("../../models/tiktok/prephashtag");
const Video = require("../../models/tiktok/video");
const { captureException } = require("@sentry/node");

const parseProfileVideos = (videoList, profile) => {
	let result = [];

	for (let i = 0; i < videoList.length; i++) {
		let item = {};
		item.FullName = profile.nickName;
		item.UserName = profile.uniqueId;
		item.Followers = profile.fans;
		item.Comments = videoList[i].commentCount;
		item.Share = videoList[i].shareCount;
		item.Likes = videoList[i].diggCount;
		item.Views = videoList[i].playCount;
		item.Engagement = Number((((videoList[i].diggCount + videoList[i].commentCount) / profile.fans) * 100).toFixed(2));
		item.Duration = !videoList[i].duration ? 0 : videoList[i].duration;
		item.Date = moment(videoList[i].createTime * 1000).format("L");
		item.Time = moment(videoList[i].createTime * 1000).format("LT");
		item.Caption = videoList[i].text;
		item.Url = `https://www.tiktok.com/@${item.UserName}/video/${videoList[i].id}`;
		item.OriginalMusic = !!videoList[i].musicData.original ? 'Yes' : 'No';
		item.MusicTitle = videoList[i].musicData.title;
		item.MusicAuthor = videoList[i].musicData.authorName;
		item.MusicDuration = videoList[i].musicData.duration;
		item.MusicUrl = videoList[i].musicData.playUrl;
		item.Hashtag = Array.isArray(videoList[i].hashtag) ? videoList[i].hashtag.join(", ") : "";
		result.push(item);
	}

	return result;
};

const parseHashtagVideos = (videoList) => {
	let result = [];
	for (let i = 0; i < videoList.length; i++) {
		if (typeof videoList[i].authorStats === "object") {
			let item = {
				FullName: videoList[i].nickname,
				UserName: videoList[i].author,
				Followers: videoList[i].authorStats?.followerCount,
				Comments: videoList[i].commentCount,
				Share: videoList[i].shareCount,
				Likes: videoList[i].diggCount,
				Views: videoList[i].playCount,
				Duration: !videoList[i].duration ? 0 : videoList[i].duration,
				Date: moment(videoList[i].createTime * 1000).format("L"),
				Time: moment(videoList[i].createTime * 1000).format("LT"),
				Caption: videoList[i].text,
				Url: `https://www.tiktok.com/@${videoList[i].uniqueId}/video/${videoList[i].id}`,
				OriginalMusic: !!videoList[i].musicData.original ? 'Yes' : 'No',
				MusicTitle: videoList[i].musicData.title,
				MusicAuthor: videoList[i].musicData.authorName,
				MusicDuration: videoList[i].musicData.duration,
				MusicUrl: videoList[i].musicData.playUrl,
				Hashtag: Array.isArray(videoList[i].hashtag) ? videoList[i].hashtag.join(", ") : "",
			};
			result.push(item);
		} else {
			console.log(`video ${videoList[i].id} not updated`);
		}
	}

	return result;
};

const parseMostMention = (profile) => {
	const mostMentions = profile.mostMention;
	mostMentions.unshift(["TikTok", "Uses"]);
	return mostMentions;
};

const parsePostsPerDay = (videos) => {
	const result = [];
	for (let i in videos) {
		const index = +moment.unix(videos[i].createTime).format("d");
		const day = moment.unix(videos[i].createTime).format("dddd");
		if (typeof result[index] == "undefined") {
			result[index] = {
				Day: day,
				"Total Posts": 0,
				"Time Logs": {},
			};
		}

		result[index]["Total Posts"] += 1;
		for (let hour = 0; hour < 24; hour++) {
			if (typeof result[index]["Time Logs"][hour] == "undefined") {
				result[index]["Time Logs"][hour] = 0;
			}

			if (+moment.unix(videos[i].createTime).format("H") == hour) {
				result[index]["Time Logs"][hour] += 1;
			}
		}
	}

	return Object.values(result);
};

const parsePostingActivity = (postsPerDay) => {
	const header = ["Time", "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
	const result = [[...header]];
	for (let hour = 0; hour < 24; hour++) {
		result[hour + 1] = [hour, 0, 0, 0, 0, 0, 0, 0];
		for (let day = 1; day < header.length; day++) {
			result[hour + 1][day] += postsPerDay[day - 1] ? postsPerDay[day - 1]["Time Logs"][hour] : 0;
		}
	}

	return result;
};

const parseMostTag = (profile) => {
	const result = [];
	for (let i in profile.mostTag) {
		result.push([+i + 1, ...Object.values(profile.mostTag[i])]);
	}

	result.unshift(["No", "Tags", "Total Tags"]);
	return result;
};

module.exports = {
	/**
	 * @param {import('express').Request} req
	 * @param {import('express').Response} res
	 */
	profileDownload: async (req, res) => {
		const { query } = req.params;
		const mode = req.query.mode;

		const profile = mode === 'full'
			? await FullProfile.findOne({ uniqueId: query }).lean().exec()
			: await PreviewProfile.findOne({ uniqueId: query }).lean().exec();

		const videos = await Video.find({ uniqueId: query }).sort({ createTime: -1 }).limit(profile.availableVideo).lean().exec();

		const workbookTitle = `@${query} TikTok Analytic Report By Socialcrab.id`;
		let workbook = XLSX.utils.book_new();
		workbook.Props = {
			Title: workbookTitle,
			Author: `Socialcrab.id`,
			CreatedDate: new Date(),
		};

		let sheetName = `All Data`;
		workbook.SheetNames.push(sheetName);
		workbook.Sheets[sheetName] = XLSX.utils.json_to_sheet(parseProfileVideos(videos, profile));

		sheetName = `Tag and Mentions`;
		workbook.SheetNames.push(sheetName);
		workbook.Sheets[sheetName] = XLSX.utils.aoa_to_sheet(parseMostMention(profile));

		const postsPerDay = parsePostsPerDay(videos);
		const postingActivity = parsePostingActivity(postsPerDay);
		delete postsPerDay["Time Logs"];
		for (let i in postsPerDay) {
			delete postsPerDay[i]["Time Logs"];
		}

		sheetName = `Total Posts per Day`;
		workbook.SheetNames.push(sheetName);
		workbook.Sheets[sheetName] = XLSX.utils.json_to_sheet(postsPerDay);

		sheetName = `Posting Activity`;
		workbook.SheetNames.push(sheetName);
		workbook.Sheets[sheetName] = XLSX.utils.aoa_to_sheet(postingActivity);

		sheetName = `Hashtag Most Used`;
		workbook.SheetNames.push(sheetName);
		workbook.Sheets[sheetName] = XLSX.utils.aoa_to_sheet(parseMostTag(profile));

		sheetName = `Music Most Used`;
		workbook.SheetNames.push(sheetName);
		workbook.Sheets[sheetName] = XLSX.utils.json_to_sheet(
			(profile.mostUsedMusic ? profile.mostUsedMusic : []).map((item, i) => {
				return {No: i + 1, Title: item.name, Used: item.total}
			})
		)

		res.attachment(`${workbookTitle}.xlsx`);
		return res.send(
			XLSX.write(workbook, {
				bookType: "xlsx",
				bookSST: false,
				type: "buffer",
			})
		);
	},

	/**
	 * @param {import('express').Request} req
	 * @param {import('express').Response} res
	 */
	// hashtagDownload: async (req, res) => {
	// 	try {
	// 		console.log(`downloading spreadsheet report of #${req.params.query}`);
	// 		const { query } = req.params;

	// 		console.log(`geting full hashtag analytics data ...`);
	// 		const hashtag = await FullHashtag.findOne({ hashtag: query }).lean().exec();
	// 		if (!hashtag) return res.sendStatus(404);
	// 		console.log(`get full hashtag analytics from ${hashtag.createdAt}`);

	// 		console.log(`geting hashtag videos ...`);
	// 		const videos = await Video.find({ hashtag: query, authorStats: { $exists: true } })
	// 			.sort({ createTime: -1 })
	// 			.limit(hashtag.totalUniquePost)
	// 			.lean()
	// 			.exec();
	// 		console.log(`get ${videos.length} videos`);

	// 		console.log(`generating spreadsheet ...`);
	// 		const workbookTitle = `#${query} TikTok Analytic Report By Socialcrab.id`;
	// 		let workbook = XLSX.utils.book_new();
	// 		workbook.Props = {
	// 			Title: workbookTitle,
	// 			Author: `Socialcrab.id`,
	// 			CreatedDate: new Date(),
	// 		};

	// 		let sheetName = `All Data`;
	// 		workbook.SheetNames.push(sheetName);
	// 		workbook.Sheets[sheetName] = XLSX.utils.json_to_sheet(parseHashtagVideos(videos));

	// 		sheetName = `Total Posts per Day`;
	// 		workbook.SheetNames.push(sheetName);
	// 		workbook.Sheets[sheetName] = XLSX.utils.json_to_sheet(
	// 			hashtag.postByDay.map((item) => {
	// 				return { Day: item.name, "Total Posts": item.y };
	// 			})
	// 		);

	// 		sheetName = `Total Follower Reach per Day`;
	// 		workbook.SheetNames.push(sheetName);
	// 		workbook.Sheets[sheetName] = XLSX.utils.json_to_sheet(
	// 			hashtag.reachByDay.map((item) => {
	// 				return { Day: item.name, "Total Follower Reach": item.y };
	// 			})
	// 		);

	// 		sheetName = `Hashtag Most Used`;
	// 		workbook.SheetNames.push(sheetName);
	// 		workbook.Sheets[sheetName] = XLSX.utils.json_to_sheet(
	// 			hashtag.mostTag.map((item, i) => {
	// 				return { No: i + 1, Tags: item.name, "Total Tags": item.total };
	// 			})
	// 		);

	// 		sheetName = `Music Most Used`;
	// 		workbook.SheetNames.push(sheetName);
	// 		workbook.Sheets[sheetName] = XLSX.utils.json_to_sheet(
	// 			(hashtag.mostUsedMusic || []).map((item, i) => {
	// 				return {No: i + 1, Title: item.name, Used: item.total}
	// 			})
	// 		)
			
	// 		res.attachment(`${workbookTitle}.xlsx`);
	// 		console.log(`spreadsheet generate with title ${workbookTitle}.xlsx`);

	// 		return res.send(
	// 			XLSX.write(workbook, {
	// 				bookType: "xlsx",
	// 				bookSST: false,
	// 				type: "buffer",
	// 			})
	// 		);
	// 	} catch (err) {
	// 		console.error(err);
	// 		captureException(err);
	// 		return res.sendStatus(500);
	// 	}
	// },
};
