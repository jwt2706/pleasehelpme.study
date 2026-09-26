const path = require("path");
const fs = require("fs");
const Database = require("better-sqlite3");

const dbPath = process.env.DB_PATH || "./data/say-it-back.db";
fs.mkdirSync(path.dirname(dbPath), { recursive: true });

const db = new Database(dbPath);
db.pragma("journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    auth0_sub TEXT PRIMARY KEY,
    email TEXT,
    sessions_completed INTEGER NOT NULL DEFAULT 0,
    streak_count INTEGER NOT NULL DEFAULT 0,
    last_session_at TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    auth0_sub TEXT NOT NULL,
    topic TEXT NOT NULL,
    persona_id TEXT NOT NULL,
    transcript TEXT NOT NULL,
    gap_report TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (auth0_sub) REFERENCES users(auth0_sub)
  );
`);

function upsertUser(sub, email) {
  db.prepare(
    `INSERT INTO users (auth0_sub, email) VALUES (?, ?)
     ON CONFLICT(auth0_sub) DO UPDATE SET email = excluded.email`
  ).run(sub, email || null);
  return getUser(sub);
}

function getUser(sub) {
  return db.prepare(`SELECT * FROM users WHERE auth0_sub = ?`).get(sub);
}

function completeSession({ sub, topic, personaId, transcript, gapReport }) {
  db.prepare(
    `INSERT INTO sessions (auth0_sub, topic, persona_id, transcript, gap_report)
     VALUES (?, ?, ?, ?, ?)`
  ).run(sub, topic, personaId, JSON.stringify(transcript), JSON.stringify(gapReport));

  db.prepare(
    `UPDATE users
     SET sessions_completed = sessions_completed + 1,
         streak_count = streak_count + 1,
         last_session_at = datetime('now')
     WHERE auth0_sub = ?`
  ).run(sub);

  return getUser(sub);
}

module.exports = { db, upsertUser, getUser, completeSession };
