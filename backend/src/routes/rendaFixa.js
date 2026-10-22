const express = require('express');
const pool    = require('../config/database');
const auth    = require('../middleware/auth');
const axios   = require('axios');

const router = express.Router();
router.use(auth);

// ─── Normalizar data para meia-noite local ─────────────────────────────────
function parseData(d) {
  if (!d) return new Date();
  const s = typeof d === 'string' ? d : d.toISOString();
  const [ano, mes, dia] = s.substring(0, 10).split('-').map(Number);
  return new Date(ano, mes - 1, dia);
}

function formatDataBCB(dt) {
  const d = String(dt.getDate()).padStart(2, '0');
  const m = String(dt.getMonth() + 1).padStart(2, '0');
  const y = dt.getFullYear();
  return `${d}/${m}/${y}`;
}

// ─── Cache de taxas
const cdiDiarioCache = {};
let taxasAnuaisCache = { selic: 0, ipca: 0, timestamp: 0 };

async function buscarCdiDiario(dataInicio, dataFim) {
  const chave = `${formatDataBCB(dataInicio)}_${formatDataBCB(dataFim)}`;
  if (cdiDiarioCache[chave]) return cdiDiarioCache[chave];
  try {
    const url = `https://api.bcb.gov.br/dados/serie/bcdata.sgs.12/dados?formato=json&dataInicial=${formatDataBCB(dataInicio)}&dataFinal=${formatDataBCB(dataFim)}`;
    const res = await axios.get(url, { timeout: 10000 });
    cdiDiarioCache[chave] = res.data || [];
    return cdiDiarioCache[chave];
  } catch (e) {
    console.error('[CDI diário BCB]', e.message);
    return [];
  }
}

async function buscarTaxasAnuais() {
  const agora = Date.now();
  if (taxasAnuaisCache.selic > 0 && agora - taxasAnuaisCache.timestamp < 3600000) return taxasAnuaisCache;
  try {
    const [resSelic, resIpca] = await Promise.allSettled([
      axios.get('https://api.bcb.gov.br/dados/serie/bcdata.sgs.1178/dados/ultimos/1?formato=json', { timeout: 8000 }),
      axios.get('https://api.bcb.gov.br/dados/serie/bcdata.sgs.13522/dados/ultimos/1?formato=json', { timeout: 8000 }),
    ]);
    const selicAnual = resSelic.status === 'fulfilled' ? parseFloat(resSelic.value.data[0]?.valor || 0) : taxasAnuaisCache.selic;
    const ipcaMensal = resIpca.status  === 'fulfilled' ? parseFloat(resIpca.value.data[0]?.valor  || 0) : null;
    const ipcaAnual  = ipcaMensal !== null
      ? parseFloat(((Math.pow(1 + ipcaMensal / 100, 12) - 1) * 100).toFixed(4))
      : taxasAnuaisCache.ipca;
    taxasAnuaisCache = { selic: selicAnual, ipca: ipcaAnual, timestamp: agora };
  } catch(e) { console.error('[taxas anuais BCB]', e.message); }
  return taxasAnuaisCache;
}

async function buscarCdiAtual() {
  try {
    const res = await axios.get('https://api.bcb.gov.br/dados/serie/bcdata.sgs.4392/dados/ultimos/1?formato=json', { timeout: 8000 });
    return parseFloat(res.data[0]?.valor || 0);
  } catch(e) { return 0; }
}

// ─── Cálculo de rendimento ─────────────────────────────────────────────────
async function calcularRendimento(item) {
  const { valor_investido, taxa, indexador, data_inicio, data_vencimento, isento_ir } = item;

  const inicio     = parseData(data_inicio);
  const hoje       = parseData(new Date().toISOString());
  const vencimento = parseData(data_vencimento);

  const diasCorridos = Math.max(0, Math.floor((hoje - inicio) / 86400000));
  const diasTotais   = Math.max(1, Math.floor((vencimento - inicio) / 86400000));
  const progressoPct = Math.min(100, (diasCorridos / diasTotais) * 100);

  const t = parseFloat(taxa);
  let fator = 1;
  let taxaAnualRef = 0;

  if (indexador === 'CDI') {
    // Acumular CDI diário (série 12) — mesma metodologia dos bancos/corretoras
    const dadosCdi = await buscarCdiDiario(inicio, hoje);
    const percentual = t / 100;
    for (const d of dadosCdi) {
      fator *= (1 + parseFloat(d.valor) / 100 * percentual);
    }
    taxaAnualRef = await buscarCdiAtual();
  } else {
    const taxasAnuais = await buscarTaxasAnuais();
    let taxaAnual = 0;
    switch (indexador) {
      case 'Prefixado': taxaAnual = t; taxaAnualRef = t; break;
      case 'Selic':     taxaAnual = (t / 100) * taxasAnuais.selic; taxaAnualRef = taxasAnuais.selic; break;
      case 'IPCA':      taxaAnual = taxasAnuais.ipca + t; taxaAnualRef = taxasAnuais.ipca; break;
      default:          taxaAnual = t; taxaAnualRef = t;
    }
    fator = Math.pow(1 + taxaAnual / 100, diasCorridos / 252);
  }

  const valorBruto = parseFloat(valor_investido) * fator;
  const rendBruto  = valorBruto - parseFloat(valor_investido);

  let aliquotaIR = 0;
  if (!isento_ir) {
    if      (diasCorridos <= 180) aliquotaIR = 22.5;
    else if (diasCorridos <= 360) aliquotaIR = 20;
    else if (diasCorridos <= 720) aliquotaIR = 17.5;
    else                          aliquotaIR = 15;
  }
  const ir           = rendBruto * (aliquotaIR / 100);
  const valorLiquido = valorBruto - ir;
  const rendLiquido  = valorLiquido - parseFloat(valor_investido);

  const diasParaVencer = Math.max(0, Math.floor((vencimento - hoje) / 86400000));
  let alertaVencimento = null;
  if      (diasParaVencer <= 30)  alertaVencimento = 'critico';
  else if (diasParaVencer <= 90)  alertaVencimento = 'atencao';
  else if (diasParaVencer <= 180) alertaVencimento = 'info';

  return {
    taxaAnual:      parseFloat(taxaAnualRef.toFixed(4)),
    valorBruto:     parseFloat(valorBruto.toFixed(2)),
    valorLiquido:   parseFloat(valorLiquido.toFixed(2)),
    rendBruto:      parseFloat(rendBruto.toFixed(2)),
    rendLiquido:    parseFloat(rendLiquido.toFixed(2)),
    rendBrutoPct:   parseFloat(((rendBruto / parseFloat(valor_investido)) * 100).toFixed(4)),
    rendLiquidoPct: parseFloat(((rendLiquido / parseFloat(valor_investido)) * 100).toFixed(4)),
    aliquotaIR,
    ir:             parseFloat(ir.toFixed(2)),
    diasCorridos,
    diasTotais,
    diasParaVencer,
    progressoPct:   parseFloat(progressoPct.toFixed(1)),
    alertaVencimento,
    vencido:        hoje > vencimento,
  };
}

