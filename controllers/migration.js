const mysql = require("mysql");
const AWS = require('aws-sdk');
const config = require("../config/config.js");
const pool = mysql.createPool(config.mysql);
const s3 = new AWS.S3();
const moment = require("moment");
const Post = require("../models/post");
const Profile = require("../models/previewProfile");
const FullProfile = require("../models/fullProfile");
const LogQuery = require("../models/logQuery");

module.exports = {
    migrate,
    logMigrate
};

async function logMigrate(req,res,next){
  let sqlResult = await fetchLogFromSQL();
  res.sendStatus(200);
  for (item of sqlResult){
    let mode = item.status === 1 ? "full-profile" : "preview-profile"
    let log = {
      email: item.email,
      query: item.query,
      mode: mode,
      status: 1
    }
    LogQuery.updateOne(
      { email: item.email, query:item.query },
      { $set: log },
      { upsert: true },
      function (err, result) {
          if (err) {
              console.log(err);
          } else {
              console.log(item.query,"finish transferring")
          }
      }
    );
  }
}

async function migrate(req,res,next){
    let sqlResult = await fetchFromSQL();
    res.sendStatus(200);
    for (item of sqlResult){
        let s3Result = await fetchFromS3(item.query);
        let profile = await parseProfile(s3Result);
        if (!profile || !profile.username) console.log(item.query,"doesnt exist")
        else {
            Profile.updateOne(
            // FullProfile.updateOne(
                { username: profile.username },
                { $set: profile },
                { upsert: true },
                function (err, result) {
                    if (err) {
                        console.log(err);
                    } else {
                        console.log(profile.username,"finish transferring")
                    }
                }
            );
        }
    }
}

function fetchFromSQL(){
    return new Promise(async function (resolve) {
        let sql = "SELECT query FROM profile WHERE id > 155000"
        // let sql = 'SELECT query FROM profile WHERE mode="full" AND id>155000';
        exec(sql, function(result){
            resolve(result);
        })
    })
}

function fetchLogFromSQL(){
  return new Promise(async function (resolve) {
      let sql = 'SELECT email,query,status FROM email WHERE analytics ="profile"';
      exec(sql, function(result){
          resolve(result);
      })
  })
}


function fetchFromS3(query){
    return new Promise(async function (resolve) {
        let s3Params = {
            Bucket: "analisabinc",
            Key: "instagram/preview/profile/"+query+".json"
            // Key: "instagram/profile/"+query+".json"
        };
        s3.getObject(s3Params, function(err, data) {
            if (err){
                console.log(query,err.stack);
                resolve(null);
            } else {
                console.log("transferring",query)
                resolve(JSON.parse(data.Body.toString('utf-8'))[0]);
            }
        });
    })
}

function exec(sql, callback) {
    pool.getConnection(function(err, connection){
        if (err) throw err;
        connection.query(sql, function(err, result, fields) {
            if (err) throw err;
            callback(result, fields);
            connection.release();
        });
    });
}

