const express = require('express');
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const db      = require('../database');

const router      = express.Router();
const SALT_ROUNDS = 12;

function gerarToken(user) {
  return jwt.sign(
    { id: user.id, name: user.name, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN }
  );
}

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
    const novoUser  = await db.createUser({ name: name.trim(), email: email.trim(), password: senhaHash });
    const token     = gerarToken(novoUser);

    return res.status(201).json({
      message: 'Conta criada com sucesso!',
      token,
      user: { id: novoUser.id, name: novoUser.name, email: novoUser.email },
    });
  } catch (err) {
    console.error('[AUTH] register:', err.message);
    return res.status(500).json({ error: 'Erro interno do servidor.' });
  }
});

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
    return res.status(200).json({
      message: 'Login realizado com sucesso!',
      token,
      user: { id: user.id, name: user.name, email: user.email },
    });
  } catch (err) {
    console.error('[AUTH] login:', err.message);
    return res.status(500).json({ error: 'Erro interno do servidor.' });
  }
});

router.get('/me', async (req, res) => {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer '))
      return res.status(401).json({ error: 'Token não fornecido.' });

    const decoded = jwt.verify(header.split(' ')[1], process.env.JWT_SECRET);
    const user    = await db.getUserById(decoded.id);
    if (!user)
      return res.status(404).json({ error: 'Usuário não encontrado.' });

    return res.status(200).json({ user });
  } catch (err) {
    return res.status(401).json({ error: 'Token inválido ou expirado.' });
  }
});

module.exports = router;