const express = require('express');
const pool    = require('../config/database');
const auth    = require('../middleware/auth');
const axios   = require('axios');

const router = express.Router();
router.use(auth);

// ─── Cache de preços ───────────────────────────────────────────────────────
let precosCache = { data: {}, timestamp: 0 };

// Mapa: ticker → como buscar
const FONTES = {
  // Criptos via CoinGecko
  BTC:  { tipo: 'cripto', id: 'bitcoin' },
  ETH:  { tipo: 'cripto', id: 'ethereum' },
  SOL:  { tipo: 'cripto', id: 'solana' },
  BNB:  { tipo: 'cripto', id: 'binancecoin' },
  // Câmbio via Banco Central
  USD:  { tipo: 'cambio', codigo: '1' },
  EUR:  { tipo: 'cambio', codigo: '21619' },
  GBP:  { tipo: 'cambio', codigo: '5' },
  // ETFs e commodities via Brapi (mesmo endpoint de ações)
  GOLD11: { tipo: 'brapi' },
  IVVB11: { tipo: 'brapi' },
  BOVA11: { tipo: 'brapi' },
  HASH11: { tipo: 'brapi' },
};

async function buscarPrecos(tickers) {
  const agora = Date.now();
  if (agora - precosCache.timestamp < 300000) return precosCache.data; // 5min cache

  const precos = { ...precosCache.data };
  const BRAPI_TOKEN = process.env.BRAPI_TOKEN;

  // 1. Criptos via CoinGecko
  const cryptoTickers = tickers.filter(t => FONTES[t]?.tipo === 'cripto');
  if (cryptoTickers.length) {
    try {
      const ids = cryptoTickers.map(t => FONTES[t].id).join(',');
      const res = await axios.get(
        `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=brl&include_24hr_change=true`,
        { timeout: 8000 }
      );
      cryptoTickers.forEach(t => {
        const id   = FONTES[t].id;
        const data = res.data[id];
        if (data) precos[t] = { preco: data.brl, variacao: data.brl_24h_change || 0 };
      });
    } catch(e) { console.error('[CoinGecko]', e.message); }
  }

  // 2. Câmbio via Banco Central
  const cambioTickers = tickers.filter(t => FONTES[t]?.tipo === 'cambio');
  for (const t of cambioTickers) {
    try {
      const res = await axios.get(
        `https://api.bcb.gov.br/dados/serie/bcdata.sgs.${FONTES[t].codigo}/dados/ultimos/2?formato=json`,
        { timeout: 8000 }
      );
      const dados = res.data;
      if (dados?.length >= 2) {
        const atual    = parseFloat(dados[dados.length - 1].valor);
        const anterior = parseFloat(dados[dados.length - 2].valor);
        precos[t] = { preco: atual, variacao: ((atual - anterior) / anterior) * 100 };
      }
    } catch(e) { console.error(`[BCB ${t}]`, e.message); }
  }

  // 3. ETFs e commodities via Brapi
  const brapiTickers = tickers.filter(t => FONTES[t]?.tipo === 'brapi' || (!FONTES[t] && !t.match(/^(BTC|ETH|SOL|BNB|USD|EUR|GBP)$/)));
  if (brapiTickers.length && BRAPI_TOKEN) {
    try {
      const syms = brapiTickers.join(',');
      const res  = await axios.get(
        `https://brapi.dev/api/quote/${syms}?token=${BRAPI_TOKEN}`,
        { timeout: 8000 }
      );
      (res.data.results || []).forEach(item => {
        precos[item.symbol] = {
          preco:    item.regularMarketPrice || 0,
          variacao: item.regularMarketChangePercent || 0,
        };
      });
    } catch(e) { console.error('[Brapi outros]', e.message); }
  }

  precosCache = { data: precos, timestamp: agora };
  return precos;
}

