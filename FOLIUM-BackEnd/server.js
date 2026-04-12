/* ═══════════════════════════════════════════════
   FOLIUM — server.js
   Servidor Express — hospedado no Railway
═══════════════════════════════════════════════ */

require('dotenv').config();

const express = require('express');
const cors    = require('cors');

const authRoutes = require('./routes/auth');
const aiRoutes   = require('./routes/ai');

const app  = express();
const PORT = process.env.PORT || 3001;

/* ══════════════════════════════════════
   CORS
   ALLOWED_ORIGIN é definido no painel do Railway.
   Em dev local fica '*' (libera tudo).
══════════════════════════════════════ */
const allowedOrigin = process.env.ALLOWED_ORIGIN || '*';

app.use(cors({
  origin: allowedOrigin,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json());

/* ══════════════════════════════════════
   ROTAS
══════════════════════════════════════ */
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', app: 'Folium API', version: '1.0.0' });
});

app.use('/api/auth', authRoutes);
app.use('/api/ai',   aiRoutes);

app.use('/api/*', (req, res) => {
  res.status(404).json({ error: 'Rota não encontrada.' });
});

/* Rota raiz — confirma que o servidor está no ar */
app.get('/', (req, res) => {
  res.json({ message: '🍃 Folium API está no ar!', docs: '/api/health' });
});

/* ══════════════════════════════════════
   START
══════════════════════════════════════ */
app.listen(PORT, () => {
  console.log('');
  console.log('  🍃  FOLIUM Backend rodando!');
  console.log(`  🌐  Porta: ${PORT}`);
  console.log(`  🔒  CORS origin: ${allowedOrigin}`);
  console.log('');
});