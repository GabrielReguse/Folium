# ═══════════════════════════════════════════════
#  FOLIUM — email_service.py
#  Envio de e-mails via SMTP (Gmail)
# ═══════════════════════════════════════════════

import os
import secrets
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from dotenv import load_dotenv

load_dotenv()

SMTP_EMAIL = os.getenv("SMTP_EMAIL", "suporte.folium@gmail.com")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")
SMTP_HOST = os.getenv("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))


def generate_code(length: int = 6) -> str:
    return "".join(str(secrets.randbelow(10)) for _ in range(length))


def send_verification_email(to_email: str, code: str) -> bool:
    if not SMTP_PASSWORD:
        print(f"[EMAIL] SMTP_PASSWORD não configurado. Código para {to_email}: {code}")
        return True

    msg = MIMEMultipart("alternative")
    msg["Subject"] = "Folium — Código de verificação"
    msg["From"] = f"Folium <{SMTP_EMAIL}>"
    msg["To"] = to_email

    html = f"""\
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;font-family:'Segoe UI',Arial,sans-serif;background:#faf7f2">
  <div style="max-width:480px;margin:40px auto;background:#fff;border-radius:16px;
              box-shadow:0 2px 12px rgba(0,0,0,.06);border:1px solid #ede8df;overflow:hidden">
    <div style="background:linear-gradient(135deg,#9B6B42,#7a5231);padding:32px 24px;text-align:center">
      <h1 style="margin:0;color:#fff;font-size:28px;font-weight:700;letter-spacing:-0.02em">
        Foli<em style="font-style:italic;font-weight:400">um</em>
      </h1>
      <p style="margin:8px 0 0;color:rgba(255,255,255,.8);font-size:14px">
        Verificação de conta
      </p>
    </div>
    <div style="padding:36px 32px;text-align:center">
      <p style="color:#5a4a3a;font-size:15px;line-height:1.6;margin:0 0 24px">
        Use o código abaixo para verificar sua conta.<br>
        Ele expira em <strong>10 minutos</strong>.
      </p>
      <div style="background:#faf7f2;border:2px dashed #d4c5b0;border-radius:12px;
                  padding:20px;margin:0 auto;max-width:260px">
        <span style="font-family:'Courier New',monospace;font-size:36px;font-weight:700;
                     color:#9B6B42;letter-spacing:8px">{code}</span>
      </div>
      <p style="color:#8a7a6a;font-size:13px;margin:24px 0 0;line-height:1.5">
        Se você não solicitou este código, ignore este e-mail.
      </p>
    </div>
    <div style="background:#faf7f2;padding:16px 24px;text-align:center;
                border-top:1px solid #ede8df">
      <p style="margin:0;color:#a09080;font-size:12px">
        Folium — Seus resumos inteligentes
      </p>
    </div>
  </div>
</body>
</html>"""

    text = f"Seu código de verificação do Folium é: {code}\nEle expira em 10 minutos."

    msg.attach(MIMEText(text, "plain", "utf-8"))
    msg.attach(MIMEText(html, "html", "utf-8"))

    try:
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT) as server:
            server.starttls()
            server.login(SMTP_EMAIL, SMTP_PASSWORD)
            server.sendmail(SMTP_EMAIL, to_email, msg.as_string())
        print(f"[EMAIL] Código enviado para {to_email}")
        return True
    except Exception as e:
        print(f"[EMAIL] Erro ao enviar e-mail para {to_email}: {e}")
        return False
