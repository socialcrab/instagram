const { savePost } = require("./postParser.js");
const logQuery = require("./logQuery.js");
const { processNewFullHashtag } = require("./fullHashtagParser.js");
const FullHashtag = require("../../../models/fullHashtag.js");
const igClones = require("../../../helpers/igClone.js");
const Sentry = require("@sentry/node");
const config = require("../../../config/config.js");
const Logger = require("../../../helpers/logger.js");

module.exports = {
	crawlFullHashtag: async (
		query,
		limit,
		type
	) => {
		let context = undefined;
		let page = undefined;
		let scrollTimeout = config.scrollTimeout ?? 20000;
		const cacheLogin = await igClones.getLoginCache();
		try {
			context = await global.browser.newContext({
				storageState: cacheLogin.loginContext,
			});
			page = await context.newPage();

			let jsonFirstPage = undefined;
			let totalPostGetted = 0;
			let userId = null;
			let valid = false;
			let repeatFirstPage = 0;
			let scrollMore = false;
			let statusAPIV1, statusAPIV2 = true;
		    while (!valid && repeatFirstPage < 5) {
		      try {
		        await Promise.all([
		          page
		            .waitForResponse(
		              (response) =>
		                response.url().includes(`/api/v1/tags/web_info/?tag_name=${query}`) && response.status() === 200,
		              { timeout: 30000 },
		            )
		            .then(async (response) => {
		              jsonFirstPage = 	await response.json();
		              Logger.info(`got hashtag web data with ${jsonFirstPage.data.media_count} post claimed`);
		              scrollMore = jsonFirstPage.data.recent.more_available
		                ? jsonFirstPage.data.recent.more_available
		                : jsonFirstPage.data.top.more_available;

		              // await Promise.all(jsonFirstPage.data.top.sections.edges.map((edge) => savePost(edge.node, query) || savePostV3(edge)));
		            }),

		          page.waitForSelector(`img[alt="${cacheLogin.username}'s profile picture"]`).catch(async () => {
		            // if (cacheLogin.retryLogin >= 3) {
		            //   const message = `${cacheLogin.username} login cache need to relogin!`;
		            //   Logger.warn(message);
		            //   await updateRetryCount(cacheLogin.username, 'relogin').catch((error) => Logger.err(error));
		            // } else {
		            //   Logger.warn(`retrying login ${cacheLogin.username} for ${cacheLogin.retryLogin}x`);
		            //   await updateRetryLogin(cacheLogin);
		            // }

		            console.log("error");
		          }),

		          page.goto(`https://www.instagram.com/explore/tags/${query}`),
		        ]);

		        valid = true;
		      } catch (error) {
		        Logger.warn('error at opening page', error);
		        repeatFirstPage++;
		      }
		    }
			if(repeatFirstPage >= 3) await igClones.updateRetryCount(cacheLogin);

			await page.close();
			await context.close();
			var queryLower = query.toLowerCase();
			var calcResult, calcPreviewResult;

			if (jsonFirstPage === undefined) return { meta: "not-found" };

			return jsonFirstPage.data;
		} catch (error) {
			Logger.err(error);

			if (page !== undefined) await page.close();
			if (context !== undefined) await context.close();
			await igClones.updateRetryCount(cacheLogin);

			return { meta: "bad-gateway" };
		}
	}
}
