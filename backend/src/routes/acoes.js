const express = require('express');
const pool = require('../config/database');
const auth = require('../middleware/auth');
const { buscarAcao, calcularPesos } = require('../services/brapiService');

const router = express.Router();
router.use(auth);

// GET /api/acoes
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM acoes_carteira WHERE usuario_id = $1 ORDER BY ticker',
      [req.userId]
    );
    const ativos = calcularPesos(result.rows);
    res.json(ativos);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar ações.' });
  }
});

// POST /api/acoes — adiciona ação e busca dados na Brapi
router.post('/', async (req, res) => {
  const { ticker, quantidade = 0, preco_compra = 0 } = req.body;
  if (!ticker) return res.status(400).json({ error: 'Ticker obrigatório.' });

  try {
    const ajuste = await pool.query(
      'SELECT divida_liquida_ebit FROM ajustes_manuais_acoes WHERE usuario_id = $1 AND ticker = $2',
      [req.userId, ticker.toUpperCase()]
    );
    const dividaManual = ajuste.rows[0]?.divida_liquida_ebit ?? null;
    const dados = await buscarAcao(ticker, dividaManual);

    const result = await pool.query(`
      INSERT INTO acoes_carteira (
        usuario_id, ticker, quantidade, preco_compra,
        score, max_score, classificacao, decisao, preco_atual, preco_graham, status_graham,
        pl, pvp, margem_liquida, roe, divida_ebit, dy,
        variacao_dia, variacao_dia_reais, preco_abertura, preco_minimo, preco_maximo,
        observacoes, ultima_atualizacao,
        dividendos_ano, dividendos_lancamentos
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,0,0)
      ON CONFLICT (usuario_id, ticker) DO UPDATE SET
        quantidade = EXCLUDED.quantidade,
        preco_compra = CASE WHEN acoes_carteira.preco_compra = 0 THEN EXCLUDED.preco_compra ELSE acoes_carteira.preco_compra END,
        score = EXCLUDED.score, max_score = EXCLUDED.max_score,
        classificacao = EXCLUDED.classificacao, decisao = EXCLUDED.decisao,
        preco_atual = EXCLUDED.preco_atual, preco_graham = EXCLUDED.preco_graham,
        status_graham = EXCLUDED.status_graham,
        pl = EXCLUDED.pl, pvp = EXCLUDED.pvp, margem_liquida = EXCLUDED.margem_liquida,
        roe = EXCLUDED.roe, divida_ebit = EXCLUDED.divida_ebit, dy = EXCLUDED.dy,
        variacao_dia = EXCLUDED.variacao_dia, variacao_dia_reais = EXCLUDED.variacao_dia_reais,
        preco_abertura = EXCLUDED.preco_abertura, preco_minimo = EXCLUDED.preco_minimo,
        preco_maximo = EXCLUDED.preco_maximo,
        observacoes = EXCLUDED.observacoes, ultima_atualizacao = EXCLUDED.ultima_atualizacao,
        updated_at = NOW()
      RETURNING *
    `, [
      req.userId, dados.ticker, quantidade, preco_compra,
      dados.score, dados.maxScore, dados.classificacao, dados.decisao,
      dados.preco, dados.precoGraham, dados.statusGraham,
      dados.pl, dados.pvp, dados.margemLiquida, dados.roe, dados.dividaEbit, dados.dy,
      dados.variacaoDia, dados.variacaoDiaReais, dados.precoAbertura, dados.precoMinimo, dados.precoMaximo,
      dados.observacoes, dados.ultimaAtualizacao
    ]);

    await recalcularPesos(req.userId);
    res.status(201).json({ ...result.rows[0], ...dados });
  } catch (err) {
    console.error(err);
    if (err.message?.includes('não encontrada')) return res.status(404).json({ error: err.message });
    res.status(500).json({ error: 'Erro ao adicionar ação.' });
  }
});

// PUT /api/acoes/:ticker — atualiza quantidade e preço
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
      `UPDATE acoes_carteira SET ${fields.join(', ')} WHERE usuario_id=$${idx++} AND ticker=$${idx++} RETURNING *`,
      values
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Ação não encontrada.' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao atualizar ação.' });
  }
});

// DELETE /api/acoes/:ticker
router.delete('/:ticker', async (req, res) => {
  try {
    await pool.query(
      'DELETE FROM acoes_carteira WHERE usuario_id=$1 AND ticker=$2',
      [req.userId, req.params.ticker.toUpperCase()]
    );
    await recalcularPesos(req.userId);
    res.json({ message: 'Ação removida.' });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao remover ação.' });
  }
});

// POST /api/acoes/atualizar-todos
router.post('/atualizar-todos', async (req, res) => {
  try {
    const acoes = await pool.query(
      'SELECT ticker FROM acoes_carteira WHERE usuario_id=$1',
      [req.userId]
    );
    const resultados = [];
    for (const acao of acoes.rows) {
      try {
        const ajuste = await pool.query(
          'SELECT divida_liquida_ebit FROM ajustes_manuais_acoes WHERE usuario_id=$1 AND ticker=$2',
          [req.userId, acao.ticker]
        );
        const dividaManual = ajuste.rows[0]?.divida_liquida_ebit ?? null;
        const dados = await buscarAcao(acao.ticker, dividaManual);
        await pool.query(`
          UPDATE acoes_carteira SET
            score=$1, max_score=$2, classificacao=$3, decisao=$4, preco_atual=$5,
            preco_graham=$6, status_graham=$7, pl=$8, pvp=$9, margem_liquida=$10,
            roe=$11, divida_ebit=$12, dy=$13,
            variacao_dia=$14, variacao_dia_reais=$15, preco_abertura=$16,
            preco_minimo=$17, preco_maximo=$18,
            observacoes=$19, ultima_atualizacao=$20, updated_at=NOW()
          WHERE usuario_id=$21 AND ticker=$22
        `, [
          dados.score, dados.maxScore, dados.classificacao, dados.decisao, dados.preco,
          dados.precoGraham, dados.statusGraham, dados.pl, dados.pvp, dados.margemLiquida,
          dados.roe, dados.dividaEbit, dados.dy,
          dados.variacaoDia, dados.variacaoDiaReais, dados.precoAbertura,
          dados.precoMinimo, dados.precoMaximo,
          dados.observacoes, dados.ultimaAtualizacao,
          req.userId, acao.ticker
        ]);
        resultados.push({ ticker: acao.ticker, status: 'ok' });
      } catch {
        resultados.push({ ticker: acao.ticker, status: 'erro' });
      }
    }
    await recalcularPesos(req.userId);
    res.json({ resultados, atualizadoEm: new Date() });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao atualizar ações.' });
  }
});

