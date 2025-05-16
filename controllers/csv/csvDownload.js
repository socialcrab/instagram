const csvProcess = require("./convertCsv");

async function downloadCSV(req, res) {
  try {
    let query = req.params.query;
    console.log(`get csv ${query}`);
    let processCSV = await csvProcess(query);

    if (!processCSV) {
      return null;
    } else {
      res.attachment(`@${query} Instagram Analytic Report By Analisa.io.csv`);
      res.send(processCSV);
    }
  } catch (error) {
    console.log(`Error at download CSV`);
    return null;
  }
}

module.exports = downloadCSV;
