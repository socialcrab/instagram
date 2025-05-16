const moment = require("moment");
const Post = require("../../../models/post");
const datePickProfile = require("../../../models/datePickProfile.js");
// const s3Image = require("../../../helpers/putS3Images.js");
const Sentry = require("@sentry/node");
const Logger = require("../../../helpers/logger.js");

module.exports = {
  profileParser,
  tokenParser,
  checkProfileParser,
  videoParser,
  getListVideoFull,
  processFullProfile,
  profileFullParser,
  processProfile,
  getListVideoFullDatepicker,
  getDatepickerData,
  getShortCodePost,
  processProfileDatepicker
};

async function videoParser(body) {
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
        urlImage = s3Image.s3Uri + image;

        // for (var i = 0; i < 5; i++) {
        //   //try resize img post
        //   saveImg = await s3Image.putS3ImageBuffer({
        //               routeImg: routeImg,
        //               urlImg: body.display_url,
        //               image: image,
        //             }); 
        //   if (saveImg) break;
        // } 
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
        Logger.info(`Save data post v2 ${data.shortcode}`);
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
}

async function checkProfileParser(body, username) {
  try {
    if (body) {
      var restrictedProfile = body.match("Restricted profile");
      var data = body ? JSON.parse(body) : false;

      // check apakah user tidak private
      if (
        data &&
        data.graphql &&
        data.graphql.user &&
        !data.graphql.user.is_private
      ) {
        if (
          data.graphql.user
            .edge_owner_to_timeline_media.count > 0
        ) {
          return {
            meta: 200,
            massage: "user-exist",
            data: data,
          };
        } else {
          Logger.err(username + " has zero post");
          return {
            meta: 422,
            massage: "zero-post",
          };
        }

        // dianggap private account
      } else if (
        data &&
        data.graphql &&
        data.graphql.user &&
        data.graphql.user.is_private
      ) {
        return {
          meta: 422,
          massage: "private",
        };

        // dianggap Restricted Account
      } else if (restrictedProfile) {
        Logger.err(username + " not found");
        return {
          meta: 422,
          massage: "restricted-account",
        };

        // dianggap tidak di temukan
      } else {
        Logger.err(username + " not found");
        return {
          meta: 422,
          massage: "not-found",
        };
      }
    } else {
      Logger.err(username + " not found");
      return {
        meta: 404,
        massage: "not-found",
      };
    }
  } catch (e) {
    Sentry.captureException(e);
    Logger.err(username + " not found");
    return {
      meta: 422,
      massage: "not-found",
    };
  }
}

async function profileParser(body, username) {
  try {
    var data = body.match("window._sharedData = ([^]*)};</script>");
    data = data
      ? JSON.parse(
          body.match("window._sharedData = ([^]*)};</script>")[1] + "}"
        )
      : false;

    return data;
  } catch (e) {
    Sentry.captureException(e);
    Logger.err(username + " not found");
    return {
      meta: 422,
      massage: "not-found",
    };
  }
}

async function tokenParser(body) {
    var data = body.match("window._sharedData = ([^]*)};</script>");
    data = data
        ? JSON.parse(
            body.match("window._sharedData = ([^]*)};</script>")[1] + "}"
          ) : null;
    return data;
}

async function profileFullParser(body, username) {
  try {
    var data = body.match("window._sharedData = ([^]*)};</script>");
    data = data
      ? JSON.parse(
          body.match("window._sharedData = ([^]*)};</script>")[1] + "}"
        )
      : false;

    return {
      meta: 200,
      massage: "successResponse",
      data: data,
    };
  } catch (e) {
    Sentry.captureException(e);
    Logger.err(username + " not found");
    return {
      meta: 422,
      massage: "not-found",
    };
  }
}

function getListVideoFullDatepicker(username, dateFrom, dateTo) {
  return new Promise(function (resolve) {
    var searchParams = {
      $or: [ 
        { username: username }, 
        { coAuthorProducers: username } 
      ],
      createTime : {
        $gte: Number(dateFrom), 
        $lte: Number(dateTo)
      }
    };

    var query = Post.find(searchParams);

    query.exec(function (err, video) {
      if (err) {
        Sentry.captureException(err);
        Logger.err(err);
      }
      resolve(video);
    });
  });
}

