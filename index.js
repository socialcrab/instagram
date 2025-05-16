//Dependencies
require('dotenv').config();
process.env.UV_THREADPOOL_SIZE = 128;
const Sentry = require("@sentry/node");
const Tracing = require("@sentry/tracing");
const express = require("express");
const ejs = require('ejs');
const app = require("express")();
process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = 0;
process.setMaxListeners(0);
const http = require("http").Server(app);
const config = require("./config/config.js");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const env = process.env.NODE_ENV || "development";
let { initBullBoardApp } = require("./controllers/crawler/queue/bull-manager.js");
let { initProfileWorker } = require("./controllers/crawler/worker/profile.js");
let { initHashtagWorker } = require("./controllers/crawler/worker/hashtag.js");
let { initBrowser, loginInstagram } = require("./helpers/playwright.js");
let logger = require("./helpers/logger.js");

Sentry.init({ 
  dsn: config.DSNSentry,
  integrations: [
    new Sentry.Integrations.Http({ tracing: true }),
    new Tracing.Integrations.Express({ app }),
  ], 
  tracesSampleRate: 1.0,
});

app.use(Sentry.Handlers.requestHandler());

let forceSsl = function (req, res, next) {
  if (req.headers["x-forwarded-proto"] !== "https") {
    return res.redirect(["https://", req.get("Host"), req.url].join(""));
  }
  return next();
};

if (env === "production") {
  app.use(forceSsl);
}

const limiter = rateLimit({
  windowMs: 60,
  max: config.reqPerMinute,
});

const corsOptions = {
  origin: function (origin, callback) {
    if (config.whiteList.indexOf(origin) > -1) {
      callback(null, true);
    } else {
      console.log({origin});
      callback(new Error("Not allowed by CORS"));
    }
  },
};

initProfileWorker();
logger.info("profile worker initialized!");

// initHashtagWorker();
// logger.info("hashtag worker initialized!");


// Set view engine
app.set('view engine', 'ejs');
app.set('views', './views'); //

app.use(limiter);
app.use(express.static("public"));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cors(corsOptions));

app.route("/mq", initBullBoardApp());

process.on("SIGINT", function () {
  mongoose.disconnect(function () {
    console.log("Mongoose disconnected on app termination");
    process.exit(0);
  });
});

(async () => {
  global.browser = await initBrowser();
  // await loginInstagram();

  require("./routes/route.js")(app);
  require("./controllers/crawler/service/fullProfileQueue.js")();
  require("./controllers/crawler/service/refreshFullProfileQueue.js")();

  app.use(Sentry.Handlers.errorHandler());
  app.use(Sentry.Handlers.tracingHandler());

  app.use(function (err, req, res, next) {
    console.error(err.stack);
    res.sendStatus(403);
  });
  app.use(function (req, res, next) {
    res.sendStatus(404);
  });

  http.listen(config.port, function () {
    console.log("listening on *:", config.port);
  });
})();
