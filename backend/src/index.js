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

async function runMigrations() {
  try {
    await pool.query(`
      ALTER TABLE acoes_carteira
        ADD COLUMN IF NOT EXISTS nome_empresa VARCHAR(200),
        ADD COLUMN IF NOT EXISTS preco_bazin NUMERIC(10,4) DEFAULT 0,
        ADD COLUMN IF NOT EXISTS status_bazin VARCHAR(20)
    `);
    await pool.query(`
      ALTER TABLE fiis_carteira
        ADD COLUMN IF NOT EXISTS nome_fundo VARCHAR(200),
        ADD COLUMN IF NOT EXISTS administradora VARCHAR(200),
        ADD COLUMN IF NOT EXISTS tipo_fundo VARCHAR(50),
        ADD COLUMN IF NOT EXISTS vpa NUMERIC(10,4) DEFAULT 0,
        ADD COLUMN IF NOT EXISTS preco_justo NUMERIC(10,4) DEFAULT 0,
        ADD COLUMN IF NOT EXISTS status_justo VARCHAR(20),
        ADD COLUMN IF NOT EXISTS setor_fundo VARCHAR(100)
    `);
    await pool.query(`
      ALTER TABLE watchlist
        ADD COLUMN IF NOT EXISTS setor_fundo VARCHAR(100)
    `);
    await pool.query(`
      ALTER TABLE watchlist
        ADD COLUMN IF NOT EXISTS nome_ativo VARCHAR(200),
        ADD COLUMN IF NOT EXISTS administradora VARCHAR(200),
        ADD COLUMN IF NOT EXISTS tipo_fundo VARCHAR(50),
        ADD COLUMN IF NOT EXISTS vpa NUMERIC(10,4) DEFAULT 0,
        ADD COLUMN IF NOT EXISTS preco_bazin NUMERIC(10,4) DEFAULT 0,
        ADD COLUMN IF NOT EXISTS status_bazin VARCHAR(20),
        ADD COLUMN IF NOT EXISTS preco_justo NUMERIC(10,4) DEFAULT 0,
        ADD COLUMN IF NOT EXISTS status_justo VARCHAR(20),
        ADD COLUMN IF NOT EXISTS favorito BOOLEAN DEFAULT FALSE
    `);
    await pool.query(`
      ALTER TABLE usuarios
        ADD COLUMN IF NOT EXISTS reset_token VARCHAR(255),
        ADD COLUMN IF NOT EXISTS reset_token_expires TIMESTAMP,
        ADD COLUMN IF NOT EXISTS cpf VARCHAR(14),
        ADD COLUMN IF NOT EXISTS telefone VARCHAR(20),
        ADD COLUMN IF NOT EXISTS endereco_cep VARCHAR(10),
        ADD COLUMN IF NOT EXISTS endereco_rua VARCHAR(255),
        ADD COLUMN IF NOT EXISTS endereco_numero VARCHAR(20),
        ADD COLUMN IF NOT EXISTS endereco_complemento VARCHAR(100),
        ADD COLUMN IF NOT EXISTS endereco_bairro VARCHAR(100),
        ADD COLUMN IF NOT EXISTS endereco_cidade VARCHAR(100),
        ADD COLUMN IF NOT EXISTS endereco_estado VARCHAR(2),
        ADD COLUMN IF NOT EXISTS termo_aceito BOOLEAN DEFAULT FALSE,
        ADD COLUMN IF NOT EXISTS termo_aceito_em TIMESTAMP,
        ADD COLUMN IF NOT EXISTS termo_ip VARCHAR(45),
        ADD COLUMN IF NOT EXISTS termo_versao VARCHAR(10) DEFAULT '1.0'
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
  message: { error: 'Muitas requisicoes. Tente novamente em 15 minutos.' }
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