async function getShortCodePost(shortcode) {
  return new Promise(function (resolve) {
    var searchParams = {};
    searchParams["shortcode"] = shortcode;

    var query = Post .findOne(searchParams).lean();

    query.exec(function (err, profile) {
      if (err) {
        Sentry.captureException(err);
        Logger.err(err);
      }
      resolve(profile);
    });
  });
}

function getDatepickerData(username, dateFrom, dateTo) {
  return new Promise(function (resolve) {
    var searchParams = {};
    searchParams["username"] = username;
    searchParams["dateFrom"] = dateFrom;
    searchParams["dateTo"] = dateTo;

    var query = datePickProfile.findOne(searchParams);

    query.exec(function (err, video) {
      if (err) {
        Sentry.captureException(err);
        Logger.err(err);
      }
      resolve(video);
    });
  });
}


function getListVideoFull(username, post, limit, dateFrom = null, dateTo = null) {
  return new Promise(function (resolve) {
    // var searchParams = {};
    var searchParams = {
      $or: [ 
        { username: username }, 
        { coAuthorProducers: username } 
      ]
    };
    // searchParams["username"] = username;
    if (dateFrom && dateTo) {
      searchParams["createTime"] = {
        $gte: Number(dateFrom),
        $lte: Number(dateTo),
      };
    }
    var queryCount = Post.countDocuments(searchParams);

    queryCount.exec(function (err, video) {
      if (err) {
        Sentry.captureException(err);
        Logger.err(err);
      }
        var queryTotal = Post.find(searchParams);
        queryTotal.exec(function (err, postData) {
          if (err) {
            Sentry.captureException(err);
            Logger.err(err);
          }
          resolve(postData);
        });
    });
  });
}

