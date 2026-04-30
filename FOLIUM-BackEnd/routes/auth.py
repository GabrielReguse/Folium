import os, re, bcrypt
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, HTTPException, Header
from fastapi.responses import JSONResponse
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

# Propósitos dos códigos de verificação — mantemos códigos de fluxos
# diferentes em buckets separados pra que um código de login não possa
# ser usado pra redefinir senha (e vice-versa).
PURPOSE_LOGIN = "login"
PURPOSE_RESET = "password_reset"

def _send_code(email: str, purpose: str = PURPOSE_LOGIN) -> bool:
    code = generate_code()
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=10)
    db.save_verification_code(email, code, expires_at, purpose=purpose)
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

class ForgotPasswordBody(BaseModel):
    email: str

class ResetPasswordBody(BaseModel):
    email: str
    code:  str
    new_password: str

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
        db.delete_user_by_id(user["id"])
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
    if not user:
        raise HTTPException(401, "E-mail ou senha incorretos.")

    # Conta sem senha (criada via Google OAuth) — diferencia para o usuário
    # entender que precisa usar 'Continuar com Google' ou definir uma senha
    # via 'Esqueci minha senha'.
    if not user.get("password"):
        if user.get("google_id"):
            return JSONResponse(
                status_code=401,
                content={
                    "detail": "Esta conta foi criada com Login Google. Use 'Continuar com Google' ou clique em 'Esqueci minha senha' para definir uma senha.",
                    "code": "google_only",
                    "email": user["email"],
                },
            )
        return JSONResponse(
            status_code=401,
            content={
                "detail": "Esta conta não tem senha definida. Use 'Esqueci minha senha' para criar uma.",
                "code": "no_password",
                "email": user["email"],
            },
        )

    if not _verify(body.password, user["password"]):
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
        email_verified = bool(idinfo.get("email_verified", False))

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

    # Google já autenticou o usuário e confirmou o e-mail (email_verified).
    # Mandar um código por e-mail seria redundante (mesmo canal já validado
    # pelo IdP) e cria dependência indevida do SMTP — quando o SMTP falha,
    # o login com Google fica inutilizável. Emite o JWT direto.
    if email_verified:
        token = _make_token(user)
        print(f"[AUTH] Google login concluído: {user['email']}")
        return {
            "message": "Login realizado com sucesso.",
            "token": token,
            "user": {"id": user["id"], "name": user["name"], "email": user["email"]},
        }

    # Fallback raro: Google reportou email_verified=False — cai no fluxo
    # de código por e-mail pra confirmar a posse do endereço.
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

    email_norm = body.email.strip()
    record = db.get_verification_code(email_norm, body.code.strip(), purpose=PURPOSE_LOGIN)
    if not record:
        raise HTTPException(401, "Código inválido.")

    if record["expires_at"].replace(tzinfo=timezone.utc) < datetime.now(timezone.utc):
        db.delete_verification_codes(email_norm, purpose=PURPOSE_LOGIN)
        raise HTTPException(401, "Código expirado. Solicite um novo.")

    db.delete_verification_codes(email_norm, purpose=PURPOSE_LOGIN)

    user = db.get_user_by_email(email_norm)
    if not user:
        raise HTTPException(404, "Usuário não encontrado.")

    token = _make_token(user)
    print(f"[AUTH] Verificação concluída: {user['email']}")
    return {
        "message": "Verificação concluída!",
        "token": token,
        "user": {"id": user["id"], "name": user["name"], "email": user["email"]}
    }

GENERIC_FORGOT_RESPONSE = {
    "message": "Se este e-mail estiver cadastrado, você receberá um código para redefinir a senha.",
}

@router.post("/forgot-password")
def forgot_password(body: ForgotPasswordBody):
    if not body.email:
        raise HTTPException(400, "E-mail é obrigatório.")

    email_norm = body.email.strip().lower()
    user = db.get_user_by_email(email_norm)

    # Sempre devolvemos a mesma resposta (mesmo status, mesmo body) tanto
    # para contas existentes quanto inexistentes — inclusive em caso de
    # falha do SMTP — pra não vazar a existência da conta via diferenças
    # de status code/mensagem (anti-enumeration).
    if not user:
        print(f"[AUTH] Forgot password (e-mail inexistente): {email_norm}")
        return {**GENERIC_FORGOT_RESPONSE, "email": email_norm}

    try:
        sent = _send_code(user["email"], purpose=PURPOSE_RESET)
        if not sent:
            print(f"[AUTH] Forgot password: SMTP falhou para {user['email']}")
        else:
            print(f"[AUTH] Forgot password: código enviado para {user['email']}")
    except Exception as e:  # noqa: BLE001
        print(f"[AUTH] Forgot password: erro inesperado ao enviar para {user['email']}: {e}")

    return {**GENERIC_FORGOT_RESPONSE, "email": user["email"]}

@router.post("/reset-password")
def reset_password(body: ResetPasswordBody):
    if not body.email or not body.code or not body.new_password:
        raise HTTPException(400, "E-mail, código e nova senha são obrigatórios.")
    if len(body.new_password) < 4:
        raise HTTPException(400, "Senha deve ter pelo menos 4 caracteres.")

    email_norm = body.email.strip()
    record = db.get_verification_code(email_norm, body.code.strip(), purpose=PURPOSE_RESET)
    if not record:
        raise HTTPException(401, "Código inválido.")

    if record["expires_at"].replace(tzinfo=timezone.utc) < datetime.now(timezone.utc):
        db.delete_verification_codes(email_norm, purpose=PURPOSE_RESET)
        raise HTTPException(401, "Código expirado. Solicite um novo.")

    db.delete_verification_codes(email_norm, purpose=PURPOSE_RESET)

    user = db.get_user_by_email(email_norm)
    if not user:
        raise HTTPException(404, "Usuário não encontrado.")

    new_hashed = _hash(body.new_password)
    db.update_user_password(user["id"], new_hashed)

    token = _make_token(user)
    print(f"[AUTH] Senha redefinida: {user['email']}")
    return {
        "message": "Senha redefinida com sucesso!",
        "token": token,
        "user": {"id": user["id"], "name": user["name"], "email": user["email"]},
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
