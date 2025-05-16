const XLSX = require("xlsx");
const moment = require("moment");

const FullProfile = require("../../models/fullProfileData");
const PreviewProfile = require("../../models/previewProfile");
const FullHashtag = require("../../models/fullHashtag");
const Post = require("../../models/post");
const { post } = require("request");

const parseProfilePosts = (postList, profile) => {
	let result = [];

	for (let i = 0; i < postList.length; i++) {
		let item = {
			FullName: profile.fullname,
			UserName: profile.username,
			Followers: profile.followers,
		};

		item.Type = postList[i].productType;
		item.Comments = postList[i].commentCount ?? 0;
		item.Likes = postList[i].likeCount ?? 0;
		item.Views = postList[i].playCount ?? 0;
		item.Engagement = Number(
			(
				((postList[i].likeCount + postList[i].commentCount) /
					profile.followers) *
				100
			).toFixed(2)
		);
		item.Duration = !postList[i].videoDuration ? 0 : postList[i].videoDuration;
		item.Date = moment(postList[i].createTime * 1000).format("L");
		item.Time = moment(postList[i].createTime * 1000).format("LT");
		item.Caption = postList[i].caption;
		item.Url = `https://www.instagram.com/p/${postList[i].shortcode}`;
		item.Hashtag = Array.isArray(postList[i].hashtag) ? postList[i].hashtag.join(', ') : postList[i].hashtag;
		item.Mentions = Array.isArray(postList[i].tagged) ? postList[i].tagged.join(', ') : postList[i].tagged;
		result.push(item);
	}

	return result;
};

const parseHashtagPosts = (posts) => {
	let result = [];
	for (let i = 0; i < posts.length; i++) {
		if (posts[i].owner) {
			let item = {
				FullName: Array.isArray(posts[i].username)
					? posts[i].username.join(", ")
					: posts[i].username,
				UserName: posts[i].owner.username,
				Followers: posts[i].owner ? posts[i].owner.follower : 0,
				Type: posts[i].productType,
				Comments: posts[i].commentCount ?? 0,
				Likes: posts[i].likeCount ?? 0,
				Views: posts[i].playCount ?? 0,
				Duration: !posts[i].videoDuration ? 0 : posts[i].videoDuration,
				Date: moment(posts[i].createTime * 1000).format("L"),
				Time: moment(posts[i].createTime * 1000).format("LT"),
				Caption: posts[i].caption,
				Url: `https://www.instagram.com/p/${posts[i].shortcode}`,
			};
			result.push(item);
		}
	}

	return result;
};

const parseMostMention = (profile) => {
	const mostMentions = profile.mostMention || [];
	mostMentions.unshift(["Instagram", "Uses"]);
	return mostMentions;
};

const parsePostsPerDay = (posts) => {
	const result = [];
	for (let i in posts) {
		const index = +moment.unix(posts[i].createTime).format("d");
		const day = moment.unix(posts[i].createTime).format("dddd");
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

			if (+moment.unix(posts[i].createTime).format("H") == hour) {
				result[index]["Time Logs"][hour] += 1;
			}
		}
	}

	return Object.values(result);
};

const parsePostingActivity = (postsPerDay) => {
	const header = [
		"Time",
		"Sunday",
		"Monday",
		"Tuesday",
		"Wednesday",
		"Thursday",
		"Friday",
		"Saturday",
	];
	const result = [[...header]];
	for (let hour = 0; hour < 24; hour++) {
		result[hour + 1] = [moment(hour.toString(), "LT").format("hh:mm A"), 0, 0, 0, 0, 0, 0, 0];
		for (let day = 1; day < header.length; day++) {
			result[hour + 1][day] += postsPerDay[day - 1] ? postsPerDay[day - 1]["Time Logs"][hour] : 0;
		}
	}

	return result;
};

const parseMostTag = (profile) => {
	const result = [];
	for (let i in profile.mostTag || []) {
		result.push([+i + 1, ...Object.values(profile.mostTag[i])]);
	}

	result.unshift(["No", "Tags", "Total Tags"]);
	return result;
};

const parsePostType = (posts) => {
	const postCount = posts.length;

	const result = posts.reduce((result, item) => {
		result[item.productType] = {
			Type: item.productType,
			Count: result[item.productType] ? (result[item.productType].Count || 0) + 1 : 1
		};
		return result;
	}, {});

	return Object.values(result).map(item => {
		item.Count = item.Count / postCount;
		return item;
	});
}