async function processFullProfile(user, username, limit) {
  let dataVideo = await getListVideoFull(username, user.edge_owner_to_timeline_media.count, limit);
    dataVideo.sort(function (a, b) {
      return a.createTime - b.createTime;
    }).reverse();

  return new Promise(async function (resolve) {
  try {
    let data = {};
    let splitName;
    let countSplit;
    let imageUri;
    let urlImage;
    let image;

    if (user.profile_pic_url || user.profile_pic_url !== "") {
      splitName = user.profile_pic_url.split("/");
      countSplit = splitName.length;
      splitName = splitName[countSplit - 1].split("?");
      imageUri = user.profile_pic_url;

      image = "instagram/profpic/" + splitName[0];
      urlImage = s3Image.s3Uri + image;

      s3Image.putS3Image({
        uri: imageUri,
        image: image,
      });
    }

    data.username = encodeURIComponent(user.username).toLowerCase();
    data.bio = user.biography;
    data.followers = user.edge_followed_by.count;
    data.following = user.edge_follow.count;
    data.fullname = user.full_name;
    data.profpic = urlImage;
    data.userId = user.id;
    data.website = user.external_url;
    data.is_verified = user.is_verified;
    data.is_business_account = user.is_business_account;
    data.is_private = user.is_private;
    data.is_professional_account = user.is_professional_account;
    data.is_joined_recently = user.is_joined_recently;
    data.category = {
      "business_category" : user.business_category_name,
      "professional_category" : user.category_name,
      "instagram_category" : user.category_enum,
    };
    data.email = user.business_email;

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
    let no = 1;
    var totalPost = limit === 1000 ? 1000 : 5000;
    for (let video of dataVideo) {
      if(totalPost == no) {
      Logger.info(
        "Build Calculation Data profile @" +
          username +
          ", with " +
          no +
          " data"
        );
      break;
      } 

      Logger.info("Handling video data " + video.shortcode);
      let hashtags = [];
      if (video) {
        if(video.productType) type.push(video.productType);
        video.author = user.username;
        totalLike += video.likeCount;
        totalComment += video.commentCount;
        if (video.location && video.location.name)
          loc.push(video.location.name);
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
                  if (tag.length > 1){
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
      if(video.coAuthorProducers && video.coAuthorProducers.length != 0){
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
          count: 1
        };
        duetVideos.push(element);
        Logger.info("Duet post : ", video.shortcode);
      }
      videos.push(video);
      no++;
    }
    
    let postByDate = videos.map((x) => x.date);
    let postByDay = videos.map((x) => x.day);
    let dayDifference = Math.abs(moment(postByDate[postByDate.length - 1]).diff(postByDate[0], "days"));
    dayDifference = dayDifference == 0 ? Math.abs(moment().diff(postByDate[0], "days")) : dayDifference;
    let heatmapData = processHeatmap(videos);
    let engagementByDay = countOccurence(postByDay, "engagementDay", videos);
    let topPostData = topPosts(videos, duetVideos);

    data.availableVideo = user.edge_owner_to_timeline_media.count;
    data.totalUniquePost = no;
    data.totalLike = totalLike;
    data.totalComment = totalComment;
    data.totalView = totalView;
    data.likeRate =
      Math.round((totalLike / data.followers / dataVideo.length) * 10000) /
        100 || 0;
    data.commentRate =
      Math.round((totalComment / data.followers / dataVideo.length) * 10000) /
        100 || 0;
    data.engagementRate =
      Math.round((data.likeRate + data.commentRate) * 100) / 100 || 0;
    data.likePerPost = Math.round(totalLike / dataVideo.length) || 0;
    data.commentPerPost = Math.round(totalComment / dataVideo.length) || 0;
    data.engagementPerPost = data.likePerPost + data.commentPerPost;
    data.postPerDay =
      Math.round((dataVideo.length / dayDifference) * 100) / 100 || 0;
    data.postPerWeek =
      Math.round((dataVideo.length / dayDifference) * 7 * 100) / 100 || 0;
    data.postPerMonth =
      Math.round((dataVideo.length / dayDifference) * 30 * 100) / 100 || 0;
    data.mostWord = countOccurence(words, "word", null)
      .sort(function (a, b) {
        return a[1] - b[1];
      })
      .reverse()
      .slice(0, 20);

    data.mostType = countOccurence(type, "type", type)
      .sort(function (a, b) {
        return a[1] - b[1];
      })
      .reverse()
      .slice(0, 20);
      
    data.mostTag = countOccurence(tags, "tag", null)
      .sort(function (a, b) {
        return a[1] - b[1];
      })
      .reverse()
      .slice(0, 20);

    data.location = countOccurence(loc, "location", null)
      .sort(function (a, b) {
        return a[1] - b[1];
      })
      .reverse()
      .slice(0, 20);
    data.mostMention = countOccurence(mentions, "mention", null)
      .sort(function (a, b) {
        return a[1] - b[1];
      })
      .reverse()
      .slice(0, 20);

    data.duetEngagementRate = calculateDuetEngagement(duetVideos, username, user.edge_followed_by.count, dataVideo.length)
      .sort(function (a, b) {
        return a[2] - b[2];
      })
      .reverse()
      .slice(0, 20);

    data.likeByDate = countOccurence(postByDate, "like", videos).sort(function (
      a,
      b
    ) {
      return a[0] - b[0];
    });
    data.viewByDate = countOccurence(postByDate, "view", videos).sort(function (
      a,
      b
    ) {
      return a[0] - b[0];
    });
    data.commentByDate = countOccurence(postByDate, "comment", videos).sort(
      function (a, b) {
        return a[0] - b[0];
      }
    );
    data.postByDate = countOccurence(postByDate, "post", null).sort(function (
      a,
      b
    ) {
      return a[0] - b[0];
    });
    data.postByDay = countOccurence(postByDay, "postDay", null);
    data.viewByDay = countOccurence(postByDay, "viewDay", videos);
    data.engByDay = calculateER(engagementByDay, null, data.postByDay);
    data.engRateByDay = calculateER(
      engagementByDay,
      data.followers,
      data.postByDay
    );
    data.postHeatMap = heatmapData[0];
    data.engHeatMap = heatmapData[1];
    data.topPost = topPostData;
    data.averageAllByDay = {
      postByDay: Number(
        (data.postByDay.reduce((a, b) => a + b.y, 0) / 7).toFixed(2)
      ),
      engByDay: Number(
        (data.engByDay.reduce((a, b) => a + b.y, 0) / 7).toFixed(2)
      ),
      engRateByDay: Number(
        (
          data.engRateByDay.reduce((a, b) => a + b.y, 0) / 7
        ).toFixed(2)
      ),
    };
    delete data.videoURL;

    resolve(data);
  } catch(err){
    Sentry.captureException(err);
    Logger.err(err);
  }
  });
}

async function processProfile(user, dataVideo) {
  return new Promise(async function (resolve) {
    let data = {};

    data.username = user.username;
    data.bio = user.bio;
    data.followers = user.followers;
    data.following = user.following;
    data.fullname = user.fullname;
    data.profpic = user.profpic;
    data.userId = user.userId;

    let videos = [];
    let tags = [];
    let words = [];
    let type = [];
    let mentions = [];
    let totalLike = 0;
    let totalComment = 0;
    let totalView = 0;
    let loc = [];
    for (let video of dataVideo) {
      let hashtags = [];
      if (video) {
        if(video.productType) type.push(video.productType);
        video.author = user.username;
        totalLike += video.likeCount;
        totalComment += video.commentCount;
        if (video.location && video.location.name)
          loc.push(video.location.name);
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
              mentions.push(word);
            }
          } else if (word[0] == "#") {
            if (word.length > 1) {
              hashtags.push(word);
            }
          } else {
            let regex =
              "\u00a9|\u00ae|[\u2000-\u3300]|\ud83c[\ud000-\udfff]|\ud83d[\ud000-\udfff]|\ud83e[\ud000-\udfff]|#";
            let replace = word.replace(new RegExp(regex, "g"), "");
            if (replace.length >= 2) {
              words.push(replace);
            }
          }
        }
        tags.push.apply(tags, hashtags);
        video.hashtag = hashtags;
      }
      videos.push(video);
    }
    let postByDate = videos.map((x) => x.date);
    let postByDay = videos.map((x) => x.day);
    let dayDifference = Math.abs(moment(postByDate[0]).diff(postByDate[postByDate.length - 1], "days"));
    let heatmapData = processHeatmap(videos);
    let engagementByDay = countOccurence(postByDay, "engagementDay", videos);
    let topPostData = topPosts(videos);

    data.availableVideo = user.availableVideo;
    data.totalUniquePost = dataVideo.length;
    data.totalLike = totalLike;
    data.totalComment = totalComment;
    data.totalView = totalView;
    data.likeRate =
      Math.round((totalLike / data.followers / dataVideo.length) * 10000) /
        100 || 0;
    data.commentRate =
      Math.round((totalComment / data.followers / dataVideo.length) * 10000) /
        100 || 0;
    data.engagementRate =
      Math.round((data.likeRate + data.commentRate) * 100) / 100 || 0;
    data.likePerPost = Math.round(totalLike / dataVideo.length) || 0;
    data.commentPerPost = Math.round(totalComment / dataVideo.length) || 0;
    data.engagementPerPost = data.likePerPost + data.commentPerPost;
    data.postPerDay =
      Math.round((dataVideo.length / dayDifference) * 100) / 100 || 0;
    data.postPerWeek =
      Math.round((dataVideo.length / dayDifference) * 7 * 100) / 100 || 0;
    data.postPerMonth =
      Math.round((dataVideo.length / dayDifference) * 30 * 100) / 100 || 0;
    data.mostWord = countOccurence(words, "word", null)
      .sort(function (a, b) {
        return a[1] - b[1];
      })
      .reverse()
      .slice(0, 20);

    data.mostType = countOccurence(type, "type", null)
      .sort(function (a, b) {
        return a[1] - b[1];
      })
      .reverse()
      .slice(0, 20);

    data.mostTag = countOccurence(tags, "tag", null)
      .sort(function (a, b) {
        return a[1] - b[1];
      })
      .reverse()
      .slice(0, 20);

    data.location = countOccurence(loc, "location", null)
      .sort(function (a, b) {
        return a[1] - b[1];
      })
      .reverse()
      .slice(0, 20);
    data.mostMention = countOccurence(mentions, "mention", null)
      .sort(function (a, b) {
        return a[1] - b[1];
      })
      .reverse()
      .slice(0, 20);
    data.likeByDate = countOccurence(postByDate, "like", videos).sort(function (
      a,
      b
    ) {
      return a[0] - b[0];
    });
    data.viewByDate = countOccurence(postByDate, "view", videos).sort(function (
      a,
      b
    ) {
      return a[0] - b[0];
    });
    data.commentByDate = countOccurence(postByDate, "comment", videos).sort(
      function (a, b) {
        return a[0] - b[0];
      }
    );
    data.postByDate = countOccurence(postByDate, "post", null).sort(function (
      a,
      b
    ) {
      return a[0] - b[0];
    });
    data.postByDay = countOccurence(postByDay, "postDay", null);
    data.viewByDay = countOccurence(postByDay, "viewDay", videos);
    data.engByDay = calculateER(engagementByDay, null, data.postByDay);
    data.engRateByDay = calculateER(
      engagementByDay,
      data.followers,
      data.postByDay
    );
    data.postHeatMap = heatmapData[0];
    data.engHeatMap = heatmapData[1];
    data.topPost = topPostData;
    data.averageAllByDay = {
      postByDay: Number(
        (data.postByDay.reduce((a, b) => a + b.y, 0) / 7).toFixed(2)
      ),
      engByDay: Number(
        (data.engByDay.reduce((a, b) => a + b.y, 0) / 7).toFixed(2)
      ),
      engRateByDay: Number(
        (
          data.engRateByDay.reduce((a, b) => a + b.y, 0) / 7
        ).toFixed(2)
      ),
    };
    delete data.videoURL;

    resolve(data);
  });
}

