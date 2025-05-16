const History = require('../models/history');

const parseHistory = (history) => {
	return {
		id: history._id.toString(),
		key: history.key,
		email: history.email,
		service: history.service,
		query: history.query,
		monitoring: history.monitoring,
		postCount: history.postCount,
		postCrawling: history.postCrawling,
		refresh: history.refresh,
		status: history.status,
		statusLog: history.statusLog,
		createdAt: history.createdAt,
		updatedAt: history.updatedAt
	}
};

const saveHistory = async (history) => {
	const onDb = await History.findOne({ key: history.key });
	if (onDb) return await onDb.overwrite(history).save();
	else return await new History(history).save();
};

const findOneHistoryByKey = async (key) => {
	const history = await History.findOne({ key });
	return history
};

const updateHistoryStatus = async (key, status) => {
    console.log('updating history status', key, status);
 
    const dataHistory = await History.findOne({ key });
	console.log("history". dataHistory);
    if (!dataHistory) {
      throw new Error(
        'No search history found with given id! Make sure to create it first before send it to MQ!'
      );
    }
  
	return await History.findOneAndUpdate(
		{ key: key },
		{ $set: {
		  status,
		  statusLog: [...dataHistory.statusLog, { timestamp: new Date(), status }]
		}}
	);  
  }
  

module.exports = { parseHistory, saveHistory, findOneHistoryByKey, updateHistoryStatus }