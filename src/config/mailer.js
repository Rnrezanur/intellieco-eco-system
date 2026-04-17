const nodemailer = require("nodemailer");

function hasRealSmtpConfig() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

async function createTransporter() {
  if (hasRealSmtpConfig()) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: process.env.SMTP_SECURE === "true",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
  }

  const testAccount = await nodemailer.createTestAccount();

  return nodemailer.createTransport({
    host: "smtp.ethereal.email",
    port: 587,
    secure: false,
    auth: {
      user: testAccount.user,
      pass: testAccount.pass
    }
  });
}

async function sendMail(options) {
  const transporter = await createTransporter();
  const info = await transporter.sendMail({
    from: process.env.EMAIL_FROM || "IntelliEco <no-reply@intellieco.local>",
    ...options
  });

  const preview = nodemailer.getTestMessageUrl(info);
  if (preview) {
    console.log("Preview email:", preview);
  }

  return {
    info,
    previewUrl: preview,
    usedTestInbox: !hasRealSmtpConfig()
  };
}

async function sendVerificationEmail(user, token) {
  const verificationUrl = `${process.env.BASE_URL}/auth/verify?token=${token}&email=${encodeURIComponent(
    user.email
  )}`;

  const mailResult = await sendMail({
    to: user.email,
    subject: "Verify your IntelliEco account",
    html: `
      <h2>Welcome to IntelliEco</h2>
      <p>Hello ${user.name},</p>
      <p>Please verify your email address to activate your account.</p>
      <p><strong>Your verification code:</strong> ${user.verificationCode}</p>
      <p><a href="${verificationUrl}">Verify My Email</a></p>
      <p>If the button does not work, copy and paste this URL into your browser:</p>
      <p>${verificationUrl}</p>
    `
  });
  return {
    verificationUrl,
    previewUrl: mailResult.previewUrl,
    usedTestInbox: mailResult.usedTestInbox
  };
}

async function sendResetEmail(user, token) {
  const resetUrl = `${process.env.BASE_URL}/auth/reset-password/${token}`;

  const mailResult = await sendMail({
    to: user.email,
    subject: "Reset your IntelliEco password",
    html: `
      <h2>Password Reset</h2>
      <p>Hello ${user.name},</p>
      <p>Click the link below to reset your password.</p>
      <p><a href="${resetUrl}">Reset Password</a></p>
    `
  });
  return {
    resetUrl,
    previewUrl: mailResult.previewUrl,
    usedTestInbox: mailResult.usedTestInbox
  };
}

module.exports = {
  sendVerificationEmail,
  sendResetEmail,
  sendMail,
  hasRealSmtpConfig
};
