import os, re, bcrypt
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel
from jose import jwt, JWTError

import database as db
from email_service import generate_code, send_verification_email

router = APIRouter()

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

def _send_code(email: str) -> bool:
    code = generate_code()
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=10)
    db.save_verification_code(email, code, expires_at)
    return send_verification_email(email, code)

# ── Models ─────────────────────────────────────

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
    email: str

# ── Endpoints ──────────────────────────────────

@router.post("/register", status_code=201)
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
    user   = db.create_user(body.name.strip(), body.email.strip(), hashed)

    sent = _send_code(user["email"])
    if not sent:
        raise HTTPException(500, "Erro ao enviar código de verificação.")

    print(f"[AUTH] Cadastro pendente de verificação: {user['email']}")
    return {
        "message": "Código de verificação enviado para seu e-mail.",
        "pending_verification": True,
        "email": user["email"],
        "user": {"id": user["id"], "name": user["name"], "email": user["email"]}
    }

@router.post("/login")
def login(body: LoginBody):
    if not body.email or not body.password:
        raise HTTPException(400, "E-mail e senha são obrigatórios.")

    user = db.get_user_by_email(body.email.strip())
    if not user or not user.get("password") or not _verify(body.password, user["password"]):
        raise HTTPException(401, "E-mail ou senha incorretos.")

    sent = _send_code(user["email"])
    if not sent:
        raise HTTPException(500, "Erro ao enviar código de verificação.")

    print(f"[AUTH] Login pendente de verificação: {user['email']}")
    return {
        "message": "Código de verificação enviado para seu e-mail.",
        "pending_verification": True,
        "email": user["email"],
        "user": {"id": user["id"], "name": user["name"], "email": user["email"]}
    }

@router.post("/google")
def google_login(body: GoogleBody):
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

        email = idinfo.get("email", "").lower()
        name  = idinfo.get("name", email.split("@")[0])
        gid   = idinfo.get("sub", "")

        if not email:
            raise HTTPException(400, "Não foi possível obter o e-mail da conta Google.")

    except ValueError:
        raise HTTPException(401, "Token do Google inválido ou expirado.")

    existing = db.get_user_by_email(email)

    if existing:
        if not existing.get("google_id"):
            db.link_google_id(existing["id"], gid)
        user = existing
    else:
        user = db.create_google_user(name, email, gid)

    sent = _send_code(user["email"])
    if not sent:
        raise HTTPException(500, "Erro ao enviar código de verificação.")

    print(f"[AUTH] Google login pendente de verificação: {user['email']}")
    return {
        "message": "Código de verificação enviado para seu e-mail.",
        "pending_verification": True,
        "email": user["email"],
        "user": {"id": user["id"], "name": user["name"], "email": user["email"]}
    }

@router.post("/verify-code")
def verify_code(body: VerifyCodeBody):
    if not body.email or not body.code:
        raise HTTPException(400, "E-mail e código são obrigatórios.")

    record = db.get_verification_code(body.email.strip(), body.code.strip())
    if not record:
        raise HTTPException(401, "Código inválido.")

    if record["expires_at"].replace(tzinfo=timezone.utc) < datetime.now(timezone.utc):
        db.delete_verification_codes(body.email)
        raise HTTPException(401, "Código expirado. Solicite um novo.")

    db.delete_verification_codes(body.email)

    user = db.get_user_by_email(body.email.strip())
    if not user:
        raise HTTPException(404, "Usuário não encontrado.")

    token = _make_token(user)
    print(f"[AUTH] Verificação concluída: {user['email']}")
    return {
        "message": "Verificação concluída!",
        "token": token,
        "user": {"id": user["id"], "name": user["name"], "email": user["email"]}
    }

@router.post("/resend-code")
def resend_code(body: ResendCodeBody):
    if not body.email:
        raise HTTPException(400, "E-mail é obrigatório.")

    user = db.get_user_by_email(body.email.strip())
    if not user:
        raise HTTPException(404, "Usuário não encontrado.")

    sent = _send_code(user["email"])
    if not sent:
        raise HTTPException(500, "Erro ao enviar código de verificação.")

    return {"message": "Novo código enviado para seu e-mail."}

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
