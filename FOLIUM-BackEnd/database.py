# ═══════════════════════════════════════════════
#  FOLIUM — database.py
#  PostgreSQL via DATABASE_URL (Render)
# ═══════════════════════════════════════════════

import os
import json
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

            # Migrações para tabelas existentes
            cur.execute("""
                DO $$
                BEGIN
                    -- Adiciona google_id se não existir
                    IF NOT EXISTS (
                        SELECT 1 FROM information_schema.columns
                        WHERE table_name = 'users' AND column_name = 'google_id'
                    ) THEN
                        ALTER TABLE users ADD COLUMN google_id TEXT;
                    END IF;

                    -- Torna password nullable (para usuários Google)
                    ALTER TABLE users ALTER COLUMN password DROP NOT NULL;
                EXCEPTION WHEN OTHERS THEN
                    NULL;
                END $$;
            """)

            cur.execute("""
                CREATE TABLE IF NOT EXISTS verification_codes (
                    id         SERIAL PRIMARY KEY,
                    email      TEXT        NOT NULL,
                    code       TEXT        NOT NULL,
                    action     TEXT        NOT NULL DEFAULT 'login',
                    payload    TEXT,
                    created_at TIMESTAMPTZ DEFAULT NOW(),
                    used       BOOLEAN     DEFAULT FALSE
                );
            """)

            cur.execute("""
                CREATE INDEX IF NOT EXISTS idx_vc_email_code
                ON verification_codes (email, code);
            """)

        conn.commit()
        print("[DB] PostgreSQL pronto")
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

def create_user_google(name: str, email: str, google_id: str) -> dict:
    """Cria um usuário via Google (sem senha)."""
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

def link_google_id(user_id: int, google_id: str) -> None:
    """Vincula Google ID a um usuário existente."""
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

# ── Verificação por código ──

def save_verification_code(email: str, code: str, action: str = "login", payload: dict | None = None) -> None:
    """Salva um código de verificação. Invalida códigos anteriores do mesmo e-mail."""
    conn = get_conn()
    try:
        with conn.cursor() as cur:
            cur.execute(
                "UPDATE verification_codes SET used = TRUE WHERE LOWER(email) = %s AND used = FALSE",
                (email.lower(),)
            )
            payload_str = json.dumps(payload) if payload else None
            cur.execute(
                "INSERT INTO verification_codes (email, code, action, payload) VALUES (%s, %s, %s, %s)",
                (email.lower(), code, action, payload_str)
            )
        conn.commit()
    finally:
        conn.close()

def check_verification_code(email: str, code: str) -> dict | None:
    """
    Verifica se o código é válido (não usado, criado há menos de 10 minutos).
    Retorna o registro se válido, None caso contrário.
    Marca o código como usado.
    """
    conn = get_conn()
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT id, email, code, action, payload, created_at
                FROM verification_codes
                WHERE LOWER(email) = %s
                  AND code = %s
                  AND used = FALSE
                  AND created_at > NOW() - INTERVAL '10 minutes'
                ORDER BY created_at DESC
                LIMIT 1
                """,
                (email.lower(), code)
            )
            row = cur.fetchone()
            if not row:
                return None

            cur.execute(
                "UPDATE verification_codes SET used = TRUE WHERE id = %s",
                (row["id"],)
            )
        conn.commit()

        result = dict(row)
        if result.get("payload"):
            result["payload"] = json.loads(result["payload"])
        return result
    finally:
        conn.close()

def cleanup_expired_codes() -> None:
    """Remove códigos expirados (mais de 30 minutos)."""
    conn = get_conn()
    try:
        with conn.cursor() as cur:
            cur.execute(
                "DELETE FROM verification_codes WHERE created_at < NOW() - INTERVAL '30 minutes'"
            )
        conn.commit()
    finally:
        conn.close()

# Inicializa o banco ao importar
try:
    init_db()
except Exception as e:
    print(f"[DB] ERRO ao inicializar banco: {e}")
    raise
