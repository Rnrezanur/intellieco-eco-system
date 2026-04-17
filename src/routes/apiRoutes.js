const express = require("express");
const multer = require("multer");
const path = require("path");

const asyncHandler = require("../middleware/asyncHandler");
const { requireAuth, requireAdmin } = require("../middleware/auth");
const detectionController = require("../controllers/detectionController");
const mapController = require("../controllers/mapController");
const pickupController = require("../controllers/pickupController");
const statsController = require("../controllers/statsController");

const storage = multer.diskStorage({
  destination: path.join(process.cwd(), "uploads"),
  filename: (req, file, cb) => {
    const extension = path.extname(file.originalname || ".jpg");
    cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${extension}`);
  }
});

const upload = multer({ storage });
const router = express.Router();

router.post(
  "/detections/analyze",
  requireAuth,
  upload.single("wasteImage"),
  asyncHandler(detectionController.analyzeWaste)
);
router.post("/pickup-requests", requireAuth, asyncHandler(pickupController.createPickupRequest));
router.get("/detections/history", requireAuth, asyncHandler(detectionController.getHistory));
router.delete("/detections/:id", requireAuth, asyncHandler(detectionController.deleteDetection));
router.post(
  "/detections/:id/review",
  requireAdmin,
  asyncHandler(detectionController.reviewDetection)
);
router.get("/stats/user", requireAuth, asyncHandler(statsController.getUserStats));
router.get("/recycling-centers", requireAuth, asyncHandler(mapController.searchRecyclingCenters));
router.post(
  "/pickup-requests/:id",
  requireAdmin,
  asyncHandler(pickupController.updatePickupRequest)
);

module.exports = router;
