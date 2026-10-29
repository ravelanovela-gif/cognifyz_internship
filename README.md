# Cognifyz Internship Showcase

An original Full Stack Development learning project that implements the eight tasks in the internship brief as one portfolio app. It includes EJS server-rendered forms, client and server validation, responsive Bootstrap UI, REST CRUD, SQLite persistence, password authentication, GitHub OAuth, external weather/repository APIs, rate limits, a persistent background job queue, and persistent caching.

## Requirements

- Node.js 22.13 or newer (the project uses Node's built-in SQLite module)
- npm
- Internet access for the Bootstrap CDN and external API demos

No separate database or Redis server is needed. SQLite stores users, projects, sessions, cache entries, and durable background jobs.

## Run the project

Open a terminal in this project folder and run:

```powershell
npm.cmd install
npm.cmd test
npm.cmd start
```

Open the local project at **http://localhost:3000**. Keep the terminal open while using the app; press `Ctrl+C` to stop it.
In PowerShell, use `npm.cmd` if the execution policy blocks the `npm` script. If port 3000 is already serving this project, open that existing page instead of starting a second copy. To run another copy on a different port:

```powershell
$env:PORT = "3001"
npm.cmd start
```

For local development, the app has a development-only session secret fallback. Before deployment, copy `.env.example` to `.env`, set a long random `SESSION_SECRET`, and set `NODE_ENV=production`. Never commit `.env` or share your OAuth client secret.

## Enable the GitHub OAuth integration

The GitHub OAuth code is implemented, but GitHub requires credentials for your own OAuth App. The app still runs without these credentials; the GitHub tab explains how to enable it.

1. Sign in to GitHub and open **Settings → Developer settings → OAuth Apps → New OAuth App**.
2. Set **Homepage URL** to `http://localhost:3000`.
3. Set **Authorization callback URL** to `http://localhost:3000/oauth/github/callback`.
4. Create the app, copy its Client ID, and generate a Client secret.
5. Copy `.env.example` to `.env`, then fill in:

   ```dotenv
   SESSION_SECRET=replace-with-a-long-random-secret
   GITHUB_CLIENT_ID=your-github-oauth-client-id
   GITHUB_CLIENT_SECRET=your-github-oauth-client-secret
   GITHUB_CALLBACK_URL=http://localhost:3000/oauth/github/callback
   ```

6. Stop and restart `npm start`, sign in to the portfolio app, open the **GitHub OAuth** tab, then choose **Connect GitHub** and approve.

The app validates a random, short-lived OAuth `state`, requests only `read:user`, calls GitHub from the server, and does not store the access token. It stores only the GitHub profile details and public repository data needed to display the portfolio. GitHub OAuth Apps do not provide a production callback for arbitrary localhost users; deploy with HTTPS and update the OAuth App callback and `GITHUB_CALLBACK_URL` for a public website.

## Implemented internship tasks

| Level | Task | Implementation |
|---|---|---|
| 1 — Beginner | 1. HTML structure and basic server interaction | EJS pages/forms, Express server endpoints, server-rendered responses |
| 1 — Beginner | 2. Inline styles, interaction, and server-side validation | Nonced inline CSS and password-strength JavaScript, interactive forms, duplicated client/server validation, validated SQLite storage |
| 2 — Intermediate | 3. Advanced CSS and responsive design | Bootstrap grid, responsive custom CSS, transitions, reduced-motion support |
| 2 — Intermediate | 4. Complex validation and dynamic DOM | Password/project rules, live project CRUD UI, hash-based client navigation |
| 3 — Advanced | 5. REST API and front-end interaction | Authenticated project CRUD JSON API, browser `fetch`, Open-Meteo integration |
| 3 — Advanced | 6. Database and authentication | SQLite, bcrypt password hashes, sessions, CSRF, per-user authorization |
| 4 — Expert | 7. OAuth, external APIs, rate limits, error handling | GitHub OAuth 2.0 and public repositories; Open-Meteo; timeouts, rate limits, explicit errors |
| 4 — Expert | 8. Middleware, background work, and caching | Helmet, body parsing, request logging, durable SQLite job queue/worker, persistent expiring API cache |

### Task guides

- [Level 1: Beginner](docs/level-1-beginner.md)
- [Level 2: Intermediate](docs/level-2-intermediate.md)
- [Level 3: Advanced](docs/level-3-advanced.md)
- [Level 4: Expert](docs/level-4-expert.md)

## API

All `/api` endpoints require a signed-in session. Mutating requests also require the CSRF token from the `csrf-token` meta tag.

| Method | Route | Purpose |
|---|---|---|
| GET | `/api/projects` | List the signed-in user's projects |
| POST | `/api/projects` | Create a project |
| GET | `/api/projects/:id` | Read one owned project |
| PATCH | `/api/projects/:id` | Update an owned project |
| DELETE | `/api/projects/:id` | Delete an owned project |
| GET | `/api/activity` | Read recent background activity entries |
| GET | `/api/weather?city=Hyderabad` | Search weather through Open-Meteo |

## Demo checklist

- Create an account and sign in; confirm signed-out API access is denied.
- Submit invalid form values and show client/server validation.
- Create, edit, and delete projects; refresh to show SQLite persistence.
- Use the Weather tab to fetch current conditions.
- Configure GitHub OAuth to demo OAuth consent and public-repository fetching.
- Resize the browser to show responsive UI and use `#projects`, `#weather`, and `#github` tabs.
- Create or change a project and show its activity entry after the background worker processes the queued job.

## Security and integrity

The project is a learning example, not a production deployment template. Production use requires HTTPS, a strong secret in the hosting provider's secret manager, backups, monitoring, and an OAuth callback URL matching the deployed host. Never upload `.env`, database files, or another person's code. Understand and customize the code before presenting it; be ready to explain each task and the changes you made.
