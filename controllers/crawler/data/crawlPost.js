const playwright = require('playwright');
const { saveSinglePost } = require("./postParser.js");
const appConfig = require('../../../config/config');
const Logger = require('../../../helpers/logger.js');
// Assuming these services are defined elsewhere
const { getLoginCache } = require('../../../helpers/igClone');
const captureMessage = require('@sentry/node').captureMessage;
const { doneScrolling } = require('../../../helpers/playwright');

const errorTypes = {
  NOT_FOUND: 'not-found',
  ZERO_POST: 'zero-post',
  INTERNAL_ERROR: 'internal-error',
  MISSING_POST: 'missing-post',
};

async function crawlPostInput(shortcode, hashtag) {
  let context;
  let page;

  // try {
    // Commented out as login cache is not implemented here
    // const loginCache = await getLoginContext('igh');
    // if (!loginCache) throw new LoginCacheNotFoundException();

    context = await global.browser.newContext({
      // storageState: loginCache.loginContext, // Commented out
    });
    page = await context.newPage();

    let jsonFirstPage;
    let postGetted;
    let valid = false;
    let repeat = 0;
    const scrollMore = false;

    while (repeat < 2) {
      try {
        await Promise.all([
          page.waitForResponse(async (response) => { 
            if(response.url().includes("/graphql") && response.status() === 200) {
              const responseData = await response.json();
              if(responseData.data 
                && responseData.data.xdt_shortcode_media
                && responseData.data.xdt_shortcode_media.shortcode) return true
              return false;
            }; 
          }, {
            timeout: 40000,
          })
            .then(async (response) => {
              jsonFirstPage = await response.json();
              if (jsonFirstPage.data && jsonFirstPage.data.xdt_shortcode_media) {
                Logger.info(`got data shortcode ${jsonFirstPage.data.xdt_shortcode_media.shortcode} `);
                postGetted = await saveSinglePost(jsonFirstPage.data.xdt_shortcode_media, hashtag);
              }
            }),
          page.goto(`https://www.instagram.com/p/${shortcode}`),
        ]);

        if (postGetted) {
          break;
        }
      } catch (error) {
        Logger.warn('error at opening page', error);
        repeat++;
      }
    }

    await doneScrolling(page, context);

    return { result: true, query: shortcode };
  // } catch (error) {
  //   Logger.err('error at crawling full hashtag', error);
  //   captureMessage(error); // Assuming you want to capture errors with Sentry
  //   return { result: false, error: errorTypes.INTERNAL_ERROR, query: shortcode };
  // } finally {
  //   await context.close();
  // }
}

module.exports = { 
  crawlPostInput 
};