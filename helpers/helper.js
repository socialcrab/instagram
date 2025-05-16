module.exports = {
    successResponse,
    errorResponse,
    switchProxy,
    refresh_session
};

const ListProxy = require("../models/list_proxy");
const config = require("../config/config");
const FakeIG = require("../models/fake_ig.js");


function successResponse(code, meta, query) {
	var endData = {
        code: 200,
        meta: "Success",
        data: { 
          massage : "Success",
          query : query
        }
    }

	return endData;
}

function errorResponse(meta, query, analyze) {
	if (meta === "not-found"){
		var endData = {
            code: 404,
            meta: meta,
            data: { 
              massage : "Error searching data, " + analyze + " not found",
              query : query
            }
        }
	} else if (meta === "private") {
		var endData = {
            code: 422,
            meta: meta,
            data: { 
              massage : "Error searching data, " + analyze + " is private",
              query : query
            }
        }
	} else if (meta === "restricted-account") {
    var endData = {
            code: 422,
            meta: meta,
            data: { 
              massage : "Error searching data, " + analyze + " is Restricted Account",
              query : query
            }
        }
  } else if (meta === "zero-post") {
    var endData = {
            code: 422,
            meta: meta,
            data: { 
              massage : "Error searching data, " + analyze + " has zero post",
              query : query
            }
        }
  } else {
		var endData = {
            code: 404,
            meta: "not-found",
            data: { 
              massage : "Error searching data, " + analyze + " not found",
              query : query
            }
        }
	}
	return endData;
}

function switchProxy(){
  return new Promise(async function (resolve) {
    if (config.needProxy) {
      // let proxies = await ListProxy.find();
      // let seed = new Date() % proxies.length;
      // let temp = proxies[seed].proxy_str.split("@");
      // let host = temp[1].split(":");
      // let credential = temp[0].split(":");
      // let proxy =  {
      //   host: host[0],
      //   port: host[1],
      //   auth: {
      //     username: credential[0],
      //     password: credential[1]
      //   }
      // };
      // let proxy = { proxy: proxies[seed].proxy_str }
      let proxy =  {
        host: "pr.oxylabs.io",
        port: 7777,
        auth: {
          username: "customer-analisa",
          password: "Bukanyangdululag1"
        }
      };
      return resolve(proxy);
    } else return resolve(null);
  });
}

function refresh_session() {
  return new Promise(async function (resolve) {
    go = false;
    console.log("refresh session");
    var igAccount = await FakeIG.find({ status: 1 })
      .sort({ last_used: 1 })
      .limit(1);
    console.log("using " + igAccount[0].username);
    igAccount[0].last_used = new Date().getTime();
    await igAccount[0].save();
    go = true;
    resolve(igAccount[0].session_string);
  });
}

function wait_for_a_while(s) {
  return new Promise(function (resolve) {
    setTimeout(function () {
      console.log("wait for a while " + s);
      resolve("resolve");
    }, s);
  });
}