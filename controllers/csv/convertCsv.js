const moment = require("moment");
const Post = require("../../models/post");
const FullProfile = require("../../models/fullProfile");
const { parse } = require("json2csv");

async function processConvert(query) {
  try {
    if (!query) {
      console.log("username not found!");
      return false;
    }

    let dataJson = await prepareJson(query);
    return parse(dataJson);
  } catch (err) {
    console.log(`Error processConvert`);
    return false;
  }
}

function prepareJson(query) {
  return new Promise(async (resolve) => {
    const postList = await getPostList(query);
    const profile = await getProfile(query);

    let result = [];
    await postList.map((post, index) => {
      let tempHashtag = [];
      let tempMention = [];

      if (post.caption && post.caption.length > 0) {
        let textSplitted = post.caption
          .replace(/\n/g, " ")
          .replace(/\ufeff/g, " ")
          .split(" ");

        for (const txt of textSplitted) {
          if (txt[0] === "@" && txt.length > 1) {
            tempMention.push(txt);
          } else if (txt[0] === "#" && txt.length > 1) {
            tempHashtag.push(txt);
          }
        }
      }

      let item = {
        Username: profile.username,
        Fullname: profile.fullname,
        Follower: profile.followers,
        Comments: post.commentCount,
        Likes: post.likeCount,
        Views: post.playCount,
        EngagementRate: Number(
          (
            ((post.likeCount + post.commentCount) / profile.followers) *
            100
          ).toFixed(2)
        ),
        Date: moment(post.createTime * 1000).format("L"),
        Time: moment(post.createTime * 1000).format("LT"),
        URL: `https://www.instagram.com/p/${post.shortcode}/`,
        Caption: post.caption,
        Bio: profile.bio,
        Hashtag: tempHashtag,
        Mentions: tempMention,
        tagged: post.tagged,
      };

      result.push(item);
    });

    resolve(result);
  });
}

function getPostList(username) {
  return new Promise((resolve) => {
    Post.find({ username: username })
      .sort({ createTime: -1 })
      .exec((err, posts) => {
        if (err) {
          console.log("Error at getPost");
        } else {
          resolve(posts);
        }
      });
  });
}

function getProfile(username) {
  return new Promise((resolve) => {
    FullProfile.findOne({ username: username }).exec((err, profile) => {
      if (err) {
        console.log("Error at getProfile");
      } else {
        resolve(profile);
      }
    });
  });
}

module.exports = processConvert;
