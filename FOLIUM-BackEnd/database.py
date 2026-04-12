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
    """Cria a tabela de usuários se não existir."""
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

def get_user_by_email(email: str) -> dict | None:
    conn = get_conn()
    try:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT id, name, email, password, created_at FROM users WHERE LOWER(email) = %s",
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

# Inicializa o banco ao importar
try:
    init_db()
except Exception as e:
    print(f"[DB] ERRO ao inicializar banco: {e}")
    raise  # agora vai aparecer no log do Render