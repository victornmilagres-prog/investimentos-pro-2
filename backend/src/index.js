require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const pool = require('./config/database');

const authRoutes = require('./routes/auth');
const brapiRoutes = require('./routes/brapi');
const acoesRoutes = require('./routes/acoes');
const fiisRoutes = require('./routes/fiis');
const rendaFixaRoutes = require('./routes/rendaFixa');
const watchlistRoutes = require('./routes/watchlist');
const planejamentoRoutes = require('./routes/planejamento');
const dashboardRoutes = require('./routes/dashboard');
const notificacoesRoutes = require('./routes/notificacoes');

const app = express();

// Adiciona colunas de reset de senha se nao existirem
async function runMigrations() {
  try {
    await pool.query(`
      ALTER TABLE usuarios
        ADD COLUMN IF NOT EXISTS reset_token VARCHAR(255),
        ADD COLUMN IF NOT EXISTS reset_token_expires TIMESTAMP
    `);
    console.log('Migrations OK');
  } catch (err) {
    console.error('Migration error:', err.message);
  }
}
runMigrations();

app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Muitas requisições. Tente novamente em 15 minutos.' }
});
app.use('/api/', limiter);
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok', version: '2.0.0', timestamp: new Date() });
});

app.use('/api/auth', authRoutes);
app.use('/api/brapi', brapiRoutes);
app.use('/api/acoes', acoesRoutes);
app.use('/api/fiis', fiisRoutes);
app.use('/api/renda-fixa', rendaFixaRoutes);
app.use('/api/watchlist', watchlistRoutes);
app.use('/api/planejamento', planejamentoRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/notificacoes', notificacoesRoutes);

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    error: err.message || 'Erro interno do servidor'
  });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`Investimentos Pro 2.0 rodando na porta ${PORT}`);
});

module.exports = app;
