const crypto = require("node:crypto");

function csrfToken(req, res, next) {
  if (!req.session.csrfToken) {
    req.session.csrfToken = crypto.randomBytes(32).toString("hex");
  }
  res.locals.csrfToken = req.session.csrfToken;
  next();
}

function verifyCsrfToken(req, res, next) {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return next();

  const expected = req.session.csrfToken;
  const supplied = req.get("x-csrf-token") || req.body._csrf;
  if (
    typeof expected !== "string" ||
    typeof supplied !== "string" ||
    expected.length !== supplied.length ||
    !crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(supplied))
  ) {
    return res.status(403).format({
      html: () =>
        res.render("error", {
          title: "Request expired",
          message: "Refresh the page and submit the form again."
        }),
      json: () => res.json({ error: "Invalid security token. Refresh and try again." }),
      default: () => res.type("txt").send("Invalid security token.")
    });
  }
  return next();
}

module.exports = { csrfToken, verifyCsrfToken };
