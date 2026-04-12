require('dotenv').config();

const express = require('express');
const cors    = require('cors');

const authRoutes = require('./routes/auth');
const aiRoutes   = require('./routes/ai');

const app  = express();
const PORT = process.env.PORT || 3001;

const allowedOrigin = process.env.ALLOWED_ORIGIN || '*';

app.use(cors({
  origin: allowedOrigin,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', app: 'Folium API', version: '1.0.0' });
});

app.use('/api/auth', authRoutes);
app.use('/api/ai',   aiRoutes);

app.use('/api/*', (req, res) => {
  res.status(404).json({ error: 'Rota não encontrada.' });
});

app.get('/', (req, res) => {
  res.json({ message: '🍃 Folium API está no ar!', docs: '/api/health' });
});

app.listen(PORT, () => {
  console.log(`\n  🍃  FOLIUM Backend rodando!\n  🌐  Porta: ${PORT}\n  🔒  CORS: ${allowedOrigin}\n`);
});