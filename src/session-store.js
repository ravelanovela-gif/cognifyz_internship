const session = require("express-session");

class SQLiteSessionStore extends session.Store {
  constructor({ db }) {
    super();
    this.db = db;
    this.getStatement = db.prepare("SELECT session, expires_at FROM sessions WHERE sid = ?");
    this.setStatement = db.prepare(
      "INSERT INTO sessions (sid, session, expires_at) VALUES (?, ?, ?) " +
        "ON CONFLICT(sid) DO UPDATE SET session = excluded.session, expires_at = excluded.expires_at"
    );
    this.deleteStatement = db.prepare("DELETE FROM sessions WHERE sid = ?");
    this.pruneStatement = db.prepare("DELETE FROM sessions WHERE expires_at <= ?");
  }

  get(sid, callback) {
    try {
      const row = this.getStatement.get(sid);
      if (!row) return callback(null, null);
      if (row.expires_at <= Date.now()) {
        this.deleteStatement.run(sid);
        return callback(null, null);
      }
      return callback(null, JSON.parse(row.session));
    } catch (error) {
      return callback(error);
    }
  }

  set(sid, sessionData, callback = () => {}) {
    try {
      const expiresAt = sessionData.cookie?.expires
        ? new Date(sessionData.cookie.expires).getTime()
        : Date.now() + Number(sessionData.cookie?.maxAge || 86400000);
      this.pruneStatement.run(Date.now());
      this.setStatement.run(sid, JSON.stringify(sessionData), expiresAt);
      return callback(null);
    } catch (error) {
      return callback(error);
    }
  }

  destroy(sid, callback = () => {}) {
    try {
      this.deleteStatement.run(sid);
      return callback(null);
    } catch (error) {
      return callback(error);
    }
  }

  touch(sid, sessionData, callback = () => {}) {
    this.set(sid, sessionData, callback);
  }
}

module.exports = SQLiteSessionStore;
