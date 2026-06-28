// ============ RENDA FIXA ============
const express = require('express');
const pool = require('../config/database');
const auth = require('../middleware/auth');
const { buscarAcao, buscarFII } = require('../services/brapiService');

const rendaFixaRouter = express.Router();
rendaFixaRouter.use(auth);

rendaFixaRouter.get('/', async (req, res) => {
  const r = await pool.query('SELECT * FROM renda_fixa WHERE usuario_id=$1 ORDER BY created_at DESC', [req.userId]);
  res.json(r.rows);
});

rendaFixaRouter.post('/', async (req, res) => {
  const { nome, instituicao, tipo, valor_investido, rendimento_anual, vencimento, indexador, observacoes } = req.body;
  if (!nome || !valor_investido) return res.status(400).json({ error: 'Nome e valor obrigatórios.' });
  try {
    const r = await pool.query(
      `INSERT INTO renda_fixa (usuario_id,nome,instituicao,tipo,valor_investido,rendimento_anual,vencimento,indexador,observacoes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [req.userId, nome, instituicao, tipo, valor_investido, rendimento_anual, vencimento || null, indexador, observacoes]
    );
    res.status(201).json(r.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao adicionar renda fixa.' });
  }
});

rendaFixaRouter.put('/:id', async (req, res) => {
  const { nome, instituicao, tipo, valor_investido, rendimento_anual, vencimento, indexador, observacoes } = req.body;
  try {
    const r = await pool.query(
      `UPDATE renda_fixa SET nome=$1,instituicao=$2,tipo=$3,valor_investido=$4,rendimento_anual=$5,
       vencimento=$6,indexador=$7,observacoes=$8,updated_at=NOW()
       WHERE id=$9 AND usuario_id=$10 RETURNING *`,
      [nome, instituicao, tipo, valor_investido, rendimento_anual, vencimento || null, indexador, observacoes, req.params.id, req.userId]
    );
    if (!r.rows.length) return res.status(404).json({ error: 'Registro não encontrado.' });
    res.json(r.rows[0]);
  } catch {
    res.status(500).json({ error: 'Erro ao atualizar.' });
  }
});

rendaFixaRouter.delete('/:id', async (req, res) => {
  await pool.query('DELETE FROM renda_fixa WHERE id=$1 AND usuario_id=$2', [req.params.id, req.userId]);
  res.json({ message: 'Removido.' });
});

// ============ WATCHLIST ============
const watchlistRouter = express.Router();
watchlistRouter.use(auth);

watchlistRouter.get('/', async (req, res) => {
  const r = await pool.query('SELECT * FROM watchlist WHERE usuario_id=$1 ORDER BY ticker', [req.userId]);
  res.json(r.rows);
});

watchlistRouter.post('/', async (req, res) => {
  const { ticker, tipo, preco_alvo, observacoes } = req.body;
  if (!ticker || !tipo) return res.status(400).json({ error: 'Ticker e tipo obrigatórios.' });
  try {
    let dados = {};
    try {
      if (tipo === 'ACAO') dados = await buscarAcao(ticker);
      else dados = await buscarFII(ticker);
    } catch { /* mantém dados vazios se falhar */ }

    const r = await pool.query(
      `INSERT INTO watchlist (usuario_id,ticker,tipo,preco_alvo,observacoes,score,classificacao,decisao,preco_atual,preco_graham,status_graham,ultima_atualizacao)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
       ON CONFLICT (usuario_id,ticker) DO UPDATE SET
         preco_alvo=EXCLUDED.preco_alvo, score=EXCLUDED.score,
         classificacao=EXCLUDED.classificacao, decisao=EXCLUDED.decisao,
         preco_atual=EXCLUDED.preco_atual, preco_graham=EXCLUDED.preco_graham,
         status_graham=EXCLUDED.status_graham, ultima_atualizacao=EXCLUDED.ultima_atualizacao
       RETURNING *`,
      [req.userId, ticker.toUpperCase(), tipo, preco_alvo || null, observacoes,
       dados.score || null, dados.classificacao || null, dados.decisao || null,
       dados.preco || null, tipo === 'ACAO' ? (dados.precoGraham || null) : null,
       tipo === 'ACAO' ? (dados.statusGraham || null) : null,
       dados.ultimaAtualizacao || null]
    );
    res.status(201).json(r.rows[0]);
  } catch {
    res.status(500).json({ error: 'Erro ao adicionar à watchlist.' });
  }
});

watchlistRouter.delete('/:ticker', async (req, res) => {
  await pool.query('DELETE FROM watchlist WHERE usuario_id=$1 AND ticker=$2', [req.userId, req.params.ticker.toUpperCase()]);
  res.json({ message: 'Removido da watchlist.' });
});

watchlistRouter.post('/atualizar-todos', async (req, res) => {
  const itens = await pool.query('SELECT ticker, tipo FROM watchlist WHERE usuario_id=$1', [req.userId]);
  for (const item of itens.rows) {
    try {
      const dados = item.tipo === 'ACAO' ? await buscarAcao(item.ticker) : await buscarFII(item.ticker);
      await pool.query(
        `UPDATE watchlist SET score=$1,classificacao=$2,decisao=$3,preco_atual=$4,
          preco_graham=$5,status_graham=$6,ultima_atualizacao=$7
         WHERE usuario_id=$8 AND ticker=$9`,
        [dados.score, dados.classificacao, dados.decisao, dados.preco,
         item.tipo === 'ACAO' ? (dados.precoGraham || null) : null,
         item.tipo === 'ACAO' ? (dados.statusGraham || null) : null,
         dados.ultimaAtualizacao, req.userId, item.ticker]
      );
    } catch { /* continua */ }
  }
  const atualizado = await pool.query('SELECT * FROM watchlist WHERE usuario_id=$1', [req.userId]);
  res.json(atualizado.rows);
});

// ============ PLANEJAMENTO PATRIMONIAL ============
const planejamentoRouter = express.Router();
planejamentoRouter.use(auth);

planejamentoRouter.get('/', async (req, res) => {
  const r = await pool.query('SELECT * FROM planejamento WHERE usuario_id=$1', [req.userId]);
  if (!r.rows.length) {
    await pool.query('INSERT INTO planejamento (usuario_id) VALUES ($1)', [req.userId]);
    return res.json((await pool.query('SELECT * FROM planejamento WHERE usuario_id=$1', [req.userId])).rows[0]);
  }
  res.json(r.rows[0]);
});

planejamentoRouter.put('/', async (req, res) => {
  const {
    salario, percentual_investimento, meta_patrimonio, meta_renda_passiva, meta_reserva_emergencia,
    perc_reserva_emergencia, perc_cdb, perc_acoes, perc_fiis, perc_bitcoin, perc_ouro,
    inst_reserva, inst_cdb, inst_acoes, inst_fiis, inst_bitcoin, inst_ouro
  } = req.body;

  try {
    const r = await pool.query(
      `UPDATE planejamento SET
        salario=$1, percentual_investimento=$2, meta_patrimonio=$3,
        meta_renda_passiva=$4, meta_reserva_emergencia=$5,
        perc_reserva_emergencia=$6, perc_cdb=$7, perc_acoes=$8,
        perc_fiis=$9, perc_bitcoin=$10, perc_ouro=$11,
        inst_reserva=$12, inst_cdb=$13, inst_acoes=$14,
        inst_fiis=$15, inst_bitcoin=$16, inst_ouro=$17, updated_at=NOW()
       WHERE usuario_id=$18 RETURNING *`,
      [salario, percentual_investimento, meta_patrimonio, meta_renda_passiva, meta_reserva_emergencia,
       perc_reserva_emergencia, perc_cdb, perc_acoes, perc_fiis, perc_bitcoin, perc_ouro,
       inst_reserva, inst_cdb, inst_acoes, inst_fiis, inst_bitcoin, inst_ouro, req.userId]
    );
    res.json(r.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao salvar planejamento.' });
  }
});

// GET /api/planejamento/simulador — retorna sugestão de aportes baseado nos pesos
planejamentoRouter.get('/simulador', async (req, res) => {
  try {
    const plan = await pool.query('SELECT * FROM planejamento WHERE usuario_id=$1', [req.userId]);
    const p = plan.rows[0];
    if (!p) return res.status(404).json({ error: 'Planejamento não configurado.' });

    const valorTotal = (p.salario * p.percentual_investimento) / 100;
    const valorAcoes = (valorTotal * p.perc_acoes) / 100;
    const valorFIIs = (valorTotal * p.perc_fiis) / 100;

    const acoes = await pool.query(
      'SELECT ticker, peso_sugerido FROM acoes_carteira WHERE usuario_id=$1 ORDER BY peso_sugerido DESC',
      [req.userId]
    );
    const fiis = await pool.query(
      'SELECT ticker, peso_sugerido FROM fiis_carteira WHERE usuario_id=$1 ORDER BY peso_sugerido DESC',
      [req.userId]
    );

    const aporteAcoes = acoes.rows.map(a => ({
      ticker: a.ticker,
      peso: parseFloat(a.peso_sugerido),
      valorSugerido: parseFloat((valorAcoes * a.peso_sugerido).toFixed(2))
    }));

    const aporteFIIs = fiis.rows.map(f => ({
      ticker: f.ticker,
      peso: parseFloat(f.peso_sugerido),
      valorSugerido: parseFloat((valorFIIs * f.peso_sugerido).toFixed(2))
    }));

    res.json({
      salario: p.salario,
      valorInvestidoMes: valorTotal,
      alocacoes: {
        reservaEmergencia: { perc: p.perc_reserva_emergencia, valor: (valorTotal * p.perc_reserva_emergencia) / 100, instituicao: p.inst_reserva },
        cdb: { perc: p.perc_cdb, valor: (valorTotal * p.perc_cdb) / 100, instituicao: p.inst_cdb },
        acoes: { perc: p.perc_acoes, valor: valorAcoes, instituicao: p.inst_acoes },
        fiis: { perc: p.perc_fiis, valor: valorFIIs, instituicao: p.inst_fiis },
        bitcoin: { perc: p.perc_bitcoin, valor: (valorTotal * p.perc_bitcoin) / 100, instituicao: p.inst_bitcoin },
        ouro: { perc: p.perc_ouro, valor: (valorTotal * p.perc_ouro) / 100, instituicao: p.inst_ouro }
      },
      aporteAcoes,
      aporteFIIs
    });
  } catch (err) {
    res.status(500).json({ error: 'Erro no simulador.' });
  }
});

// ============ DASHBOARD ============
const dashboardRouter = express.Router();
dashboardRouter.use(auth);

dashboardRouter.get('/', async (req, res) => {
  try {
    const [acoes, fiis, rendaFixa, watchlist] = await Promise.all([
      pool.query('SELECT * FROM acoes_carteira WHERE usuario_id=$1', [req.userId]),
      pool.query('SELECT * FROM fiis_carteira WHERE usuario_id=$1', [req.userId]),
      pool.query('SELECT * FROM renda_fixa WHERE usuario_id=$1', [req.userId]),
      pool.query('SELECT * FROM watchlist WHERE usuario_id=$1', [req.userId])
    ]);

    const calcPatrimonio = (rows, campoPreco) =>
      rows.reduce((s, r) => s + (Number(r.quantidade || 0) * Number(r[campoPreco] || 0)), 0);

    const patrimonioAcoes = calcPatrimonio(acoes.rows, 'preco_atual');
    const patrimonioFIIs = calcPatrimonio(fiis.rows, 'preco_atual');
    const patrimonioRendaFixa = rendaFixa.rows.reduce((s, r) => s + Number(r.valor_investido || 0), 0);
    const patrimonioTotal = patrimonioAcoes + patrimonioFIIs + patrimonioRendaFixa;

    const calcCusto = (rows) =>
      rows.reduce((s, r) => s + (Number(r.quantidade || 0) * Number(r.preco_compra || 0)), 0);

    const custoAcoes = calcCusto(acoes.rows);
    const custoFIIs = calcCusto(fiis.rows);
    const ganhoAcoes = patrimonioAcoes - custoAcoes;
    const ganhoFIIs = patrimonioFIIs - custoFIIs;

    // Radar de oportunidades e riscos
    const todosAtivos = [
      ...acoes.rows.map(a => ({ ...a, tipo: 'ACAO' })),
      ...fiis.rows.map(f => ({ ...f, tipo: 'FII' }))
    ];

    const oportunidades = todosAtivos
      .filter(a => a.decisao === 'COMPRAR/ACUMULAR')
      .sort((a, b) => Number(b.peso_sugerido) - Number(a.peso_sugerido))
      .slice(0, 10);

    const riscos = todosAtivos
      .filter(a => a.decisao === 'EVITAR/REVER' || a.classificacao === 'RISCO')
      .slice(0, 10);

    res.json({
      resumo: {
        patrimonioTotal,
        patrimonioAcoes,
        patrimonioFIIs,
        patrimonioRendaFixa,
        ganhoAcoes,
        ganhoFIIs,
        totalAtivos: todosAtivos.length,
        totalAcoes: acoes.rows.length,
        totalFIIs: fiis.rows.length,
        ativosExcelentes: todosAtivos.filter(a => a.classificacao === 'EXCELENTE').length,
        ativosRisco: todosAtivos.filter(a => a.classificacao === 'RISCO').length,
        totalWatchlist: watchlist.rows.length
      },
      rankingAcoes: acoes.rows
        .sort((a, b) => Number(b.peso_sugerido) - Number(a.peso_sugerido))
        .slice(0, 10),
      rankingFIIs: fiis.rows
        .sort((a, b) => Number(b.peso_sugerido) - Number(a.peso_sugerido))
        .slice(0, 10),
      oportunidades,
      riscos,
      atualizadoEm: new Date()
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao carregar dashboard.' });
  }
});

// ============ NOTIFICAÇÕES ============
const notificacoesRouter = express.Router();
notificacoesRouter.use(auth);

notificacoesRouter.get('/', async (req, res) => {
  const r = await pool.query(
    'SELECT * FROM notificacoes WHERE usuario_id=$1 ORDER BY created_at DESC LIMIT 50',
    [req.userId]
  );
  res.json(r.rows);
});

notificacoesRouter.put('/:id/lida', async (req, res) => {
  await pool.query('UPDATE notificacoes SET lida=true WHERE id=$1 AND usuario_id=$2', [req.params.id, req.userId]);
  res.json({ message: 'Marcada como lida.' });
});

notificacoesRouter.delete('/todas', async (req, res) => {
  await pool.query('DELETE FROM notificacoes WHERE usuario_id=$1', [req.userId]);
  res.json({ message: 'Notificações limpas.' });
});

// ============ BRAPI (busca avulsa) ============
const brapiRouter = express.Router();
brapiRouter.use(auth);

brapiRouter.get('/acao/:ticker', async (req, res) => {
  try {
    const dados = await buscarAcao(req.params.ticker);
    res.json(dados);
  } catch (err) {
    res.status(404).json({ error: err.message });
  }
});

brapiRouter.get('/fii/:ticker', async (req, res) => {
  try {
    const dados = await buscarFII(req.params.ticker);
    res.json(dados);
  } catch (err) {
    res.status(404).json({ error: err.message });
  }
});

module.exports = {
  rendaFixaRouter,
  watchlistRouter,
  planejamentoRouter,
  dashboardRouter,
  notificacoesRouter,
  brapiRouter
};
