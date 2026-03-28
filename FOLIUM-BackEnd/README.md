# 🍃 FOLIUM — Backend

API de autenticação do Folium com **Node.js + Express + PostgreSQL + bcrypt + JWT**.

---

## 🚀 Deploy no Render (gratuito)

### 1. Banco de dados PostgreSQL

1. Acesse [render.com](https://render.com) → **New → PostgreSQL**
2. Preencha:
   - **Name:** `folium-db`
   - **Plan:** Free
3. Clique em **Create Database**
4. Copie a **Internal Database URL** — você vai precisar logo abaixo

---

### 2. Web Service (o servidor)

1. **New → Web Service** → conecte seu repositório GitHub
2. Configure:
   - **Root Directory:** `FOLIUM-BackEnd` (se o repo tiver as duas pastas)
   - **Runtime:** Node
   - **Build Command:** `npm install`
   - **Start Command:** `node server.js`
   - **Plan:** Free
3. Em **Environment Variables**, adicione:

| Variável | Valor |
|---|---|
| `NODE_ENV` | `production` |
| `JWT_SECRET` | Uma frase longa e aleatória (ex: `folium_xK9#mP2...`) |
| `JWT_EXPIRES_IN` | `7d` |
| `ALLOWED_ORIGIN` | `https://seu-projeto.vercel.app` |
| `DATABASE_URL` | A URL que você copiou do PostgreSQL |

4. Clique em **Create Web Service**

✅ Após o deploy, copie a URL do serviço (ex: `https://folium-api.onrender.com`).

---

## ▲ Frontend no Vercel

1. Abra `FOLIUM/js/config.js` e substitua a URL:
```js
API_BASE: 'https://folium-api.onrender.com/api',
```
2. Suba o frontend no Vercel apontando para a pasta `FOLIUM/`

---

## 💻 Dev local

```bash
npm install
# Crie um .env com base no .env.example
# (você precisa de um PostgreSQL local OU pode usar o do Render no .env)
npm start
```

---

## 🔑 Endpoints

| Método | Rota | Descrição |
|---|---|---|
| `GET` | `/api/health` | Status da API |
| `POST` | `/api/auth/register` | Cadastro |
| `POST` | `/api/auth/login` | Login |
| `GET` | `/api/auth/me` | Dados do usuário (requer token) |

---

## ⚠️ Sobre o plano gratuito do Render

- O serviço **"dorme"** após 15 min sem uso → primeira requisição demora ~30s para acordar
- O banco PostgreSQL gratuito **expira após 90 dias** (Render envia e-mail de aviso)
- Para produção real, considere o plano pago ($7/mês)
