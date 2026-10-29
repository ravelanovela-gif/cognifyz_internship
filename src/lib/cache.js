const db = require("../db");

function getCached(key) {
  const entry = db.prepare("SELECT value, expires_at FROM weather_cache WHERE cache_key = ?").get(key);
  if (!entry) return undefined;
  if (entry.expires_at <= Date.now()) {
    db.prepare("DELETE FROM weather_cache WHERE cache_key = ?").run(key);
    return undefined;
  }
  return JSON.parse(entry.value);
}

function setCached(key, value, ttlMs) {
  db.prepare("DELETE FROM weather_cache WHERE expires_at <= ?").run(Date.now());
  db.prepare(
    "INSERT INTO weather_cache (cache_key, value, expires_at) VALUES (?, ?, ?) " +
      "ON CONFLICT(cache_key) DO UPDATE SET value = excluded.value, expires_at = excluded.expires_at"
  ).run(key, JSON.stringify(value), Date.now() + ttlMs);
}

module.exports = { getCached, setCached };
