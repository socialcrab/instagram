const Bull = require("bull");
const logger = require("../../../helpers/logger");
const config = require("../../../config/config.js");

// Konfigurasi koneksi Redis dari environment variables
const redis = {
  host: config.redis.host || "",
  port: config.redis.port || 0,
  password: config.redis.password || "",
  db: config.redis.db || 0,
};

// Konfigurasi pengaturan queue
const settings = {
  lockDuration: 600000, // 10 menit untuk menjaga lock job tetap aktif
  lockRenewTime: 15000, // Perbarui lock setiap 15 detik
  stalledInterval: 30000, // Interval untuk memeriksa job yang stuck
  maxStalledCount: 0, // Tidak ada limit untuk job yang stuck
  guardInterval: 5000, // Interval untuk memeriksa job stalled
  retryProcessDelay: 5000, // Delay sebelum memproses ulang job
  backoffStrategies: {}, // Strategi backoff
  drainDelay: 5, // Delay sebelum menguras antrian job
};

// Fungsi untuk membuat antrian dengan nama yang diberikan
function createQueue (name) {
  let dataQueue = new Bull(name, { redis: redis, settings: settings });

  return dataQueue;
};

// Fungsi untuk berlangganan dan memproses job dari antrian
const subscribe = (queueName, callback) => {
  logger.info("Creating subscriber queue", queueName);
  const queue = createQueue(queueName);

  queue.on("active", (job) => {
    logger.info("Queue active", JSON.stringify(job.id))
  }
  );
  queue.on("completed", (job) => {
    logger.info("Queue complete", JSON.stringify(job.id))
  }
  );
  queue.on("failed", async (job) => {
    console.log("job failed", job);
    logger.info("Queue failed", JSON.stringify(job.id));
  });
  queue.on("error", (error) => {
    console.log("error queue", error);
    logger.err("Queue error", JSON.stringify(error))
  });

  // Memproses job menggunakan callback yang diberikan
  queue.process(callback);
  logger.info("Queue", queueName, "initialized!");
};

// Fungsi untuk menambahkan job ke antrian
const publish = async (queueName, data, jobId) => {
  logger.info("Creating publisher queue");
  const queue = createQueue(queueName);

  logger.info("Adding queue", jobId);
  const job = await queue.add(data, { jobId });
  const jobState = await job.getState();

  logger.info("Got job", job.id, jobState);
  if (jobState === "failed") {
    logger.info("Retrying failed job");
    await job.retry();
  } else if (jobState === "stuck") {
    logger.info("Moving stuck job to failed and retrying");
    await job.moveToFailed({
      message: "Moving to failed due to a request with same jobId",
    });
    await job.retry();
  }

  logger.info("Closing queue");
  await queue.close();
};


module.exports = {
  publish,
  subscribe,
  createQueue
}