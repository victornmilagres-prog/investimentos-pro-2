const express = require('express');
const pool = require('../config/database');
const auth = require('../middleware/auth');
const { buscarFII, calcularPesos } = require('../services/brapiService');

const router = express.Router();
router.use(auth);

// GET /api/fiis
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

// POST /api/fiis
router.post('/', async (req, res) => {
  const { ticker, quantidade = 0, preco_compra = 0 } = req.body;
  if (!ticker) return res.status(400).json({ error: 'Ticker obrigatório.' });
  try {
    const ajuste = await pool.query(
      'SELECT * FROM ajustes_manuais_fiis WHERE usuario_id=$1 AND ticker=$2',
      [req.userId, ticker.toUpperCase()]
    );
    const dados = await buscarFII(ticker, ajuste.rows[0] || {});

    // DY Mensal = dyAnual / 12 se dyMensal não vier da API
    const dyMensal = dados.dyMensal > 0 ? dados.dyMensal : (dados.dyAnual > 0 ? dados.dyAnual / 12 : 0);

    const result = await pool.query(`
      INSERT INTO fiis_carteira (
        usuario_id, ticker, quantidade, preco_compra,
        score, classificacao, decisao, preco_atual,
        dy_mensal, dy_anual, pvp, volume_financeiro, patrimonio_liquido,
        variacao_dia, variacao_dia_reais, preco_abertura, preco_minimo, preco_maximo,
        observacoes, ultima_atualizacao,
        dividendos_ano, dividendos_lancamentos, dividendos_breakdown,
        dividendos_geral, dividendos_geral_lancamentos
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,0,0,'{}',0,0)
      ON CONFLICT (usuario_id, ticker) DO UPDATE SET
        quantidade = EXCLUDED.quantidade,
        preco_compra = CASE WHEN fiis_carteira.preco_compra = 0 THEN EXCLUDED.preco_compra ELSE fiis_carteira.preco_compra END,
        score = EXCLUDED.score, classificacao = EXCLUDED.classificacao,
        decisao = EXCLUDED.decisao, preco_atual = EXCLUDED.preco_atual,
        dy_mensal = EXCLUDED.dy_mensal, dy_anual = EXCLUDED.dy_anual,
        pvp = EXCLUDED.pvp, volume_financeiro = EXCLUDED.volume_financeiro,
        patrimonio_liquido = EXCLUDED.patrimonio_liquido,
        variacao_dia = EXCLUDED.variacao_dia, variacao_dia_reais = EXCLUDED.variacao_dia_reais,
        preco_abertura = EXCLUDED.preco_abertura, preco_minimo = EXCLUDED.preco_minimo,
        preco_maximo = EXCLUDED.preco_maximo,
        observacoes = EXCLUDED.observacoes, ultima_atualizacao = EXCLUDED.ultima_atualizacao,
        updated_at = NOW()
      RETURNING *
    `, [
      req.userId, dados.ticker, quantidade, preco_compra,
      dados.score, dados.classificacao, dados.decisao, dados.preco,
      dyMensal, dados.dyAnual, dados.pvp, dados.volumeFinanceiro, dados.patrimonioLiquido,
      dados.variacaoDia, dados.variacaoDiaReais, dados.precoAbertura, dados.precoMinimo, dados.precoMaximo,
      dados.observacoes, dados.ultimaAtualizacao
    ]);

    await recalcularPesosFII(req.userId);
    res.status(201).json({ ...result.rows[0], ...dados });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao adicionar FII.' });
  }
});

