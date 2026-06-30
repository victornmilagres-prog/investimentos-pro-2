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
    let d = {};
    try {
      if (tipo === 'ACAO') d = await buscarAcao(ticker);
      else d = await buscarFII(ticker);
    } catch(e) { console.log('Erro ao buscar dados watchlist:', e.message); }

    const isAcao = tipo === 'ACAO';
    const r = await pool.query(
      `INSERT INTO watchlist (
         usuario_id,ticker,tipo,preco_alvo,observacoes,
         preco_atual,score,max_score,classificacao,decisao,
         pl,pvp,margem_liquida,roe,divida_ebit,dy,
         dy_mensal,dy_anual,volume_financeiro,patrimonio_liquido,
         preco_graham,status_graham,
         variacao_dia,variacao_dia_reais,preco_abertura,preco_minimo,preco_maximo,
         ultima_atualizacao,
         nome_ativo,administradora,tipo_fundo,vpa,preco_bazin,status_bazin,preco_justo,status_justo
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31,$32,$33,$34,$35,$36)
       ON CONFLICT (usuario_id,ticker) DO UPDATE SET
         preco_alvo=EXCLUDED.preco_alvo, observacoes=EXCLUDED.observacoes,
         preco_atual=EXCLUDED.preco_atual, score=EXCLUDED.score, max_score=EXCLUDED.max_score,
         classificacao=EXCLUDED.classificacao, decisao=EXCLUDED.decisao,
         pl=EXCLUDED.pl, pvp=EXCLUDED.pvp, margem_liquida=EXCLUDED.margem_liquida,
         roe=EXCLUDED.roe, divida_ebit=EXCLUDED.divida_ebit, dy=EXCLUDED.dy,
         dy_mensal=EXCLUDED.dy_mensal, dy_anual=EXCLUDED.dy_anual,
         volume_financeiro=EXCLUDED.volume_financeiro, patrimonio_liquido=EXCLUDED.patrimonio_liquido,
         preco_graham=EXCLUDED.preco_graham, status_graham=EXCLUDED.status_graham,
         variacao_dia=EXCLUDED.variacao_dia, variacao_dia_reais=EXCLUDED.variacao_dia_reais,
         preco_abertura=EXCLUDED.preco_abertura, preco_minimo=EXCLUDED.preco_minimo,
         preco_maximo=EXCLUDED.preco_maximo, ultima_atualizacao=EXCLUDED.ultima_atualizacao,
         nome_ativo=EXCLUDED.nome_ativo, administradora=EXCLUDED.administradora,
         tipo_fundo=EXCLUDED.tipo_fundo, vpa=EXCLUDED.vpa,
         preco_bazin=EXCLUDED.preco_bazin, status_bazin=EXCLUDED.status_bazin,
         preco_justo=EXCLUDED.preco_justo, status_justo=EXCLUDED.status_justo,
         updated_at=NOW()
       RETURNING *`,
      [
        req.userId, ticker.toUpperCase(), tipo, preco_alvo || null, observacoes,
        d.preco || null, d.score || null, isAcao ? (d.maxScore || 6) : 4,
        d.classificacao || null, d.decisao || null,
        isAcao ? (d.pl || 0) : 0,
        d.pvp || 0,
        isAcao ? (d.margemLiquida || 0) : 0,
        isAcao ? (d.roe || 0) : 0,
        isAcao ? (d.dividaEbit || 0) : 0,
        isAcao ? (d.dy || 0) : 0,
        !isAcao ? (d.dyMensal || 0) : 0,
        !isAcao ? (d.dyAnual || 0) : 0,
        !isAcao ? (d.volumeFinanceiro || 0) : 0,
        !isAcao ? (d.patrimonioLiquido || 0) : 0,
        isAcao ? (d.precoGraham || null) : null,
        isAcao ? (d.statusGraham || null) : null,
        d.variacaoDia || 0, d.variacaoDiaReais || 0,
        d.precoAbertura || 0, d.precoMinimo || 0, d.precoMaximo || 0,
        d.ultimaAtualizacao || new Date(),
        isAcao ? (d.nomeEmpresa || null) : (d.nomeFundo || null),
        !isAcao ? (d.administradora || null) : null,
        !isAcao ? (d.tipoFundo || null) : null,
        !isAcao ? (d.vpa || 0) : 0,
        isAcao ? (d.precoBazin || 0) : 0,
        isAcao ? (d.statusBazin || null) : null,
        !isAcao ? (d.precoJusto || 0) : 0,
        !isAcao ? (d.statusJusto || null) : null
      ]
    );
    res.status(201).json(r.rows[0]);
  } catch(err) {
    console.error(err);
    res.status(500).json({ error: 'Erro ao adicionar à watchlist.' });
  }
});

