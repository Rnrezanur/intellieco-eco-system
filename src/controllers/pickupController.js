const PickupRequest = require("../models/PickupRequest");
const User = require("../models/User");
const { logAdminAction } = require("../services/auditLogger");

const REWARD_POINTS_BY_WASTE = {
  plastic: 15,
  metal: 18,
  paper: 10,
  organic: 8,
  glass: 16
};

function getRewardPointsForWaste(wasteType) {
  const normalizedType = String(wasteType || "").trim().toLowerCase();
  return REWARD_POINTS_BY_WASTE[normalizedType] || 12;
}

async function createPickupRequest(req, res) {
  const {
    wasteType,
    contactPhone,
    addressLine,
    areaName,
    latitude,
    longitude,
    notes,
    approximateWeightKg,
    linkedDetectionId
  } = req.body;
  const approximateWeight = Number(approximateWeightKg || 0);
  let detectedItems = [];
  let linkedDetectionIds = [];

  if (!wasteType || !contactPhone || !addressLine || !areaName || !approximateWeight) {
    return res.status(400).json({
      message: "Waste type, weight, phone, address, and area are required."
    });
  }

  try {
    detectedItems = JSON.parse(req.body.detectedItems || "[]");
  } catch (error) {
    detectedItems = [];
  }

  try {
    linkedDetectionIds = JSON.parse(req.body.linkedDetectionIds || "[]");
  } catch (error) {
    linkedDetectionIds = linkedDetectionId ? [linkedDetectionId] : [];
  }

  const pickup = await PickupRequest.create({
    user: req.session.user.id,
    wasteType,
    imagePath: req.file ? `/uploads/${req.file.filename}` : String(req.body.imagePath || ""),
    linkedDetection: linkedDetectionIds[0] || linkedDetectionId || undefined,
    linkedDetections: linkedDetectionIds,
    approximateWeightKg: approximateWeight,
    detectedItems: detectedItems.length
      ? detectedItems
      : [
          {
            wasteType,
            quantity: 1
          }
        ],
    contactPhone,
    addressLine,
    areaName,
    latitude: latitude ? Number(latitude) : undefined,
    longitude: longitude ? Number(longitude) : undefined,
    notes: String(notes || "").trim()
  });

  return res.json({
    message: "Pickup request submitted successfully.",
    pickup
  });
}

async function updatePickupRequest(req, res) {
  const { status, assignedTo } = req.body;
  const pickup = await PickupRequest.findById(req.params.id).populate("user", "name email");

  if (!pickup) {
    return res.status(404).json({ message: "Pickup request not found." });
  }

  if (status) {
    pickup.status = status;
  }

  let rewardGranted = false;
  let rewardedUser = null;

  if (pickup.status === "picked_up" && pickup.rewardStatus !== "earned") {
    const rewardPoints = getRewardPointsForWaste(pickup.wasteType);
    rewardedUser = await User.findById(pickup.user?._id || pickup.user);

    if (rewardedUser) {
      rewardedUser.rewardPoints += rewardPoints;
      rewardedUser.totalRewardedPickups += 1;
      await rewardedUser.save();
    }

    pickup.rewardPoints = rewardPoints;
    pickup.rewardStatus = "earned";
    pickup.rewardedAt = new Date();
    rewardGranted = true;
  }

  pickup.assignedTo = String(assignedTo || "").trim();
  await pickup.save();

  await logAdminAction({
    adminUserId: req.session.user.id,
    actionType: "pickup_updated",
    targetType: "PickupRequest",
    targetId: pickup._id,
    details: {
      status: pickup.status,
      assignedTo: pickup.assignedTo,
      userEmail: pickup.user?.email,
      rewardGranted,
      rewardPoints: pickup.rewardPoints
    }
  });

  return res.json({
    message: "Pickup request updated.",
    pickup,
    reward: rewardGranted
      ? {
          points: pickup.rewardPoints,
          totalPoints: rewardedUser?.rewardPoints || pickup.rewardPoints
        }
      : null
  });
}

module.exports = {
  createPickupRequest,
  updatePickupRequest
};
