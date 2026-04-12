# ═══════════════════════════════════════════════
#  FOLIUM — routes/auth.py
#  Rotas de autenticação
# ═══════════════════════════════════════════════

import os, re
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel
from passlib.context import CryptContext
from jose import jwt, JWTError

import database as db

router = APIRouter()
pwd_ctx = CryptContext(schemes=["bcrypt"], deprecated="auto")

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

# ── Schemas ───────────────────────────────────
class RegisterBody(BaseModel):
    name:     str
    email:    str
    password: str

class LoginBody(BaseModel):
    email:    str
    password: str

# ── POST /api/auth/register ───────────────────
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

    hashed = pwd_ctx.hash(body.password)
    user   = db.create_user(body.name.strip(), body.email.strip(), hashed)
    token  = _make_token(user)

    print(f"[AUTH] Cadastro: {user['email']}")
    return {"message": "Conta criada com sucesso!", "token": token,
            "user": {"id": user["id"], "name": user["name"], "email": user["email"]}}

# ── POST /api/auth/login ──────────────────────
@router.post("/login")
def login(body: LoginBody):
    if not body.email or not body.password:
        raise HTTPException(400, "E-mail e senha são obrigatórios.")

    user = db.get_user_by_email(body.email.strip())
    if not user or not pwd_ctx.verify(body.password, user["password"]):
        raise HTTPException(401, "E-mail ou senha incorretos.")

    token = _make_token(user)
    print(f"[AUTH] Login: {user['email']}")
    return {"message": "Login realizado com sucesso!", "token": token,
            "user": {"id": user["id"], "name": user["name"], "email": user["email"]}}

# ── GET /api/auth/me ──────────────────────────
@router.get("/me")
def me(authorization: str = Header(default="")):
    if not authorization.startswith("Bearer "):
        raise HTTPException(401, "Token não fornecido.")
    try:
        payload = jwt.decode(authorization.split(" ")[1],
                             os.getenv("JWT_SECRET", "dev_secret"),
                             algorithms=["HS256"])
        user = db.get_user_by_id(payload["id"])
        if not user:
            raise HTTPException(404, "Usuário não encontrado.")
        return {"user": user}
    except JWTError:
        raise HTTPException(401, "Token inválido ou expirado.")
