const xlsx = require('node-xlsx');
const Logger = require('../../helpers/logger.js');
const jsonData = require('../../hashtag.json');
const FullHashtag = require('../../models/fullHashtag.js');
const { processFullHashtag } = require("./data/fullHashtagParser.js");
const { crawlPostInput } = require('./data/crawlPost.js');
const { crawlFullHashtag } = require('./data/crawlFullHashtag.js');

async function inputPostController (req, res) {
  Logger.info('got request with shortcode', req.params.shortcode);

  const shortcode = req.params.shortcode;
  const hashtag = req.params.hashtag;
  // Replace this with your actual function to add to a queue
  await addInputPostQueue({ shortcode, hashtag });
  return res.json({ message: 'queued!' });
};

 async function inputBulkHashtagController (req, res){
   if (!req.file) {
    return res.status(400).send({ message: 'Tidak ada file yang diunggah.' });
  }

  const hashtag = req.body.hashtag;
  console.log(hashtag);
  const buffer = req.file.buffer;
  const excel = xlsx.parse(buffer);

  // if (validateData(excel)) {
  //   return res.status(400).send('File Excel kosong atau tidak valid.');
  // }

  const shortcodes = new Set();
  const username = new Set();
  const errorCrawlingShortcode = new Set();
  const errorCrawlingProfile = new Set();

  excel.forEach(item => {
    if (item.name === 'url-post') {
      item.data.forEach(url => {  // Loop through each URL in the array
        const matches = url[0].match(/instagram\.com\/p\/([^/?]+)/);
        const matchesReel = url[0].match(/instagram\.com\/reel\/([^/?]+)/);

        let postcode;
        if (matches && matches[1]) {
          postcode = matches[1];
        } else {
          postcode = matchesReel ? matchesReel[1] : '';
        }

        shortcodes.add(postcode);
      });
    } else if (item.name === 'username') {
      item.data.forEach(name => {
        // Ubah menjadi lowercase
        username.add(name[0].toLowerCase());
      });
    }
  });

  let dataCrawling = await crawlFullHashtag(hashtag, 1000);
  console.log(dataCrawling);
  let calcResult = await processFullHashtag(dataCrawling, 1000);
  console.log(calcResult);

  Logger.info(`got request with ${shortcodes.size} shortcodes`);
  for (const shortcode of shortcodes) {
    let crawl = await crawlPostInput(shortcode, hashtag);
    if(crawl && crawl.result) {
      Logger.info(`success queue shortcode ${crawl.query}`);
    } else {
      Logger.err(`error crawling shortcode ${crawl.query}, error detail = ${crawl.error}`);
      errorCrawlingShortcode.add(crawl.query);
    }
  }
  let saveHashtag = await FullHashtag.updateOne({ hashtag: hashtag }, { $set: calcResult }, {
    upsert: true,
  });

  if(saveHashtag){
    console.log("save success", saveHashtag);
  }

  return res.json({ message: 'success' });
};

function validateData(data) {
  return data.every(item => {
    return item.data.every(subArray => subArray.length > 0);
  });
}

module.exports = {
  inputPostController,
  inputBulkHashtagController
};