const dayjs = require("dayjs");
const moment = require("moment");
const localeData = require("dayjs/plugin/localeData");

dayjs.extend(localeData);

const getDateValue = (result, postCreatedAt, additionValue) => {
  const date = moment.unix(postCreatedAt).startOf('day').unix();

  if (result[date]) result[date].value += additionValue;
  else result[date] = { date: date.toString(), value: additionValue };

  return result;
};

const sortDateValue = (result) => {
  return result.sort((a, b) => +a.date - +b.date);
};

const splitTextToWords = (text) => {
  return text
    .split("\n")
    .reduce(
      (words, sentence) => [...words, ...sentence.split(" ")],
      []
    );
};

const getDayValue = (result, postCreatedAt, additionValue) => {
  const day = moment.unix(postCreatedAt).format("dddd");

  if (result[day]) result[day].value += additionValue;
  else result[day] = { day, value: additionValue };

  return result;
};

const parseFullChartPerDay = (chartPerDay) => {
  const days = dayjs.weekdays();

  const fullChartPerDay = {};
  for (const day of days) {
    fullChartPerDay[day] = { day, value: chartPerDay[day]?.value || 0 };
  }

  return Object.values(fullChartPerDay);
};

const getVideoPerDate = (videos) => {
  const result = videos.reduce((result, video) => {
    return getDateValue(result, video.createTime, 1);
  }, {});
  return sortDateValue(Object.values(result));
};

const getCommentPerDate = (videos) => {
  const result = videos.reduce((result, video) => {
    return getDateValue(result, video.createTime, video.commentCount);
  }, {});
  return sortDateValue(Object.values(result));
};

const getLikePerDate = (videos) => {
  const result = videos.reduce((result, video) => {
    return getDateValue(result, video.createTime, video.likeCount);
  }, {});
  return sortDateValue(Object.values(result));
};

const getViewPerDate = (videos) => {
  const result = videos.reduce((result, video) => {
    return getDateValue(result, video.createTime, video.playCount);
  }, {});
  return sortDateValue(Object.values(result));
};

const getReachPerDate = (videos) => {
  const result = videos.reduce((result, video) => {
    return getDateValue(result, video.createTime, video.owner.follower);
  }, {});
  return sortDateValue(Object.values(result));
};

