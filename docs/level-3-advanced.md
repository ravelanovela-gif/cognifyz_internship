# Level 3 — Advanced

## Task 5: API integration and front-end interaction

**Where to look:** `src/routes/api.js`, `src/services/weather.js`, `public/js/app.js`.

- Project create/read/update/delete operations are exposed as REST endpoints.
- The dashboard calls the app's own API with browser `fetch` and updates the DOM from JSON responses.
- Weather lookup calls the external Open-Meteo geocoding and forecast APIs; upstream failures and timeouts are reported.

**Try it:** use the dashboard, then inspect the browser Network tab to view JSON responses. Try a misspelled city to see the not-found path.

## Task 6: Database and user authentication

**Where to look:** `src/db.js`, `src/routes/auth.js`, `src/middleware/auth.js`, `server.js`.

- SQLite persists users, projects, sessions, and activity.
- Passwords are hashed with bcrypt; the raw password is never stored.
- Session authentication protects dashboard and API access. Each project query is scoped to the signed-in user's ID.
- CSRF tokens protect form submissions and state-changing API requests; login/register attempts are rate-limited.

**Try it:** create two accounts and check that each sees only its own projects. A signed-out request to `/api/projects` receives HTTP 401.
