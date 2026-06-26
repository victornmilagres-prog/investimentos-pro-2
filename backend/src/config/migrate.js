require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function migrate() {
  const client = await pool.connect();
  try {
    console.log('🔄 Iniciando migração do banco de dados...');

    await client.query(`
      CREATE TABLE IF NOT EXISTS usuarios (
        id SERIAL PRIMARY KEY,
        nome VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        senha_hash VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS acoes_carteira (
        id SERIAL PRIMARY KEY,
        usuario_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE,
        ticker VARCHAR(20) NOT NULL,
        quantidade DECIMAL(15,6) DEFAULT 0,
        preco_compra DECIMAL(15,2) DEFAULT 0,
        peso_base DECIMAL(10,4) DEFAULT 0,
        peso_sugerido DECIMAL(10,6) DEFAULT 0,
        score VARCHAR(10),
        classificacao VARCHAR(50),
        decisao VARCHAR(50),
        preco_atual DECIMAL(15,2),
        preco_graham DECIMAL(15,2),
        status_graham VARCHAR(20),
        pl DECIMAL(15,4),
        pvp DECIMAL(15,4),
        margem_liquida DECIMAL(15,4),
        roe DECIMAL(15,4),
        divida_ebit DECIMAL(15,4),
        dy DECIMAL(15,4),
        observacoes TEXT,
        ultima_atualizacao TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(usuario_id, ticker)
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS fiis_carteira (
        id SERIAL PRIMARY KEY,
        usuario_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE,
        ticker VARCHAR(20) NOT NULL,
        quantidade DECIMAL(15,6) DEFAULT 0,
        preco_compra DECIMAL(15,2) DEFAULT 0,
        peso_base DECIMAL(10,4) DEFAULT 0,
        peso_sugerido DECIMAL(10,6) DEFAULT 0,
        score VARCHAR(10),
        classificacao VARCHAR(50),
        decisao VARCHAR(50),
        preco_atual DECIMAL(15,2),
        dy_mensal DECIMAL(15,4),
        dy_anual DECIMAL(15,4),
        pvp DECIMAL(15,4),
        volume_financeiro DECIMAL(20,2),
        patrimonio_liquido DECIMAL(20,2),
        observacoes TEXT,
        ultima_atualizacao TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(usuario_id, ticker)
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS renda_fixa (
        id SERIAL PRIMARY KEY,
        usuario_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE,
        nome VARCHAR(255) NOT NULL,
        instituicao VARCHAR(255),
        tipo VARCHAR(100),
        valor_investido DECIMAL(15,2) NOT NULL,
        rendimento_anual DECIMAL(10,4),
        vencimento DATE,
        indexador VARCHAR(50),
        observacoes TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS watchlist (
        id SERIAL PRIMARY KEY,
        usuario_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE,
        ticker VARCHAR(20) NOT NULL,
        tipo VARCHAR(10) NOT NULL CHECK (tipo IN ('ACAO', 'FII')),
        preco_alvo DECIMAL(15,2),
        observacoes TEXT,
        score VARCHAR(10),
        classificacao VARCHAR(50),
        decisao VARCHAR(50),
        preco_atual DECIMAL(15,2),
        ultima_atualizacao TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(usuario_id, ticker)
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS planejamento (
        id SERIAL PRIMARY KEY,
        usuario_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE UNIQUE,
        salario DECIMAL(15,2) DEFAULT 0,
        percentual_investimento DECIMAL(5,2) DEFAULT 20,
        meta_patrimonio DECIMAL(15,2) DEFAULT 0,
        meta_renda_passiva DECIMAL(15,2) DEFAULT 0,
        meta_reserva_emergencia DECIMAL(15,2) DEFAULT 0,
        perc_reserva_emergencia DECIMAL(5,2) DEFAULT 28,
        perc_cdb DECIMAL(5,2) DEFAULT 50,
        perc_acoes DECIMAL(5,2) DEFAULT 10,
        perc_fiis DECIMAL(5,2) DEFAULT 10,
        perc_bitcoin DECIMAL(5,2) DEFAULT 1,
        perc_ouro DECIMAL(5,2) DEFAULT 1,
        inst_reserva VARCHAR(100) DEFAULT 'C6',
        inst_cdb VARCHAR(100) DEFAULT 'XP',
        inst_acoes VARCHAR(100) DEFAULT 'XP',
        inst_fiis VARCHAR(100) DEFAULT 'XP',
        inst_bitcoin VARCHAR(100) DEFAULT 'Nubank',
        inst_ouro VARCHAR(100) DEFAULT 'XP',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS notificacoes (
        id SERIAL PRIMARY KEY,
        usuario_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE,
        ticker VARCHAR(20) NOT NULL,
        tipo VARCHAR(50) NOT NULL,
        mensagem TEXT NOT NULL,
        lida BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS ajustes_manuais_acoes (
        id SERIAL PRIMARY KEY,
        usuario_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE,
        ticker VARCHAR(20) NOT NULL,
        divida_liquida_ebit DECIMAL(15,4),
        UNIQUE(usuario_id, ticker)
      );
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS ajustes_manuais_fiis (
        id SERIAL PRIMARY KEY,
        usuario_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE,
        ticker VARCHAR(20) NOT NULL,
        dy_mensal DECIMAL(15,4),
        dy_anual DECIMAL(15,4),
        pvp DECIMAL(15,4),
        volume_financeiro_dia DECIMAL(20,2),
        patrimonio_liquido DECIMAL(20,2),
        UNIQUE(usuario_id, ticker)
      );
    `);

    console.log('✅ Migração concluída com sucesso!');
  } catch (err) {
    console.error('❌ Erro na migração:', err);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