const getMostWords = (videos) => {
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

const getMostMentions = (videos) => {
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

const getMostHashtags = (videos) => {
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

const getVideoActivity = (videos) => {
  const activityHeatmap = {};

  for (const video of videos) {
    const time = dayjs(video.createdAt);
    const day = time.format("dddd");
    const hour = time.format("H");

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

const getAudienceActivity = (videos) => {
  const audienceEngagementHeatmap = {};

  for (const video of videos) {
    const time = dayjs(video.createdAt);
    const day = time.format("dddd");
    const hour = time.format("H");

    const tweetEngagement = video.likeCount + video.commentCount;

    if (audienceEngagementHeatmap[day]) {
      if (audienceEngagementHeatmap[day].activities[hour])
        audienceEngagementHeatmap[day].activities[hour].value +=
          tweetEngagement;
      else
        audienceEngagementHeatmap[day].activities[hour] = {
          hour: +hour,
          value: tweetEngagement,
        };
    } else {
      audienceEngagementHeatmap[day] = { day, activities: {} };
      audienceEngagementHeatmap[day].activities[hour] = {
        hour: +hour,
        value: tweetEngagement,
      };
    }
  }

  return parseFullHeatmap(audienceEngagementHeatmap);
};

const parseFullHeatmap = (heatmap) => {
  const days = dayjs.weekdays();

  const fullHeatmap = {};
  for (const day of days) {
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

const getVideoPerDay = (videos) => {
  return parseFullChartPerDay(
    videos.reduce(
      (res, video) => getDayValue(res, video.createdAt, 1),
      {}
    )
  );
};

const getViewPerDay = (videos) => {
  return parseFullChartPerDay(
    videos.reduce((res, video) => 
      getDayValue(res, video.createdAt, video.playCount), 
    {})
  );
};

const getAvgEngagementPerDay = (videos) => {
  return parseFullChartPerDay(
    videos.reduce((res, video) => 
      getDayValue(res, video.createdAt, video.commentCount), 
    {})
  );
};

const getEngagementRatePerDay = (videos) => {
  return parseFullChartPerDay(
    videos.reduce((res, video) => 
      getDayValue(res, video.createdAt, video.likeCount + video.commentCount), 
    {})
  );
};

const getFollowerReachPerDay = (videos) => {
  return parseFullChartPerDay(
    videos.reduce((res, video) => 
      getDayValue(res, video.createdAt, video.owner.follower), 
    {})
  );
};

const getContributors = (videos) => {
  return Object.values(
    videos.reduce((res, video) => {
      const username = video.owner.username;
      
      if(video.owner.follower){
        if (res[username]) {
          res[username].videos.push(video);
        } else {
          res[username] = { ...video.owner, videos: [video] };
        }
      }

      return res;
    }, {})
  );
};

const getParticipations = (videos) => {
  const contributors = getContributors(videos);

  return [
    {
      key: "total",
      title: "Total Contributors",
      value: contributors.length,
      order: 0,
    },
    {
      key: "level-1",
      title: "Contributors with 11+ Posts",
      value: contributors.filter(
        (contributor) => contributor.videos.length >= 11
      ).length,
      order: 1,
    },
    {
      key: "level-2",
      title: "Contributors with 6-10 Posts",
      value: contributors.filter(
        (contributor) =>
          contributor.videos.length >= 6 &&
          contributor.videos.length <= 10
      ).length,
      order: 2,
    },
    {
      key: "level-3",
      title: "Contributors with 1-5 Posts",
      value: contributors.filter(
        (contributor) =>
          contributor.videos.length >= 1 &&
          contributor.videos.length <= 5
      ).length,
      order: 3,
    },
  ];
};

const getCategories = (start, end, numCategories) => {
  if (numCategories <= 0) {
    throw new Error("Number of categories must be greater than 0.");
  }

  const totalRange = end - start + 1;

  if (numCategories > totalRange) {
    numCategories = totalRange;
  }

  const categorySize = Math.floor(totalRange / numCategories);
  const remainder = totalRange % numCategories;

  const categories = [];
  let currentStart = start;

  for (let i = 0; i < numCategories; i++) {
    let currentEnd = currentStart + categorySize - 1;
    if (i < remainder) {
      currentEnd += 1;
    }

    categories.push([currentStart, currentEnd]);
    currentStart = currentEnd + 1;
  }

  return categories;
};

const getPotentialInfluencer = (contributors) => {
  const GROUP_BY = 5;
  // console.log("getPotentialInfluencer", contributors);
  const followerCounts = contributors.map((c) => c.follower);
  console.log("followerCounts",followerCounts);
  const categories = getCategories(
    Math.min(...followerCounts),
    Math.max(...followerCounts),
    GROUP_BY
  );
  console.log("categories", categories);

  const groups = categories.map(([start, end], i) => ({
    key: `${start}-${end}`,
    title: `${start} - ${end}`,
    order: i,
    value: 0,
  }));

  contributors.forEach((contributor) => {
    const followerCount = contributor.follower;

    for (let i = 0; i < categories.length; i++) {
      const [start, end] = categories[i];
      if (followerCount >= start && followerCount <= end) {
        groups[i].value++;
        break;
      }
    }
  });

  return groups;
};

const getTopReachContributor = (contributors) => {
  contributors.sort((a, b) => b.follower - a.follower);
  const totalReach = contributors.reduce(
    (res, contributor) => res + contributor.follower,
    0
  );

  const top = contributors.slice(0, 5).map((contributor) => ({
    username: contributor.username,
    value: contributor.follower,
    percentage:
      Math.round((contributor.follower / totalReach) * 100 * 100) /
      100,
  }));

  const rest = contributors.slice(5).reduce(
    (res, contributor) => {
      res.value = res.value + contributor.follower;
      res.percentage = Math.round((res.value / totalReach) * 100 * 100) / 100;
      return res;
    },
    { username: "other", value: 0, percentage: 0 }
  );

  return [...top, rest];
};

const getTopEngagementContributor = (contributors) => {
  const contributorsWithEngagement = contributors.map((contributor) => {
    const engagement = contributor.videos.reduce(
      (res, video) => res + video.likeCount + video.commentCount,
      0
    );
    return { ...contributor, engagement };
  });

  contributorsWithEngagement.sort((a, b) => b.engagement - a.engagement);

  const totalEngagement = contributorsWithEngagement.reduce(
    (res, contributor) => res + contributor.engagement,
    0
  );

  const top = contributorsWithEngagement.slice(0, 5).map((contributor) => ({
    username: contributor.username,
    value: contributor.engagement,
    percentage:
      Math.round((contributor.engagement / totalEngagement) * 100 * 100) / 100,
  }));

  const rest = contributorsWithEngagement.slice(5).reduce(
    (res, contributor) => {
      res.value = res.value + contributor.engagement;
      res.percentage =
        Math.round((res.value / totalEngagement) * 100 * 100) / 100;
      return res;
    },
    { username: "other", value: 0, percentage: 0 }
  );

  return [...top, rest];
};

const getTopVideoCountContributor = (contributors) => {
  contributors.sort((a, b) => b.videos.length - a.videos.length);
  const total = contributors.reduce(
    (res, contributor) => res + contributor.videos.length,
    0
  );

  const top = contributors.slice(0, 5).map((contributor) => ({
    username: contributor.username,
    value: contributor.videos.length,
    percentage:
      Math.round((contributor.videos.length / total) * 100 * 100) / 100,
  }));

  const rest = contributors.slice(5).reduce(
    (res, contributor) => {
      res.value = res.value + contributor.videos.length;
      res.percentage = Math.round((res.value / total) * 100 * 100) / 100;
      return res;
    },
    { username: "other", value: 0, percentage: 0 }
  );

  return [...top, rest];
};

const calcVideoEngagement = (stats) => {
  return stats.likeCount + stats.commentCount;
};

const calcVideoEngagementRatePerView = (stats) => {
  return calcVideoEngagement(stats) / stats.playCount;
};

const calcVideoEngagementRatePerFollower = (stats, authorStats) => {
  const followerCount = authorStats?.follower;
  return followerCount ? calcVideoEngagement(stats) / followerCount : 0;
};

const calcVideoImpression = (stats) => {
  return stats.playCount;
};

const calcVideoReach = (stats, authorStats) => {
  return (
    stats.playCount *
    calcVideoEngagementRatePerView(stats) *
    calcVideoEngagementRatePerFollower(stats, authorStats)
  );
};

const mapVideoInfo = (video) => {
  return {
    authorName: video.owner.username,
    caption: video.caption,
    coverImageUrl: video.covers,
    createdAt: video.createdAt,
    totalViews: video.playCount,
    totalLikes: video.likeCount,
    totalComments: video.commentCount,
    // followerImpression: calcVideoImpression(video),
    // followerReach: calcVideoReach(video, video.owner.stats),
  };
};

// Export functions
module.exports = {
  getVideoPerDate,
  getCommentPerDate,
  getLikePerDate,
  getViewPerDate,
  getReachPerDate,
  getMostWords,
  getMostMentions,
  getMostHashtags,
  getVideoActivity,
  getAudienceActivity,
  getVideoPerDay,
  getViewPerDay,
  getAvgEngagementPerDay,
  getEngagementRatePerDay,
  getFollowerReachPerDay,
  getContributors,
  getParticipations,
  getCategories,
  getPotentialInfluencer,
  getTopReachContributor,
  getTopEngagementContributor,
  getTopVideoCountContributor,
  calcVideoEngagement,
  calcVideoEngagementRatePerView,
  calcVideoEngagementRatePerFollower,
  calcVideoImpression,
  calcVideoReach,
  mapVideoInfo,
};
