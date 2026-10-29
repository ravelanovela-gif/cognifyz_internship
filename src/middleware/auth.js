function requireAuth(req, res, next) {
  if (!req.session.user) {
    if (req.originalUrl.startsWith("/api/")) return res.status(401).json({ error: "Please sign in first." });
    return res.redirect("/login");
  }
  res.locals.user = req.session.user;
  return next();
}

function redirectIfAuthenticated(req, res, next) {
  if (req.session.user) return res.redirect("/dashboard");
  return next();
}

module.exports = { requireAuth, redirectIfAuthenticated };
