/* ═══════════════════════════════════════════════
   FOLIUM — database.js
   SQLite com caminho configurável via DB_PATH.

   No Railway: defina DB_PATH=/data/folium.db
   e anexe um Volume em /data para persistência.
   Localmente: o banco fica em ./folium.db (padrão).
═══════════════════════════════════════════════ */

const Database = require('better-sqlite3');
const path     = require('path');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, 'folium.db');

const db = new Database(DB_PATH);

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    name       TEXT    NOT NULL,
    email      TEXT    NOT NULL UNIQUE COLLATE NOCASE,
    password   TEXT    NOT NULL,
    created_at DATETIME DEFAULT (datetime('now', 'localtime'))
  );
`);

console.log('[DB] Banco SQLite pronto →', DB_PATH);

const stmts = {
  insertUser: db.prepare(`
    INSERT INTO users (name, email, password)
    VALUES (@name, @email, @password)
  `),
  findByEmail: db.prepare(`
    SELECT id, name, email, password, created_at
    FROM users WHERE email = ?
  `),
  findById: db.prepare(`
    SELECT id, name, email, created_at
    FROM users WHERE id = ?
  `),
};

module.exports = {
  createUser({ name, email, password }) {
    const result = stmts.insertUser.run({ name, email, password });
    return { id: result.lastInsertRowid, name, email };
  },
  getUserByEmail(email) {
    return stmts.findByEmail.get(email) || null;
  },
  getUserById(id) {
    return stmts.findById.get(id) || null;
  },
};
