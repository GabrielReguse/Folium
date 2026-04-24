import os, re, bcrypt
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel
from jose import jwt, JWTError

import database as db
from email_service import generate_code, send_verification_email

router = APIRouter()

# ── Helpers ──

def _hash(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

def _verify(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode(), hashed.encode())

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

def _send_code(email: str, action: str = "login", payload: dict | None = None) -> None:
    """Gera, salva e envia código de verificação."""
    code = generate_code()
    db.save_verification_code(email, code, action, payload)
    ok = send_verification_email(email, code)
    if not ok:
        raise HTTPException(500, "Erro ao enviar e-mail de verificação. Tente novamente.")

# ── Models ──

class RegisterBody(BaseModel):
    name:     str
    email:    str
    password: str

class LoginBody(BaseModel):
    email:    str
    password: str

class GoogleBody(BaseModel):
    credential: str

class VerifyCodeBody(BaseModel):
    email: str
    code:  str

class ResendCodeBody(BaseModel):
    email:  str
    action: str = "login"

# ── Endpoints ──

@router.post("/register")
def register(body: RegisterBody):
    if len(body.name.strip()) < 2:
        raise HTTPException(400, "Nome deve ter pelo menos 2 caracteres.")
    if not re.match(r"^[^\s@]+@[^\s@]+\.[^\s@]+$", body.email):
        raise HTTPException(400, "E-mail inválido.")
    if len(body.password) < 4:
        raise HTTPException(400, "Senha deve ter pelo menos 4 caracteres.")

    if db.get_user_by_email(body.email):
        raise HTTPException(409, "Este e-mail já está cadastrado.")

    hashed = _hash(body.password)
    payload = {"name": body.name.strip(), "password": hashed}

    _send_code(body.email.strip(), action="register", payload=payload)

    print(f"[AUTH] Cadastro pendente: {body.email}")
    return {
        "pending_verification": True,
        "email": body.email.strip(),
        "message": "Código de verificação enviado para seu e-mail."
    }

@router.post("/login")
def login(body: LoginBody):
    if not body.email or not body.password:
        raise HTTPException(400, "E-mail e senha são obrigatórios.")

    user = db.get_user_by_email(body.email.strip())
    if not user or not user.get("password") or not _verify(body.password, user["password"]):
        raise HTTPException(401, "E-mail ou senha incorretos.")

    _send_code(user["email"], action="login")

    print(f"[AUTH] Login pendente: {user['email']}")
    return {
        "pending_verification": True,
        "email": user["email"],
        "message": "Código de verificação enviado para seu e-mail."
    }

@router.post("/google")
def google_auth(body: GoogleBody):
    """Autentica via Google ID Token."""
    try:
        from google.oauth2 import id_token
        from google.auth.transport import requests as google_requests

        client_id = os.getenv("GOOGLE_CLIENT_ID", "")
        if not client_id:
            raise HTTPException(500, "GOOGLE_CLIENT_ID não configurado no servidor.")

        idinfo = id_token.verify_oauth2_token(
            body.credential,
            google_requests.Request(),
            client_id
        )

        google_id = idinfo["sub"]
        email     = idinfo["email"]
        name      = idinfo.get("name", email.split("@")[0])

    except ValueError:
        raise HTTPException(401, "Token Google inválido.")

    user = db.get_user_by_email(email)

    if user:
        if not user.get("google_id"):
            db.link_google_id(user["id"], google_id)
        action = "login"
        payload = None
    else:
        action = "google"
        payload = {"name": name, "google_id": google_id}

    _send_code(email, action=action, payload=payload)

    print(f"[AUTH] Google pendente: {email}")
    return {
        "pending_verification": True,
        "email": email,
        "message": "Código de verificação enviado para seu e-mail."
    }

@router.post("/verify-code")
def verify_code(body: VerifyCodeBody):
    """Verifica o código e retorna o token JWT."""
    record = db.check_verification_code(body.email.strip(), body.code.strip())

    if not record:
        raise HTTPException(400, "Código inválido ou expirado.")

    action  = record["action"]
    payload = record.get("payload")

    if action == "register":
        if db.get_user_by_email(body.email):
            raise HTTPException(409, "Este e-mail já está cadastrado.")
        user = db.create_user(payload["name"], body.email.strip(), payload["password"])
    elif action == "google":
        existing = db.get_user_by_email(body.email)
        if existing:
            user = existing
            if not existing.get("google_id") and payload:
                db.link_google_id(existing["id"], payload["google_id"])
        else:
            user = db.create_user_google(payload["name"], body.email.strip(), payload["google_id"])
    else:
        user = db.get_user_by_email(body.email)
        if not user:
            raise HTTPException(404, "Usuário não encontrado.")

    token = _make_token(user)
    print(f"[AUTH] Verificado: {user['email']}")
    return {
        "message": "Verificação concluída!",
        "token": token,
        "user": {"id": user["id"], "name": user["name"], "email": user["email"]}
    }

@router.post("/resend-code")
def resend_code(body: ResendCodeBody):
    """Reenvia o código de verificação, preservando payload de register/google."""
    payload = None
    if body.action in ("register", "google"):
        payload = db.get_latest_payload(body.email.strip(), body.action)

    _send_code(body.email.strip(), action=body.action, payload=payload)

    return {
        "message": "Novo código enviado para seu e-mail.",
        "email": body.email.strip()
    }

@router.get("/me")
def me(authorization: str = Header(default="")):
    if not authorization.startswith("Bearer "):
        raise HTTPException(401, "Token não fornecido.")
    try:
        payload = jwt.decode(
            authorization.split(" ")[1],
            os.getenv("JWT_SECRET", "dev_secret"),
            algorithms=["HS256"]
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