// POST /api/acoes/dividendos
// Recebe: { lancamentos: [{ ticker, valor_por_acao, quantidade, mes, ano }] }
router.post('/dividendos', async (req, res) => {
  const { lancamentos } = req.body;
  if (!Array.isArray(lancamentos) || !lancamentos.length) {
    return res.status(400).json({ error: 'Nenhum lançamento informado.' });
  }

  try {
    for (const lanc of lancamentos) {
      const { ticker, valor_por_acao, quantidade, mes, ano } = lanc;
      if (!ticker || !valor_por_acao || !mes || !ano) continue;

      const valorTotal = Number(valor_por_acao) * Number(quantidade || 0);
      const anoAtual = new Date().getFullYear();

      await pool.query(`
        INSERT INTO dividendos_acoes (usuario_id, ticker, valor_por_acao, valor_total, mes, ano, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, NOW())
        ON CONFLICT (usuario_id, ticker, mes, ano) DO UPDATE SET
          valor_por_acao = EXCLUDED.valor_por_acao,
          valor_total = EXCLUDED.valor_total,
          created_at = NOW()
      `, [req.userId, ticker.toUpperCase(), Number(valor_por_acao), valorTotal, mes, ano]);

      const totais = await pool.query(`
        SELECT COALESCE(SUM(valor_total), 0) AS total, COUNT(*) AS lancamentos
        FROM dividendos_acoes
        WHERE usuario_id=$1 AND ticker=$2 AND ano=$3
      `, [req.userId, ticker.toUpperCase(), anoAtual]);

      const { total, lancamentos: numLanc } = totais.rows[0];

      await pool.query(`
        UPDATE acoes_carteira
        SET dividendos_ano=$1, dividendos_lancamentos=$2, updated_at=NOW()
        WHERE usuario_id=$3 AND ticker=$4
      `, [Number(total), Number(numLanc), req.userId, ticker.toUpperCase()]);
    }

    res.json({ message: 'Dividendos lançados com sucesso.' });
  } catch (err) {
    console.error('[dividendos]', err);
    res.status(500).json({ error: 'Erro ao lançar dividendos.' });
  }
});

// GET /api/acoes/dividendos?mes=X&ano=Y
router.get('/dividendos', async (req, res) => {
  const { mes, ano } = req.query;
  if (!mes || !ano) return res.status(400).json({ error: 'mes e ano obrigatórios.' });
  try {
    const r = await pool.query(
      'SELECT ticker, valor_por_acao, valor_total, mes, ano FROM dividendos_acoes WHERE usuario_id=$1 AND mes=$2 AND ano=$3 ORDER BY ticker',
      [req.userId, Number(mes), Number(ano)]
    );
    res.json(r.rows);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar dividendos.' });
  }
});

// DELETE /api/acoes/dividendos/:ticker/:mes/:ano
router.delete('/dividendos/:ticker/:mes/:ano', async (req, res) => {
  const { ticker, mes, ano } = req.params;
  const anoAtual = new Date().getFullYear();
  try {
    await pool.query(
      'DELETE FROM dividendos_acoes WHERE usuario_id=$1 AND ticker=$2 AND mes=$3 AND ano=$4',
      [req.userId, ticker.toUpperCase(), Number(mes), Number(ano)]
    );
    const totais = await pool.query(
      'SELECT COALESCE(SUM(valor_total),0) AS total, COUNT(*) AS lancamentos FROM dividendos_acoes WHERE usuario_id=$1 AND ticker=$2 AND ano=$3',
      [req.userId, ticker.toUpperCase(), anoAtual]
    );
    const { total, lancamentos } = totais.rows[0];
    await pool.query(
      'UPDATE acoes_carteira SET dividendos_ano=$1, dividendos_lancamentos=$2, updated_at=NOW() WHERE usuario_id=$3 AND ticker=$4',
      [Number(total), Number(lancamentos), req.userId, ticker.toUpperCase()]
    );
    res.json({ message: 'Lançamento removido.' });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao remover lançamento.' });
  }
});

async function recalcularPesos(usuarioId) {
  const acoes = await pool.query(
    'SELECT id, classificacao FROM acoes_carteira WHERE usuario_id=$1',
    [usuarioId]
  );
  const pesoBase = (cl) => cl === 'EXCELENTE' ? 5 : cl === 'BOM' ? 3 : cl === 'ATENÇÃO' ? 1 : 0;
  const total = acoes.rows.reduce((s, a) => s + pesoBase(a.classificacao), 0);
  for (const a of acoes.rows) {
    const pb = pesoBase(a.classificacao);
    const ps = total > 0 ? pb / total : 0;
    await pool.query(
      'UPDATE acoes_carteira SET peso_base=$1, peso_sugerido=$2 WHERE id=$3',
      [pb, ps, a.id]
    );
  }
}

module.exports = router;
