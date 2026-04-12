/* ═══════════════════════════════════════════════
   FOLIUM — routes/auth.js
   Rotas de autenticação (async/await com PostgreSQL)
═══════════════════════════════════════════════ */

const express = require('express');
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const db      = require('../database');

const router     = express.Router();
const SALT_ROUNDS = 12;
const { JWT_SECRET, JWT_EXPIRES_IN } = process.env;

function gerarToken(user) {
  return jwt.sign(
    { id: user.id, name: user.name, email: user.email },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

/* ══════════════════════════════════════
   POST /api/auth/register
══════════════════════════════════════ */
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name  || name.trim().length < 2)
      return res.status(400).json({ error: 'Nome deve ter pelo menos 2 caracteres.' });
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      return res.status(400).json({ error: 'E-mail inválido.' });
    if (!password || password.length < 4)
      return res.status(400).json({ error: 'Senha deve ter pelo menos 4 caracteres.' });

    const existente = await db.getUserByEmail(email.trim());
    if (existente)
      return res.status(409).json({ error: 'Este e-mail já está cadastrado.' });

    const senhaHash = await bcrypt.hash(password, SALT_ROUNDS);
    const novoUser  = await db.createUser({
      name:     name.trim(),
      email:    email.trim(),
      password: senhaHash,
    });

    const token = gerarToken(novoUser);
    console.log(`[AUTH] Cadastro: ${novoUser.email}`);

    return res.status(201).json({
      message: 'Conta criada com sucesso!',
      token,
      user: { id: novoUser.id, name: novoUser.name, email: novoUser.email },
    });
  } catch (err) {
    console.error('[AUTH] Erro no registro:', err.message);
    return res.status(500).json({ error: 'Erro interno do servidor.' });
  }
});

/* ══════════════════════════════════════
   POST /api/auth/login
══════════════════════════════════════ */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password)
      return res.status(400).json({ error: 'E-mail e senha são obrigatórios.' });

    const user = await db.getUserByEmail(email.trim());
    if (!user)
      return res.status(401).json({ error: 'E-mail ou senha incorretos.' });

    const senhaCorreta = await bcrypt.compare(password, user.password);
    if (!senhaCorreta)
      return res.status(401).json({ error: 'E-mail ou senha incorretos.' });

    const token = gerarToken(user);
    console.log(`[AUTH] Login: ${user.email}`);

    return res.status(200).json({
      message: 'Login realizado com sucesso!',
      token,
      user: { id: user.id, name: user.name, email: user.email },
    });
  } catch (err) {
    console.error('[AUTH] Erro no login:', err.message);
    return res.status(500).json({ error: 'Erro interno do servidor.' });
  }
});

/* ══════════════════════════════════════
   GET /api/auth/me
══════════════════════════════════════ */
router.get('/me', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer '))
      return res.status(401).json({ error: 'Token não fornecido.' });

    const token   = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    const user    = await db.getUserById(decoded.id);

    if (!user)
      return res.status(404).json({ error: 'Usuário não encontrado.' });

    return res.status(200).json({ user });
  } catch (err) {
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError')
      return res.status(401).json({ error: 'Token inválido ou expirado.' });
    return res.status(500).json({ error: 'Erro interno do servidor.' });
  }
});

module.exports = router;

/* ═══════════════════════════════════════════════
   FOLIUM — middleware/auth.js
   Verifica JWT em rotas protegidas
═══════════════════════════════════════════════ */

const jwt = require('jsonwebtoken');

module.exports = function requireAuth(req, res, next) {
  const header = req.headers.authorization;

  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token não fornecido.' });
  }

  const token = header.split(' ')[1];

  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Token inválido ou expirado.' });
  }
};
