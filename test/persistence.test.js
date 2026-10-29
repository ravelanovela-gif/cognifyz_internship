const test = require("node:test");
const assert = require("node:assert/strict");
const db = require("../src/db");
const queue = require("../src/jobs/queue");
const cache = require("../src/lib/cache");

test("activity jobs persist until the background worker processes them", () => {
  const email = `queue-${Date.now()}-${Math.random()}@example.com`;
  const user = db
    .prepare("INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)")
    .run("Queue Test", email, "test-hash");
  const userId = Number(user.lastInsertRowid);

  try {
    queue.enqueueActivity(userId, "Created", "Durable queue test");
    const queued = db
      .prepare("SELECT id, status FROM background_jobs WHERE job_type = 'activity' ORDER BY id DESC LIMIT 1")
      .get();
    assert.ok(queued);
    assert.equal(queued.status, "pending");

    queue.processNext();

    const activity = db
      .prepare("SELECT action, project_title FROM activity_log WHERE user_id = ? ORDER BY id DESC LIMIT 1")
      .get(userId);
    assert.equal(activity.action, "Created");
    assert.equal(activity.project_title, "Durable queue test");
    assert.equal(db.prepare("SELECT id FROM background_jobs WHERE id = ?").get(queued.id), undefined);
  } finally {
    db.prepare("DELETE FROM background_jobs WHERE payload LIKE ?").run(`%${userId}%`);
    db.prepare("DELETE FROM users WHERE id = ?").run(userId);
  }
});

test("weather cache persists values and expires them", () => {
  const key = `cache-test-${Date.now()}-${Math.random()}`;
  const value = { city: "Test City", temperature: 21 };

  try {
    cache.setCached(key, value, 60_000);
    assert.deepEqual(cache.getCached(key), value);

    cache.setCached(key, value, -1);
    assert.equal(cache.getCached(key), undefined);
  } finally {
    db.prepare("DELETE FROM weather_cache WHERE cache_key = ?").run(key);
  }
});
