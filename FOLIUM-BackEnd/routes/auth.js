/* ═══════════════════════════════════════════════
   FOLIUM — routes/auth.js
   Rotas de autenticação: /api/auth/register e /api/auth/login
═══════════════════════════════════════════════ */

const express = require('express');
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const db      = require('../database');

const router = express.Router();

/* ── Constantes ── */
const SALT_ROUNDS = 12;   // Custo do bcrypt (quanto maior, mais seguro/lento)
const { JWT_SECRET, JWT_EXPIRES_IN } = process.env;

/* ──────────────────────────────────────────────
   Função auxiliar: gera um token JWT para o user
────────────────────────────────────────────── */
function gerarToken(user) {
  return jwt.sign(
    { id: user.id, name: user.name, email: user.email },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

/* ══════════════════════════════════════
   POST /api/auth/register
   Cadastro de novo usuário
══════════════════════════════════════ */
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    /* ── Validações básicas ── */
    if (!name  || name.trim().length < 2) {
      return res.status(400).json({ error: 'Nome deve ter pelo menos 2 caracteres.' });
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'E-mail inválido.' });
    }
    if (!password || password.length < 4) {
      return res.status(400).json({ error: 'Senha deve ter pelo menos 4 caracteres.' });
    }

    /* ── Verifica se e-mail já está cadastrado ── */
    const existente = db.getUserByEmail(email.trim());
    if (existente) {
      return res.status(409).json({ error: 'Este e-mail já está cadastrado.' });
    }

    /* ── Criptografa a senha com bcrypt ── */
    const senhaHash = await bcrypt.hash(password, SALT_ROUNDS);

    /* ── Salva o usuário no banco ── */
    const novoUser = db.createUser({
      name:     name.trim(),
      email:    email.trim().toLowerCase(),
      password: senhaHash,
    });

    /* ── Gera o token JWT ── */
    const token = gerarToken(novoUser);

    console.log(`[AUTH] Novo cadastro: ${novoUser.email}`);

    return res.status(201).json({
      message: 'Conta criada com sucesso!',
      token,
      user: {
        id:    novoUser.id,
        name:  novoUser.name,
        email: novoUser.email,
      },
    });

  } catch (err) {
    console.error('[AUTH] Erro no registro:', err.message);
    return res.status(500).json({ error: 'Erro interno do servidor.' });
  }
});

/* ══════════════════════════════════════
   POST /api/auth/login
   Login de usuário existente
══════════════════════════════════════ */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    /* ── Validações básicas ── */
    if (!email || !password) {
      return res.status(400).json({ error: 'E-mail e senha são obrigatórios.' });
    }

    /* ── Busca o usuário pelo e-mail ── */
    const user = db.getUserByEmail(email.trim());
    if (!user) {
      /* Mensagem genérica por segurança (não revela se o e-mail existe) */
      return res.status(401).json({ error: 'E-mail ou senha incorretos.' });
    }

    /* ── Compara a senha com o hash salvo ── */
    const senhaCorreta = await bcrypt.compare(password, user.password);
    if (!senhaCorreta) {
      return res.status(401).json({ error: 'E-mail ou senha incorretos.' });
    }

    /* ── Gera o token JWT ── */
    const token = gerarToken(user);

    console.log(`[AUTH] Login bem-sucedido: ${user.email}`);

    return res.status(200).json({
      message: 'Login realizado com sucesso!',
      token,
      user: {
        id:    user.id,
        name:  user.name,
        email: user.email,
      },
    });

  } catch (err) {
    console.error('[AUTH] Erro no login:', err.message);
    return res.status(500).json({ error: 'Erro interno do servidor.' });
  }
});

/* ══════════════════════════════════════
   GET /api/auth/me
   Retorna dados do usuário logado (via token)
══════════════════════════════════════ */
router.get('/me', (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token não fornecido.' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);

    const user = db.getUserById(decoded.id);
    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado.' });
    }

    return res.status(200).json({ user });

  } catch (err) {
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token inválido ou expirado.' });
    }
    return res.status(500).json({ error: 'Erro interno do servidor.' });
  }
});

module.exports = router;
