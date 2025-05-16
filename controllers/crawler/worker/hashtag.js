const Bull = require('bull');
const { publish, subscribe } = require('../queue/message-queue');
const { history } = require('../../../models/history');
const logger = require('../../../helpers/logger');
const { reportStatusMapper } = require('../../../helpers/exceptions/error-parser');
const { profileCrawlerApplication } = require('../data/crawlFullProfile');
const { CalculationError } = require('../../../helpers/exceptions/calculation-error');


// Konstanta untuk nama queue
const HASHTAG_REQUEST = 'req_instagram_hashtag_1';
const HASHTAG_RESULT = 'res_instagram_hashtag_1';

// Fungsi untuk memperbarui status history
const updateHistoryStatus = async (id, status) => {
  logger.info('updating history status', id, status);

  const history = await appDb.history.findFirst({ where: { id } });
  if (!history) {
    throw new Error(
      'No search history found with given id! Make sure to create it first before send it to MQ!'
    );
  }

  return await appDb.history.update({
    where: { id },
    data: {
      status,
      statusLog: [...history.statusLog, { timestamp: new Date(), status }],
    },
  });
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
  await publish(HASHTAG_RESULT, erroredHistory, job.data.id);
};

// Fungsi untuk menginisialisasi worker untuk hashtag
const initHashtagWorker = async () => {
  subscribe(HASHTAG_REQUEST, async (job) => {
    try {
      logger.info('processing queue', job.data);

      const processedHistory = await updateHistoryStatus(
        job.data.id,
        REPORT_STATUS.PROCESSING
      );
      await hashtagCrawlerApplication(
        processedHistory.query,
        processedHistory.postCount
      );

      const finishedHistory = await updateHistoryStatus(
        processedHistory.id,
        REPORT_STATUS.FINISH
      );
      await publish(HASHTAG_RESULT, finishedHistory, finishedHistory.id);
    } catch (error) {
      await handleError(error, job);
      throw error;
    }
  });
};

module.exports = {
  HASHTAG_REQUEST,
  HASHTAG_RESULT,
  initHashtagWorker,
};
