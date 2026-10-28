const express = require('express');
const pool = require('../config/database');
const auth = require('../middleware/auth');

const router = express.Router();
router.use(auth);

// GET /api/historico
// Query params: categoria, tipo, periodo (7d|30d|90d|1a|tudo), ticker
router.get('/', async (req, res) => {
  try {
    const { categoria, tipo, periodo, ticker } = req.query;

    let whereClauses = ['usuario_id=$1'];
    const params = [req.userId];
    let idx = 2;

    if (categoria && categoria !== 'todos') {
      whereClauses.push(`categoria=$${idx++}`);
      params.push(categoria);
    }
    if (tipo && tipo !== 'todos') {
      whereClauses.push(`tipo=$${idx++}`);
      params.push(tipo);
    }
    if (ticker) {
      whereClauses.push(`UPPER(ticker) LIKE $${idx++}`);
      params.push(`%${ticker.toUpperCase()}%`);
    }
    if (periodo && periodo !== 'tudo') {
      const periodMap = { '7d': 7, '30d': 30, '90d': 90, '1a': 365 };
      const dias = periodMap[periodo];
      if (dias) {
        whereClauses.push(`data_operacao >= NOW() - INTERVAL '${dias} days'`);
      }
    }

    const where = whereClauses.join(' AND ');
    const result = await pool.query(
      `SELECT * FROM historico_operacoes WHERE ${where} ORDER BY data_operacao DESC, created_at DESC LIMIT 500`,
      params
    );

    // Resumo por tipo
    const resumo = await pool.query(
      `SELECT tipo, COUNT(*) as total, COALESCE(SUM(total), 0) as valor
       FROM historico_operacoes WHERE usuario_id=$1
       GROUP BY tipo`,
      [req.userId]
    );

    res.json({
      operacoes: result.rows,
      resumo: resumo.rows,
      total: result.rows.length,
    });
  } catch (err) {
    console.error('[historico GET]', err);
    res.status(500).json({ error: 'Erro ao buscar histórico.' });
  }
});

