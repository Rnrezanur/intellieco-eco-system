const bcrypt = require("bcryptjs");
const path = require("path");

const User = require("../models/User");

async function updateProfile(req, res) {
  const { name, email, currentPassword, newPassword } = req.body;
  const normalizedEmail = String(email || "").trim().toLowerCase();
  const cleanName = String(name || "").trim();

  if (!cleanName || !normalizedEmail) {
    req.flash("error", "Name and email are required.");
    return res.redirect("/profile");
  }

  const user = await User.findById(req.session.user.id);
  if (!user) {
    req.flash("error", "Please log in again to update your profile.");
    return res.redirect("/login");
  }

  const emailOwner = await User.findOne({
    email: normalizedEmail,
    _id: { $ne: user._id }
  });

  if (emailOwner) {
    req.flash("error", "Another account already uses that email.");
    return res.redirect("/profile");
  }

  user.name = cleanName;
  user.email = normalizedEmail;

  if (req.file) {
    user.profileImage = `/uploads/${path.basename(req.file.path)}`;
  }

  if (newPassword) {
    if (!currentPassword) {
      req.flash("error", "Enter your current password before setting a new password.");
      return res.redirect("/profile");
    }

    const passwordMatches = await bcrypt.compare(currentPassword, user.password);
    if (!passwordMatches) {
      req.flash("error", "Current password is incorrect.");
      return res.redirect("/profile");
    }

    if (newPassword.length < 6) {
      req.flash("error", "New password must be at least 6 characters.");
      return res.redirect("/profile");
    }

    user.password = await bcrypt.hash(newPassword, 10);
  }

  await user.save();

  req.session.user = {
    ...req.session.user,
    name: user.name,
    email: user.email,
    role: user.role,
    profileImage: user.profileImage
  };

  req.flash("success", "Profile updated successfully.");
  return res.redirect("/profile");
}

module.exports = {
  updateProfile
};
