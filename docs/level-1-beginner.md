# Level 1 — Beginner

## Task 1: HTML structure and basic server interaction

**Where to look:** `server.js`, `src/routes/pages.js`, `src/routes/auth.js`, `views/`.

- EJS templates provide the HTML structure, including registration, sign-in, and project forms.
- Express serves pages and handles `POST /auth/register` and `POST /auth/login`.
- Form submissions are checked on the server before validated values are used.

**Try it:** run the app, create an account, and inspect the dashboard. Change a visible label in an EJS template and refresh to see server-rendered HTML.

## Task 2: Inline styles, interaction, and server-side validation

**Where to look:** `views/partials/header.ejs`, `views/register.ejs`, `public/js/app.js`, `src/lib/validation.js`, `src/routes/auth.js`.

- A CSP-nonced inline `<style>` demonstrates inline styling without allowing arbitrary inline styles.
- A CSP-nonced inline password-strength script demonstrates browser interaction; the project form uses the app's separate JavaScript module.
- The server independently validates account and project data. Valid submissions are kept server-side in SQLite rather than trusted from the browser.

**Try it:** use a weak password and invalid project values. Browser hints improve usability, but server validation remains authoritative.