// POST /api/historico — inserção manual (para uso interno das rotas)
router.post('/', async (req, res) => {
  const { categoria, ticker, tipo, quantidade, preco_unitario, total, resultado, observacao, data_operacao } = req.body;
  if (!categoria || !ticker || !tipo || total === undefined)
    return res.status(400).json({ error: 'categoria, ticker, tipo e total são obrigatórios.' });
  try {
    const result = await pool.query(
      `INSERT INTO historico_operacoes
        (usuario_id, categoria, ticker, tipo, quantidade, preco_unitario, total, resultado, observacao, data_operacao)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [
        req.userId,
        categoria,
        ticker.toUpperCase(),
        tipo,
        quantidade || null,
        preco_unitario || null,
        total,
        resultado || null,
        observacao || null,
        data_operacao || new Date().toISOString().slice(0, 10),
      ]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('[historico POST]', err);
    res.status(500).json({ error: 'Erro ao registrar histórico.' });
  }
});

// POST /api/historico/migrar — popula histórico retroativo com dados existentes
router.post('/migrar', async (req, res) => {
  try {
    let inseridos = 0;

    // 1. Ações (acoes_carteira)
    const acoes = await pool.query(
      `SELECT ticker, quantidade, preco_medio, quantidade * preco_medio AS total
       FROM acoes_carteira WHERE usuario_id=$1 AND quantidade > 0`,
      [req.userId]
    );
    for (const row of acoes.rows) {
      // Só insere se ainda não existe entrada de compra para este ticker (evita duplicar)
      const exists = await pool.query(
        `SELECT 1 FROM historico_operacoes WHERE usuario_id=$1 AND ticker=$2 AND tipo='compra' AND categoria='acao' LIMIT 1`,
        [req.userId, row.ticker]
      );
      if (exists.rows.length === 0) {
        await pool.query(
          `INSERT INTO historico_operacoes (usuario_id,categoria,ticker,tipo,quantidade,preco_unitario,total,observacao,data_operacao)
           VALUES ($1,'acao',$2,'compra',$3,$4,$5,'Migrado do portfólio existente',CURRENT_DATE)`,
          [req.userId, row.ticker, parseFloat(row.quantidade), parseFloat(row.preco_medio), parseFloat(row.total)]
        );
        inseridos++;
      }
    }

    // 2. FIIs (fiis_carteira)
    const fiis = await pool.query(
      `SELECT ticker, quantidade, preco_medio, quantidade * preco_medio AS total
       FROM fiis_carteira WHERE usuario_id=$1 AND quantidade > 0`,
      [req.userId]
    );
    for (const row of fiis.rows) {
      const exists = await pool.query(
        `SELECT 1 FROM historico_operacoes WHERE usuario_id=$1 AND ticker=$2 AND tipo='compra' AND categoria='fii' LIMIT 1`,
        [req.userId, row.ticker]
      );
      if (exists.rows.length === 0) {
        await pool.query(
          `INSERT INTO historico_operacoes (usuario_id,categoria,ticker,tipo,quantidade,preco_unitario,total,observacao,data_operacao)
           VALUES ($1,'fii',$2,'compra',$3,$4,$5,'Migrado do portfólio existente',CURRENT_DATE)`,
          [req.userId, row.ticker, parseFloat(row.quantidade), parseFloat(row.preco_medio), parseFloat(row.total)]
        );
        inseridos++;
      }
    }

    // 3. Renda Fixa (renda_fixa)
    const rf = await pool.query(
      `SELECT nome, valor_investido, data_inicio FROM renda_fixa WHERE usuario_id=$1`,
      [req.userId]
    );
    for (const row of rf.rows) {
      const ticker = (row.nome || '').substring(0, 50);
      const exists = await pool.query(
        `SELECT 1 FROM historico_operacoes WHERE usuario_id=$1 AND ticker=$2 AND tipo='aplicacao' AND categoria='renda_fixa' LIMIT 1`,
        [req.userId, ticker]
      );
      if (exists.rows.length === 0) {
        await pool.query(
          `INSERT INTO historico_operacoes (usuario_id,categoria,ticker,tipo,total,observacao,data_operacao)
           VALUES ($1,'renda_fixa',$2,'aplicacao',$3,'Migrado do portfólio existente',$4)`,
          [req.userId, ticker, parseFloat(row.valor_investido), row.data_inicio || new Date().toISOString().slice(0,10)]
        );
        inseridos++;
      }
    }

    // 4. Outros ativos (outros_ativos)
    const outros = await pool.query(
      `SELECT ticker, quantidade, preco_compra, tipo, quantidade * preco_compra AS total
       FROM outros_ativos WHERE usuario_id=$1`,
      [req.userId]
    );
    for (const row of outros.rows) {
      const exists = await pool.query(
        `SELECT 1 FROM historico_operacoes WHERE usuario_id=$1 AND ticker=$2 AND tipo='compra' AND categoria='outros' LIMIT 1`,
        [req.userId, row.ticker]
      );
      if (exists.rows.length === 0) {
        await pool.query(
          `INSERT INTO historico_operacoes (usuario_id,categoria,ticker,tipo,quantidade,preco_unitario,total,observacao,data_operacao)
           VALUES ($1,'outros',$2,'compra',$3,$4,$5,$6,CURRENT_DATE)`,
          [req.userId, row.ticker, parseFloat(row.quantidade), parseFloat(row.preco_compra), parseFloat(row.total), `Migrado — ${row.tipo || 'ativo'}`]
        );
        inseridos++;
      }
    }

    res.json({ ok: true, inseridos, mensagem: `${inseridos} operação(ões) migrada(s) com sucesso.` });
  } catch (err) {
    console.error('[historico migrar]', err);
    res.status(500).json({ error: 'Erro ao migrar histórico.' });
  }
});

module.exports = router;
