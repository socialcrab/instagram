const moment = require("moment");
const specialChar = require("../models/specialChar.js");
let arab = require("../helpers/specialCharacter/arabic.json");
let bangladesh = require("../helpers/specialCharacter/bangladesh.json");
let china = require("../helpers/specialCharacter/china.json");
let hongkong = require("../helpers/specialCharacter/hongkong.json");
let india = require("../helpers/specialCharacter/india.json");
let japan = require("../helpers/specialCharacter/japan.json");
let korea = require("../helpers/specialCharacter/korea.json");
let rusia = require("../helpers/specialCharacter/rusia.json");
let taiwan = require("../helpers/specialCharacter/taiwan.json");
let thailand = require("../helpers/specialCharacter/thailand.json");
let filipina = require("../helpers/specialCharacter/filipina.json");
let myanmar = require("../helpers/specialCharacter/myanmar.json");
module.exports = {
	index
};

async function index(req,res,next){
	//arabic
	for (let data of arab){
		if(data.character !== "؀" || data.character !== null || data.character !== ""){
			let dataResult = await langParser(data, "arabic");
			console.log("dataResult", dataResult);
		}
	}

	//bangladesh
	for (let data of bangladesh){
		if(data.character !== "؀" || data.character !== null || data.character !== ""){
			let dataResult = await langParser(data, "bangladesh");
			console.log("dataResult", dataResult);
		}
	}

	//china
	for (let data of china){
		if(data.character !== "؀" || data.character !== null || data.character !== ""){
			let dataResult = await langParser(data, "china");
			console.log("dataResult", dataResult);
		}
	}

	//hongkong
	for (let data of hongkong){
		if(data.character !== "؀" || data.character !== null || data.character !== ""){
			let dataResult = await langParser(data, "hongkong");
			console.log("dataResult", dataResult);
		}
	}

	//india
	for (let data of india){
		if(data.character !== "؀" || data.character !== null || data.character !== ""){
			let dataResult = await langParser(data, "india");
			console.log("dataResult", dataResult);
		}
	}

	//japan
	for (let data of japan){
		if(data.character !== "؀" || data.character !== null || data.character !== ""){
			let dataResult = await langParser(data, "japan");
			console.log("dataResult", dataResult);
		}
	}

	//korea
	for (let data of korea){
		if(data.character !== "؀" || data.character !== null || data.character !== ""){
			let dataResult = await langParser(data, "korea");
			console.log("dataResult", dataResult);
		}
	}

	//rusia
	for (let data of rusia){
		if(data.character !== "؀" || data.character !== null || data.character !== ""){
			let dataResult = await langParser(data, "rusia");
			console.log("dataResult", dataResult);
		}
	}

	//taiwan
	for (let data of taiwan){
		if(data.character !== "؀" || data.character !== null || data.character !== ""){
			let dataResult = await langParser(data, "taiwan");
			console.log("dataResult", dataResult);
		}
	}

	//thailand
	for (let data of thailand){
		if(data.character !== "؀" || data.character !== null || data.character !== ""){
			let dataResult = await langParser(data, "thailand");
			console.log("dataResult", dataResult);
		}
	}

	//filipina
	for (let data of filipina){
		if(data.character !== "؀" || data.character !== null || data.character !== ""){
			let dataResult = await langParser(data, "filipina");
			console.log("dataResult", dataResult);
		}
	}

	//myanmar
	for (let data of myanmar){
		if(data.character !== "؀" || data.character !== null || data.character !== ""){
			let dataResult = await langParser(data, "myanmar");
			console.log("dataResult", dataResult);
		}
	}
	res.sendStatus(200);
}

async function langParser(body, country) {
  return new Promise(function (resolve) {
    try {
      var data = {
        unicode: body.unicode,
        character: body.character,
        utf8: body.utf8,
        name: body.name,
        country: country
      };

      specialChar.updateOne(
        { unicode: body.unicode },
        { $set: data },
        { upsert: true },
        function (err, result) {
          if (err) console.log(err);
          return resolve(data);
        }
      );

      return resolve(data);
    } catch (e) {
      return resolve(null);
    }
  });
}