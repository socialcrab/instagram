const dayjs = require("dayjs")
const moment = require("moment");
const localeData = require("dayjs/plugin/localeData");

dayjs.extend(localeData);

function getProfileChartData (profileInfo, videos){
  const avgEngagementPerDay = getAvgEngagementPerDay(videos);
  const engagementRatePerDay = avgEngagementPerDay.map((item) => {
    item.value = item.value / profileInfo.follower_count;
    return item;
  });

  // console.log(getAudienceActivity(videos));

  let dataResult = {
    postPerDates: getPostPerDate(videos),
    commentPerDates: getCommentPerDate(videos),
    likePerDates: getLikePerDate(videos),
    viewPerDates: getViewPerDate(videos),

    mostWords: getMostWords(videos),
    mostMentions: getMostMentions(videos),
    mostHashtags: getMostHashtags(videos),
    mostLocation: getMostLocation(videos),
    mostTypePost: getMostTypePost(videos),

    postActivity: getPostActivity(videos),
    audienceActivity: getAudienceActivity(videos),

    postPerDay: getPostPerDay(videos),
    viewPerDay: getViewPerDay(videos),

    avgEngagementPerDay,
    engagementRatePerDay,
  };
  return dataResult;
};

function topPosts(username, posts) {
  let post = [];
  let result = {};

  for(let data of posts){
    post.push(
    {
      username: username,
      likeCount: data.likeCount,
      commentCount: data.commentCount,
      shortcode: data.shortcode,
      isVideo: data.isVideo,
      covers: data.covers,
      caption: data.caption,
      createTime: data.createTime,
      playCount: data.playCount
    });
  }

  result.mostEng = post
    .slice(0)
    .sort((a, b) => (a.likeCount + a.commentCount > b.likeCount + b.commentCount ? -1 : 1))
    .slice(0, 5);
  result.mostLike = post
    .slice(0)
    .sort((a, b) => (a.likeCount > b.likeCount ? -1 : 1))
    .slice(0, 5);
  result.mostComment = post
    .slice(0)
    .sort((a, b) => (a.commentCount > b.commentCount ? -1 : 1))
    .slice(0, 5);
  result.mostViewed = post
    .slice(0)
    .filter(video => video.playCount > 0)
    .sort((a, b) => (b.playCount - a.playCount))
    .slice(0, 5);
  result.mostRecent = post
    .slice(0)
    .sort((a, b) => (a.createTime > b.createTime ? -1 : 1))
    .slice(0, 5);

  console.log(result);
  return result;
}


function getAvgEngagementPerDay (videos){
  const perDay = {};

  for (let video of videos) {
    const day = moment.unix(video.createTime).format("dddd");

    if (perDay[day])
      perDay[day].value += video.likeCount + video.commentCount;
    else perDay[day] = { day, value: video.likeCount + video.commentCount };
  }

  return parseFullChartPerDay(perDay);
};

function getDateValue (result, createdAt, additionValue){
  const date = moment.unix(createdAt).startOf('day').unix();

  if (result[date]) result[date].value += additionValue;
  else result[date] = { date: date.toString(), value: additionValue };

  return result;
};

function sortDateValue (result) {
  return result.sort((a, b) => +a.date - +b.date);
}

function parseFullHeatmap (heatmap){
  const days = dayjs.weekdays();

  const fullHeatmap= {};
  for (let day of days) {
    fullHeatmap[day] = { day, activities: {} };
    for (let i = 0; i < 24; i++) {
      fullHeatmap[day].activities[i.toString()] = heatmap[day]?.activities[
        i.toString()
      ] || { hour: i, value: 0 };
    }
  }

  return Object.values(fullHeatmap).map((item) => ({
    day: item.day,
    activities: Object.values(item.activities),
  }));
};

function getAudienceActivity (videos){
  const audienceEngagementHeatmap = {};

  for (let video of videos) {
    const day = moment.unix(video.createTime).format("dddd");
    const hour = moment.unix(video.createTime).format("H");

    const instagramEngagement = video.likeCount + video.commentCount;

    if (audienceEngagementHeatmap[day]) {
      if (audienceEngagementHeatmap[day].activities[hour])
        audienceEngagementHeatmap[day].activities[hour].value +=
          instagramEngagement;
      else
        audienceEngagementHeatmap[day].activities[hour] = {
          hour: +hour,
          value: instagramEngagement,
        };
    } else {
      audienceEngagementHeatmap[day] = { day, activities: {} };
      audienceEngagementHeatmap[day].activities[hour] = {
        hour: +hour,
        value: instagramEngagement,
      };
    }
  }

  return parseFullHeatmap(audienceEngagementHeatmap);
};


