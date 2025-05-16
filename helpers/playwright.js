const { chromium } = require("playwright");
const { getClone } = require("./igClone.js");
const config = require("../config/config.js");
const Logger = require('./logger.js');

/** @return {import('playwright').Browser} */
const initBrowser = async () => {
	try {
		let option = { headless: true, devtools: true };
		if (config.proxyBrowser) option.proxy = {
			server: config.proxyBrowser.server,
			username: config.proxyBrowser.username,
			password: config.proxyBrowser.password
		}
		if (config.headlessBrowser === false) option.headless = false;
		return await chromium.launch(option);
	} catch (error) {
		console.error(error);
		process.exit(1);
	}
};

const savePageContentToFile = (pageContent, query) => {
	const fs = require("fs");
	fs.writeFileSync(
		`tmp/profile-${query || new Date().getTime()}.html`,
		pageContent,
		(err) =>
			err ? console.error(err) : `new page content schema saved! @${query}`
	);
};

const saveJsonToFile = (json, query) => {
	const fs = require("fs");
	fs.writeFileSync(
		`tmp/${query || new Date().getTime()}.json`,
		JSON.stringify(json),
		(err) =>
			err ? console.error(err) : `new page content schema saved! @${query}`
	);
};

const doneScrolling = async (page, context) => {
  Logger.info('done scrolling, closing page ...');
  await page.waitForTimeout(5000);
  await page.close();
  await context.close();
};

const loginInstagram = async () => {
	try {
		const context = await global.browser.newContext();
		const page = await context.newPage();

		await page.goto("https://www.instagram.com", {
			waitUntil: "domcontentloaded",
		});
		await page.waitForTimeout(5000);

		const user = getClone();
		await page.fill(`input[name='username']`, user.username);
		await page.fill(`input[name='password']`, user.password);

		await page.click(`button[type='submit']`);

		await page.waitForNavigation();
		await page.goto("https://www.instagram.com");

		await context.storageState({ path: "playwright.json" });

		await page.close();
		await context.close();
	} catch (error) {
		console.error(error);
		process.exit(1);
	}
};

module.exports = {
	initBrowser,
	loginInstagram,
	savePageContentToFile,
	saveJsonToFile,
	doneScrolling
};
