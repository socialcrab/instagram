import { Browser } from 'playwright';
export {};

declare global {
	var browser: Browser;
	var page: Page;
}