function getPostActivity (videos){
  const activityHeatmap = {};

  for (let video of videos) {
    const day = moment.unix(video.createTime).format("dddd");
    const hour = moment.unix(video.createTime).format("H");

    if (activityHeatmap[day]) {
      if (activityHeatmap[day].activities[hour])
        activityHeatmap[day].activities[hour].value++;
      else activityHeatmap[day].activities[hour] = { hour: +hour, value: 1 };
    } else {
      activityHeatmap[day] = { day, activities: {} };
      activityHeatmap[day].activities[hour] = { hour: +hour, value: 1 };
    }
  }

  return parseFullHeatmap(activityHeatmap);
};

function splitTextToWords (text){
  return text
    .split("\n")
    .reduce(
      (words, sentence) => [...words, ...sentence.split(" ")],
      []
    );
};

function getMostWords (videos){
  return Object.values(
    videos.reduce((most, video) => {
      for (const word of splitTextToWords(video.caption || "")) {
        if (word[0] !== "#" && word[0] !== "@" && word.length > 4) {
          if (!most[word]) most[word] = { key: word, value: 1 };
          else most[word].value++;
        }
      }

      return most;
    }, {})
  )
    .sort((a, b) => b.value - a.value)
    .slice(0, 20);
};

function getMostMentions (videos){
  return Object.values(
    videos.reduce((most, video) => {
      for (const word of splitTextToWords(video.caption || "")) {
        if (word[0] === "@") {
          if (!most[word]) most[word] = { key: word, value: 1 };
          else most[word].value++;
        }
      }

      return most;
    }, {})
  )
    .sort((a, b) => b.value - a.value)
    .slice(0, 20);
};

function getMostHashtags (videos){
  return Object.values(
    videos.reduce((most, video) => {
      for (const word of splitTextToWords(video.caption || "")) {
        if (word[0] === "#") {
          if (!most[word]) most[word] = { key: word, value: 1 };
          else most[word].value++;
        }
      }

      return most;
    }, {})
  )
    .sort((a, b) => b.value - a.value)
    .slice(0, 20);
};

function getMostLocation (videos){
  return Object.values(
    videos.reduce((most, video) => {
      if(video.location.name){
          if (!most[video.location.name]) most[video.location.name] = { key: video.location.name, value: 1 };
          else most[video.location.name].value++;
      }
      return most;
    }, {})
  )
    .sort((a, b) => b.value - a.value)
    .slice(0, 20);
};

function getMostTypePost (videos){
  return Object.values(
    videos.reduce((most, video) => {
      if(video.productType){
          if (!most[video.productType]) most[video.productType] = { key: video.productType, value: 1 };
          else most[video.productType].value++;
      }
      return most;
    }, {})
  )
    .sort((a, b) => b.value - a.value)
    .slice(0, 20);
};

function getPostPerDay (videos) {
  const perDay = {};

  for (let video of videos) {
    const day = moment.unix(video.createTime).format("dddd");

    if (perDay[day]) perDay[day].value++;
    else perDay[day] = { day, value: 1 };
  }

  return parseFullChartPerDay(perDay);
};

function getCommentPerDate (videos){
  const result = videos.reduce((result, video) => {
    return getDateValue(result, video.createTime, video.commentCount);
  }, {});
  return sortDateValue(Object.values(result));
};

function getLikePerDate (videos){
  const result = videos.reduce((result, video) => {
    return getDateValue(result, video.createTime, video.likeCount);
  }, {});
  return sortDateValue(Object.values(result));
};

function getViewPerDate (videos){
  const result = videos.reduce((result, video) => {
    return getDateValue(result, video.createTime, video.playCount);
  }, {});
  return sortDateValue(Object.values(result));
};

function getPostPerDate (videos){
  const result = videos.reduce((result, video) => {
    return getDateValue(result, video.createTime, 1);
  }, {});
  return sortDateValue(Object.values(result));
};

function getViewPerDay (videos){
  const perDay = {};

  for (let video of videos) {
    const day = moment.unix(video.createTime).format("dddd");

    if (perDay[day]) perDay[day].value += video.playCount;
    else perDay[day] = { day, value: video.playCount };
  }

  return parseFullChartPerDay(perDay);
};

function parseFullChartPerDay (chartPerDay){
  const days = dayjs.weekdays();
  const fullChartPerDay = {};

  for (let day of days) {
    fullChartPerDay[day] = { day, value: chartPerDay[day]?.value || 0 };
  }

  return Object.values(fullChartPerDay);
};


module.exports = {
	getProfileChartData,
  topPosts
};