const express = require("express");

const pageController = require("../controllers/pageController");
const asyncHandler = require("../middleware/asyncHandler");
const { requireAuth, requireGuest } = require("../middleware/auth");

const router = express.Router();

router.get("/", asyncHandler(pageController.homePage));
router.get("/login", requireGuest, asyncHandler(pageController.loginPage));
router.get("/register", requireGuest, asyncHandler(pageController.registerPage));
router.get("/verify-account", requireGuest, asyncHandler(pageController.verifyAccountPage));
router.get("/dashboard", requireAuth, asyncHandler(pageController.dashboardPage));
router.get("/forgot-password", requireGuest, asyncHandler(pageController.forgotPasswordPage));
router.get("/auth/reset-password/:token", requireGuest, asyncHandler(pageController.resetPasswordPage));

module.exports = router;
