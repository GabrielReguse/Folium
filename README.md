🍃 FOLIUM — Backend
API de autenticação do Folium com Python + FastAPI + PostgreSQL + bcrypt + JWT.

🚀 Deploy no Render (gratuito)
1. Banco de dados PostgreSQL
Acesse render.com → New → PostgreSQL
Preencha:
Name: folium-db
Plan: Free
Clique em Create Database
Copie a Internal Database URL — você vai precisar logo abaixo
2. Web Service (o servidor)
New → Web Service → conecte seu repositório GitHub
Configure:
Root Directory: FOLIUM-BackEnd (se o repo tiver as duas pastas)
Runtime: Python
Build Command: pip install -r requirements.txt
Start Command: uvicorn main:app --host 0.0.0.0 --port $PORT
Plan: Free
Em Environment Variables, adicione:
Variável	Valor
JWT_SECRET	Uma frase longa e aleatória (ex: folium_xK9#mP2...)
JWT_EXPIRES_DAYS	7
ALLOWED_ORIGIN	https://seu-projeto.vercel.app
DATABASE_URL	A URL que você copiou do PostgreSQL
GOOGLE_CLIENT_ID	Seu Google OAuth Client ID
SMTP_EMAIL	suporte.folium@gmail.com
SMTP_PASSWORD	Senha de App do Gmail
SMTP_HOST	smtp.gmail.com
SMTP_PORT	587
GROQ_API_KEY	Chave do Groq (usada pela IA 1 — tópicos)
GEMINI_API_KEY	Chave do Google AI Studio (IA 2 — folha, primário)
CEREBRAS_API_KEY	Chave do Cerebras Cloud (IA 2 — fallback final)
Clique em Create Web Service
▲ Frontend no Vercel
Abra FOLIUM/js/config.js e configure:
API_BASE: 'https://folium-api.onrender.com/api',
GOOGLE_CLIENT_ID: 'seu-google-client-id.apps.googleusercontent.com',
Suba o frontend no Vercel apontando para a pasta FOLIUM/
💻 Dev local
pip install -r requirements.txt
# Crie um .env com base no .env.example
uvicorn main:app --reload --port 3001
🔑 Endpoints
Método	Rota	Descrição
GET	/api/health	Status da API
POST	/api/auth/register	Cadastro (envia código de verificação)
POST	/api/auth/login	Login (envia código de verificação)
POST	/api/auth/google	Login com Google (envia código de verificação)
POST	/api/auth/verify-code	Verifica o código e retorna JWT
POST	/api/auth/resend-code	Reenvia o código de verificação
GET	/api/auth/me	Dados do usuário (requer token)
🤖 Configuração das IAs
O Folium usa duas IAs em provedores diferentes — ambas com planos gratuitos, sem cartão:

IA 1 — Curadoria de tópicos (/api/ai/topics, /api/ai/check-topic)
Provedor: Groq (llama-3.3-70b-versatile → fallback llama-3.1-8b-instant)
Chave: GROQ_API_KEY — https://console.groq.com/keys
Gera até 10 tópicos com briefing enriquecido (foco, sub-tópicos, fórmulas-chave, âncora visual e pegadinhas) que alimenta a IA 2.
IA 2 — Geradora da folha (/api/ai2/sheet)
Cadeia com fallback automático em caso de 429/413/timeout:

Gemini 2.5 Pro (primário, qualidade máxima) — 5 RPM · 100 RPD · 250k TPM
Gemini 2.5 Flash (fallback) — 10 RPM · 250 RPD · 250k TPM
Cerebras Llama 3.3 70B (último recurso) — 30 RPM · 1M tok/dia
Chave Gemini: GEMINI_API_KEY — https://aistudio.google.com/apikey
Chave Cerebras: CEREBRAS_API_KEY — https://cloud.cerebras.ai
Basta ter pelo menos uma das chaves da IA 2 configurada; entradas da cadeia sem chave são puladas automaticamente.

🔐 Configuração do Google OAuth
Acesse Google Cloud Console
Crie um projeto (ou use um existente)
Vá em APIs & Services → Credentials → Create Credentials → OAuth 2.0 Client ID
Tipo: Web application
Em Authorized JavaScript origins adicione:
http://localhost:5500 (dev local)
https://seu-projeto.vercel.app (produção)
Copie o Client ID e configure no backend (.env) e frontend (config.js)
📧 Configuração do SMTP (Gmail)
Acesse a conta suporte.folium@gmail.com
Ative a Verificação em duas etapas em myaccount.google.com/security
Gere uma Senha de App em myaccount.google.com/apppasswords
Use essa senha de app como SMTP_PASSWORD no .env
⚠️ Sobre o plano gratuito do Render
O serviço "dorme" após 15 min sem uso → primeira requisição demora ~30s para acordar
O banco PostgreSQL gratuito expira após 90 dias (Render envia e-mail de aviso)
Para produção real, considere o plano pago ($7/mês)
