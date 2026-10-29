const db = require("../db");

const MAX_ATTEMPTS = 5;
const POLL_INTERVAL_MS = 500;
let interval = null;
let processing = false;

function enqueueActivity(userId, action, projectTitle) {
  db.prepare("INSERT INTO background_jobs (job_type, payload, run_after) VALUES (?, ?, ?)")
    .run("activity", JSON.stringify({ userId, action, projectTitle }), Date.now());
}

function processNext() {
  if (processing) return;
  processing = true;

  try {
    const job = db
      .prepare(
        "SELECT id, job_type, payload, attempts FROM background_jobs " +
          "WHERE status = 'pending' AND run_after <= ? ORDER BY id LIMIT 1"
      )
      .get(Date.now());
    if (!job) return;

    try {
      const payload = JSON.parse(job.payload);
      if (job.job_type !== "activity") throw new Error(`Unknown background job type: ${job.job_type}`);
      if (
        !Number.isInteger(payload.userId) ||
        typeof payload.action !== "string" ||
        typeof payload.projectTitle !== "string"
      ) {
        throw new Error("Background activity job has an invalid payload.");
      }

      db.exec("BEGIN IMMEDIATE");
      try {
        const claim = db
          .prepare("UPDATE background_jobs SET status = 'processing' WHERE id = ? AND status = 'pending'")
          .run(job.id);
        if (claim.changes) {
          db.prepare(
            "INSERT INTO activity_log (user_id, action, project_title) VALUES (?, ?, ?)"
          ).run(payload.userId, payload.action, payload.projectTitle);
          db.prepare("DELETE FROM background_jobs WHERE id = ?").run(job.id);
        }
        db.exec("COMMIT");
      } catch (error) {
        db.exec("ROLLBACK");
        throw error;
      }
    } catch (error) {
      const attempts = job.attempts + 1;
      const isTerminal = attempts >= MAX_ATTEMPTS;
      const retryDelay = Math.min(1000 * 2 ** attempts, 60_000);
      db.prepare(
        "UPDATE background_jobs SET attempts = ?, status = ?, run_after = ?, last_error = ? WHERE id = ?"
      ).run(
        attempts,
        isTerminal ? "failed" : "pending",
        Date.now() + retryDelay,
        error.message,
        job.id
      );
      console.error(`Background job ${job.id} failed (${attempts}/${MAX_ATTEMPTS}):`, error);
    }
  } catch (error) {
    console.error("Could not process background job:", error);
  } finally {
    processing = false;
  }
}

function start() {
  if (interval) return;
  db.prepare("UPDATE background_jobs SET status = 'pending' WHERE status = 'processing'").run();
  interval = setInterval(processNext, POLL_INTERVAL_MS);
  interval.unref();
  setImmediate(processNext);
}

function stop() {
  if (interval) clearInterval(interval);
  interval = null;
}

module.exports = { enqueueActivity, processNext, start, stop };
