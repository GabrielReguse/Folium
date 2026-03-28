/* ═══════════════════════════════════════════════
   FOLIUM — database.js
   PostgreSQL via variável DATABASE_URL (Render)
   Em dev local, funciona com SQLite via fallback.
═══════════════════════════════════════════════ */

const { Pool } = require('pg');

/* ── Conexão ──────────────────────────────────
   No Render: DATABASE_URL é preenchida
   automaticamente ao linkar o banco PostgreSQL.
   Localmente: coloque no .env (veja .env.example).
──────────────────────────────────────────────── */
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,

  /* SSL obrigatório no Render (e na maioria dos hosts) */
  ssl: process.env.NODE_ENV === 'production'
    ? { rejectUnauthorized: false }
    : false,
});

/* ── Criação da tabela (se não existir) ────── */
async function initDB() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id         SERIAL PRIMARY KEY,
      name       TEXT        NOT NULL,
      email      TEXT        NOT NULL UNIQUE,
      password   TEXT        NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);
  console.log('[DB] PostgreSQL pronto ✓');
}

initDB().catch(err => {
  console.error('[DB] Erro ao inicializar banco:', err.message);
  process.exit(1);
});

/* ══════════════════════════════════════════════
   FUNÇÕES DE ACESSO
══════════════════════════════════════════════ */

module.exports = {
  /**
   * Cria um novo usuário
   * @returns {{ id, name, email }}
   */
  async createUser({ name, email, password }) {
    const { rows } = await pool.query(
      `INSERT INTO users (name, email, password)
       VALUES ($1, $2, $3)
       RETURNING id, name, email`,
      [name, email.toLowerCase(), password]
    );
    return rows[0];
  },

  /**
   * Busca usuário pelo e-mail (inclui password hash)
   * @returns {object|null}
   */
  async getUserByEmail(email) {
    const { rows } = await pool.query(
      `SELECT id, name, email, password, created_at
       FROM users WHERE LOWER(email) = $1`,
      [email.toLowerCase()]
    );
    return rows[0] || null;
  },

  /**
   * Busca usuário pelo ID (sem expor senha)
   * @returns {object|null}
   */
  async getUserById(id) {
    const { rows } = await pool.query(
      `SELECT id, name, email, created_at
       FROM users WHERE id = $1`,
      [id]
    );
    return rows[0] || null;
  },
};
