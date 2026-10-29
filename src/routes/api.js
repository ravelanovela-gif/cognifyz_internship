const express = require("express");
const db = require("../db");
const { validateProject } = require("../lib/validation");
const { getWeather } = require("../services/weather");
const { enqueueActivity } = require("../jobs/queue");

const router = express.Router();
const weatherLimiter = require("express-rate-limit").rateLimit({
  windowMs: 60 * 1000,
  limit: 20,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "Weather requests are temporarily limited. Try again shortly." }
});

router.get("/projects", (req, res) => {
  const projects = db
    .prepare(
      "SELECT id, title, description, status, created_at, updated_at FROM projects WHERE user_id = ? ORDER BY updated_at DESC"
    )
    .all(req.session.user.id);
  res.json({ projects });
});

router.post("/projects", (req, res) => {
  const result = validateProject(req.body);
  if (result.errors.length) return res.status(422).json({ errors: result.errors });

  const insert = db
    .prepare("INSERT INTO projects (user_id, title, description, status) VALUES (?, ?, ?, ?)")
    .run(req.session.user.id, result.value.title, result.value.description, result.value.status);
  const project = db
    .prepare("SELECT id, title, description, status, created_at, updated_at FROM projects WHERE id = ?")
    .get(insert.lastInsertRowid);
  enqueueActivity(req.session.user.id, "Created", project.title);
  return res.status(201).json({ project });
});

router.get("/projects/:id", (req, res) => {
  const project = db
    .prepare(
      "SELECT id, title, description, status, created_at, updated_at FROM projects WHERE id = ? AND user_id = ?"
    )
    .get(Number(req.params.id), req.session.user.id);
  if (!project) return res.status(404).json({ error: "Project not found." });
  return res.json({ project });
});

router.patch("/projects/:id", (req, res) => {
  const result = validateProject(req.body);
  if (result.errors.length) return res.status(422).json({ errors: result.errors });

  const update = db
    .prepare(
      "UPDATE projects SET title = ?, description = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?"
    )
    .run(result.value.title, result.value.description, result.value.status, Number(req.params.id), req.session.user.id);
  if (!update.changes) return res.status(404).json({ error: "Project not found." });
  enqueueActivity(req.session.user.id, "Updated", result.value.title);
  const project = db
    .prepare("SELECT id, title, description, status, created_at, updated_at FROM projects WHERE id = ?")
    .get(Number(req.params.id));
  return res.json({ project });
});

router.delete("/projects/:id", (req, res) => {
  const project = db
    .prepare("SELECT title FROM projects WHERE id = ? AND user_id = ?")
    .get(Number(req.params.id), req.session.user.id);
  if (!project) return res.status(404).json({ error: "Project not found." });

  db.prepare("DELETE FROM projects WHERE id = ? AND user_id = ?").run(Number(req.params.id), req.session.user.id);
  enqueueActivity(req.session.user.id, "Deleted", project.title);
  return res.status(204).end();
});

router.get("/activity", (req, res) => {
  const activity = db
    .prepare(
      "SELECT action, project_title, created_at FROM activity_log WHERE user_id = ? ORDER BY id DESC LIMIT 10"
    )
    .all(req.session.user.id);
  res.json({ activity });
});

router.get("/weather", weatherLimiter, async (req, res, next) => {
  const city = String(req.query.city || "").trim();
  if (city.length < 2 || city.length > 80) {
    return res.status(422).json({ error: "Enter a city name between 2 and 80 characters." });
  }
  try {
    const weather = await getWeather(city);
    return res.json({ weather });
  } catch (error) {
    if (error.status === 404) return res.status(404).json({ error: error.message });
    return next(error);
  }
});

module.exports = router;
