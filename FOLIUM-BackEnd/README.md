# 🍃 FOLIUM — Backend

API de autenticação do Folium, construída com **Node.js**, **Express**, **SQLite** e **bcrypt**.

---

## 🚀 Como rodar

### 1. Pré-requisito
Instale o [Node.js](https://nodejs.org/) (versão 18+ recomendada).

### 2. Instale as dependências
Abra o terminal **dentro da pasta `FOLIUM-BackEnd`** e rode:

```bash
npm install
```

### 3. Inicie o servidor

```bash
npm start
```

Você verá:
```
  🍃  FOLIUM Backend rodando!
  🌐  http://localhost:3001
  📡  API: http://localhost:3001/api/health
```

### 4. Abra o front-end
Abra o arquivo `FOLIUM/index.html` no navegador **ou** acesse `http://localhost:3001`.

> ⚠️ **O servidor precisa estar rodando** para o login/cadastro funcionarem.

---

## 📁 Estrutura

```
FOLIUM-BackEnd/
├── server.js       ← Servidor principal
├── database.js     ← Configuração do SQLite
├── routes/
│   └── auth.js     ← Rotas /api/auth/register e /api/auth/login
├── .env            ← Configurações (porta, chave JWT)
├── folium.db       ← Banco de dados (criado automaticamente)
└── package.json
```

---

## 🔑 Endpoints

| Método | Rota                  | Descrição              |
|--------|-----------------------|------------------------|
| GET    | `/api/health`         | Status da API          |
| POST   | `/api/auth/register`  | Cadastro de usuário    |
| POST   | `/api/auth/login`     | Login de usuário       |
| GET    | `/api/auth/me`        | Dados do usuário atual |

---

## 🔒 Segurança

- Senhas criptografadas com **bcrypt** (12 rounds)
- Autenticação via **JWT** (7 dias de validade)
- E-mail duplicado bloqueado com erro 409
- Mensagens de erro genéricas no login (não revelam se o e-mail existe)
