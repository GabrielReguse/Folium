import os
import re
import secrets
import hashlib
import uuid
from datetime import datetime, timedelta, timezone

import httpx
import bcrypt
from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel
from jose import jwt, JWTError

import database as db
from email_service import send_verification_code

router = APIRouter()


# ── Configurações ────────────────────────────────────

CODE_TTL_MINUTES     = int(os.getenv("VERIFICATION_CODE_TTL_MIN", "10"))
CODE_MAX_ATTEMPTS    = int(os.getenv("VERIFICATION_MAX_ATTEMPTS", "5"))
CODE_MAX_RESENDS     = int(os.getenv("VERIFICATION_MAX_RESENDS",  "3"))
GOOGLE_CLIENT_ID     = os.getenv("GOOGLE_OAUTH_CLIENT_ID", "")


# ── Utilitários ─────────────────────────────────────

def _hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def _verify_password(password: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(password.encode(), hashed.encode())
    except Exception:
        return False


def _make_token(user: dict) -> str:
    secret  = os.getenv("JWT_SECRET", "dev_secret")
    expires = int(os.getenv("JWT_EXPIRES_DAYS", "7"))
    payload = {
        "id":    user["id"],
        "name":  user["name"],
        "email": user["email"],
        "exp":   datetime.now(timezone.utc) + timedelta(days=expires),
    }
    return jwt.encode(payload, secret, algorithm="HS256")


def _generate_code() -> str:
    """Código numérico de 6 dígitos (criptograficamente aleatório)."""
    return f"{secrets.randbelow(1_000_000):06d}"


def _hash_code(code: str) -> str:
    return hashlib.sha256(code.encode()).hexdigest()


def _valid_email(email: str) -> bool:
    return bool(re.match(r"^[^\s@]+@[^\s@]+\.[^\s@]+$", email or ""))


def _start_verification(
    *,
    purpose: str,
    email: str,
    name: str | None = None,
    password_hash: str | None = None,
    google_sub: str | None = None,
) -> dict:
    """Gera código, persiste e envia. Retorna resposta padronizada para o cliente."""
    code   = _generate_code()
    ticket = uuid.uuid4().hex
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=CODE_TTL_MINUTES)

    db.create_pending(
        ticket=ticket,
        purpose=purpose,
        email=email,
        code_hash=_hash_code(code),
        expires_at=expires_at,
        name=name,
        password_hash=password_hash,
        google_sub=google_sub,
    )

    try:
        send_verification_code(email, code, name)
    except RuntimeError as e:
        # Limpa a pendência pra evitar lixo se não conseguimos enviar o email
        db.delete_pending(ticket)
        raise HTTPException(503, str(e))

    return {
        "verification_required": True,
        "ticket": ticket,
        "email": email,
        "expires_in": CODE_TTL_MINUTES * 60,
        "message": f"Enviamos um código de verificação para {email}.",
    }


# ── Schemas ─────────────────────────────────────────

class RegisterBody(BaseModel):
    name:     str
    email:    str
    password: str


class LoginBody(BaseModel):
    email:    str
    password: str


class GoogleBody(BaseModel):
    credential: str   # ID token devolvido pelo Google Identity Services


class VerifyBody(BaseModel):
    ticket: str
    code:   str


class ResendBody(BaseModel):
    ticket: str


# ── Endpoints ──────────────────────────────────────

@router.get("/google/config")
def google_config():
    """Devolve o Client ID público para o frontend inicializar o Google Sign-In."""
    return {"client_id": GOOGLE_CLIENT_ID}


@router.post("/register", status_code=202)
def register(body: RegisterBody):
    name  = (body.name  or "").strip()
    email = (body.email or "").strip()
    pw    = body.password or ""

    if len(name) < 2:
        raise HTTPException(400, "Nome deve ter pelo menos 2 caracteres.")
    if not _valid_email(email):
        raise HTTPException(400, "E-mail inválido.")
    if len(pw) < 4:
        raise HTTPException(400, "Senha deve ter pelo menos 4 caracteres.")

    existing = db.get_user_by_email(email)
    if existing:
        raise HTTPException(409, "Este e-mail já está cadastrado.")

    return _start_verification(
        purpose="register",
        email=email,
        name=name,
        password_hash=_hash_password(pw),
    )


@router.post("/login", status_code=202)
def login(body: LoginBody):
    email = (body.email or "").strip()
    pw    = body.password or ""
    if not email or not pw:
        raise HTTPException(400, "E-mail e senha são obrigatórios.")

    user = db.get_user_by_email(email)
    if not user or not user.get("password") or not _verify_password(pw, user["password"]):
        raise HTTPException(401, "E-mail ou senha incorretos.")

    return _start_verification(
        purpose="login",
        email=user["email"],
        name=user["name"],
    )