// PUT /api/fiis/:ticker
router.put('/:ticker', async (req, res) => {
  const { ticker } = req.params;
  const { quantidade, preco_compra } = req.body;
  try {
    const fields = [];
    const values = [];
    let idx = 1;
    if (quantidade !== undefined) { fields.push(`quantidade=$${idx++}`); values.push(quantidade); }
    if (preco_compra !== undefined) { fields.push(`preco_compra=$${idx++}`); values.push(preco_compra); }
    if (!fields.length) return res.status(400).json({ error: 'Nenhum campo para atualizar.' });
    fields.push(`updated_at=NOW()`);
    values.push(req.userId, ticker.toUpperCase());
    const result = await pool.query(
      `UPDATE fiis_carteira SET ${fields.join(', ')} WHERE usuario_id=$${idx++} AND ticker=$${idx++} RETURNING *`,
      values
    );
    if (!result.rows.length) return res.status(404).json({ error: 'FII não encontrado.' });
    res.json(result.rows[0]);
  } catch {
    res.status(500).json({ error: 'Erro ao atualizar FII.' });
  }
});

// DELETE /api/fiis/:ticker
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

// POST /api/fiis/atualizar-todos
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
        const dyMensal = dados.dyMensal > 0 ? dados.dyMensal : (dados.dyAnual > 0 ? dados.dyAnual / 12 : 0);
        await pool.query(`
          UPDATE fiis_carteira SET score=$1, classificacao=$2, decisao=$3, preco_atual=$4,
            dy_mensal=$5, dy_anual=$6, pvp=$7, volume_financeiro=$8, patrimonio_liquido=$9,
            variacao_dia=$10, variacao_dia_reais=$11, preco_abertura=$12, preco_minimo=$13, preco_maximo=$14,
            observacoes=$15, ultima_atualizacao=$16, updated_at=NOW()
          WHERE usuario_id=$17 AND ticker=$18
        `, [
          dados.score, dados.classificacao, dados.decisao, dados.preco,
          dyMensal, dados.dyAnual, dados.pvp, dados.volumeFinanceiro, dados.patrimonioLiquido,
          dados.variacaoDia, dados.variacaoDiaReais, dados.precoAbertura, dados.precoMinimo, dados.precoMaximo,
          dados.observacoes, dados.ultimaAtualizacao,
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

// ─── POST /api/fiis/comprar ───────────────────────────────────────────────
router.post('/comprar', async (req, res) => {
  const { ticker, quantidade, preco } = req.body;
  if (!ticker || !quantidade || !preco) return res.status(400).json({ error: 'ticker, quantidade e preco obrigatórios.' });
  try {
    const atual = await pool.query(
      'SELECT quantidade, preco_compra FROM fiis_carteira WHERE usuario_id=$1 AND ticker=$2',
      [req.userId, ticker.toUpperCase()]
    );
    if (!atual.rows.length) return res.status(404).json({ error: 'FII não encontrado na carteira.' });
    const { quantidade: qtdAtual, preco_compra: pmAtual } = atual.rows[0];
    const novaQtd = Number(qtdAtual) + Number(quantidade);
    const novoPM  = qtdAtual > 0
      ? ((Number(qtdAtual) * Number(pmAtual)) + (Number(quantidade) * Number(preco))) / novaQtd
      : Number(preco);
    await pool.query(
      'UPDATE fiis_carteira SET quantidade=$1, preco_compra=$2, updated_at=NOW() WHERE usuario_id=$3 AND ticker=$4',
      [novaQtd, parseFloat(novoPM.toFixed(4)), req.userId, ticker.toUpperCase()]
    );
    res.json({ message: 'Compra registrada.', novaQtd, novoPM });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao registrar compra.' });
  }
});

// ─── POST /api/fiis/vender ────────────────────────────────────────────────
router.post('/vender', async (req, res) => {
  const { ticker, quantidade } = req.body;
  if (!ticker || !quantidade) return res.status(400).json({ error: 'ticker e quantidade obrigatórios.' });
  try {
    const atual = await pool.query(
      'SELECT quantidade FROM fiis_carteira WHERE usuario_id=$1 AND ticker=$2',
      [req.userId, ticker.toUpperCase()]
    );
    if (!atual.rows.length) return res.status(404).json({ error: 'FII não encontrado na carteira.' });
    const novaQtd = Math.max(0, Number(atual.rows[0].quantidade) - Number(quantidade));
    await pool.query(
      'UPDATE fiis_carteira SET quantidade=$1, updated_at=NOW() WHERE usuario_id=$2 AND ticker=$3',
      [novaQtd, req.userId, ticker.toUpperCase()]
    );
    res.json({ message: 'Venda registrada.', novaQtd });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao registrar venda.' });
  }
});

// ─── POST /api/fiis/dividendos ────────────────────────────────────────────
router.post('/dividendos', async (req, res) => {
  const { lancamentos } = req.body;
  if (!Array.isArray(lancamentos) || !lancamentos.length)
    return res.status(400).json({ error: 'Nenhum lançamento informado.' });
  try {
    const anoAtual = new Date().getFullYear();
    for (const lanc of lancamentos) {
      const { ticker, tipo_dividendo = 'Rendimento', valor_por_cota, quantidade, valor_total_override, mes, ano } = lanc;
      if (!ticker || !valor_por_cota || !mes || !ano) continue;
      const valorTotal = valor_total_override != null
        ? Number(valor_total_override)
        : Number(valor_por_cota) * Number(quantidade || 0);
      await pool.query(`
        INSERT INTO dividendos_fiis (usuario_id, ticker, tipo_dividendo, valor_por_cota, valor_total, mes, ano, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
        ON CONFLICT (usuario_id, ticker, mes, ano, tipo_dividendo, valor_por_cota) DO UPDATE SET
          valor_total = EXCLUDED.valor_total, created_at = NOW()
      `, [req.userId, ticker.toUpperCase(), tipo_dividendo, Number(valor_por_cota), valorTotal, mes, ano]);
    }
    const tickers = [...new Set(lancamentos.map(l => l.ticker.toUpperCase()))];
    for (const ticker of tickers) {
      await recalcularDividendosAno(req.userId, ticker, anoAtual);
      await recalcularDividendosGeral(req.userId, ticker);
    }
    res.json({ message: 'Dividendos lançados com sucesso.' });
  } catch (err) {
    console.error('[dividendos fiis]', err);
    res.status(500).json({ error: 'Erro ao lançar dividendos.' });
  }
});

// GET /api/fiis/dividendos?mes=X&ano=Y
router.get('/dividendos', async (req, res) => {
  const { mes, ano } = req.query;
  if (!mes || !ano) return res.status(400).json({ error: 'mes e ano obrigatórios.' });
  try {
    const r = await pool.query(
      `SELECT ticker, tipo_dividendo, valor_por_cota, valor_total, mes, ano
       FROM dividendos_fiis WHERE usuario_id=$1 AND mes=$2 AND ano=$3
       ORDER BY ticker, tipo_dividendo`,
      [req.userId, Number(mes), Number(ano)]
    );
    res.json(r.rows);
  } catch {
    res.status(500).json({ error: 'Erro ao buscar dividendos.' });
  }
});

// GET /api/fiis/dividendos/anos
router.get('/dividendos/anos', async (req, res) => {
  try {
    const r = await pool.query(
      `SELECT DISTINCT ano FROM dividendos_fiis WHERE usuario_id=$1 ORDER BY ano DESC`,
      [req.userId]
    );
    res.json({ anos: r.rows.map(row => row.ano) });
  } catch {
    res.status(500).json({ error: 'Erro ao buscar anos.' });
  }
});

// GET /api/fiis/dividendos/resumo?ano=X
router.get('/dividendos/resumo', async (req, res) => {
  const { ano } = req.query;
  try {
    let query, params;
    if (ano && Number(ano) > 0) {
      query = `
        SELECT ticker,
          COALESCE(SUM(soma), 0) AS total, SUM(lancamentos) AS lancamentos,
          json_object_agg(tipo_dividendo, COALESCE(soma, 0)) AS breakdown
        FROM (
          SELECT ticker, tipo_dividendo, SUM(valor_total) AS soma, COUNT(*) AS lancamentos
          FROM dividendos_fiis WHERE usuario_id=$1 AND ano=$2
          GROUP BY ticker, tipo_dividendo
        ) t GROUP BY ticker`;
      params = [req.userId, Number(ano)];
    } else {
      query = `
        SELECT ticker,
          COALESCE(SUM(soma), 0) AS total, SUM(lancamentos) AS lancamentos,
          json_object_agg(tipo_dividendo, COALESCE(soma, 0)) AS breakdown
        FROM (
          SELECT ticker, tipo_dividendo, SUM(valor_total) AS soma, COUNT(*) AS lancamentos
          FROM dividendos_fiis WHERE usuario_id=$1
          GROUP BY ticker, tipo_dividendo
        ) t GROUP BY ticker`;
      params = [req.userId];
    }
    const r = await pool.query(query, params);
    const resultado = {};
    for (const row of r.rows) {
      resultado[row.ticker] = {
        total: Number(row.total),
        lancamentos: Number(row.lancamentos),
        breakdown: row.breakdown || {}
      };
    }
    res.json(resultado);
  } catch (err) {
    console.error('[dividendos/resumo fiis]', err);
    res.status(500).json({ error: 'Erro ao buscar resumo.' });
  }
});

// DELETE /api/fiis/dividendos/:ticker/:tipo/:mes/:ano
router.delete('/dividendos/:ticker/:tipo/:mes/:ano', async (req, res) => {
  const { ticker, tipo, mes, ano } = req.params;
  try {
    await pool.query(
      `DELETE FROM dividendos_fiis WHERE usuario_id=$1 AND ticker=$2 AND tipo_dividendo=$3 AND mes=$4 AND ano=$5`,
      [req.userId, ticker.toUpperCase(), tipo, Number(mes), Number(ano)]
    );
    const anoAtual = new Date().getFullYear();
    await recalcularDividendosAno(req.userId, ticker.toUpperCase(), anoAtual);
    await recalcularDividendosGeral(req.userId, ticker.toUpperCase());
    res.json({ message: 'Lançamento removido.' });
  } catch {
    res.status(500).json({ error: 'Erro ao remover lançamento.' });
  }
});

// ─── helpers ──────────────────────────────────────────────────────────────
async function recalcularDividendosAno(usuarioId, ticker, ano) {
  const r = await pool.query(`
    SELECT COALESCE(SUM(soma), 0) AS total, SUM(lancamentos) AS lancamentos,
      json_object_agg(tipo_dividendo, COALESCE(soma, 0)) AS breakdown
    FROM (
      SELECT tipo_dividendo, SUM(valor_total) AS soma, COUNT(*) AS lancamentos
      FROM dividendos_fiis WHERE usuario_id=$1 AND ticker=$2 AND ano=$3
      GROUP BY tipo_dividendo
    ) t
  `, [usuarioId, ticker, ano]);
  const { total, lancamentos, breakdown } = r.rows[0];
  await pool.query(
    `UPDATE fiis_carteira SET dividendos_ano=$1, dividendos_lancamentos=$2, dividendos_breakdown=$3, updated_at=NOW()
     WHERE usuario_id=$4 AND ticker=$5`,
    [Number(total), Number(lancamentos), JSON.stringify(breakdown || {}), usuarioId, ticker]
  );
}

async function recalcularDividendosGeral(usuarioId, ticker) {
  const r = await pool.query(
    `SELECT COALESCE(SUM(valor_total), 0) AS total, COUNT(*) AS lancamentos
     FROM dividendos_fiis WHERE usuario_id=$1 AND ticker=$2`,
    [usuarioId, ticker]
  );
  const { total, lancamentos } = r.rows[0];
  await pool.query(
    `UPDATE fiis_carteira SET dividendos_geral=$1, dividendos_geral_lancamentos=$2, updated_at=NOW()
     WHERE usuario_id=$3 AND ticker=$4`,
    [Number(total), Number(lancamentos), usuarioId, ticker]
  );
}

async function recalcularPesosFII(usuarioId) {
  const fiis = await pool.query('SELECT id, classificacao FROM fiis_carteira WHERE usuario_id=$1', [usuarioId]);
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
