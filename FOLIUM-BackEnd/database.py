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
    """Cria/atualiza tabelas necessárias."""
    conn = get_conn()
    try:
        with conn.cursor() as cur:
            cur.execute("""
                CREATE TABLE IF NOT EXISTS users (
                    id         SERIAL PRIMARY KEY,
                    name       TEXT        NOT NULL,
                    email      TEXT        NOT NULL UNIQUE,
                    password   TEXT        NOT NULL,
                    created_at TIMESTAMPTZ DEFAULT NOW()
                );
            """)
            # Colunas novas para login Google (idempotente)
            cur.execute("ALTER TABLE users ADD COLUMN IF NOT EXISTS google_sub TEXT UNIQUE;")
            cur.execute("ALTER TABLE users ALTER COLUMN password DROP NOT NULL;")

            # Tabela de verificações pendentes (códigos enviados por email)
            cur.execute("""
                CREATE TABLE IF NOT EXISTS pending_verifications (
                    ticket         TEXT PRIMARY KEY,
                    purpose        TEXT        NOT NULL,
                    email          TEXT        NOT NULL,
                    name           TEXT,
                    password_hash  TEXT,
                    google_sub     TEXT,
                    code_hash      TEXT        NOT NULL,
                    attempts       INT         NOT NULL DEFAULT 0,
                    resends        INT         NOT NULL DEFAULT 0,
                    expires_at     TIMESTAMPTZ NOT NULL,
                    created_at     TIMESTAMPTZ DEFAULT NOW()
                );
            """)
            cur.execute("CREATE INDEX IF NOT EXISTS idx_pending_email ON pending_verifications(email);")
        conn.commit()
        print("[DB] PostgreSQL pronto ✓")
    finally:
        conn.close()


# ── Usuários ──────────────────────────────────────────

def create_user(name: str, email: str, password: str | None, google_sub: str | None = None) -> dict:
    conn = get_conn()
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO users (name, email, password, google_sub)
                VALUES (%s, %s, %s, %s)
                RETURNING id, name, email, google_sub
                """,
                (name, email.lower(), password, google_sub),
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
                "SELECT id, name, email, password, google_sub, created_at FROM users WHERE LOWER(email) = %s",
                (email.lower(),),
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
                "SELECT id, name, email, google_sub, created_at FROM users WHERE id = %s",
                (user_id,),
            )
            row = cur.fetchone()
            return dict(row) if row else None
    finally:
        conn.close()


def link_google_to_user(user_id: int, google_sub: str) -> None:
    conn = get_conn()
    try:
        with conn.cursor() as cur:
            cur.execute(
                "UPDATE users SET google_sub = %s WHERE id = %s AND google_sub IS NULL",
                (google_sub, user_id),
            )
        conn.commit()
    finally:
        conn.close()


# ── Verificações pendentes ───────────────────────────

def create_pending(
    *,
    ticket: str,
    purpose: str,
    email: str,
    code_hash: str,
    expires_at,
    name: str | None = None,
    password_hash: str | None = None,
    google_sub: str | None = None,
) -> None:
    conn = get_conn()
    try:
        with conn.cursor() as cur:
            # Limpa pendências anteriores para o mesmo email (evita lixo acumulado)
            cur.execute(
                "DELETE FROM pending_verifications WHERE LOWER(email) = %s OR expires_at < NOW()",
                (email.lower(),),
            )
            cur.execute(
                """
                INSERT INTO pending_verifications
                    (ticket, purpose, email, name, password_hash, google_sub, code_hash, expires_at)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                """,
                (
                    ticket,
                    purpose,
                    email.lower(),
                    name,
                    password_hash,
                    google_sub,
                    code_hash,
                    expires_at,
                ),
            )
        conn.commit()
    finally:
        conn.close()


def get_pending(ticket: str) -> dict | None:
    conn = get_conn()
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT ticket, purpose, email, name, password_hash, google_sub,
                       code_hash, attempts, resends, expires_at
                FROM pending_verifications
                WHERE ticket = %s
                """,
                (ticket,),
            )
            row = cur.fetchone()
            return dict(row) if row else None
    finally:
        conn.close()


def increment_attempts(ticket: str) -> int:
    conn = get_conn()
    try:
        with conn.cursor() as cur:
            cur.execute(
                "UPDATE pending_verifications SET attempts = attempts + 1 WHERE ticket = %s RETURNING attempts",
                (ticket,),
            )
            row = cur.fetchone()
        conn.commit()
        return int(row["attempts"]) if row else 0
    finally:
        conn.close()


def update_pending_code(ticket: str, code_hash: str, expires_at) -> int:
    """Atualiza código (para reenvio). Retorna número de reenvios."""
    conn = get_conn()
    try:
        with conn.cursor() as cur:
            cur.execute(
                """
                UPDATE pending_verifications
                SET code_hash = %s, expires_at = %s,
                    attempts = 0, resends = resends + 1
                WHERE ticket = %s
                RETURNING resends
                """,
                (code_hash, expires_at, ticket),
            )
            row = cur.fetchone()
        conn.commit()
        return int(row["resends"]) if row else 0
    finally:
        conn.close()


def delete_pending(ticket: str) -> None:
    conn = get_conn()
    try:
        with conn.cursor() as cur:
            cur.execute("DELETE FROM pending_verifications WHERE ticket = %s", (ticket,))
        conn.commit()
    finally:
        conn.close()


# Inicializa o banco ao importar
try:
    init_db()
except Exception as e:
    print(f"[DB] ERRO ao inicializar banco: {e}")
    raise  # agora vai aparecer no log do Render
