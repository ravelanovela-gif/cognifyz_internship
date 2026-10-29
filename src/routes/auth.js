const express = require("express");
const bcrypt = require("bcryptjs");
const db = require("../db");
const { redirectIfAuthenticated } = require("../middleware/auth");
const { validateLogin, validateRegistration } = require("../lib/validation");

const router = express.Router();

router.get("/register", redirectIfAuthenticated, (req, res) => {
  res.render("register", { title: "Create account", errors: [], values: {} });
});

router.post("/register", redirectIfAuthenticated, async (req, res, next) => {
  const result = validateRegistration(req.body);
  if (result.errors.length) {
    return res.status(422).render("register", {
      title: "Create account",
      errors: result.errors,
      values: { name: result.value.name, email: result.value.email }
    });
  }

  try {
    const passwordHash = await bcrypt.hash(result.value.password, 12);
    const insert = db
      .prepare("INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)")
      .run(result.value.name, result.value.email, passwordHash);
    req.session.regenerate((error) => {
      if (error) return next(error);
      req.session.user = { id: Number(insert.lastInsertRowid), name: result.value.name, email: result.value.email };
      return req.session.save((saveError) => (saveError ? next(saveError) : res.redirect("/dashboard")));
    });
  } catch (error) {
    if (error.code === "SQLITE_CONSTRAINT_UNIQUE") {
      return res.status(409).render("register", {
        title: "Create account",
        errors: ["An account with that email already exists."],
        values: { name: result.value.name, email: result.value.email }
      });
    }
    return next(error);
  }
});

router.get("/login", redirectIfAuthenticated, (req, res) => {
  res.render("login", { title: "Sign in", errors: [], values: {} });
});

router.post("/login", redirectIfAuthenticated, async (req, res, next) => {
  const result = validateLogin(req.body);
  if (result.errors.length) {
    return res.status(422).render("login", {
      title: "Sign in",
      errors: result.errors,
      values: { email: result.value.email }
    });
  }

  try {
    const user = db.prepare("SELECT id, name, email, password_hash FROM users WHERE email = ?").get(result.value.email);
    const passwordMatches = user ? await bcrypt.compare(result.value.password, user.password_hash) : false;
    if (!passwordMatches) {
      return res.status(401).render("login", {
        title: "Sign in",
        errors: ["Email or password is incorrect."],
        values: { email: result.value.email }
      });
    }
    req.session.regenerate((error) => {
      if (error) return next(error);
      req.session.user = { id: user.id, name: user.name, email: user.email };
      return req.session.save((saveError) => (saveError ? next(saveError) : res.redirect("/dashboard")));
    });
  } catch (error) {
    return next(error);
  }
});

router.post("/logout", (req, res, next) => {
  req.session.destroy((error) => {
    if (error) return next(error);
    res.clearCookie("internship.sid");
    return res.redirect("/");
  });
});

module.exports = router;
