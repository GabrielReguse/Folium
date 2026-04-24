# ═══════════════════════════════════════════════
#  FOLIUM — email_service.py
#  Envio de código de verificação via Gmail SMTP
# ═══════════════════════════════════════════════

import os
import secrets
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart


def generate_code(length=6):
    """Gera um código numérico de verificação."""
    return ''.join([str(secrets.randbelow(10)) for _ in range(length)])


def send_verification_email(to_email: str, code: str) -> bool:
    """Envia e-mail com código de verificação via Gmail SMTP."""
    smtp_email = os.getenv("SMTP_EMAIL", "suporte.folium@gmail.com")
    smtp_password = os.getenv("SMTP_PASSWORD", "")

    if not smtp_password:
        print(f"[EMAIL] SMTP_PASSWORD não configurado. Código para {to_email}: {code}")
        return True

    msg = MIMEMultipart("alternative")
    msg["Subject"] = "Folium — Código de verificação"
    msg["From"] = f"Folium <{smtp_email}>"
    msg["To"] = to_email

    html = f"""\
<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#F5EDD6;">
  <div style="font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;max-width:480px;margin:30px auto;padding:40px 30px;background:#FDFAF3;border-radius:16px;border:1px solid rgba(196,168,130,0.45);">
    <div style="text-align:center;margin-bottom:30px;">
      <h1 style="font-family:Georgia,serif;font-size:28px;color:#2C1810;margin:0;">
        Foli<em style="color:#9B6B42;font-weight:400;">um</em>
      </h1>
      <p style="color:#A07855;font-size:13px;margin-top:4px;">Seus resumos inteligentes</p>
    </div>
    <div style="background:white;border-radius:12px;padding:30px;text-align:center;border:1px solid rgba(196,168,130,0.3);">
      <p style="color:#6B4C35;font-size:15px;margin:0 0 20px;">Seu código de verificação é:</p>
      <div style="font-size:36px;font-weight:700;letter-spacing:8px;color:#5C3D2E;background:#F5EDD6;border-radius:10px;padding:16px 24px;display:inline-block;">
        {code}
      </div>
      <p style="color:#A07855;font-size:13px;margin-top:20px;">
        Este código expira em <strong>10 minutos</strong>.
      </p>
    </div>
    <p style="color:#A07855;font-size:11px;text-align:center;margin-top:24px;">
      Se você não solicitou este código, ignore este e-mail.
    </p>
  </div>
</body>
</html>"""

    msg.attach(MIMEText(html, "html"))

    try:
        with smtplib.SMTP("smtp.gmail.com", 587) as server:
            server.starttls()
            server.login(smtp_email, smtp_password)
            server.sendmail(smtp_email, to_email, msg.as_string())
        print(f"[EMAIL] Código enviado para {to_email}")
        return True
    except Exception as e:
        print(f"[EMAIL] Erro ao enviar e-mail: {e}")
        return False
