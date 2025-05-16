const s3Image = require("../../../helpers/putS3Images.js");
const Post = require("../../../models/post.js");
const Logger = require("../../../helpers/logger.js");
const Sentry = require("@sentry/node");

module.exports = {
	savePost: async (body, username) => {
		return new Promise(async function (resolve) {
			console.log(body);
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

				if (body.image_versions2) {
					urlImage = await s3Image.copyImageToOSS(body.image_versions2.candidates[0].url, 'postPicture', body.id);
					console.log(urlImage);
				} else if (body.display_url){
					urlImage = await s3Image.copyImageToOSS(body.display_url, 'postPicture', body.id);
					console.log(urlImage);
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

				if (body.usertags && body.usertags.in) {
					for (let item of body.usertags.in) {
						try {
							tagged.push(item.user.username);
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
						if(userAuthor.username !== body.owner.username) {
							Logger.info(`found duet user ${userAuthor.username} ${(body.shortcode ? body.shortcode : body.code)}`)
							duetUsername.push(userAuthor.username);
						}
					}
				}

				var data = {
					id: body.id,
					caption: caption,
					createTime: body.taken_at,
					authorId: body.owner.id,
					username: username,
					coAuthorProducers: duetUsername ? duetUsername : [],
					hashtag: dataHashtag,
					isVideo: body.video_versions == null ? false : true,
					isAd: body.ad_id == null ? false : true,
					commentCount: body.comment_count ?? 0,
					likeCount: body.like_count ?? 0,
					playCount: body.view_count ??  0,
					owner: parseDataOwner(body.owner),
					covers: [urlImage],
					coversOrigin: body.image_versions2,
					coversDynamic: body.image_versions2,
					location: body.location ?? "",
					comment: body.comments ? body.edge_media_to_parent_comment : [],
					shortcode: body.code ? body.code : body.shortcode,
					mediaPreview: body.preview,
					tagged: tagged,
					productType: productType,
					videoDuration: body.video_duration ? body.video_duration : 0,
					musicInfo: body.music_info ?? [],
				};

				try {
			        let checkVideo = await Post.findOne({ shortcode: data.shortcode });
			        if (!checkVideo) checkVideo = new Post(data);
					checkVideo.$set(data);

			        const saveVideo = await checkVideo.save();
			        Logger.info(`Save data post v1 ${data.shortcode}`);
			        return resolve(saveVideo);

			    } catch (e) {
			        console.error(e)
			    }

				return resolve(data);
			} catch (e) {
				Logger.err("Error", e);
				Sentry.captureException(e);
				return resolve(null);
			}
		});
	},

	saveSinglePost: async (body, hashtag) => {
		return new Promise(async function (resolve) {
		    try {
		      let urlImage;
		      let image;
		      const tagged = [];
		      let routeImg;
		      let saveImg;
		      const dataHashtag = [];
		      const duetUsername = [];

				if (body.display_url) {
					urlImage = await s3Image.copyImageToOSS(body.display_url, 'postPicture', body.id);
					console.log(urlImage);
				}

		      const caption = body.edge_media_to_caption.edges[0] ? body.edge_media_to_caption.edges[0].node.text : ' ';

		      if (caption && caption.length > 1) {
		        const textSplitted = caption
		          .replace(/\n/g, ' ')
		          .replace(/\ufeff/g, ' ')
		          .split(' ');
		        for (const word of textSplitted) {
		          if (word[0] === '#' && word.length > 1) {
		            const checkWord = word
		              .replace(/\n/g, ' ')
		              .replace(/\ufeff/g, ' ')
		              .split('#');
		            if (checkWord.length === 1) {
		              dataHashtag.push(encodeURIComponent(word.replace('#', '')).toLowerCase());
		            } else {
		              for (const anotherWord of checkWord) {
		                if (anotherWord[0] !== ' ' && anotherWord.length > 1) {
		                  dataHashtag.push(encodeURIComponent(anotherWord).toLowerCase());
		                }
		              }
		            }
		          }
		        }
		      }

		      dataHashtag.push(hashtag);

		      const playCount = body.is_video ? body.video_view_count : 0;

		      if (body.edge_media_to_tagged_user && body.edge_media_to_tagged_user.edges) {
		        for (const item of body.edge_media_to_tagged_user.edges) {
		          try {
		            tagged.push(item.node.user.username);
		          } catch (e) {}
		        }
		      }

		      let productType = 'photo';

		      if (body.product_type) {
		        switch (body.product_type) {
		          case 'clips':
		            productType = 'reel';
		            break;
		          case 'carousel_container':
		            productType = 'carousel';
		            break;
		          case 'feed':
		            productType = 'photo';
		            break;
		          case 'igtv':
		            productType = 'igtv';
		            break;
		          default:
		            productType = 'photo';
		        }

		        if (productType === 'photo' && body.video_duration) {
		          productType = 'video';
		        } else if (productType === 'feed' && body.video_duration) {
		          productType = 'video';
		        }
		      }

		      if (body.coauthor_producers && body.coauthor_producers.length !== 0) {
		        console.log('DUET', body.coauthor_producers);
		        for (const userAuthor of body.coauthor_producers) {
		          if (userAuthor.username !== body.owner.username) {
		            console.log(`found duet user ${userAuthor.username}`);
		            duetUsername.push(userAuthor.username);
		          }
		        }
		      }

		      const commentCount = body.edge_media_to_parent_comment
		        ? body.edge_media_to_parent_comment.count
		        : body.edge_media_to_comment
		        ? body.edge_media_to_comment.count
		        : 0;

		      const data = {
		        id: body.id,
		        caption: caption,
		        createTime: body.taken_at_timestamp,
		        authorId: body.owner.id,
		        username: body.owner.username,
		        coAuthorProducers: duetUsername ? duetUsername : [],
		        hashtag: dataHashtag,
		        isVideo: body.is_video,
		        isAd: body.is_ad,
		        commentCount: commentCount,
		        likeCount: body.edge_media_preview_like.count < 0 ? 0 : body.edge_media_preview_like.count,
		        playCount: playCount,
		        owner: parseDataOwner(body.owner),
		        covers: [urlImage],
		        coversOrigin: body.display_url,
		        coversDynamic: body.display_resources,
		        location: body.location ? body.location : '',
		        comment: body.edge_media_to_parent_comment ? body.edge_media_to_parent_comment.edges : [],
		        shortcode: body.shortcode ? body.shortcode : body.code,
		        mediaPreview: body.media_preview,
		        tagged: tagged,
		        productType: productType,
		        videoDuration: body.video_duration ? body.video_duration : 0,
		        musicInfo: body.clips_music_attribution_info ? body.clips_music_attribution_info : [],
		      };

		      try {
		        let checkVideo = await Post.findOne({ shortcode: data.shortcode });
		        if (!checkVideo) checkVideo = new Post(data);
		        checkVideo.$set(data);

		        const saveVideo = await checkVideo.save();
		        Logger.info(`Save data post ${data.shortcode}`);
		        return resolve(saveVideo);
		      } catch (e) {
		        console.error(e);
		      }

		      return resolve(data);
		    } catch (e) {
		      console.log('Error', e);
		      Sentry.captureException(e);
		      return resolve(null);
		    }
		});
	},

	savePostV2: async (item, username) => {
		let hashtag = [];
		let routeImg;
		let saveImg = false;
		let cover = '';
		let coverOrigin = '';
		let splitName, countSplit, image;
      	let dataHashtag = [];
      	var duetUsername = [];
		if (item.image_versions2 && item.image_versions2.candidates[0]) {
			coverOrigin = item.image_versions2.candidates[0].url;
			splitName = coverOrigin.split("/");
			countSplit = splitName.length;
			splitName = splitName[countSplit - 1].split("?");

			routeImg = "helpers/temp/" + splitName[0];
			image = "instagram/post/" + splitName[0];
			cover = s3Image.s3Uri + image;

			for (var i = 0; i < 5; i++) {
				saveImg = await s3Image.putS3ImageBuffer({
					routeImg: routeImg,
					urlImg: coverOrigin,
					image: image,
				});
				if (saveImg) break;
			}
		} else if(item.carousel_media && item.carousel_media[0]) {
			if (item.carousel_media[0].image_versions2 && item.carousel_media[0].image_versions2.candidates[0]) {
				coverOrigin = item.carousel_media[0].image_versions2.candidates[0].url;
				splitName = coverOrigin.split("/");
				countSplit = splitName.length;
				splitName = splitName[countSplit - 1].split("?");

				routeImg = "helpers/temp/" + splitName[0];
				image = "instagram/post/" + splitName[0];
				cover = s3Image.s3Uri + image;

				for (var i = 0; i < 5; i++) {
					saveImg = await s3Image.putS3ImageBuffer({
						routeImg: routeImg,
						urlImg: coverOrigin,
						image: image,
					});
					if (saveImg) break;
				}
			}
		}

		var caption = item.caption ? item.caption.text : " ";
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
								hashtag.push(word);
								dataHashtag.push(word.replace("#", ""));
							} else {
								for (let anotherWord of checkWord) {
									if (anotherWord[0] != " " && anotherWord.length > 1) {
										hashtag.push("#" + anotherWord);
										dataHashtag.push(anotherWord);
									}
								}
							}
						}
					}
				}

		 var productType = "photo";

	      if(item.product_type){
	        switch(item.product_type){
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
	        
	        if(productType == "photo" && item.video_duration) { 
	          productType = "video";
	        } else if(productType == "feed" && item.video_duration){
	          productType = "video";
	        }
	      }

		if (item.coauthor_producers && item.coauthor_producers.length != 0) {
			for (let userAuthor of item.coauthor_producers) {
				if(userAuthor.username !== item.user.username) {
					Logger.info(`found duet user ${userAuthor.username} ${item.code}`)
					duetUsername.push(userAuthor.username);
				}
			}
		}

		const post = {
			id: item.pk,
			caption: item.caption ? item.caption.text : null ,
			createTime: item.taken_at,
			authorId: item.user.pk,
			username: username,
			hashtag: hashtag,
			isVideo: !!item.video_duration,
			isAd: false,
			commentCount: item.comment_count ?? 0,
			likeCount: item.like_count ?? 0,
			playCount: item.play_count ? item.play_count : item.view_count,
			covers: [cover],
			coversOrigin: [coverOrigin],
			coversDynamic: item.image_versions2 ? item.image_versions2.candidates : null ,
			location: item.location ? item.location.short_name : null,
			tagged: item.usertags ? item.usertags.in.map(tag => tag.user.username) : [],
			comment: item.comments,
			musicInfo: null,
			owner: item.user,
			ownerProfPic: item.user.profile_pic_url,
			coAuthorProducers: duetUsername,
			productType: productType,
			shortcode: item.code,
			videoDuration: item.video_duration || null,
			mediaPreview: null,
		}

		try {
			let checkVideo = await Post.findOne({ shortcode: post.shortcode });
			if (!checkVideo) checkVideo = new Post(post);
			const saveVideo = await checkVideo.save();
			Logger.info(`Save data post v2 ${post.shortcode}`);
			return saveVideo;

		} catch (e) {
			console.error(e)
			Sentry.captureException(e);
			return null;
		}

		return post;
	},

	savePostV3: async (body) => {
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

	      if (body.display_url || body.display_url !== "") {
	        splitName = body.display_url.split("/");
	        countSplit = splitName.length;
	        splitName = splitName[countSplit - 1].split("?");
	        imageUri = body.display_url;

	        routeImg = "helpers/temp/" + splitName[0];
	        image = "instagram/post/" + splitName[0];
	        urlImage = "https://img.analisa.io/" + image;

	        for (var i = 0; i < 5; i++) {
	          //try resize img post
	          saveImg = await s3Image.putS3ImageBuffer({
	                      routeImg: routeImg,
	                      urlImg: body.display_url,
	                      image: image,
	                    }); 
	          if (saveImg) break;
	        } 
	      }


	      var caption = body.edge_media_to_caption.edges[0]
	        ? body.edge_media_to_caption.edges[0].node.text
	        : " ";
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

	      var playCount = body.is_video ? body.video_view_count : 0;
	      if (
	        body.edge_media_to_tagged_user &&
	        body.edge_media_to_tagged_user.edges
	      ) {
	        for (let item of body.edge_media_to_tagged_user.edges) {
	          try {
	            tagged.push(item.node.user.username);
	          } catch (e) {}
	        }
	      }

	      var productType = "photo";

	      if(body.product_type){
	        switch(body.product_type){
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
	        
	        if(productType == "photo" && body.video_duration) { 
	          productType = "video";
	        } else if(productType == "feed" && body.video_duration){
	          productType = "video";
	        }
	      }

	      if(body.coauthor_producers && body.coauthor_producers.length != 0){
	          Logger.info("DUET", body.coauthor_producers);
	          for (let userAuthor of body.coauthor_producers) {
	            if(userAuthor.username !== body.owner.username) {
	              Logger.info(`found duet user ${userAuthor.username}`)
	              duetUsername.push(userAuthor.username);
	            }
	          }
	      }

	      let commentCount = body.edge_media_to_parent_comment ? 
	        body.edge_media_to_parent_comment.count : body.edge_media_to_comment ? 
	        body.edge_media_to_comment.count : 0;

	      let data = {
	        id: body.id,
	        caption: caption,
	        createTime: body.taken_at_timestamp,
	        authorId: body.owner.id,
	        username: body.owner.username,
	        coAuthorProducers : duetUsername ? duetUsername : [],
	        hashtag: dataHashtag,
	        isVideo: body.is_video,
	        isAd: body.is_ad,
	        commentCount: commentCount,
	        likeCount: body.edge_media_preview_like.count < 0 ? 0 : body.edge_media_preview_like.count,
	        playCount: playCount,
	        owner: body.owner,
	        covers: [urlImage],
	        coversOrigin: body.display_url,
	        coversDynamic: body.display_resources,
	        location: body.location ? body.location : "",
	        comment: body.edge_media_to_parent_comment ? body.edge_media_to_parent_comment.edges : [],
	        shortcode: body.shortcode ? body.shortcode : body.code,
	        mediaPreview: body.media_preview,
	        tagged: tagged,
	        productType: productType,
	        videoDuration: body.video_duration ? body.video_duration : 0,
	        musicInfo: body.clips_music_attribution_info ? body.clips_music_attribution_info : [],
	      };


	      try {
	        let checkVideo = await Post.findOne({ shortcode: data.shortcode });
	        if (!checkVideo) checkVideo = new Post(data);
	        checkVideo.$set(data);

	        const saveVideo = await checkVideo.save();
	        Logger.info(`Save data post v3 ${data.shortcode}`);
	        return resolve(saveVideo);

	      } catch (e) {
	        console.error(e)
	      }

	      return resolve(data);
	    } catch (e) {
	      Logger.err("Error", e);
	      Sentry.captureException(e);
	      return resolve(null);
	    }
	  });
	},


	checkMissingHolePost: async (data) => {
		console.log("total post", data)
		return new Promise(async function (resolve) {
	    // Inisialisasi flag
	    let missingHolePost = false;

	    // Loop melalui data array
	    for (let i = 0; i < data.length; i++) {
	    	if(i == (data.length - 1)) break;
	        const currentTimestamp = data[i + 1][0];
	        const previousTimestamp = data[i][0];

	        // Hitung selisih hari antara dua tanggal
	        const timeDiff = (currentTimestamp - previousTimestamp) / (1000 * 60 * 60 * 24);

	        // Jika selisih hari lebih dari 35, atur flag menjadi true
	        if (timeDiff > 50) {
	            missingHolePost = true;
	            break; // Keluar dari loop karena sudah ditemukan perbedaan yang cukup besar
	        }
	    }

	    return resolve(missingHolePost);
		});
	}
}


// Fungsi untuk melakukan parsing data owner
function parseDataOwner(data) {
  // Mengembalikan objek baru dengan data yang diinginkan
  return {
    id: data.id,
    username: data.username,
    is_private: data.is_private,
    is_verified: data.is_verified,
    follower: data.edge_followed_by ? data.edge_followed_by.count : 0,  // Memastikan ada data follower count
    following: data.edge_owner_to_timeline_media ? data.edge_owner_to_timeline_media.count : 0, // Memastikan ada data following count
    profile_pict: data.profile_pic_url
  };
}