//Profile
// const previewProfile = require("../controllers/previewProfile/previewProfileController.js");
// const fullProfile = require("../controllers/fullProfile/fullProfileController.js");
const express = require('express');
const multer = require('multer');
const fullProfileNew = require('../controllers/crawler/fullProfileController.js');
const csv = require("../controllers/csv/csvDownload");
const fullProfileData = require("../models/fullProfile.js");
const dashboardControler = require("../controllers/dashboard/dashboardAdminController.js");
const sheetTiktokController = require("../controllers/csv/export-xlsx-tiktok.js");
const sheetInstagramController = require("../controllers/csv/export-xlsx-instagram.js");
const { crawlFullProfile } = require("../controllers/crawler/data/crawlFullProfile.js");
const { processNewFullProfile } = require("../controllers/crawler/data//fullProfileParser.js");
const hashtagController = require('../controllers/crawler/inputPostController');
const { REPORT_STATUS, SERVICE } = require('../interfaces/history');
const History = require('../models/history');
const { publish } = require('../controllers/crawler/queue/message-queue');
const { PROFILE_REQUEST } = require('../controllers/crawler/worker/profile');
const { constructKey } = require('../helpers/keyHelper.js')
const { findOneHistoryByKey, parseHistory, saveHistory, updateHistoryStatus } = require('../helpers/historyHelper');

const dataProfile = require("../data.json");

const router = express.Router();
// Using multer for handling Excel file uploads
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

module.exports = function (app) {
  // app.get("/profile/:username", function (req, res, next) {
  //   previewProfile.getIndex(req, res);
  // });

  // app.get("/fullProfile/:username", function (req, res, next) {
  //   fullProfile.getIndex(req, res);
  // });

  app.get('/full-profile/:username', fullProfileNew.getIndex);
  app.get('/preview-profile/:username', fullProfileNew.getIndexPreview);
  app.get('/guest-profile/:username', fullProfileNew.getIndexPreview);
  
  app.get("/debug-sentry", function mainHandler(req, res) {
    throw new Error("My first Sentry error!");
  });

  app.get("/download/:query", function (req, res, next) {
    csv(req, res);
  });

  app.get("/full-username/:username", async function (req, res) {
    const result = await crawlFullProfile(req.params.username, 5000, "full-profile");
    res.json({ result });
  })

  app.get("/test", async function (req, res) {
    calcResult = await processNewFullProfile(dataProfile, "lugasanegah", 1000, "full-profile");
    res.json(calcResult);
  });

  app.get("/queue/:username/:post", async function (req, res) {

    let username = req.params.username;
    let post = req.params.post;
    const history = await History.create({
        email: 'lugas@asocialcrab.id',
        key: 'system_',
        service: SERVICE.PROFILE,
        query: username,
        monitoring: false,
        postCount: Number(post || 100), // Konversi ke number
        postCrawl: Number(post || 100), // Konversi ke number
        status: REPORT_STATUS.QUEUED,
        statusLog: [{ timestamp: new Date(), status: REPORT_STATUS.QUEUED }],
    });

    // let history;
    // const existingHistory = await findOneHistoryByKey(inputData.key);
    // if (existingHistory) {
    //   history = await updateHistoryStatus(
    //     existingHistory.key,
    //     REPORT_STATUS.QUEUED
    //   )
    // } else {
    //   history = parseHistory(await saveHistory(inputData))
    // }

    // await publish(PROFILE_REQUEST, history, history.key);
    // console.log('Job published:', history.key);

    res.json({"done": true});
  })

  app.get("/check-query", async function (req, res) {
    const result = await fullProfileData.find({ updatedAt: { $gt: new Date(Date.now() - 68 * 60 * 60 * 1000), $lt: new Date() }, commentRate: Infinity }).exec();
    result.forEach(element => {
      console.log(element.username);
    });
    res.json({ result: result.length });
  })


  app.get('/dashboard', async (req, res) => {
    res.render('index', { reports: [] });
  });

  app.get('/missing-post-reports', dashboardControler.missingPostReport);
  app.post('/crawl/upload', upload.single('excelFile'), hashtagController.inputBulkHashtagController);
  
    //export xlsx tiktok
  // app.get(
  //   "/download-csv-tiktok/profile/:query",
  //   sheetTiktokController.profileDownload
  // );
  // app.get(
  //   "/download-csv-tiktok/hashtag/:query",
  //   sheetTiktokController.hashtagDownload
  // );

  //export xlsx instagram
  app.get(
    "/download-csv-instagram/profile/:query",
    sheetInstagramController.profileDownload
  );
  app.get(
    "/download-csv-instagram/hashtag/:query",
    sheetInstagramController.hashtagDownload
  );
};