module.exports = {
	/**
	 * @param {import('express').Request} req
	 * @param {import('express').Response} res
	 */
	profileDownload: async (req, res) => {
		const { query } = req.params;
		const mode = req.query.mode ?? "full";
		let profile;
		let posts = await Post.find({ username: query })
			.lean()
			.exec();

		posts = posts.sort((a, b) => {
			return (new Date(a.createTime) - new Date(b.createTime)) * -1;
		});

		if(mode === "full"){
			posts = posts.slice(0, 5000);
			profile = await FullProfile.findOne({ username: query })
				.lean()
				.exec();
		} else if (mode === "preview"){
			posts = posts.slice(0, 12);
			profile = await PreviewProfile.findOne({ username: query })
				.lean()
				.exec();
		}

		if (posts.length <= 0 && !profile) {
			return res.status(404).json({
				message: "Not Found",
				posts,
				profile,
			});
		}
		console.log(`Prepareing report for ${query}'s profile`);

		const workbookTitle = `@${query} Instagram Analytic Report By Socialcrab.id`;
		let workbook = XLSX.utils.book_new();
		workbook.Props = {
			Title: workbookTitle,
			Author: `Socialcrab.id`,
			CreatedDate: new Date(),
		};

		let sheetName = `All Data`;
		workbook.SheetNames.push(sheetName);
		workbook.Sheets[sheetName] = XLSX.utils.json_to_sheet(
			parseProfilePosts(posts, profile)
		);

		sheetName = `Tag and Mentions`;
		workbook.SheetNames.push(sheetName);
		workbook.Sheets[sheetName] = XLSX.utils.aoa_to_sheet(
			parseMostMention(profile)
		);

		const postsPerDay = parsePostsPerDay(posts);
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

		sheetName = `Post Type`;
		workbook.SheetNames.push(sheetName);
		workbook.Sheets[sheetName] = XLSX.utils.json_to_sheet(Object.values(parsePostType(posts)));


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
	hashtagDownload: async (req, res) => {
		const { query } = req.params;

		const hashtag = await FullHashtag.findOne({ hashtag: encodeURIComponent(query).toLowerCase() }).lean().exec();
		if (!hashtag) {
			return res.status(404).json({
				message: "Not Found",
				posts: [],
				hashtag,
			});
		}

		let posts = await Post.find({hashtag: encodeURIComponent(query).toLowerCase()}).lean().exec();
		posts = posts.sort((a, b) => {
			return (new Date(a.createTime) - new Date(b.createTime)) * -1;
		});
		posts = posts.slice(0, 5000);

		const workbookTitle = `#${query} Instagram Analytic Report By Socialcrab.id`;
		let workbook = XLSX.utils.book_new();
		workbook.Props = {
			Title: workbookTitle,
			Author: `Socialcrab.id`,
			CreatedDate: new Date(),
		};

		let sheetName = `All Data`;
		workbook.SheetNames.push(sheetName);
		workbook.Sheets[sheetName] = XLSX.utils.json_to_sheet(
			parseHashtagPosts(posts)
		);

		sheetName = `Total Posts per Day`;
		workbook.SheetNames.push(sheetName);
		workbook.Sheets[sheetName] = XLSX.utils.json_to_sheet(
			hashtag.chartData.postPerDay.map((item) => {
				return { Day: item.day, "Total Posts": item.value };
			})
		);

		sheetName = `Total Follower Reach per Day`;
		workbook.SheetNames.push(sheetName);
		workbook.Sheets[sheetName] = XLSX.utils.json_to_sheet(
			hashtag.chartData.totalFollowerReachPerDay.map((item) => {
				return { Day: item.day, "Total Follower Reach": item.value };
			})
		);

		sheetName = `Hashtag Most Used`;
		workbook.SheetNames.push(sheetName);
		workbook.Sheets[sheetName] = XLSX.utils.json_to_sheet(
			hashtag.chartData.mostHashtags.map((item, i) => {
				return { No: i + 1, Tags: item.key, "Total Tags": item.value };
			})
		);

		res.attachment(`${workbookTitle}.xlsx`);
		return res.send(
			XLSX.write(workbook, {
				bookType: "xlsx",
				bookSST: false,
				type: "buffer",
			})
		);
	},
};
