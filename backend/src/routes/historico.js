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

module.exports = router;
