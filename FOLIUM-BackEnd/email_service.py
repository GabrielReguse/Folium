# ═══════════════════════════════════════════════
#  FOLIUM — email_service.py
#  Envio de e-mails via SMTP (Gmail) — códigos de verificação
# ═══════════════════════════════════════════════

import os
import smtplib
import ssl
from email.message import EmailMessage
from email.utils import formataddr


SMTP_HOST     = os.getenv("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT     = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER     = os.getenv("SMTP_USER", "suporte.folium@gmail.com")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")
EMAIL_FROM    = os.getenv("EMAIL_FROM", SMTP_USER)
EMAIL_FROM_NAME = os.getenv("EMAIL_FROM_NAME", "Folium")


def _build_html(code: str, name: str | None = None) -> str:
    nome = (name or "").strip().split(" ")[0] if name else ""
    saudacao = f"Olá, {nome}!" if nome else "Olá!"
    return f"""\
<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f6efe3;font-family:'Segoe UI',Arial,sans-serif;color:#2f2418;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f6efe3;padding:32px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0"
               style="max-width:480px;background:#fdfaf3;border-radius:18px;padding:40px 36px;border:1px solid #e4d6b8;box-shadow:0 8px 30px rgba(155,107,66,0.12);">
          <tr><td align="center" style="padding-bottom:18px;">
            <div style="font-family:'Playfair Display','Times New Roman',serif;font-size:30px;font-weight:700;color:#2f2418;letter-spacing:-0.02em;">
              Foli<em style="color:#9B6B42;font-weight:400;">um</em>
            </div>
            <div style="font-size:13px;color:#6b5a44;font-weight:300;margin-top:4px;">Seus resumos inteligentes</div>
          </td></tr>

          <tr><td style="padding:10px 0 4px;font-size:16px;">{saudacao}</td></tr>
          <tr><td style="padding:0 0 18px;font-size:14px;color:#4b3d2c;line-height:1.55;">
            Use o código abaixo para concluir seu acesso ao Folium. O código é válido
            por <strong>10 minutos</strong> e deve ser usado apenas uma vez.
          </td></tr>

          <tr><td align="center" style="padding:8px 0 18px;">
            <div style="display:inline-block;background:#fff;border:2px dashed #9B6B42;
                        border-radius:14px;padding:18px 28px;font-size:34px;font-weight:700;
                        letter-spacing:10px;color:#2f2418;font-family:'Courier New',monospace;">
              {code}
            </div>
          </td></tr>

          <tr><td style="padding:10px 0;font-size:12.5px;color:#6b5a44;line-height:1.5;">
            Se você não solicitou este código, ignore este e-mail. Sua conta continua segura.
          </td></tr>

          <tr><td style="padding-top:26px;font-size:11.5px;color:#8a7a63;border-top:1px solid #e4d6b8;">
            Este é um e-mail automático enviado por <strong>suporte.folium@gmail.com</strong>.
            Por favor, não responda diretamente.
          </td></tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
"""


def _build_text(code: str) -> str:
    return (
        "Folium — Código de verificação\n\n"
        f"Seu código é: {code}\n\n"
        "Ele é válido por 10 minutos e deve ser usado apenas uma vez.\n"
        "Se você não solicitou este código, ignore este e-mail."
    )


def send_verification_code(to_email: str, code: str, name: str | None = None) -> None:
    """Envia o código de verificação. Lança RuntimeError em caso de falha."""
    if not SMTP_PASSWORD:
        raise RuntimeError(
            "SMTP_PASSWORD não configurada. Defina a senha de app do Gmail "
            "para permitir envio de e-mails de verificação."
        )

    msg = EmailMessage()
    msg["Subject"] = f"Folium — seu código de acesso: {code}"
    msg["From"]    = formataddr((EMAIL_FROM_NAME, EMAIL_FROM))
    msg["To"]      = to_email
    msg.set_content(_build_text(code))
    msg.add_alternative(_build_html(code, name), subtype="html")

    context = ssl.create_default_context()
    try:
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=20) as server:
            server.ehlo()
            server.starttls(context=context)
            server.ehlo()
            server.login(SMTP_USER, SMTP_PASSWORD)
            server.send_message(msg)
        print(f"[EMAIL] Código enviado para {to_email}")
    except Exception as e:
        print(f"[EMAIL] Falha ao enviar para {to_email}: {e}")
        raise RuntimeError("Falha ao enviar o código por e-mail.") from e