watchlistRouter.put('/:id', async (req, res) => {
  const { favorito } = req.body;
  try {
    await pool.query(
      'UPDATE watchlist SET favorito=$1 WHERE id=$2 AND usuario_id=$3',
      [favorito, req.params.id, req.userId]
    );
    res.json({ ok: true });
  } catch {
    res.status(500).json({ error: 'Erro ao atualizar favorito.' });
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
      const d = item.tipo === 'ACAO' ? await buscarAcao(item.ticker) : await buscarFII(item.ticker);
      const isAcao = item.tipo === 'ACAO';
      await pool.query(
        `UPDATE watchlist SET
           preco_atual=$1, score=$2, max_score=$3, classificacao=$4, decisao=$5,
           pl=$6, pvp=$7, margem_liquida=$8, roe=$9, divida_ebit=$10, dy=$11,
           dy_mensal=$12, dy_anual=$13, volume_financeiro=$14, patrimonio_liquido=$15,
           preco_graham=$16, status_graham=$17,
           variacao_dia=$18, variacao_dia_reais=$19,
           preco_abertura=$20, preco_minimo=$21, preco_maximo=$22,
           ultima_atualizacao=$23,
           nome_ativo=$24, administradora=$25, tipo_fundo=$26, vpa=$27,
           preco_bazin=$28, status_bazin=$29, preco_justo=$30, status_justo=$31
         WHERE usuario_id=$32 AND ticker=$33`,
        [
          d.preco, d.score, isAcao ? (d.maxScore || 6) : 4, d.classificacao, d.decisao,
          isAcao ? (d.pl || 0) : 0,
          d.pvp || 0,
          isAcao ? (d.margemLiquida || 0) : 0,
          isAcao ? (d.roe || 0) : 0,
          isAcao ? (d.dividaEbit || 0) : 0,
          isAcao ? (d.dy || 0) : 0,
          !isAcao ? (d.dyMensal || 0) : 0,
          !isAcao ? (d.dyAnual || 0) : 0,
          !isAcao ? (d.volumeFinanceiro || 0) : 0,
          !isAcao ? (d.patrimonioLiquido || 0) : 0,
          isAcao ? (d.precoGraham || null) : null,
          isAcao ? (d.statusGraham || null) : null,
          d.variacaoDia || 0, d.variacaoDiaReais || 0,
          d.precoAbertura || 0, d.precoMinimo || 0, d.precoMaximo || 0,
          d.ultimaAtualizacao,
          isAcao ? (d.nomeEmpresa || null) : (d.nomeFundo || null),
          !isAcao ? (d.administradora || null) : null,
          !isAcao ? (d.tipoFundo || null) : null,
          !isAcao ? (d.vpa || 0) : 0,
          isAcao ? (d.precoBazin || 0) : 0,
          isAcao ? (d.statusBazin || null) : null,
          !isAcao ? (d.precoJusto || 0) : 0,
          !isAcao ? (d.statusJusto || null) : null,
          req.userId, item.ticker
        ]
      );
    } catch(e) { console.log(`Watchlist update erro ${item.ticker}:`, e.message); }
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
