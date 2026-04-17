const PDFDocument = require("pdfkit");

const Detection = require("../models/Detection");
const ReportSchedule = require("../models/ReportSchedule");
const { sendMail } = require("../config/mailer");

function convertDetectionsToRows(detections) {
  return detections.map((item) => ({
    date: new Date(item.createdAt).toLocaleString(),
    user: item.user?.email || "Unknown user",
    wasteType: item.wasteType,
    predictedLabel: item.predictedLabel,
    reviewedWasteType: item.reviewedWasteType || "",
    reviewStatus: item.reviewStatus || "pending",
    modelVersion: item.modelVersion || "1.0.0",
    confidence: item.confidence ? `${(item.confidence * 100).toFixed(1)}%` : "N/A"
  }));
}

async function fetchReportRows() {
  const detections = await Detection.find()
    .populate("user", "email")
    .sort({ createdAt: -1 });

  return convertDetectionsToRows(detections);
}

async function buildCsvContent() {
  const rows = await fetchReportRows();
  return [
    ["Date", "User", "Waste Type", "Predicted Label", "Reviewed Waste Type", "Review Status", "Model Version", "Confidence"].join(","),
    ...rows.map((row) =>
      [
        row.date,
        row.user,
        row.wasteType,
        row.predictedLabel,
        row.reviewedWasteType,
        row.reviewStatus,
        row.modelVersion,
        row.confidence
      ]
        .map((value) => `"${String(value).replace(/"/g, '""')}"`)
        .join(",")
    )
  ].join("\n");
}

async function buildPdfBuffer() {
  const rows = await fetchReportRows();
  const doc = new PDFDocument({ margin: 40, size: "A4" });
  const chunks = [];

  return new Promise((resolve, reject) => {
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    doc.fontSize(20).text("IntelliEco Waste Activity Report");
    doc.moveDown(0.5);
    doc.fontSize(10).fillColor("#555").text(`Generated: ${new Date().toLocaleString()}`);
    doc.moveDown();

    rows.slice(0, 50).forEach((row, index) => {
      doc
        .fillColor("#000")
        .fontSize(11)
        .text(
          `${index + 1}. ${row.date} | ${row.user} | ${row.wasteType} | ${row.predictedLabel} | ${row.reviewStatus} | ${row.modelVersion} | ${row.confidence}`
        );
      doc.moveDown(0.35);
    });

    doc.end();
  });
}

async function sendScheduledReportEmail(schedule) {
  const recipients = schedule.recipients.filter(Boolean);
  if (!recipients.length) {
    return;
  }

  const csvContent = await buildCsvContent();
  const pdfBuffer = await buildPdfBuffer();

  await sendMail({
    to: recipients.join(", "),
    subject: `IntelliEco ${schedule.frequency} waste report`,
    html: `
      <h2>IntelliEco ${schedule.frequency} report</h2>
      <p>Please find the latest waste activity report attached as CSV and PDF.</p>
    `,
    attachments: [
      {
        filename: "intellieco-waste-report.csv",
        content: csvContent
      },
      {
        filename: "intellieco-waste-report.pdf",
        content: pdfBuffer
      }
    ]
  });

  schedule.lastSentAt = new Date();
  await schedule.save();
}

async function ensureDefaultSchedules() {
  const defaults = [
    { frequency: "weekly", nextRunLabel: "Every Monday at 9:00 AM" },
    { frequency: "monthly", nextRunLabel: "First day of each month at 9:00 AM" }
  ];

  for (const item of defaults) {
    const existing = await ReportSchedule.findOne({ frequency: item.frequency });
    if (!existing) {
      await ReportSchedule.create({
        frequency: item.frequency,
        recipients: (process.env.REPORT_RECIPIENTS || "")
          .split(",")
          .map((entry) => entry.trim())
          .filter(Boolean),
        isActive: false,
        nextRunLabel: item.nextRunLabel
      });
    }
  }
}

module.exports = {
  buildCsvContent,
  buildPdfBuffer,
  sendScheduledReportEmail,
  ensureDefaultSchedules
};
