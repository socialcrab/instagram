module.exports = {
  refreshRequest,
  getProxyCredential,
};

const ListProxy = require("../models/list_proxy.js");
const config = require("../config/config.js");

function refreshRequest(request, mode) {
  return new Promise(async function (resolve) {
    let proxy = await ListProxy.find({mode: mode});
    let seed = new Date() % proxy.length;
    let requestWrapped;
    if(config.needProxy){
      requestWrapped = request.defaults({ proxy: proxy[seed].proxy_str });
    } else {
      requestWrapped = request;
    }
    resolve(requestWrapped);
  });
}

function getProxyCredential() {
  return new Promise(async function (resolve) {
    let proxyConfig = config.proxy ? config.proxy.split("//") : "";
    let proxy = await ListProxy.find({
      proxy_str: { $regex: ".*" + proxyConfig[1] + ".*" },
    });
    let seed = new Date() % proxy.length;
    let proxyString = proxy[seed].proxy_str.split("//");
    proxyString = proxyString[1].split(":");
    let passProxy = proxyString[1].split("@");
    console.log("puppeteer using", proxy[seed].proxy_str);
    resolve({
      username: proxyString[0],
      password: passProxy[0],
    });
  });
}
