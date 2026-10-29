const crypto = require("node:crypto");
const express = require("express");
const db = require("../db");
const { isFreshOAuthState, isValidOAuthState } = require("../lib/oauth-state");

const router = express.Router();
const GITHUB_API = "https://api.github.com";
const CALLBACK_URL = process.env.GITHUB_CALLBACK_URL || "http://localhost:3000/oauth/github/callback";

function createHttpError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}

function configured() {
  return Boolean(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET);
}

async function githubRequest(url, accessToken) {
  const response = await fetch(url, {
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${accessToken}`,
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "Cognifyz-Internship-Showcase"
    },
    signal: AbortSignal.timeout(8000)
  });
  if (!response.ok) throw createHttpError(502, "GitHub could not complete the request. Please try again later.");
  return response.json();
}

router.get("/github", (req, res, next) => {
  if (!configured()) {
    return res.status(503).render("error", {
      title: "GitHub OAuth is not configured",
      message: "Add GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET to .env, then restart the app."
    });
  }

  const state = crypto.randomBytes(32).toString("base64url");
  req.session.githubOAuthState = { value: state, createdAt: Date.now() };
  return req.session.save((error) => {
    if (error) return next(error);
    const authorizeUrl = new URL("https://github.com/login/oauth/authorize");
    authorizeUrl.searchParams.set("client_id", process.env.GITHUB_CLIENT_ID);
    authorizeUrl.searchParams.set("redirect_uri", CALLBACK_URL);
    authorizeUrl.searchParams.set("scope", "read:user");
    authorizeUrl.searchParams.set("state", state);
    return res.redirect(authorizeUrl.toString());
  });
});

router.get("/github/callback", async (req, res, next) => {
  const savedState = req.session.githubOAuthState;
  delete req.session.githubOAuthState;

  if (!isFreshOAuthState(savedState) || !isValidOAuthState(savedState.value, req.query.state)) {
    return next(createHttpError(400, "The GitHub authorization expired or failed its security check. Please try again."));
  }
  if (req.query.error) return res.redirect("/dashboard?github=denied");
  if (!configured()) return next(createHttpError(503, "GitHub OAuth is not configured."));
  if (typeof req.query.code !== "string" || req.query.code.length > 2048) {
    return next(createHttpError(400, "GitHub did not return a valid authorization code."));
  }

  try {
    const tokenResponse = await fetch("https://github.com/login/oauth/access_token", {
      method: "POST",
      headers: { Accept: "application/json", "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code: req.query.code,
        redirect_uri: CALLBACK_URL
      }),
      signal: AbortSignal.timeout(8000)
    });
    if (!tokenResponse.ok) throw createHttpError(502, "GitHub sign-in is temporarily unavailable.");
    const tokenData = await tokenResponse.json();
    if (typeof tokenData.access_token !== "string" || tokenData.error) {
      throw createHttpError(502, "GitHub did not authorize this application. Please try again.");
    }

    const profile = await githubRequest(`${GITHUB_API}/user`, tokenData.access_token);
    if (!Number.isInteger(profile.id) || typeof profile.login !== "string") {
      throw createHttpError(502, "GitHub returned an incomplete profile.");
    }
    const repositories = await githubRequest(
      `${GITHUB_API}/users/${encodeURIComponent(profile.login)}/repos?type=owner&sort=updated&per_page=8`,
      tokenData.access_token
    );
    if (!Array.isArray(repositories)) throw createHttpError(502, "GitHub returned an invalid repository list.");

    const safeRepositories = repositories
      .filter((repository) => {
        if (!repository || typeof repository.name !== "string" || typeof repository.html_url !== "string") {
          return false;
        }
        try {
          const repositoryUrl = new URL(repository.html_url);
          return repositoryUrl.protocol === "https:" && repositoryUrl.hostname === "github.com";
        } catch {
          return false;
        }
      })
      .map((repository) => ({
        name: repository.name,
        url: repository.html_url,
        description: typeof repository.description === "string" ? repository.description : "",
        language: typeof repository.language === "string" ? repository.language : null,
        stars: Number.isInteger(repository.stargazers_count) ? repository.stargazers_count : 0
      }));

    db.prepare(
      "INSERT INTO github_connections (user_id, github_user_id, login, avatar_url, repositories) " +
        "VALUES (?, ?, ?, ?, ?) ON CONFLICT(user_id) DO UPDATE SET " +
        "github_user_id = excluded.github_user_id, login = excluded.login, " +
        "avatar_url = excluded.avatar_url, repositories = excluded.repositories, linked_at = CURRENT_TIMESTAMP"
    ).run(
      req.session.user.id,
      profile.id,
      profile.login,
      typeof profile.avatar_url === "string" && profile.avatar_url.startsWith("https://")
        ? profile.avatar_url
        : null,
      JSON.stringify(safeRepositories)
    );

    return res.redirect("/dashboard?github=connected");
  } catch (error) {
    if (error.code === "SQLITE_CONSTRAINT_UNIQUE") {
      return next(createHttpError(409, "That GitHub account is already connected to another portfolio account."));
    }
    return next(error);
  }
});

router.post("/github/unlink", (req, res, next) => {
  try {
    db.prepare("DELETE FROM github_connections WHERE user_id = ?").run(req.session.user.id);
    return res.redirect("/dashboard?github=disconnected");
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
