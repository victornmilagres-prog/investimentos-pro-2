const express = require('express');
const pool = require('../config/database');
const auth = require('../middleware/auth');
const { buscarFII, calcularPesos } = require('../services/brapiService');

const router = express.Router();
router.use(auth);

router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM fiis_carteira WHERE usuario_id=$1 ORDER BY ticker',
      [req.userId]
    );
    res.json(calcularPesos(result.rows));
  } catch {
    res.status(500).json({ error: 'Erro ao buscar FIIs.' });
  }
});

router.post('/', async (req, res) => {
  const { ticker, quantidade = 0, preco_compra = 0 } = req.body;
  if (!ticker) return res.status(400).json({ error: 'Ticker obrigatório.' });

  try {
    const ajuste = await pool.query(
      'SELECT * FROM ajustes_manuais_fiis WHERE usuario_id=$1 AND ticker=$2',
      [req.userId, ticker.toUpperCase()]
    );
    const dados = await buscarFII(ticker, ajuste.rows[0] || {});

    const result = await pool.query(`
      INSERT INTO fiis_carteira (
        usuario_id, ticker, quantidade, preco_compra,
        score, classificacao, decisao, preco_atual,
        dy_mensal, dy_anual, pvp, volume_financeiro, patrimonio_liquido,
        observacoes, ultima_atualizacao
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
      ON CONFLICT (usuario_id, ticker) DO UPDATE SET
        quantidade = EXCLUDED.quantidade,
        preco_compra = CASE WHEN fiis_carteira.preco_compra = 0 THEN EXCLUDED.preco_compra ELSE fiis_carteira.preco_compra END,
        score = EXCLUDED.score, classificacao = EXCLUDED.classificacao,
        decisao = EXCLUDED.decisao, preco_atual = EXCLUDED.preco_atual,
        dy_mensal = EXCLUDED.dy_mensal, dy_anual = EXCLUDED.dy_anual,
        pvp = EXCLUDED.pvp, volume_financeiro = EXCLUDED.volume_financeiro,
        patrimonio_liquido = EXCLUDED.patrimonio_liquido,
        observacoes = EXCLUDED.observacoes, ultima_atualizacao = EXCLUDED.ultima_atualizacao,
        updated_at = NOW()
      RETURNING *
    `, [
      req.userId, dados.ticker, quantidade, preco_compra,
      dados.score, dados.classificacao, dados.decisao, dados.preco,
      dados.dyMensal, dados.dyAnual, dados.pvp,
      dados.volumeFinanceiro, dados.patrimonioLiquido,
      dados.observacoes, dados.ultimaAtualizacao
    ]);

    await recalcularPesosFII(req.userId);
    res.status(201).json({ ...result.rows[0], ...dados });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao adicionar FII.' });
  }
});

router.put('/:ticker', async (req, res) => {
  const { quantidade, preco_compra } = req.body;
  try {
    const result = await pool.query(
      'UPDATE fiis_carteira SET quantidade=$1, preco_compra=$2, updated_at=NOW() WHERE usuario_id=$3 AND ticker=$4 RETURNING *',
      [quantidade, preco_compra, req.userId, req.params.ticker.toUpperCase()]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'FII não encontrado.' });
    res.json(result.rows[0]);
  } catch {
    res.status(500).json({ error: 'Erro ao atualizar FII.' });
  }
});

router.delete('/:ticker', async (req, res) => {
  try {
    await pool.query(
      'DELETE FROM fiis_carteira WHERE usuario_id=$1 AND ticker=$2',
      [req.userId, req.params.ticker.toUpperCase()]
    );
    await recalcularPesosFII(req.userId);
    res.json({ message: 'FII removido.' });
  } catch {
    res.status(500).json({ error: 'Erro ao remover FII.' });
  }
});

router.post('/atualizar-todos', async (req, res) => {
  try {
    const fiis = await pool.query('SELECT ticker FROM fiis_carteira WHERE usuario_id=$1', [req.userId]);
    const resultados = [];
    for (const fii of fiis.rows) {
      try {
        const ajuste = await pool.query(
          'SELECT * FROM ajustes_manuais_fiis WHERE usuario_id=$1 AND ticker=$2',
          [req.userId, fii.ticker]
        );
        const dados = await buscarFII(fii.ticker, ajuste.rows[0] || {});
        await pool.query(`
          UPDATE fiis_carteira SET score=$1, classificacao=$2, decisao=$3, preco_atual=$4,
            dy_mensal=$5, dy_anual=$6, pvp=$7, volume_financeiro=$8, patrimonio_liquido=$9,
            observacoes=$10, ultima_atualizacao=$11, updated_at=NOW()
          WHERE usuario_id=$12 AND ticker=$13
        `, [
          dados.score, dados.classificacao, dados.decisao, dados.preco,
          dados.dyMensal, dados.dyAnual, dados.pvp, dados.volumeFinanceiro,
          dados.patrimonioLiquido, dados.observacoes, dados.ultimaAtualizacao,
          req.userId, fii.ticker
        ]);
        resultados.push({ ticker: fii.ticker, status: 'ok' });
      } catch {
        resultados.push({ ticker: fii.ticker, status: 'erro' });
      }
    }
    await recalcularPesosFII(req.userId);
    res.json({ resultados, atualizadoEm: new Date() });
  } catch {
    res.status(500).json({ error: 'Erro ao atualizar FIIs.' });
  }
});

async function recalcularPesosFII(usuarioId) {
  const fiis = await pool.query(
    'SELECT id, classificacao FROM fiis_carteira WHERE usuario_id=$1', [usuarioId]
  );
  const pesoBase = (cl) => cl === 'EXCELENTE' ? 5 : cl === 'BOM' ? 3 : cl === 'ATENÇÃO' ? 1 : 0;
  const total = fiis.rows.reduce((s, f) => s + pesoBase(f.classificacao), 0);
  for (const f of fiis.rows) {
    const pb = pesoBase(f.classificacao);
    await pool.query(
      'UPDATE fiis_carteira SET peso_base=$1, peso_sugerido=$2 WHERE id=$3',
      [pb, total > 0 ? pb / total : 0, f.id]
    );
  }
}

module.exports = router;
