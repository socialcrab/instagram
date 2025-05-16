
module.exports = {

	scrollTimeout : 20000,

	port: Number(process.env.PORT || 0) || 3006,

	socketUrl: process.env.ANALISA_URL || 'http://127.0.0.1:3000',

	crawlerMode: process.env.CRAWLER_MODE || 'page-by-page',

	urlList: {
		igProfileUrl: process.env.IG_PROFILE_URL || 'http://localhost:3030',
		igHashtagUrl: process.env.IG_HASHTAG_URL || 'http://localhost:3040',
	},

	scraper: {
		BASE_URL: "https://www.instagram.com",
		LOGIN_URL: "https://www.instagram.com/accounts/login/ajax/",
		LOGOUT_URL: "https://www.instagram.com/accounts/logout/",
		CHROME_WIN_UA: "Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:80.0) Gecko/20100101 Firefox/80.0"
	},

	database: {
		app: process.env.APP_DATABASE_URL || '',
		instagram: process.env.INSTAGRAM_DATABASE_URL || ''

	},

	sentry: {
		dsn: process.env.SENTRY_DSN || '',
	},

	proxy: {
		enable: process.env.PROXY_ENABLE === 'true',
		string: process.env.PROXY_STRING || '',
		server: process.env.PROXY_SERVER || '',
		username: process.env.PROXY_USERNAME || '',
		password: process.env.PROXY_PASSWORD || '',
	},

	disableQueue: process.env.DISABLE_QUEUE === 'true',
	resetQueue: process.env.RESET_QUEUE_ON_INIT === 'true',

	redis: {
		host: process.env.REDIS_HOST || '127.0.0.1',
		port: Number(process.env.REDIS_PORT || 6379),
		db: Number(process.env.REDIS_DB || 0),
		password: process.env.REDIS_PASSWORD || '',
	},

	headlessBrowser: process.env.HEADLESS_BROWSER === 'true',

	modules: process.env.MODULES ? process.env.MODULES.split(',') : [],

	profileAnalytics: {
		postLimit: {
		  preview: Number(process.env.PROFILE_POST_LIMIT_PREVIEW || 6),
		  full: Number(process.env.PROFILE_POST_LIMIT_FULL || 1000),
		},
	},

	hashtagAnalytics: {
		crawledPostLimit: {
		  preview: Number(process.env.HASHTAG_POST_LIMIT_PREVIEW || 6),
		  full: Number(process.env.HASHTAG_POST_LIMIT_FULL || 1000),
		},
		calculatedPostLimit: {
		  preview: Number(process.env.HASHTAG_CALCULATED_POST_LIMIT_PREVIEW || 6),
		  full: Number(process.env.HASHTAG_CALCULATED_POST_LIMIT_PREVIEW || 5000),
		},
	},

	rawProfile: {
		cache: Number(process.env.RAW_PROFILE_CACHE || 3 * 24 * 60),
	},

	oss: {
		OSS_ENDPOINT: process.env.OSS_ENDPOINT || '127.0.0.1',
		OSS_PORT: Number(process.env.OSS_PORT || '127.0.0.1'),
		OSS_SSL: Boolean(process.env.OSS_SSL || true),
		OSS_ACCESS_KEY: process.env.OSS_ACCESS_KEY || '127.0.0.1',
		OSS_SECRET_KEY: process.env.OSS_SECRET_KEY || '127.0.0.1',
		OSS_BUCKET_NAME: process.env.OSS_BUCKET_NAME || '127.0.0.1',
	},

	reqPerMinute: 50,
	cacheAge: 30000, //in minute
	cachePost: 14, //in day
	previewCacheAge: 129600, //in minute
	url: "https://analisa.io",
	scrollTimeout:10000,
	queueConcurrency: 2,
	timeout: 15000,
	DSNSentry: 'https://d2fd48fc5d214891b69c60b8e9aa6096@o393012.ingest.sentry.io/5390275',
	needProxy: "http://customer-nitto:bukanrahasiaanyatiga@pr.oxylabs.io:7777",
	whiteList: ["https://analisa.io",undefined,"http://localhost:3003"],
	worker: ["full","full-new", "preview-new", "refresh-new"]
} 