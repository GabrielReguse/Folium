# ═══════════════════════════════════════════════
#  FOLIUM — database.py
#  PostgreSQL via DATABASE_URL (Render)
# ═══════════════════════════════════════════════

import os
import psycopg
from psycopg.rows import dict_row
from dotenv import load_dotenv

load_dotenv()

def get_conn():
    """Abre uma conexão nova. Feche após usar."""
    url = os.getenv("DATABASE_URL")
    if not url:
        raise RuntimeError("DATABASE_URL não configurada.")
    return psycopg.connect(url, row_factory=dict_row)

def init_db():
    """Cria as tabelas se não existirem e aplica migrações."""
    conn = get_conn()
    try:
        with conn.cursor() as cur:
            cur.execute("""
                CREATE TABLE IF NOT EXISTS users (
                    id         SERIAL PRIMARY KEY,
                    name       TEXT        NOT NULL,
                    email      TEXT        NOT NULL UNIQUE,
                    password   TEXT,
                    google_id  TEXT,
                    created_at TIMESTAMPTZ DEFAULT NOW()
                );
            """)

            cur.execute("""
                CREATE TABLE IF NOT EXISTS verification_codes (
                    id         SERIAL PRIMARY KEY,
                    email      TEXT        NOT NULL,
                    code       TEXT        NOT NULL,
                    expires_at TIMESTAMPTZ NOT NULL,
                    created_at TIMESTAMPTZ DEFAULT NOW()
                );
            """)

            # Migração: adicionar google_id se não existir
            cur.execute("""
                DO $$
                BEGIN
                    IF NOT EXISTS (
                        SELECT 1 FROM information_schema.columns
                        WHERE table_name = 'users' AND column_name = 'google_id'
                    ) THEN
                        ALTER TABLE users ADD COLUMN google_id TEXT;
                    END IF;
                END $$;
            """)

            # Migração: tornar password nullable (para usuários Google)
            cur.execute("""
                ALTER TABLE users ALTER COLUMN password DROP NOT NULL;
            """)

        conn.commit()
        print("[DB] PostgreSQL pronto ✓")
    finally:
        conn.close()

def create_user(name: str, email: str, password: str) -> dict:
    conn = get_conn()
    try:
        with conn.cursor() as cur:
            cur.execute(
                "INSERT INTO users (name, email, password) VALUES (%s, %s, %s) RETURNING id, name, email",
                (name, email.lower(), password)
            )
            user = dict(cur.fetchone())
        conn.commit()
        return user
    finally:
        conn.close()

def create_google_user(name: str, email: str, google_id: str) -> dict:
    conn = get_conn()
    try:
        with conn.cursor() as cur:
            cur.execute(
                "INSERT INTO users (name, email, google_id) VALUES (%s, %s, %s) RETURNING id, name, email",
                (name, email.lower(), google_id)
            )
            user = dict(cur.fetchone())
        conn.commit()
        return user
    finally:
        conn.close()

def get_user_by_email(email: str) -> dict | None:
    conn = get_conn()
    try:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT id, name, email, password, google_id, created_at FROM users WHERE LOWER(email) = %s",
                (email.lower(),)
            )
            row = cur.fetchone()
            return dict(row) if row else None
    finally:
        conn.close()

def get_user_by_id(user_id: int) -> dict | None:
    conn = get_conn()
    try:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT id, name, email, created_at FROM users WHERE id = %s",
                (user_id,)
            )
            row = cur.fetchone()
            return dict(row) if row else None
    finally:
        conn.close()

def delete_user_by_id(user_id: int):
    conn = get_conn()
    try:
        with conn.cursor() as cur:
            cur.execute("DELETE FROM users WHERE id = %s", (user_id,))
        conn.commit()
    finally:
        conn.close()

def link_google_id(user_id: int, google_id: str):
    conn = get_conn()
    try:
        with conn.cursor() as cur:
            cur.execute(
                "UPDATE users SET google_id = %s WHERE id = %s",
                (google_id, user_id)
            )
        conn.commit()
    finally:
        conn.close()

def update_user_password(user_id: int, password_hash: str):
    conn = get_conn()
    try:
        with conn.cursor() as cur:
            cur.execute(
                "UPDATE users SET password = %s WHERE id = %s",
                (password_hash, user_id)
            )
        conn.commit()
    finally:
        conn.close()

# ── Verificação por código ─────────────────────

def save_verification_code(email: str, code: str, expires_at):
    conn = get_conn()
    try:
        with conn.cursor() as cur:
            cur.execute("DELETE FROM verification_codes WHERE LOWER(email) = %s", (email.lower(),))
            cur.execute(
                "INSERT INTO verification_codes (email, code, expires_at) VALUES (%s, %s, %s)",
                (email.lower(), code, expires_at)
            )
        conn.commit()
    finally:
        conn.close()

def get_verification_code(email: str, code: str) -> dict | None:
    conn = get_conn()
    try:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT * FROM verification_codes WHERE LOWER(email) = %s AND code = %s ORDER BY created_at DESC LIMIT 1",
                (email.lower(), code)
            )
            row = cur.fetchone()
            return dict(row) if row else None
    finally:
        conn.close()

def delete_verification_codes(email: str):
    conn = get_conn()
    try:
        with conn.cursor() as cur:
            cur.execute("DELETE FROM verification_codes WHERE LOWER(email) = %s", (email.lower(),))
        conn.commit()
    finally:
        conn.close()