// ─── GET /api/renda-fixa/taxas ────────────────────────────────────────────
router.get('/taxas', async (req, res) => {
  try {
    const [taxasAnuais, cdiAtual] = await Promise.all([buscarTaxasAnuais(), buscarCdiAtual()]);
    res.json({ cdi: cdiAtual, selic: taxasAnuais.selic, ipca: taxasAnuais.ipca });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar taxas.' });
  }
});

// ─── GET /api/renda-fixa ──────────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM renda_fixa WHERE usuario_id=$1 ORDER BY data_vencimento ASC', [req.userId]);
    const itens = await Promise.all(result.rows.map(async item => ({
      ...item,
      ...await calcularRendimento(item),
    })));
    const [taxasAnuais, cdiAtual] = await Promise.all([buscarTaxasAnuais(), buscarCdiAtual()]);
    res.json({ itens, taxas: { cdi: cdiAtual, selic: taxasAnuais.selic, ipca: taxasAnuais.ipca } });
  } catch (err) {
    console.error('[renda-fixa GET]', err);
    res.status(500).json({ error: 'Erro ao buscar renda fixa.' });
  }
});

// ─── POST /api/renda-fixa ─────────────────────────────────────────────────
router.post('/', async (req, res) => {
  const { nome, tipo, indexador, taxa, valor_investido, data_inicio, data_vencimento, emissor, liquidez, isento_ir, observacoes } = req.body;
  if (!nome || !tipo || !indexador || !taxa || !valor_investido || !data_inicio || !data_vencimento)
    return res.status(400).json({ error: 'Campos obrigatórios: nome, tipo, indexador, taxa, valor_investido, data_inicio, data_vencimento.' });
  try {
    const result = await pool.query(`
      INSERT INTO renda_fixa (usuario_id, nome, tipo, indexador, taxa, valor_investido, data_inicio, data_vencimento, emissor, liquidez, isento_ir, observacoes)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *
    `, [req.userId, nome, tipo, indexador, parseFloat(taxa), parseFloat(valor_investido), data_inicio, data_vencimento,
        emissor || null, liquidez || 'Vencimento', isento_ir || false, observacoes || null]);
    const rendimento = await calcularRendimento(result.rows[0]);
    res.status(201).json({ ...result.rows[0], ...rendimento });
  } catch (err) {
    console.error('[renda-fixa POST]', err);
    res.status(500).json({ error: 'Erro ao cadastrar investimento.' });
  }
});

// ─── PUT /api/renda-fixa/:id ──────────────────────────────────────────────
router.put('/:id', async (req, res) => {
  const { nome, tipo, indexador, taxa, valor_investido, data_inicio, data_vencimento, emissor, liquidez, isento_ir, observacoes } = req.body;
  try {
    const result = await pool.query(`
      UPDATE renda_fixa SET nome=$1, tipo=$2, indexador=$3, taxa=$4, valor_investido=$5,
        data_inicio=$6, data_vencimento=$7, emissor=$8, liquidez=$9, isento_ir=$10,
        observacoes=$11, updated_at=NOW()
      WHERE id=$12 AND usuario_id=$13 RETURNING *
    `, [nome, tipo, indexador, parseFloat(taxa), parseFloat(valor_investido), data_inicio, data_vencimento,
        emissor, liquidez, isento_ir, observacoes, req.params.id, req.userId]);
    if (!result.rows.length) return res.status(404).json({ error: 'Investimento não encontrado.' });
    const rendimento = await calcularRendimento(result.rows[0]);
    res.json({ ...result.rows[0], ...rendimento });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao atualizar investimento.' });
  }
});

// ─── DELETE /api/renda-fixa/:id ───────────────────────────────────────────
router.delete('/:id', async (req, res) => {
  try {
    await pool.query('DELETE FROM renda_fixa WHERE id=$1 AND usuario_id=$2', [req.params.id, req.userId]);
    res.json({ message: 'Investimento removido.' });
  } catch (err) {
    res.status(500).json({ error: 'Erro ao remover investimento.' });
  }
});

module.exports = router;