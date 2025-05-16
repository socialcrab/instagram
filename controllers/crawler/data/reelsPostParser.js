// const s3Image = require("../../../helpers/putS3Images.js");
const Post = require("../../../models/post.js");
const Logger = require("../../../helpers/logger.js");
const Sentry = require("@sentry/node");

module.exports = {
	savePostReels: async (body, username) => {
		return new Promise(async function (resolve) {
			try {
				let splitName;
				let countSplit;
				let imageUri;
				let urlImage;
				let image;
				let tagged = [];
				let routeImg;
				let saveImg = false;
				let dataHashtag = [];
				var duetUsername = [];

				if (body.image_versions2.candidates || body.image_versions2.candidates[0].url !== "") {
					splitName = body.image_versions2.candidates[0].url.split("/");
					countSplit = splitName.length;
					splitName = splitName[countSplit - 1].split("?");
					imageUri = body.image_versions2.candidates[0].url;

					routeImg = "helpers/temp/" + splitName[0];
					image = "instagram/post/" + splitName[0];
					urlImage = s3Image.s3Uri + image;

					// for (var i = 0; i < 5; i++) {
					// 	saveImg = await s3Image.putS3ImageBuffer({
					// 		routeImg: routeImg,
					// 		urlImg: body.image_versions2.candidates[0].url,
					// 		image: image,
					// 	});
					// 	if (saveImg) break;
					// }
				}

				var caption = body.caption ? body.caption.text : " ";
				if (caption && caption.length > 1) {
					let textSplitted = caption
						.replace(/\n/g, " ")
						.replace(/\ufeff/g, " ")
						.split(" ");
					for (let word of textSplitted) {
						if (word[0] == "#" && word.length > 1) {
							let checkWord = word
								.replace(/\n/g, " ")
								.replace(/\ufeff/g, " ")
								.split("#");
							if (checkWord.length == 1) {
								dataHashtag.push(encodeURIComponent(word.replace('#', '')).toLowerCase());
							} else {
								for (let anotherWord of checkWord) {
									if (anotherWord[0] != " " && anotherWord.length > 1) {
										dataHashtag.push(encodeURIComponent(anotherWord).toLowerCase());
									}
								}
							}
						}
					}
				}
				var playCount = body.play_count ? body.play_count : 0;
				if (body.edge_media_to_tagged_user && body.edge_media_to_tagged_user.edges) {
					for (let item of body.edge_media_to_tagged_user.edges) {
						try {
							tagged.push(item.node.user.username);
						} catch (e) { }
					}
				}

				var productType = "photo";

				if (body.product_type) {
					switch (body.product_type) {
						case "clips":
							productType = "reel";
							break;
						case "carousel_container":
							productType = "carousel";
							break;
						case "feed":
							productType = "photo";
							break;
						case "igtv":
							productType = "igtv";
							break;
						default:
							productType = "photo";
					}

					if (productType == "photo" && body.video_duration) {
						productType = "video";
					} else if (productType == "feed" && body.video_duration) {
						productType = "video";
					}
				}

				if (body.coauthor_producers && body.coauthor_producers.length != 0) {
					for (let userAuthor of body.coauthor_producers) {
						if(userAuthor.username !== body.user.username) {
							Logger.info(`found duet user ${userAuthor.username} ${(body.shortcode ? body.shortcode : body.code)}`)
							duetUsername.push(userAuthor.username);
						}
					}
				}

				let commentCount =  body.comment_count ? body.comment_count : 0;

				let owner = {
					id: body.user.pk,
					username: body.user.username,
					fullname: body.user.fullname ? body.user.fullname : ""
				}

				var data = {
					id: body.id,
					caption: caption,
					createTime: body.taken_at,
					authorId: body.user.pk,
					username: username,
					coAuthorProducers: duetUsername ? duetUsername : [],
					hashtag: dataHashtag,
					isVideo: true,
					isAd: body.is_paid_partnership,
					commentCount: commentCount ?? 0,
					likeCount: body.like_count < 0 ? 0 : body.like_count,
					playCount: playCount,
					owner: owner,
					covers: [urlImage],
					coversOrigin: body.image_versions2.candidates[0],
					coversDynamic: body.image_versions2.candidates[1],
					location: body.location ? body.location : "",
					comment: body.comments ? body.comments : [],
					shortcode: body.shortcode ? body.shortcode : body.code,
					tagged: tagged,
					productType: productType,
					videoDuration: body.video_duration ? body.video_duration : 0,
				};


				 try {
			        let checkVideo = await Post.findOne({ shortcode: data.shortcode });
			        if (!checkVideo) checkVideo = new Post(data);

			        const saveVideo = await checkVideo.save();
			        Logger.info(`Save data reels ${data.shortcode}`);
			        return resolve(saveVideo);

			    } catch (e) {
			        console.error(e);
					Sentry.captureException(e);
					return null;
			    }

				return resolve(data);
			} catch (e) {
				Logger.err("Error", e);
				Sentry.captureException(e);
				return resolve(null);
			}
		});
	},
}