// ─── GET /api/outros-ativos ───────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM outros_ativos WHERE usuario_id=$1 ORDER BY tipo, ticker',
      [req.userId]
    );
    const tickers = result.rows.map(r => r.ticker);
    const precos  = tickers.length ? await buscarPrecos(tickers) : {};

    const itens = result.rows.map(item => {
      const p        = precos[item.ticker] || { preco: item.preco_atual || 0, variacao: 0 };
      const precoAtual   = p.preco;
      const valorAtual   = precoAtual * parseFloat(item.quantidade || 0);
      const valorInvest  = parseFloat(item.preco_compra || 0) * parseFloat(item.quantidade || 0);
      const resultado    = valorAtual - valorInvest;
      const resultadoPct = valorInvest > 0 ? (resultado / valorInvest) * 100 : 0;
      return {
        ...item,
        preco_atual:     parseFloat(precoAtual.toFixed(4)),
        variacao_dia:    parseFloat((p.variacao || 0).toFixed(4)),
        valor_atual:     parseFloat(valorAtual.toFixed(2)),
        valor_investido: parseFloat(valorInvest.toFixed(2)),
        resultado:       parseFloat(resultado.toFixed(2)),
        resultado_pct:   parseFloat(resultadoPct.toFixed(4)),
      };
    });
    res.json(itens);
  } catch (err) {
    console.error('[outros-ativos GET]', err);
    res.status(500).json({ error: 'Erro ao buscar outros ativos.' });
  }
});

// ─── POST /api/outros-ativos ──────────────────────────────────────────────
router.post('/', async (req, res) => {
  const { ticker, nome, tipo, quantidade, preco_compra, observacoes } = req.body;
  if (!ticker || !tipo || !quantidade || !preco_compra)
    return res.status(400).json({ error: 'Campos obrigatórios: ticker, tipo, quantidade, preco_compra.' });
  try {
    const result = await pool.query(`
      INSERT INTO outros_ativos (usuario_id, ticker, nome, tipo, quantidade, preco_compra, observacoes)
      VALUES ($1,$2,$3,$4,$5,$6,$7)
      ON CONFLICT (usuario_id, ticker) DO UPDATE SET
        quantidade=EXCLUDED.quantidade, preco_compra=EXCLUDED.preco_compra,
        nome=EXCLUDED.nome, tipo=EXCLUDED.tipo, updated_at=NOW()
      RETURNING *
    `, [req.userId, ticker.toUpperCase(), nome || ticker, tipo, parseFloat(quantidade), parseFloat(preco_compra), observacoes || null]);
    // Histórico
    const totalInvest = parseFloat(quantidade) * parseFloat(preco_compra);
    await pool.query(
      `INSERT INTO historico_operacoes (usuario_id, categoria, ticker, tipo, quantidade, preco_unitario, total, observacao, data_operacao)
       VALUES ($1,'outros',$2,'compra',$3,$4,$5,$6,CURRENT_DATE)`,
      [req.userId, ticker.toUpperCase(), parseFloat(quantidade), parseFloat(preco_compra), parseFloat(totalInvest.toFixed(2)), tipo]
    ).catch(e => console.error('[hist outros compra]', e.message));
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('[outros-ativos POST]', err);
    res.status(500).json({ error: 'Erro ao adicionar ativo.' });
  }
});

// ─── PUT /api/outros-ativos/:ticker ───────────────────────────────────────
router.put('/:ticker', async (req, res) => {
  const { nome, tipo, quantidade, preco_compra, observacoes } = req.body;
  try {
    const result = await pool.query(`
      UPDATE outros_ativos SET nome=$1, tipo=$2, quantidade=$3, preco_compra=$4,
        observacoes=$5, updated_at=NOW()
      WHERE usuario_id=$6 AND ticker=$7 RETURNING *
    `, [nome, tipo, parseFloat(quantidade), parseFloat(preco_compra), observacoes, req.userId, req.params.ticker.toUpperCase()]);
    if (!result.rows.length) return res.status(404).json({ error: 'Ativo não encontrado.' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao atualizar ativo.' });
  }
});

// ─── DELETE /api/outros-ativos/:ticker ────────────────────────────────────
router.delete('/:ticker', async (req, res) => {
  try {
    await pool.query('DELETE FROM outros_ativos WHERE usuario_id=$1 AND ticker=$2', [req.userId, req.params.ticker.toUpperCase()]);
    res.json({ message: 'Ativo removido.' });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao remover ativo.' });
  }
});

module.exports = router;
