const { savePost, savePostV2, savePostV3, checkMissingHolePost } = require("./postParser.js");
const { savePostReels } = require("./reelsPostParser.js");
const logQuery = require("./logQuery.js");
const { processFullProfile, processNewFullProfile } = require("./fullProfileParser.js");
const FullProfile = require("../../../models/fullProfile.js");
const FullProfileData = require("../../../models/fullProfileData.js");
const previewProfile = require("../../../models/previewProfile.js");
const igClones = require("../../../helpers/igClone.js");
// const timeout = require("../../../helpers/putS3Images.js");
const Sentry = require("@sentry/node");
const config = require("../../../config/config.js");
const Logger = require("../../../helpers/logger.js");

module.exports = {
	crawlFullProfile: async (
		query,
		limit
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

			let igUserData = undefined;
			let totalPostGetted = 0;

			let userId = null;
			let valid = false;
			let repeatFirstPage = 0;
			let scrollMore = false;
			let statusAPIV1, statusAPIV2 = true;
			while (!valid && repeatFirstPage <= 3) {
				try {
					await Promise.all([
						page
							.waitForResponse(
								(response) => 
								{	if(response.url().includes(`/api/v1/users/web_profile_info/?username=${query}`) && response.status() === 200) { return true } else { return false }   },
								{
									timeout: 60000,
								}
							)
							.then(async (webProfileInfoResponse) => {
								const webProifleInfojson = await webProfileInfoResponse.json();
								console.log("web data",webProifleInfojson);
								igUserData = webProifleInfojson.data.user;

								valid = igUserData.is_private || igUserData.media_count <= 0;
								scrollMore = igUserData.edge_owner_to_timeline_media.page_info.has_next_page || false;


								const postGetted = igUserData.edge_owner_to_timeline_media.count;
								console.log("data post", igUserData.edge_owner_to_timeline_media);
								Logger.info(`got initial ${postGetted} post`);

								if(postGetted > 1) valid = true;
							}),
						page
							.waitForResponse(async (response) => {
								if(response.url().includes("/graphql") && response.status() === 200) {
									const responseData = await response.json();
									if(responseData.data 
										&& responseData.data.user
										&& responseData.data.user.username) return true
									return false;
								};
							}, {
								timeout: 60000,
							})
							.then(async (postResponse) => {
								const postJson = await postResponse.json();
								igUserData = postJson.data.user;
								console.log("web data",igUserData);
								scrollMore = true;
								valid = true;
								Logger.info(`got profile data`);

							}).catch(((err) => { 
								statusAPIV1 = false;
								Logger.err(err) 
							})),
						page
							.waitForResponse(async (response) => {
								if(response.url().includes("/graphql") && response.status() === 200) {
									const responseData = await response.json();
									if(responseData.data
										&& responseData.data.xdt_api__v1__feed__user_timeline_graphql_connection
										&& responseData.data.xdt_api__v1__feed__user_timeline_graphql_connection.edges !== undefined 
										&& responseData.data.xdt_api__v1__feed__user_timeline_graphql_connection.edges.length > 1) return true
									return false;
								};
							}, {
								timeout: 60000,
							})
							.then(async (postResponse) => {
								const json = await postResponse.json();
								scrollMore = json.data.xdt_api__v1__feed__user_timeline_graphql_connection.page_info.has_next_page;

								const postGetted = json.data.xdt_api__v1__feed__user_timeline_graphql_connection.edges.length;
								Logger.info(`got another ${postGetted} post`);
								totalPostGetted += postGetted;

								await Promise.all(json.data.xdt_api__v1__feed__user_timeline_graphql_connection.edges.map((edge) => savePost(edge.node, query) || savePostV3(edge)));
								valid = true;

							}).catch(((err) => { 
								statusAPIV1 = false;
								Logger.err(err) 
							})),
						page.waitForSelector(`img[alt="${cacheLogin.username}'s profile picture"]`).catch((reason) => {
							if(cacheLogin.retryLogin >= 3){
								Logger.warn(`${cacheLogin.username} login cache need to relogin!`);
								igClones.updateRelogin(cacheLogin);
							} else {
								Logger.warn(`retrying ${cacheLogin.username} for ${cacheLogin.retryLogin}x`);
								igClones.updateRetryLogin(cacheLogin);
							}
						}),
						page.goto(`https://www.instagram.com/${query}`, {
							timeout: 60000,
						}),
					]);

				} catch (error) {
					Logger.err("error on opening profile page", error);
					repeatFirstPage++;
				}
			}
			if(repeatFirstPage >= 3) await igClones.updateRetryCount(cacheLogin);

			let repeatScrollPage = 0;
			let timeOut = (scrollTimeout+(Math.random() * 5000));
				while (scrollMore && (totalPostGetted <= limit)) {
					Logger.info("post total", {
						totalPostGetted : totalPostGetted,
						limit : limit
					});
					try {
						const [response] = await Promise.all([
							page.waitForResponse(async (response) => {
							if(response.url().includes("/graphql") && response.status() === 200) {
									const responseData = await response.json();
									if(responseData.data
										&& responseData.data.xdt_api__v1__feed__user_timeline_graphql_connection
										&& responseData.data.xdt_api__v1__feed__user_timeline_graphql_connection.edges !== undefined 
										&& responseData.data.xdt_api__v1__feed__user_timeline_graphql_connection.edges.length > 1) return true
									return false;
								};
							}, {
								timeout: 60000,
							}),
							page.evaluate(() => {
								const htmlEl = document.querySelector("html");
								if (htmlEl) htmlEl.style.scrollBehavior = "smooth";

								window.scrollBy(0, document.body.scrollHeight);
							}),
							page.waitForTimeout(timeOut)
						]);

						const json = await response.json();
						scrollMore = json.data.xdt_api__v1__feed__user_timeline_graphql_connection.page_info.has_next_page;

						const postGetted = json.data.xdt_api__v1__feed__user_timeline_graphql_connection.edges.length;
						Logger.info(`got another ${postGetted} post`);
						totalPostGetted += postGetted;

						await Promise.all(json.data.xdt_api__v1__feed__user_timeline_graphql_connection.edges.map((edge) => savePost(edge.node, query) || savePostV3(edge)));
					} catch (error) {
						Logger.err("error on scrolling page with API V1", error);
						repeatScrollPage++;
						scrollMore = repeatScrollPage <= 5;
					}
				}
				if(repeatScrollPage >= 5) await igClones.updateRetryCount(cacheLogin);


			await page.close();
			await context.close();
			var queryLower = query.toLowerCase();
			var calcResult, calcPreviewResult;

			if (igUserData === undefined) return { meta: "not-found" };
			if (igUserData.is_private) return { meta: "private" };
			if (igUserData.media_count <= 0) return { meta: "zero-post" };
			
			calcResult = await processNewFullProfile(igUserData, queryLower, limit, "full-profile");
			console.log("data", calcResult)
			await FullProfileData.updateOne({ username: queryLower }, { $set: calcResult }, {
				new: true,
				upsert: true,
			});

			return { meta: "exists", result: calcResult, totalPostGetted: totalPostGetted, postInstagram: igUserData.media_count};
		} catch (error) {
			Logger.err(error);

			if (page !== undefined) await page.close();
			if (context !== undefined) await context.close();
			await igClones.updateRetryCount(cacheLogin);

			return { meta: "bad-gateway" };
		}
	}
}
