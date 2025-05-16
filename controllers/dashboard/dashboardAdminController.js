const express = require('express');
const dayjs = require('dayjs');

const {
  crawlFullHashtag,
  crawlFullProfile,
  getFullHashtagMissingPostReports,
  getFullProfileMissingPostReports,
} = require('./service/dashboardService');

async function missingPostReport(req, res){
  const startDate = req.query.startDate
    ? dayjs(req.query.startDate.toString()).startOf('day').valueOf()
    : dayjs().subtract(7, 'day').startOf('day').valueOf();
  const endDate = req.query.endDate
    ? dayjs(req.query.endDate.toString()).endOf('day').valueOf()
    : dayjs().endOf('day').valueOf();

  const [fullProfileReports, fullHashtagReports] = await Promise.all([
    getFullProfileMissingPostReports(startDate, endDate),
    getFullHashtagMissingPostReports(startDate, endDate),
  ]);

  const reports = [...fullProfileReports, ...fullHashtagReports].sort(
    (a, b) => +dayjs(a.updatedAt) - +dayjs(b.updatedAt),
  );

  return res.json(reports);
};


module.exports = {
  missingPostReport
};