async function processProfileDatepicker(user, dataVideo, dateFrom, dateTo) {
  return new Promise(async function (resolve) {
    let data = {};
    data.username = user.username;
    data.bio = user.bio;
    data.followers = user.followers;
    data.following = user.following;
    data.fullname = user.fullname;
    data.profpic = user.profpic;
    data.userId = user.userId;

    let videos = [];
    let duetVideos = [];
    let tags = [];
    let words = [];
    let type = [];
    let mentions = [];
    let totalLike = 0;
    let totalComment = 0;
    let totalView = 0;
    let loc = [];
    for (let video of dataVideo) {
      let hashtags = [];
      if (video) {
        if(video.productType) type.push(video.productType);
        video.author = user.username;
        totalLike += video.likeCount;
        totalComment += video.commentCount;
        if (video.location && video.location.name)
          loc.push(video.location.name);
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
                  if (tag.length > 1){
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
      if(video.coAuthorProducers && video.coAuthorProducers.length != 0){
        var element = {
          username: user.username === video.username ? video.coAuthorProducers[0] : video.username,
          likeCount: video.likeCount,
          commentCount: video.commentCount,
          shortcode: video.shortcode,
          isVideo: video.isVideo,
          covers: video.covers,
          caption: video.caption,
          createTime: video.createTime,
          playCount: video.playCount,
          count: 1
        };
        duetVideos.push(element);
        Logger.info("Duet post : ", video.shortcode);
      }

      videos.push(video);
    }

    let postByDate = videos.map((x) => x.date);
    let postByDay = videos.map((x) => x.day);
    let dayDifference = Math.abs(moment(postByDate[0]).diff(postByDate[postByDate.length - 1], "days"));
    let heatmapData = processHeatmap(videos);
    let engagementByDay = countOccurence(postByDay, "engagementDay", videos);
    let topPostData = topPosts(videos, duetVideos);

    data.availableVideo = user.availableVideo;
    data.totalUniquePost = dataVideo.length;
    data.totalLike = totalLike;
    data.totalComment = totalComment;
    data.totalView = totalView;
    data.likeRate =
      Math.round((totalLike / data.followers / dataVideo.length) * 10000) /
        100 || 0;
    data.commentRate =
      Math.round((totalComment / data.followers / dataVideo.length) * 10000) /
        100 || 0;
    data.engagementRate =
      Math.round((data.likeRate + data.commentRate) * 100) / 100 || 0;
    data.likePerPost = Math.round(totalLike / dataVideo.length) || 0;
    data.commentPerPost = Math.round(totalComment / dataVideo.length) || 0;
    data.engagementPerPost = data.likePerPost + data.commentPerPost;
    data.postPerDay =
      Math.round((dataVideo.length / dayDifference) * 100) / 100 || 0;
    data.postPerWeek =
      Math.round((dataVideo.length / dayDifference) * 7 * 100) / 100 || 0;
    data.postPerMonth =
      Math.round((dataVideo.length / dayDifference) * 30 * 100) / 100 || 0;
    data.mostWord = countOccurence(words, "word", null)
      .sort(function (a, b) {
        return a[1] - b[1];
      })
      .reverse()
      .slice(0, 20);

    data.mostTag = countOccurence(tags, "tag", null)
      .sort(function (a, b) {
        return a[1] - b[1];
      })
      .reverse()
      .slice(0, 20);

    data.mostType = countOccurence(type, "type", type)
      .sort(function (a, b) {
        return a[1] - b[1];
      })
      .reverse()
      .slice(0, 20);

    data.location = countOccurence(loc, "location", null)
      .sort(function (a, b) {
        return a[1] - b[1];
      })
      .reverse()
      .slice(0, 20);
    data.mostMention = countOccurence(mentions, "mention", null)
      .sort(function (a, b) {
        return a[1] - b[1];
      })
      .reverse()
      .slice(0, 20);

    var dataLikeByDate = checkFromAndToData(countOccurence(postByDate, "like", videos), dateFrom, dateTo);
    var dataCommentByDate = checkFromAndToData(countOccurence(postByDate, "comment", videos), dateFrom, dateTo);
    var dataPostByDate = checkFromAndToData(countOccurence(postByDate, "post", null), dateFrom, dateTo);
    var dataViewByDate = checkFromAndToData(countOccurence(postByDate, "view", videos), dateFrom, dateTo);

    data.duetEngagementRate = calculateDuetEngagement(duetVideos, user.username, user.followers, dataVideo.length)
      .sort(function (a, b) {
        return a[2] - b[2];
      })
      .reverse()
      .slice(0, 20);
      
    data.likeByDate = dataLikeByDate.sort(function (
      a,
      b
    ) {
      return a[0] - b[0];
    });
    data.commentByDate = dataCommentByDate.sort(
      function (a, b) {
        return a[0] - b[0];
      }
    );
    data.postByDate = dataPostByDate.sort(function (
      a,
      b
    ) {
      return a[0] - b[0];
    });
    data.viewByDate = dataViewByDate.sort(function (
      a,
      b
    ) {
      return a[0] - b[0];
    });

    data.postByDay = countOccurence(postByDay, "postDay", null);
    data.viewByDay = countOccurence(postByDay, "viewDay", videos);
    data.engByDay = calculateER(engagementByDay, null, data.postByDay);
    data.engRateByDay = calculateER(
      engagementByDay,
      data.followers,
      data.postByDay
    );
    data.postHeatMap = heatmapData[0];
    data.engHeatMap = heatmapData[1];
    data.topPost = topPostData;
    data.averageAllByDay = {
      postByDay: Number(
        (data.postByDay.reduce((a, b) => a + b.y, 0) / 7).toFixed(2)
      ),
      engByDay: Number(
        (data.engByDay.reduce((a, b) => a + b.y, 0) / 7).toFixed(2)
      ),
      engRateByDay: Number(
        (
          data.engRateByDay.reduce((a, b) => a + b.y, 0) / 7
        ).toFixed(2)
      ),
    };
    delete data.videoURL;

    resolve(data);
  });
}

function calculateDuetEngagement(postDuet, username, follower, totalPost) {
  let dataTempDuet = [];
  for(let dataPost of postDuet){
    if(dataTempDuet.some(e => e.username === dataPost.username)){
      for(let dataTemp of dataTempDuet){
        if(dataPost.username == dataTemp.username && dataPost.shortcode != dataTemp.shortcode){
          dataTempDuet[dataTempDuet.indexOf(dataTemp)].count++;
          dataTempDuet[dataTempDuet.indexOf(dataTemp)].likeCount += dataPost.likeCount;
          dataTempDuet[dataTempDuet.indexOf(dataTemp)].commentCount += dataPost.commentCount;
        }
      }
    } else {
      dataTempDuet.push(dataPost);
    }
  }
    Logger.info(postDuet.length);
    let resultDuet = [];
    for (let dataDuet of dataTempDuet) {
      var engDuetRate = ((((dataDuet.likeCount + dataDuet.commentCount)) / (follower*dataDuet.count)) * 100).toFixed(2);

      resultDuet.push([
          dataDuet.username,
          dataDuet.count,
          engDuetRate <= 0.009 ? 0.01 : engDuetRate
        ]);
    }
    return resultDuet;
}


function checkFromAndToData(array, dateFrom, dateTo){
  var dataFromX = parseInt(moment(moment.unix(dateFrom).format("YYYY-MM-DD")).format("x"));
  var dataToX = parseInt(moment(moment.unix(dateTo).format("YYYY-MM-DD")).format("x"));
  var checkFrom = true;
  var checkTo = true;
  for(let data of array){
    if(data[0] == dataFromX) checkFrom = false;
    if(data[0] == dataToX) checkTo = false;
  }

  if(checkFrom) array.push([dataFromX, 0]);
  if(checkTo) array.push([dataToX, 0]);

  return array;
}

function sortByOccurence(inputArray) {
  let arrayItemCounts = {};
  for (let i in inputArray) {
    if (
      inputArray[i] !== "" ||
      inputArray[i] !== undefined ||
      inputArray[i] !== null
    ) {
      if (!arrayItemCounts.hasOwnProperty(inputArray[i])) {
        arrayItemCounts[inputArray[i]] = 1;
      } else {
        arrayItemCounts[inputArray[i]] += 1;
      }
    }
  }
  let keysByCount = Object.keys(arrayItemCounts).sort(function (a, b) {
    return arrayItemCounts[a] - arrayItemCounts[b]; //sort small to large
  });
  return keysByCount.reverse().slice(0, 21);
}

function countOccurence(inputArray, mode, videos) {
  let arrayItemCounts = {};
  for (let i in inputArray) {
    if (
      inputArray[i] !== "" ||
      inputArray[i] !== undefined ||
      inputArray[i] !== null
    ) {
      if (!arrayItemCounts.hasOwnProperty(inputArray[i])) {
        if (
          mode === "mention" ||
          mode === "post" ||
          mode === "postDay" ||
          mode === "location" ||
          mode === "tag" ||
          mode === "word" ||
          mode === "type"
        )
          arrayItemCounts[inputArray[i]] = 1;
        else if (mode === "like")
          arrayItemCounts[inputArray[i]] = videos[i].likeCount;
        else if (mode === "comment")
          arrayItemCounts[inputArray[i]] = videos[i].commentCount;
         else if (mode === "view" || mode === "viewDay")
          arrayItemCounts[inputArray[i]] = videos[i].playCount ? videos[i].playCount : 0;
        else if (mode === "engagementDay")
          arrayItemCounts[inputArray[i]] =
            videos[i].likeCount + videos[i].commentCount;
      } else {
        if (
          mode === "mention" ||
          mode === "post" ||
          mode === "postDay" ||
          mode === "location" ||
          mode === "tag" ||
          mode === "word" || 
          mode === "type"
        )
          arrayItemCounts[inputArray[i]] += 1;
        else if (mode === "like")
          arrayItemCounts[inputArray[i]] += videos[i].likeCount;
        else if (mode === "comment")
          arrayItemCounts[inputArray[i]] += videos[i].commentCount;
        else if (mode === "view" || mode === "viewDay")
          arrayItemCounts[inputArray[i]] += videos[i].playCount ? videos[i].playCount : 0;
        else if (mode === "engagementDay")
          arrayItemCounts[inputArray[i]] +=
            videos[i].likeCount + videos[i].commentCount;
      }
    }
  }

  let arr = [];
  if (mode === "postDay" || mode === "engagementDay" || mode === "viewDay") {
    arr.push({ name: "Monday", y: arrayItemCounts["Monday"] || 0 });
    arr.push({ name: "Tuesday", y: arrayItemCounts["Tuesday"] || 0 });
    arr.push({ name: "Wednesday", y: arrayItemCounts["Wednesday"] || 0 });
    arr.push({ name: "Thursday", y: arrayItemCounts["Thursday"] || 0 });
    arr.push({ name: "Friday", y: arrayItemCounts["Friday"] || 0 });
    arr.push({ name: "Saturday", y: arrayItemCounts["Saturday"] || 0 });
    arr.push({ name: "Sunday", y: arrayItemCounts["Sunday"] || 0 });
  } else {

    for (let prop in arrayItemCounts) {
      if (arrayItemCounts.hasOwnProperty(prop)) {
        if (mode === "mention" || mode === "location" || mode === "tag" || mode === "word") {
          arr.push([prop, arrayItemCounts[prop]]);
        } else if (mode === "type" && videos){
          arr.push([prop, ((arrayItemCounts[prop] / videos.length) * 100).toFixed(2)]);
        } else {
          arr.push([parseInt(moment(prop).format("x")), arrayItemCounts[prop]]);
        }
      }
    }
  }
  return arr;
}

function calculateER(inputArray, fans, posts) {
  let arr = [];
  if (fans)
    for (let i = 0; i < inputArray.length; i++) {
      arr.push({
        name: inputArray[i].name,
        y: Math.round((inputArray[i].y / fans / posts[i].y) * 10000) / 100 || 0,
      });
    }
  else
    for (let i = 0; i < inputArray.length; i++) {
      arr.push({
        name: inputArray[i].name,
        y: Math.round((inputArray[i].y / posts[i].y) * 100) / 100 || 0,
      });
    }
  return arr;
}

function processHeatmap(videos) {
  let days = [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday",
  ];
  let hours = [
    "1AM",
    "2AM",
    "3AM",
    "4AM",
    "5AM",
    "6AM",
    "7AM",
    "8AM",
    "9AM",
    "10AM",
    "11AM",
    "12AM",
    "1PM",
    "2PM",
    "3PM",
    "4PM",
    "5PM",
    "6PM",
    "7PM",
    "8PM",
    "9PM",
    "10PM",
    "11PM",
    "12PM",
  ];
  let postHeatmap = [];
  let engHeatmap = [];
  let post;
  let engagement;
  for (let i = 0; i < days.length; i++) {
    for (let j = 0; j < hours.length; j++) {
      post = 0;
      engagement = 0;
      for (let k = 0; k < videos.length; k++) {
        if (videos[k].day === days[i] && videos[k].hour === hours[j]) {
          post += 1;
          engagement += videos[k].likeCount + videos[k].commentCount;
        }
      }
      postHeatmap.push([i, j, post]);
      engHeatmap.push([i, j, engagement]);
    }
  }
  return [postHeatmap, engHeatmap];
}

function topPosts(videos, duetVideos) {
  let result = {};
  result.mostDuetEng = duetVideos
    .slice(0)
    .sort((a, b) =>
      a.likeCount + a.commentCount > b.likeCount + b.commentCount ? -1 : 1
    )
    .slice(0, 10);
  result.mostEng = videos
    .slice(0)
    .sort((a, b) =>
      a.likeCount + a.commentCount > b.likeCount + b.commentCount ? -1 : 1
    )
    .slice(0, 10);
  result.mostLike = videos
    .slice(0)
    .sort((a, b) => (a.likeCount > b.likeCount ? -1 : 1))
    .slice(0, 10);
  result.mostComment = videos
    .slice(0)
    .sort((a, b) => (a.commentCount > b.commentCount ? -1 : 1))
    .slice(0, 10);
  result.mostViewed = videos
    .slice(0)
    .sort((a, b) => (a.playCount > b.playCount ? -1 : 1))
    .slice(0, 10);
  result.mostRecent = videos
    .slice(0)
    .sort((a, b) => (a.createTime > b.createTime ? -1 : 1))
    .slice(0, 12);

  return result;
}

function deleteRandomChar(word) {
  var char = word;
  if (word[word.length - 1] === "." || 
      word[word.length - 1] === "," || 
      word[word.length - 1] === "!" || 
      word[word.length - 1] === ")") {

      char = word.slice(0, word.length - 1);
  }

  return char;
}
