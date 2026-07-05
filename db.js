// db.js - Hifadhi rahisi ya watumiaji na video zilizoombwa, kwa SQLite (better-sqlite3)

const Database = require('better-sqlite3');
const db = new Database('wa_users.db');

db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    jid TEXT PRIMARY KEY,
    first_seen INTEGER,
    last_seen INTEGER,
    request_count INTEGER DEFAULT 0
  );

  CREATE TABLE IF NOT EXISTS requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    jid TEXT,
    url TEXT,
    video_id TEXT,
    status TEXT,
    created_at INTEGER
  );
`);

function upsertUser(jid) {
  const now = Math.floor(Date.now() / 1000);
  const existing = db.prepare('SELECT jid FROM users WHERE jid = ?').get(jid);
  if (existing) {
    db.prepare('UPDATE users SET last_seen = ?, request_count = request_count + 1 WHERE jid = ?')
      .run(now, jid);
  } else {
    db.prepare('INSERT INTO users (jid, first_seen, last_seen, request_count) VALUES (?, ?, ?, 1)')
      .run(jid, now, now);
  }
}

function logRequest(jid, url, videoId, status) {
  const now = Math.floor(Date.now() / 1000);
  db.prepare(
    'INSERT INTO requests (jid, url, video_id, status, created_at) VALUES (?, ?, ?, ?, ?)'
  ).run(jid, url, videoId, status, now);
}

function totalUsers() {
  return db.prepare('SELECT COUNT(*) as c FROM users').get().c;
}

function activeUsersSince(days) {
  const cutoff = Math.floor(Date.now() / 1000) - days * 86400;
  return db.prepare('SELECT COUNT(*) as c FROM users WHERE last_seen >= ?').get(cutoff).c;
}

function allUserJids() {
  return db.prepare('SELECT jid FROM users').all().map((r) => r.jid);
}

// Rate limiting rahisi: mtumiaji asizidi maombi mangapi kwa dakika fulani
function requestsInLastMinutes(jid, minutes) {
  const cutoff = Math.floor(Date.now() / 1000) - minutes * 60;
  return db
    .prepare('SELECT COUNT(*) as c FROM requests WHERE jid = ? AND created_at >= ?')
    .get(jid, cutoff).c;
}

module.exports = {
  upsertUser,
  logRequest,
  totalUsers,
  activeUsersSince,
  allUserJids,
  requestsInLastMinutes,
};
