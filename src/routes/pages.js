const express = require("express");
const db = require("../db");
const { requireAuth, redirectIfAuthenticated } = require("../middleware/auth");

const router = express.Router();

router.get("/", (req, res) => {
  res.render("home", { title: "Build your internship portfolio" });
});

router.get("/register", redirectIfAuthenticated, (req, res) => res.redirect("/auth/register"));
router.get("/login", redirectIfAuthenticated, (req, res) => res.redirect("/auth/login"));

router.get("/dashboard", requireAuth, (req, res) => {
  const projects = db
    .prepare(
      "SELECT id, title, description, status, created_at, updated_at FROM projects WHERE user_id = ? ORDER BY updated_at DESC"
    )
    .all(req.session.user.id);
  const activity = db
    .prepare(
      "SELECT action, project_title, created_at FROM activity_log WHERE user_id = ? ORDER BY id DESC LIMIT 5"
    )
    .all(req.session.user.id);
  const githubRow = db
    .prepare("SELECT login, avatar_url, repositories, linked_at FROM github_connections WHERE user_id = ?")
    .get(req.session.user.id);
  const github = githubRow
    ? { ...githubRow, repositories: JSON.parse(githubRow.repositories) }
    : null;
  res.render("dashboard", { title: "My dashboard", projects, activity, github });
});

module.exports = router;
