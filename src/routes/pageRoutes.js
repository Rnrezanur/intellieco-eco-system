const express = require("express");
const multer = require("multer");
const path = require("path");

const pageController = require("../controllers/pageController");
const profileController = require("../controllers/profileController");
const asyncHandler = require("../middleware/asyncHandler");
const { requireAuth, requireGuest } = require("../middleware/auth");

const router = express.Router();

const profileImageStorage = multer.diskStorage({
  destination: path.join(process.cwd(), "uploads"),
  filename: (req, file, cb) => {
    const extension = path.extname(file.originalname || ".jpg");
    cb(null, `profile-${Date.now()}-${Math.round(Math.random() * 1e9)}${extension}`);
  }
});

const profileImageUpload = multer({
  storage: profileImageStorage,
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
      return cb(new Error("Only image files are allowed."));
    }

    return cb(null, true);
  },
  limits: {
    fileSize: 3 * 1024 * 1024
  }
});

function handleProfileImageUpload(req, res, next) {
  profileImageUpload.single("profileImage")(req, res, (error) => {
    if (!error) {
      return next();
    }

    req.flash(
      "error",
      error.code === "LIMIT_FILE_SIZE"
        ? "Profile picture must be smaller than 3MB."
        : error.message || "Profile picture upload failed."
    );
    return res.redirect("/profile");
  });
}

router.get("/", asyncHandler(pageController.homePage));
router.get("/login", requireGuest, asyncHandler(pageController.loginPage));
router.get("/register", requireGuest, asyncHandler(pageController.registerPage));
router.get("/verify-account", requireGuest, asyncHandler(pageController.verifyAccountPage));
router.get("/dashboard", requireAuth, asyncHandler(pageController.dashboardPage));
router.get("/profile", requireAuth, asyncHandler(pageController.profilePage));
router.post(
  "/profile",
  requireAuth,
  handleProfileImageUpload,
  asyncHandler(profileController.updateProfile)
);
router.get("/forgot-password", requireGuest, asyncHandler(pageController.forgotPasswordPage));
router.get("/auth/reset-password/:token", requireGuest, asyncHandler(pageController.resetPasswordPage));

module.exports = router;
