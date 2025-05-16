const Bull = require('bull');
const ObjectID = require("bson-objectid");
const { publish, subscribe } = require('../queue/message-queue');
const logQuery = require('../../../models/history');
const logger = require('../../../helpers/logger');
const { reportStatusMapper } = require('../../../helpers/exceptions/error-parser');
const { crawlFullProfile } = require('../data/crawlFullProfile');
const { CalculationError } = require('../../../helpers/exceptions/calculation-error');
const { REPORT_STATUS, SERVICE } = require('../../../interfaces/history');


// Konstanta untuk nama queue
const PROFILE_REQUEST = 'req_instagram_profile_1';
const PROFILE_RESULT = 'res_instagram_profile_1';

// Fungsi untuk memperbarui status history
const updateHistoryStatus = async (key, status) => {
  logger.info('updating history status', key, status);

 const dataHistory = await History.findOne({ key });
  console.log("history". dataHistory);
  if (!dataHistory) {
    throw new Error(
      'No search history found with given id! Make sure to create it first before send it to MQ!'
    );
  }

	return await HistoryModel.findOneAndUpdate(
	  { key: key },
	  { $set: {
      status,
      statusLog: [...dataHistory.statusLog, { timestamp: new Date(), status }]
	  }}
	);
};

// Fungsi untuk menangani error
const handleError = async (error, job) => {
  const erroredHistory = await updateHistoryStatus(
    job.data.id,
    reportStatusMapper(
      error instanceof CalculationError
        ? error.meta
        : error.message || 'Unknown error'
    )
  );
  await publish(PROFILE_RESULT, erroredHistory, job.data.id);
};

// Fungsi untuk menginisialisasi worker untuk profile
const initProfileWorker = async () => {
  subscribe(PROFILE_REQUEST, async (job) => {
    try {
      logger.info('processing queue', job.data);

      const processedHistory = await updateHistoryStatus(
        job.data.key,
        REPORT_STATUS.PROCESSING
      );
      
      console.log("data", processedHistory);

      let resultCrawler = await crawlFullProfile(
        job.data.query,
        job.data.postCount
      );

      console.log("resultCrawler",resultCrawler);

      const finishedHistory = await updateHistoryStatus(
        processedHistory.key,
        REPORT_STATUS.FINISH
      );

      console.log("finishedHistory", finishedHistory)
      await publish(PROFILE_RESULT, finishedHistory, finishedHistory.key);
    } catch (error) {
      console.log(error,'<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<')
      await handleError(error, job);
      throw error;
    }
  });
};

module.exports = {
  PROFILE_REQUEST,
  PROFILE_RESULT,
  initProfileWorker,
};
