function requireAuth(req, res, next) {
  if (!req.session.user) {
    req.flash("error", "Please log in to continue.");
    return res.redirect("/login");
  }

  next();
}

function requireGuest(req, res, next) {
  if (req.session.user) {
    return res.redirect(req.session.user.role === "admin" ? "/admin" : "/dashboard");
  }

  next();
}

function requireAdmin(req, res, next) {
  if (!req.session.user) {
    req.flash("error", "Please log in to continue.");
    return res.redirect("/login");
  }

  if (req.session.user.role !== "admin") {
    req.flash("error", "Admin access is required.");
    return res.redirect("/dashboard");
  }

  next();
}

module.exports = {
  requireAuth,
  requireGuest,
  requireAdmin
};
