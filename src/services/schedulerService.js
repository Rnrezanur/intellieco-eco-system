const cron = require("node-cron");

const ReportSchedule = require("../models/ReportSchedule");
const { sendScheduledReportEmail, ensureDefaultSchedules } = require("./reportService");

async function runScheduledReports(frequency) {
  const schedule = await ReportSchedule.findOne({ frequency, isActive: true });
  if (!schedule) {
    return;
  }

  await sendScheduledReportEmail(schedule);
}

async function startSchedulers() {
  await ensureDefaultSchedules();

  cron.schedule("0 9 * * 1", async () => {
    await runScheduledReports("weekly");
  });

  cron.schedule("0 9 1 * *", async () => {
    await runScheduledReports("monthly");
  });
}

module.exports = {
  startSchedulers
};
