import os, re, bcrypt
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, HTTPException, Header
from pydantic import BaseModel
from jose import jwt, JWTError

import database as db

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

class RegisterBody(BaseModel):
    name:     str
    email:    str
    password: str

class LoginBody(BaseModel):
    email:    str
    password: str

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
    token  = _make_token(user)

    print(f"[AUTH] Cadastro: {user['email']}")
    return {
        "message": "Conta criada com sucesso!",
        "token": token,
        "user": {"id": user["id"], "name": user["name"], "email": user["email"]}
    }

@router.post("/login")
def login(body: LoginBody):
    if not body.email or not body.password:
        raise HTTPException(400, "E-mail e senha são obrigatórios.")

    user = db.get_user_by_email(body.email.strip())
    if not user or not _verify(body.password, user["password"]):
        raise HTTPException(401, "E-mail ou senha incorretos.")

    token = _make_token(user)
    print(f"[AUTH] Login: {user['email']}")
    return {
        "message": "Login realizado com sucesso!",
        "token": token,
        "user": {"id": user["id"], "name": user["name"], "email": user["email"]}
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