async function parseProfile(item){
    return new Promise(async function (resolve) {
        if (!item) return resolve(null);
        let data = {};
        data.username = item.data.profile.username;
        data.bio = item.data.profile.bio;
        data.website = item.data.profile.website;
        data.followers = item.data.profile.counts ? item.data.profile.counts.followed_by : 0;
        data.following = item.data.profile.counts ? item.data.profile.counts.follows : 0;
        data.availableVideo = item.data.main ? item.data.main.length : 0;
        data.fullname = item.data.profile.full_name;
        data.is_verified = item.data.profile.is_verified;
        data.is_business_account = item.data.profile.is_business_account;
        data.is_private = item.data.profile.is_private;
        data.userId = item.data.profile.id;
        data.profpic = item.data.profile.profile_picture;

        let posts = [];
        let tags = [];
        let words = [];
        let mentions = [];
        let totalLike = 0;
        let totalComment = 0;
        let totalView = 0;
        let location = [];

        if (!item.data.main) return resolve(null)
        for (let post of item.data.main) {
            post = await parsePost(post);
            let hashtags = [];
            if (post) {
                post.author = data.username;
                totalLike += post.likeCount;
                totalComment += post.commentCount;
                location.push(post.location);
                if (post.playCount) totalView += post.playCount;
                post.date = moment.unix(post.createTime).format("YYYY-MM-DD");
                post.day = moment.unix(post.createTime).format("dddd");
                post.hour = moment.unix(post.createTime).format("hA");
                let textSplitted = post.caption ? post.caption.split(" ") : [];
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
                post.hashtag = hashtags;
            }
            posts.push(post);
        }
        
        let postByDate = posts.map((x) => x.date);
        let postByDay = posts.map((x) => x.day);
        let dayDifference = moment(postByDate[0]).diff(
            postByDate[postByDate.length - 1], "days"
        );
        if (!dayDifference || dayDifference === 0) dayDifference = 1
        let heatmapData = processHeatmap(posts);
        let engagementByDay = countOccurence(postByDay, "engagementDay", posts);
        let topPostData = topPosts(posts);
        data.totalLike = totalLike;
        data.totalComment = totalComment;
        data.totalView = totalView;
        data.likeRate =
            Math.round((totalLike / data.followers / data.availableVideo) * 10000) / 100 || 0;
        data.commentRate =
            Math.round((totalComment / data.followers / data.availableVideo) * 10000) / 100 || 0;
        data.engagementRate = Math.round((data.likeRate + data.commentRate) * 100) / 100 || 0;
        data.likePerPost = Math.round(totalLike / data.availableVideo) || 0;
        data.commentPerPost = Math.round(totalComment / data.availableVideo) || 0;
        data.engagementPerPost = data.likePerPost + data.commentPerPost;
        data.postPerDay = Math.round((data.availableVideo / dayDifference) * 100) / 100 || 0;
        data.postPerWeek = Math.round((data.availableVideo / dayDifference) * 7 * 100) / 100 || 0;
        data.postPerMonth = Math.round((data.availableVideo / dayDifference) * 30 * 100) / 100 || 0;
        data.mostWord = sortByOccurence(words);
        data.mostTag = sortByOccurence(tags);
        data.location = countOccurence(location, "location", null)
        .sort(function (a, b) {
            return a[1] - b[1];
        })
        .reverse()
        .slice(0, 20);;
        data.mostMention = countOccurence(mentions, "mention", null)
        .sort(function (a, b) {
            return a[1] - b[1];
        })
        .reverse()
        .slice(0, 20);
        data.likeByDate = countOccurence(postByDate, "like", posts).sort(function (a, b) {
            return a[0] - b[0];
        });
        data.commentByDate = countOccurence(postByDate, "comment", posts).sort(
        function (a, b) {
            return a[0] - b[0];
        }
        );
        data.postByDate = countOccurence(postByDate, "post", null).sort(function (a, b) {
            return a[0] - b[0];
        });
        data.postByDay = countOccurence(postByDay, "postDay", null);
        data.engByDay = calculateER(engagementByDay, null, data.postByDay);
        data.engRateByDay = calculateER(engagementByDay, data.followers, data.postByDay);
        data.postHeatMap = heatmapData[0];
        data.engHeatMap = heatmapData[1];
        data.topPost = topPostData;
        resolve(data);
    })
}

async function parsePost(body) {
    return new Promise(function (resolve) {
      try {
        let data = {
          id: body.id,
          caption: body.caption,
          createTime: body.timestamp,
          authorId: body.userid,
          username: body.username,
          isVideo: body.is_video,
          isAd: body.is_ad,
          commentCount: body.comments,
          likeCount: body.likes,
          playCount: body.playCount || 0,
          covers: [body.image],
          coversOrigin: body.image,
          coversDynamic: body.image,
          location: body.location,
          tagged: body.tagged,
          shortcode: body.shortcode,
          mediaPreview: body.media_preview
        };
  
        Post.updateOne(
          { id: body.id },
          { $set: data },
          { upsert: true },
          function (err, result) {
            if (err) { 
                console.log(err); 
                return resolve(data); 
            }
            return resolve(data);
          }
        );
      } catch (e) {
        console.log(e);
        return resolve(null);
      }
    });
}


function sortByOccurence(inputArray) {
    let arrayItemCounts = {};
    for (let i in inputArray) {
      if (inputArray[i] !== "") {
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
      if (inputArray[i] !== "") {
        if (!arrayItemCounts.hasOwnProperty(inputArray[i])) {
          if (mode === "mention" || mode === "post" || mode === "postDay" || mode === "location")
            arrayItemCounts[inputArray[i]] = 1;
          else if (mode === "like")
            arrayItemCounts[inputArray[i]] = videos[i].likeCount;
          else if (mode === "comment")
            arrayItemCounts[inputArray[i]] = videos[i].commentCount;
          else if (mode === "engagementDay")
            arrayItemCounts[inputArray[i]] =
              videos[i].likeCount + videos[i].commentCount;
        } else {
          if (mode === "mention" || mode === "post" || mode === "postDay" || mode === "location")
            arrayItemCounts[inputArray[i]] += 1;
          else if (mode === "like")
            arrayItemCounts[inputArray[i]] += videos[i].likeCount;
          else if (mode === "comment")
            arrayItemCounts[inputArray[i]] += videos[i].commentCount;
          else if (mode === "engagementDay")
            arrayItemCounts[inputArray[i]] +=
              videos[i].likeCount + videos[i].commentCount;
        }
      }
    }
    let arr = [];
    if (mode === "postDay" || mode === "engagementDay") {
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
          if (mode === "mention" || mode === "location") {
            arr.push([prop, arrayItemCounts[prop]]);
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
  
  function topPosts(videos) {
    let result = {};
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