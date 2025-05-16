const dayjs = require('dayjs');
const FullHashtag = require('../../../models/fullHashtag');
const LogQuery = require('../../../models/logQuery');
const Logger = require('../../../helpers/logger');
const FullProfile = require('../../../models/fullProfile');
const axios = require('axios');
const appConfig = require('../../../config/config.js');

const getFullProfileMissingPostReports = async (startDate, endDate) => {
  const dateFilter = {
    startDate: startDate
      ? dayjs(startDate).startOf('day').toDate()
      : dayjs().subtract(1, 'month').startOf('day').toDate(),
    endDate: endDate ? dayjs(endDate).endOf('day').toDate() : dayjs().endOf('day').toDate(),
  };

  const reports = await FullProfile.aggregate([
    {
      $match: {
        updatedAt: {
          $gte: dateFilter.startDate,
          $lte: dateFilter.endDate,
        },
        $and: [
          {
            $or: [
              { manuallyMarkedAsDoneAt: { $exists: false } },
              {
                manuallyMarkedAsDoneAt: {
                  $exists: true,
                  $gte: { $subtract: ['$updatedAt', 60000] }, // 60000 milliseconds = 1 minute
                },
              },
            ],
          },
        ],
      },
    },
    {
      $project: {
        report: 'profile',
        query: '$username',
        totalPost: '$totalUniquePost',
        estimatedPost: '$availableVideo',
        postCoverage: {
          $cond: {
            if: { $gt: ['$availableVideo', 0] },
            then: { $divide: ['$totalUniquePost', '$availableVideo'] },
            else: 0,
          },
        },
        hasMore: {
          $toBool: '$hasMore',
        },
        updatedAt: '$updatedAt',
      },
    },
    {
      $match: {
        $or: [
          { estimatedPost: { $gte: 1000 }, totalPost: { $lte: 600 } },
          { estimatedPost: { $lt: 1000, $gte: 500 }, postCoverage: { $lte: 0.7 } },
          { estimatedPost: { $lt: 500, $gte: 100 }, postCoverage: { $lte: 0.8 } },
          { estimatedPost: { $lt: 100, $gte: 1 }, postCoverage: { $lte: 0.9 } },
        ],
      },
    },
  ]).exec();

  return await Promise.all(
    reports.map(async (report) => {
      report.users = (await LogQuery.find({ query: report.query, mode: 'full-profile' }).lean()).map(
        (logQuery) => logQuery.email,
      );
      return report;
    }),
  );
};

const getFullHashtagMissingPostReports = async (startDate, endDate) => {
  const dateFilter = {
    startDate: startDate
      ? dayjs(startDate).startOf('day').toDate()
      : dayjs().subtract(1, 'month').startOf('day').toDate(),
    endDate: endDate ? dayjs(endDate).endOf('day').toDate() : dayjs().endOf('day').toDate(),
  };

  const reports = await FullHashtag.aggregate([
    {
      $match: {
        $and: [
          {
            $or: [
              { $and: [{ manuallyMarkedAsDoneAt: { $exists: false } }] },
              {
                $and: [
                  {
                    manuallyMarkedAsDoneAt: {
                      $exists: true,
                      $gte: { $dateSubtract: { startDate: '$updatedAt', unit: 'minute', amount: 1 } },
                    },
                  },
                ],
              },
            ],
          },
          {
            updatedAt: {
              $gte: dateFilter.startDate,
              $lte: dateFilter.endDate,
            },
          },
        ],
      },
    },
    {
      $project: {
        report: 'hashtag',
        query: '$hashtag',
        totalPost: '$totalUniquePost',
        estimatedPost: '$totalPostInstagram',
        postCoverage: {
          $cond: {
            if: { $gt: ['$totalPostInstagram', 0] },
            then: { $divide: ['$totalUniquePost', '$totalPostInstagram'] },
            else: 0,
          },
        },
        hasMore: {
          $toBool: '$hasMore',
        },
        updatedAt: '$updatedAt',
      },
    },
    {
      $match: {
        $or: [
          { estimatedPost: { $gte: 1000 }, totalPost: { $lte: 600 } },
          { estimatedPost: { $lt: 1000, $gte: 500 }, postCoverage: { $lte: 0.7 } },
          { estimatedPost: { $lt: 500, $gte: 100 }, postCoverage: { $lte: 0.8 } },
          { estimatedPost: { $lt: 100, $gte: 1 }, postCoverage: { $lte: 0.9 } },
        ],
      },
    },
  ]).exec();

  return await Promise.all(
    reports.map(async (report) => {
      report.users = (await LogQuery.find({ query: report.query, mode: 'full-hashtag' }).lean()).map(
        (logQuery) => logQuery.email,
      );
      return report;
    }),
  );
};

const crawlFullProfile = async (query) => {
  try {
    const response = await axios.get(`${appConfig.urlList.igProfileUrl}/full-profile/${query}?refresh=1&limit=5000`);
    try {
      const updatedUser = await FullProfile.findOneAndUpdate({ username: query }, { hasMore: false }, { new: true });
      Logger.info(`Berhasil mengirim antrian ${query}`);
    } catch (error) {
      Logger.err(`Error update data sewaktu crawl full-profile : ${error}`);
    }
    return response.data;
  } catch (error) {
    console.log('error', error);
  }
};

const crawlFullHashtag = async (query) => {
  try {
    const response = await axios.get(`${appConfig.urlList.igHashtagUrl}/full-hashtag/${query}?refresh=1&limit=1000`);
    try {
      const updatedUser = await FullHashtag.findOneAndUpdate({ hashtag: query }, { hasMore: false }, { new: true });
      Logger.info(`Berhasil mengirim antrian ${query}`);
    } catch (error) {
      Logger.err(`Error update data sewaktu crawl full-hashtag : ${error}`);
    }

    return response.data;
  } catch (error) {
    console.log('error', error);
  }
};

module.exports = {
  crawlFullHashtag,
  crawlFullProfile,
  getFullHashtagMissingPostReports,
  getFullProfileMissingPostReports
};
