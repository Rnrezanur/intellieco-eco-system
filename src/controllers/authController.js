const bcrypt = require("bcryptjs");
const crypto = require("crypto");

const User = require("../models/User");
const {
  sendVerificationEmail,
  sendResetEmail
} = require("../config/mailer");

async function signup(req, res) {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    req.flash("error", "All fields are required.");
    return res.redirect("/register");
  }

  try {
    const normalizedEmail = email.toLowerCase();
    const adminEmails = (process.env.ADMIN_EMAILS || "")
      .split(",")
      .map((item) => item.trim().toLowerCase())
      .filter(Boolean);

    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      req.flash("error", "An account with this email already exists.");
      return res.redirect("/register");
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({
      name,
      email: normalizedEmail,
      password: hashedPassword,
      role: adminEmails.includes(normalizedEmail) ? "admin" : "user"
    });

    const emailResult = await sendVerificationEmail(user, user.verificationToken);

    if (emailResult.usedTestInbox) {
      req.flash(
        "success",
        `Account created. Real SMTP is not configured, so no inbox email was sent. Use this verification code: ${user.verificationCode}`
      );
    } else {
      req.flash(
        "success",
        "Account created. Check your email, or use the verification code page to activate your account."
      );
    }
    return res.redirect("/verify-account");
  } catch (error) {
    console.error(error);
    req.flash("error", "Unable to create account right now.");
    return res.redirect("/register");
  }
}

async function verifyEmail(req, res) {
  const { token, email } = req.query;

  try {
    const user = await User.findOne({ email: email?.toLowerCase(), verificationToken: token });
    if (!user) {
      req.flash("error", "Invalid or expired verification link.");
      return res.redirect("/login");
    }

    user.isVerified = true;
    user.verificationToken = undefined;
    user.verificationCode = undefined;
    await user.save();

    req.flash("success", "Email verified successfully. You can now log in.");
    return res.redirect("/login");
  } catch (error) {
    console.error(error);
    req.flash("error", "Verification failed.");
    return res.redirect("/login");
  }
}

async function verifyCode(req, res) {
  const { email, verificationCode } = req.body;

  try {
    const user = await User.findOne({
      email: email?.toLowerCase(),
      verificationCode: String(verificationCode || "").trim()
    });

    if (!user) {
      req.flash("error", "Invalid email or verification code.");
      return res.redirect("/verify-account");
    }

    user.isVerified = true;
    user.verificationToken = undefined;
    user.verificationCode = undefined;
    await user.save();

    req.flash("success", "Account verified successfully. You can now log in.");
    return res.redirect("/login");
  } catch (error) {
    console.error(error);
    req.flash("error", "Verification failed.");
    return res.redirect("/verify-account");
  }
}

async function login(req, res) {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email: email?.toLowerCase() });
    if (!user) {
      req.flash("error", "Invalid email or password.");
      return res.redirect("/login");
    }

    if (!user.isVerified) {
      req.flash("error", "Please verify your email before logging in.");
      return res.redirect("/login");
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      req.flash("error", "Invalid email or password.");
      return res.redirect("/login");
    }

    req.session.user = {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      profileImage: user.profileImage
    };

    return res.redirect(user.role === "admin" ? "/admin" : "/dashboard");
  } catch (error) {
    console.error(error);
    req.flash("error", "Login failed.");
    return res.redirect("/login");
  }
}

function logout(req, res) {
  req.session.destroy(() => {
    res.redirect("/");
  });
}

async function forgotPassword(req, res) {
  const { email } = req.body;

  try {
    const user = await User.findOne({ email: email?.toLowerCase() });
    if (!user) {
      req.flash("error", "No account found for that email.");
      return res.redirect("/forgot-password");
    }

    user.resetPasswordToken = crypto.randomBytes(24).toString("hex");
    user.resetPasswordExpires = Date.now() + 1000 * 60 * 30;
    await user.save();

    const emailResult = await sendResetEmail(user, user.resetPasswordToken);
    if (emailResult.usedTestInbox) {
      req.flash(
        "success",
        `Real SMTP is not configured, so no inbox email was sent. Use this reset link: ${emailResult.resetUrl}`
      );
    } else {
      req.flash("success", "Password reset email sent.");
    }
    return res.redirect("/login");
  } catch (error) {
    console.error(error);
    req.flash("error", "Unable to send reset email.");
    return res.redirect("/forgot-password");
  }
}

async function resetPassword(req, res) {
  const { token } = req.params;
  const { password } = req.body;

  try {
    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() }
    });

    if (!user) {
      req.flash("error", "Reset link is invalid or expired.");
      return res.redirect("/forgot-password");
    }

    user.password = await bcrypt.hash(password, 10);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    req.flash("success", "Password updated successfully.");
    return res.redirect("/login");
  } catch (error) {
    console.error(error);
    req.flash("error", "Unable to reset password.");
    return res.redirect(`/auth/reset-password/${token}`);
  }
}

module.exports = {
  signup,
  verifyEmail,
  verifyCode,
  login,
  logout,
  forgotPassword,
  resetPassword
};