@router.post("/google", status_code=202)
def google_login(body: GoogleBody):
    """Valida o ID token do Google e inicia a verificação por email."""
    if not body.credential:
        raise HTTPException(400, "Credencial Google ausente.")
    if not GOOGLE_CLIENT_ID:
        raise HTTPException(503, "Login com Google não está configurado no servidor.")

    try:
        with httpx.Client(timeout=10) as client:
            resp = client.get(
                "https://oauth2.googleapis.com/tokeninfo",
                params={"id_token": body.credential},
            )
    except httpx.HTTPError:
        raise HTTPException(502, "Não foi possível validar com o Google. Tente novamente.")

    if resp.status_code != 200:
        raise HTTPException(401, "Credencial Google inválida.")
    info = resp.json()

    aud = info.get("aud")
    if aud != GOOGLE_CLIENT_ID:
        raise HTTPException(401, "Credencial Google não corresponde a esta aplicação.")

    iss = info.get("iss", "")
    if iss not in ("accounts.google.com", "https://accounts.google.com"):
        raise HTTPException(401, "Emissor do token Google inválido.")

    if info.get("email_verified") not in ("true", True):
        raise HTTPException(401, "E-mail do Google não verificado.")

    email      = (info.get("email") or "").lower().strip()
    google_sub = info.get("sub") or ""
    name       = (info.get("name") or info.get("given_name") or email.split("@")[0]).strip()

    if not email or not google_sub:
        raise HTTPException(401, "Dados do Google incompletos.")

    return _start_verification(
        purpose="google",
        email=email,
        name=name,
        google_sub=google_sub,
    )


@router.post("/verify")
def verify(body: VerifyBody):
    ticket = (body.ticket or "").strip()
    code   = (body.code   or "").strip()

    if not ticket or not code:
        raise HTTPException(400, "Ticket e código são obrigatórios.")

    pending = db.get_pending(ticket)
    if not pending:
        raise HTTPException(400, "Solicitação de verificação não encontrada. Tente novamente.")

    # Normaliza expires_at para timezone-aware
    expires_at = pending["expires_at"]
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)

    if datetime.now(timezone.utc) > expires_at:
        db.delete_pending(ticket)
        raise HTTPException(410, "Código expirado. Solicite um novo.")

    if pending["attempts"] >= CODE_MAX_ATTEMPTS:
        db.delete_pending(ticket)
        raise HTTPException(429, "Muitas tentativas inválidas. Solicite um novo código.")

    if _hash_code(code) != pending["code_hash"]:
        remaining = CODE_MAX_ATTEMPTS - db.increment_attempts(ticket)
        if remaining <= 0:
            db.delete_pending(ticket)
            raise HTTPException(429, "Muitas tentativas inválidas. Solicite um novo código.")
        raise HTTPException(400, f"Código incorreto. {remaining} tentativa(s) restante(s).")

    # ✓ Código válido — processa conforme o propósito
    purpose = pending["purpose"]
    email   = pending["email"]

    if purpose == "register":
        if db.get_user_by_email(email):
            db.delete_pending(ticket)
            raise HTTPException(409, "Este e-mail já está cadastrado.")
        user = db.create_user(pending["name"], email, pending["password_hash"])

    elif purpose == "login":
        user = db.get_user_by_email(email)
        if not user:
            db.delete_pending(ticket)
            raise HTTPException(404, "Usuário não encontrado.")

    elif purpose == "google":
        user = db.get_user_by_email(email)
        if user:
            if not user.get("google_sub"):
                db.link_google_to_user(user["id"], pending["google_sub"])
        else:
            user = db.create_user(pending["name"], email, None, google_sub=pending["google_sub"])

    else:
        db.delete_pending(ticket)
        raise HTTPException(400, "Propósito de verificação desconhecido.")

    db.delete_pending(ticket)
    token = _make_token(user)
    print(f"[AUTH] Verificação OK ({purpose}): {user['email']}")
    return {
        "message": "Acesso liberado!",
        "token": token,
        "user": {"id": user["id"], "name": user["name"], "email": user["email"]},
    }


@router.post("/resend")
def resend(body: ResendBody):
    ticket = (body.ticket or "").strip()
    if not ticket:
        raise HTTPException(400, "Ticket ausente.")

    pending = db.get_pending(ticket)
    if not pending:
        raise HTTPException(400, "Solicitação de verificação não encontrada.")

    if pending["resends"] >= CODE_MAX_RESENDS:
        raise HTTPException(429, "Limite de reenvios atingido. Inicie o acesso novamente.")

    code = _generate_code()
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=CODE_TTL_MINUTES)
    db.update_pending_code(ticket, _hash_code(code), expires_at)

    try:
        send_verification_code(pending["email"], code, pending.get("name"))
    except RuntimeError as e:
        raise HTTPException(503, str(e))

    return {
        "message": f"Novo código enviado para {pending['email']}.",
        "expires_in": CODE_TTL_MINUTES * 60,
    }


@router.get("/me")
def me(authorization: str = Header(default="")):
    if not authorization.startswith("Bearer "):
        raise HTTPException(401, "Token não fornecido.")
    try:
        payload = jwt.decode(
            authorization.split(" ")[1],
            os.getenv("JWT_SECRET", "dev_secret"),
            algorithms=["HS256"],
        )
        user = db.get_user_by_id(payload["id"])
        if not user:
            raise HTTPException(404, "Usuário não encontrado.")
        return {"user": user}
    except JWTError:
        raise HTTPException(401, "Token inválido ou expirado.")


@router.delete("/admin/reset-user")
def reset_user(email: str):
    conn = db.get_conn()
    try:
        with conn.cursor() as cur:
            cur.execute("DELETE FROM users WHERE LOWER(email) = %s", (email.lower(),))
        conn.commit()
        return {"message": f"Usuário {email} removido."}
    finally:
        conn.close()
