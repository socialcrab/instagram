function info(...args) {
  console.log(`[${new Date().toISOString()}] [INFO]`, ...args);
}

function warn(...args) {
  console.log(`[${new Date().toISOString()}] [WARNING]`, ...args);
}

function err(...args) {
  console.log(`[${new Date().toISOString()}] [ERROR]`, ...args);
}

module.exports = {
  info,
  warn,
  err,
};
