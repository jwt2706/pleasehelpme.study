const path = require("path");
const fs = require("fs");
const Database = require("better-sqlite3");

const dbPath = process.env.DB_PATH || "./data/say-it-back.db";
fs.mkdirSync(path.dirname(dbPath), { recursive: true });

const db = new Database(dbPath);
db.pragma("journal_mode = WAL");

const crypto = require("crypto");

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

try {
  db.exec(`ALTER TABLE users ADD COLUMN role TEXT NOT NULL DEFAULT 'student'`);
} catch (_) { /* already added on a later boot */ }
try {
  db.exec(`ALTER TABLE users ADD COLUMN role_selected INTEGER NOT NULL DEFAULT 0`);
} catch (_) { /* already added */ }

db.exec(`
  CREATE TABLE IF NOT EXISTS links (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    guardian_sub TEXT NOT NULL,
    student_sub TEXT NOT NULL,
    guardian_role TEXT NOT NULL, -- 'parent' | 'teacher'
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(guardian_sub, student_sub),
    FOREIGN KEY (guardian_sub) REFERENCES users(auth0_sub),
    FOREIGN KEY (student_sub) REFERENCES users(auth0_sub)
  );

  CREATE TABLE IF NOT EXISTS link_codes (
    code TEXT PRIMARY KEY,
    creator_sub TEXT NOT NULL,
    creator_role TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (creator_sub) REFERENCES users(auth0_sub)
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

function getSessionHistory(sub) {
  const rows = db
    .prepare(
      `SELECT id, topic, persona_id, transcript, gap_report, created_at
       FROM sessions
       WHERE auth0_sub = ?
       ORDER BY created_at DESC`
    )
    .all(sub);

  return rows.map((row) => ({
    id: row.id,
    topic: row.topic,
    personaId: row.persona_id,
    createdAt: row.created_at,
    transcript: JSON.parse(row.transcript),
    gapReport: row.gap_report ? JSON.parse(row.gap_report) : null,
  }));
}

function setUserRole(sub, role) {
  if (!["student", "parent", "teacher"].includes(role)) {
    throw new Error("Invalid role");
  }
  db.prepare(
    `UPDATE users SET role = ?, role_selected = 1 WHERE auth0_sub = ?`
  ).run(role, sub);
  return getUser(sub);
}

function generateLinkCode(creatorSub, creatorRole) {
  const code = crypto.randomBytes(4).toString("hex"); // 8 chars
  const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();
  db.prepare(
    `INSERT INTO link_codes (code, creator_sub, creator_role, expires_at) VALUES (?, ?, ?, ?)`
  ).run(code, creatorSub, creatorRole, expiresAt);
  return { code, expiresAt };
}

function redeemLinkCode(code, redeemerSub, redeemerRole) {
  const row = db.prepare(`SELECT * FROM link_codes WHERE code = ?`).get(code);
  if (!row) throw new Error("Invalid or expired code");
  if (new Date(row.expires_at) < new Date()) {
    db.prepare(`DELETE FROM link_codes WHERE code = ?`).run(code);
    throw new Error("Invalid or expired code");
  }
  if (row.creator_sub === redeemerSub) throw new Error("Cannot link to yourself");

  let guardianSub, studentSub, guardianRole;
  if (row.creator_role === "student") {
    if (!["parent", "teacher"].includes(redeemerRole)) {
      throw new Error("This code must be redeemed by a parent or teacher account");
    }
    guardianSub = redeemerSub;
    studentSub = row.creator_sub;
    guardianRole = redeemerRole;
  } else {
    // A parent/teacher can also generate a "class/family" code for students to redeem
    if (redeemerRole !== "student") {
      throw new Error("This code must be redeemed by a student account");
    }
    guardianSub = row.creator_sub;
    studentSub = redeemerSub;
    guardianRole = row.creator_role;
  }

  db.prepare(
    `INSERT OR IGNORE INTO links (guardian_sub, student_sub, guardian_role) VALUES (?, ?, ?)`
  ).run(guardianSub, studentSub, guardianRole);

  db.prepare(`DELETE FROM link_codes WHERE code = ?`).run(code); // single-use

  return { guardianSub, studentSub };
}

function getLinkedStudents(guardianSub) {
  return db
    .prepare(
      `SELECT u.auth0_sub, u.email, u.sessions_completed, u.streak_count, l.created_at AS linked_at
       FROM links l JOIN users u ON u.auth0_sub = l.student_sub
       WHERE l.guardian_sub = ?
       ORDER BY l.created_at DESC`
    )
    .all(guardianSub);
}

function getGuardiansForStudent(studentSub) {
  return db
    .prepare(
      `SELECT u.auth0_sub, u.email, l.guardian_role, l.created_at AS linked_at
       FROM links l JOIN users u ON u.auth0_sub = l.guardian_sub
       WHERE l.student_sub = ?
       ORDER BY l.created_at DESC`
    )
    .all(studentSub);
}

function isLinked(guardianSub, studentSub) {
  return !!db
    .prepare(`SELECT 1 FROM links WHERE guardian_sub = ? AND student_sub = ?`)
    .get(guardianSub, studentSub);
}

function removeLink(guardianSub, studentSub) {
  db.prepare(`DELETE FROM links WHERE guardian_sub = ? AND student_sub = ?`).run(
    guardianSub,
    studentSub
  );
}

module.exports = {
  db,
  upsertUser,
  getUser,
  completeSession,
  getSessionHistory,
  setUserRole,
  generateLinkCode,
  redeemLinkCode,
  getLinkedStudents,
  getGuardiansForStudent,
  isLinked,
  removeLink,
};
