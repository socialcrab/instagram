const Bull = require('bull');
const { createBullBoard } = require('@bull-board/api');
const { BullAdapter } = require('@bull-board/api/bullAdapter');
const { ExpressAdapter } = require('@bull-board/express');
const app = require("express");
const { PROFILE_REQUEST, PROFILE_RESULT } = require('../worker/profile');
const { HASHTAG_REQUEST, HASHTAG_RESULT } = require('../worker/hashtag');

const initBullBoardApp = () => {
  // Inisialisasi BullBoard dengan menggunakan express untuk mengintegrasikan serveStatic
  const serverAdapter = new ExpressAdapter();
  serverAdapter.setBasePath('/mq');
  // Buat BullBoard dan daftarkan queue yang ada
  createBullBoard({
    queues: [
      new BullAdapter(new Bull(PROFILE_REQUEST)),
      new BullAdapter(new Bull(PROFILE_RESULT)),
      new BullAdapter(new Bull(HASHTAG_REQUEST)),
      new BullAdapter(new Bull(HASHTAG_RESULT)),
    ],
    serverAdapter: serverAdapter,
  });

  // Mengembalikan plugin yang terdaftar
  return serverAdapter.getRouter();
};

module.exports = { initBullBoardApp };
