# Level 4 — Expert

## Task 7: OAuth, external APIs, limits, and error handling

**Where to look:** `src/routes/oauth.js`, `src/lib/oauth-state.js`, `src/services/weather.js`, `src/routes/api.js`, `server.js`.

- GitHub OAuth uses the authorization-code flow, a random short-lived state checked with a timing-safe comparison, and the minimum `read:user` scope.
- The server exchanges the authorization code, fetches the GitHub profile and public repositories, and discards the access token after use. Public profile/repository details are stored for display.
- Open-Meteo supplies geocoding and current weather. Weather requests are rate-limited and cached; network calls have timeouts and report service errors rather than fabricated data.
- Configure a GitHub OAuth App and local callback using the root README before connecting GitHub. OAuth credentials are not committed.

**Try it:** connect your GitHub account from the dashboard's GitHub OAuth tab, then inspect the displayed public repositories. Test missing credentials, denied consent, and retrying an expired authorization.

## Task 8: Advanced server-side functionality

**Where to look:** `server.js`, `src/jobs/queue.js`, `src/db.js`, `src/lib/cache.js`.

- Helmet, JSON/form body parsing, request logging, sessions, CSRF checks, and rate-limit middleware process incoming requests.
- Project changes enqueue activity jobs in SQLite. A background worker processes persisted jobs, safely retries failures, and retains terminal failures for inspection; work survives a process restart.
- The expiring weather-response cache is stored in SQLite and survives a restart. No Redis installation is required for this learning implementation.

**Try it:** create a project, refresh the dashboard to see its activity, then restart the app and confirm project, session, and cached/job data are persisted as expected.
