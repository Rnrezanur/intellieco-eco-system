const fs = require("fs");
const path = require("path");

const Detection = require("../models/Detection");
const {
  formatWasteType,
  getSuggestionForLabel
} = require("../services/recyclingSuggestions");
const { logAdminAction } = require("../services/auditLogger");

async function analyzeWaste(req, res) {
  if (!req.file) {
    return res.status(400).json({ message: "Please upload or capture an image." });
  }

  const predictedLabel = String(req.body.predictedLabel || "").trim().toLowerCase();
  if (!predictedLabel) {
    return res.status(400).json({ message: "The custom waste model did not return a class label." });
  }

  const modelVersion = String(req.body.modelVersion || "1.0.0").trim();
  const confidence = Number(req.body.confidence || 0);
  const wasteType = formatWasteType(predictedLabel);
  const suggestion = getSuggestionForLabel(predictedLabel);

  const detection = await Detection.create({
    user: req.session.user.id,
    imagePath: `/uploads/${path.basename(req.file.path)}`,
    predictedLabel,
    modelVersion,
    wasteType,
    confidence,
    suggestion
  });

  return res.json({
    id: detection._id,
    predictedLabel: detection.predictedLabel,
    modelVersion: detection.modelVersion,
    wasteType: detection.wasteType,
    confidence: detection.confidence,
    suggestion: detection.suggestion,
    imagePath: detection.imagePath
  });
}

async function getHistory(req, res) {
  const history = await Detection.find({ user: req.session.user.id }).sort({ createdAt: -1 });
  return res.json(history);
}

async function deleteDetection(req, res) {
  const detection = await Detection.findOne({
    _id: req.params.id,
    user: req.session.user.id
  });

  if (!detection) {
    return res.status(404).json({ message: "History item not found." });
  }

  const filePath = path.join(process.cwd(), detection.imagePath.replace(/^\//, ""));
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }

  await detection.deleteOne();
  return res.json({ message: "History item deleted." });
}

async function reviewDetection(req, res) {
  const { reviewedWasteType, reviewNote } = req.body;
  const allowedWasteTypes = ["Plastic", "Metal", "Paper", "Organic", "Glass", "Unknown"];

  if (!allowedWasteTypes.includes(reviewedWasteType)) {
    return res.status(400).json({ message: "Please choose a valid reviewed waste type." });
  }

  const detection = await Detection.findById(req.params.id);
  if (!detection) {
    return res.status(404).json({ message: "Detection not found." });
  }

  detection.reviewStatus = "corrected";
  detection.reviewedWasteType = reviewedWasteType;
  detection.reviewNote = String(reviewNote || "").trim();
  detection.reviewedAt = new Date();
  detection.reviewedBy = req.session.user.id;
  await detection.save();

  await logAdminAction({
    adminUserId: req.session.user.id,
    actionType: "detection_reviewed",
    targetType: "Detection",
    targetId: detection._id,
    details: {
      originalWasteType: detection.wasteType,
      reviewedWasteType,
      reviewNote: detection.reviewNote
    }
  });

  return res.json({
    message: "Detection review saved.",
    detection: {
      id: detection._id,
      reviewStatus: detection.reviewStatus,
      reviewedWasteType: detection.reviewedWasteType,
      reviewNote: detection.reviewNote
    }
  });
}

module.exports = {
  analyzeWaste,
  getHistory,
  deleteDetection,
  reviewDetection
};
