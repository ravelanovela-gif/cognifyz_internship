require("dotenv").config();

const path = require("node:path");
const crypto = require("node:crypto");
const express = require("express");
const session = require("express-session");
const helmet = require("helmet");
const morgan = require("morgan");
const { rateLimit } = require("express-rate-limit");
const db = require("./src/db");
const SQLiteSessionStore = require("./src/session-store");
const activityQueue = require("./src/jobs/queue");
const { csrfToken, verifyCsrfToken } = require("./src/middleware/csrf");
const { requireAuth } = require("./src/middleware/auth");
const authRoutes = require("./src/routes/auth");
const pageRoutes = require("./src/routes/pages");
const apiRoutes = require("./src/routes/api");
const oauthRoutes = require("./src/routes/oauth");

const app = express();
const isProduction = process.env.NODE_ENV === "production";
const githubOAuthConfigured = Boolean(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET);

if (isProduction && (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 32)) {
  throw new Error("SESSION_SECRET must contain at least 32 characters in production.");
}

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.disable("x-powered-by");
app.use((req, res, next) => {
  res.locals.cspNonce = crypto.randomBytes(18).toString("base64");
  res.locals.githubOAuthConfigured = githubOAuthConfigured;
  next();
});
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "https://cdn.jsdelivr.net", (_req, res) => `'nonce-${res.locals.cspNonce}'`],
        scriptSrc: ["'self'", (_req, res) => `'nonce-${res.locals.cspNonce}'`],
        connectSrc: [
          "'self'",
          "https://geocoding-api.open-meteo.com",
          "https://api.open-meteo.com",
          "https://api.github.com"
        ],
        imgSrc: ["'self'", "data:", "https://avatars.githubusercontent.com"],
        objectSrc: ["'none'"],
        upgradeInsecureRequests: isProduction ? [] : null
      }
    }
  })
);
app.use(morgan("combined"));
app.use(express.urlencoded({ extended: false, limit: "10kb" }));
app.use(express.json({ limit: "10kb" }));
app.use(
  session({
    store: new SQLiteSessionStore({ db }),
    name: "internship.sid",
    secret: process.env.SESSION_SECRET || "development-only-change-this-session-secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      secure: isProduction,
      maxAge: 1000 * 60 * 60 * 8
    }
  })
);
app.use((req, res, next) => {
  res.locals.user = req.session.user || null;
  next();
});
app.use(csrfToken);
app.use(verifyCsrfToken);
app.use(
  express.static(path.join(__dirname, "public"), {
    maxAge: isProduction ? "1d" : 0
  })
);

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "Too many sign-in attempts. Please try again in 15 minutes." }
});

app.use("/", pageRoutes);
app.use("/auth", authLimiter, authRoutes);
app.use("/oauth", requireAuth, oauthRoutes);
app.use("/api", requireAuth, apiRoutes);

app.use((req, res) => {
  res.status(404).format({
    html: () => res.render("error", { title: "Not found", message: "We couldn't find that page." }),
    json: () => res.json({ error: "Not found" }),
    default: () => res.type("txt").send("Not found")
  });
});

app.use((err, req, res, next) => {
  console.error(err);
  if (res.headersSent) return next(err);
  const status = Number.isInteger(err.status) ? err.status : 500;
  const message = status >= 500 ? "Something went wrong. Please try again." : err.message;
  if (req.path.startsWith("/api/")) return res.status(status).json({ error: message });
  return res.status(status).render("error", { title: "Something went wrong", message });
});

const port = Number(process.env.PORT) || 3000;
const server = app.listen(port, () => {
  activityQueue.start();
  console.log(`Internship Showcase running at http://localhost:${port}`);
});

function shutdown() {
  activityQueue.stop();
  server.close(() => {
    db.close();
    process.exit(0);
  });
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
