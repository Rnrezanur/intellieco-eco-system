require("dotenv").config();

const path = require("path");
const express = require("express");
const session = require("express-session");
const flash = require("connect-flash");

const connectDB = require("./src/config/db");
const pageRoutes = require("./src/routes/pageRoutes");
const authRoutes = require("./src/routes/authRoutes");
const apiRoutes = require("./src/routes/apiRoutes");
const adminRoutes = require("./src/routes/adminRoutes");
const { startSchedulers } = require("./src/services/schedulerService");

const app = express();
const PORT = process.env.PORT || 3000;

connectDB();
startSchedulers().catch((error) => {
  console.error("Scheduler startup failed:", error.message);
});

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "src", "views"));

app.use(express.urlencoded({ extended: true }));
app.use(express.json({ limit: "10mb" }));
app.use(
  session({
    secret: process.env.SESSION_SECRET || "intellieco-dev-secret",
    resave: false,
    saveUninitialized: false
  })
);
app.use(flash());
app.use(express.static(path.join(__dirname, "public")));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.use((req, res, next) => {
  res.locals.currentUser = req.session.user || null;
  res.locals.successMessages = req.flash("success");
  res.locals.errorMessages = req.flash("error");
  next();
});

app.use("/", pageRoutes);
app.use("/auth", authRoutes);
app.use("/api", apiRoutes);
app.use("/admin", adminRoutes);

app.use((error, req, res, next) => {
  console.error(error);

  if (req.originalUrl.startsWith("/api/")) {
    return res.status(500).json({ message: "Something went wrong. Please try again." });
  }

  req.flash("error", "Something went wrong. Please try again.");
  return res.redirect("/");
});

app.use((req, res) => {
  res.status(404).render("pages/404", { title: "Page Not Found" });
});

app.listen(PORT, () => {
  console.log(`IntelliEco is running at http://localhost:${PORT}`);
});
