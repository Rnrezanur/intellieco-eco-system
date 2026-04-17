const express = require("express");

const authController = require("../controllers/authController");
const asyncHandler = require("../middleware/asyncHandler");
const { requireAuth, requireGuest } = require("../middleware/auth");

const router = express.Router();

router.post("/signup", requireGuest, asyncHandler(authController.signup));
router.get("/verify", asyncHandler(authController.verifyEmail));
router.post("/verify-code", requireGuest, asyncHandler(authController.verifyCode));
router.post("/login", requireGuest, asyncHandler(authController.login));
router.post("/logout", requireAuth, authController.logout);
router.post("/forgot-password", requireGuest, asyncHandler(authController.forgotPassword));
router.post("/reset-password/:token", requireGuest, asyncHandler(authController.resetPassword));

module.exports = router;
