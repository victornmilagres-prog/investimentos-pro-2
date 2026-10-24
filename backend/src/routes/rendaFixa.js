const express = require('express');
const pool    = require('../config/database');
const auth    = require('../middleware/auth');
const axios   = require('axios');

const router = express.Router();
router.use(auth);

// ─── Cache das taxas do Banco Central ─────────────────────────────────────
let taxasCache = { cdi: 0, selic: 0, ipca: 0, timestamp: 0 };

async function buscarTaxasBancoCentral() {
  const agora = Date.now();
  if (taxasCache.cdi > 0 && agora - taxasCache.timestamp < 3600000) return taxasCache;
  try {
    const [resCdi, resSelic, resIpca] = await Promise.allSettled([
      axios.get('https://api.bcb.gov.br/dados/serie/bcdata.sgs.4391/dados/ultimos/1?formato=json', { timeout: 8000 }),
      axios.get('https://api.bcb.gov.br/dados/serie/bcdata.sgs.432/dados/ultimos/1?formato=json', { timeout: 8000 }),
      axios.get('https://api.bcb.gov.br/dados/serie/bcdata.sgs.13522/dados/ultimos/1?formato=json', { timeout: 8000 }),
    ]);
    const cdi   = resCdi.status   === 'fulfilled' ? parseFloat(resCdi.value.data[0]?.valor   || 0) : taxasCache.cdi;
    const selic = resSelic.status === 'fulfilled' ? parseFloat(resSelic.value.data[0]?.valor || 0) : taxasCache.selic;
    const ipca  = resIpca.status  === 'fulfilled' ? parseFloat(resIpca.value.data[0]?.valor  || 0) : taxasCache.ipca;
    taxasCache  = { cdi, selic, ipca, timestamp: agora };
  } catch(e) { console.error('[taxas BCB]', e.message); }
  return taxasCache;
}

// ─── Cálculo de rendimento ─────────────────────────────────────────────────
function calcularRendimento(item, taxas) {
  const { valor_investido, taxa, indexador, data_inicio, data_vencimento, isento_ir } = item;
  const inicio     = new Date(data_inicio);
  const hoje       = new Date();
  const vencimento = new Date(data_vencimento);
  const diasCorridos  = Math.max(0, Math.floor((hoje - inicio) / 86400000));
  const diasTotais    = Math.max(1, Math.floor((vencimento - inicio) / 86400000));
  const progressoPct  = Math.min(100, (diasCorridos / diasTotais) * 100);

  // Taxa anual efetiva
  let taxaAnual = 0;
  const t = parseFloat(taxa);
  switch (indexador) {
    case 'Prefixado': taxaAnual = t; break;
    case 'CDI':       taxaAnual = (t / 100) * taxas.cdi;  break;
    case 'Selic':     taxaAnual = (t / 100) * taxas.selic; break;
    case 'IPCA':      taxaAnual = taxas.ipca + t; break;
    default:          taxaAnual = t;
  }

  // Valor atual bruto via juros compostos diários (base 252 dias úteis)
  const fator       = Math.pow(1 + taxaAnual / 100, diasCorridos / 252);
  const valorBruto  = parseFloat(valor_investido) * fator;
  const rendBruto   = valorBruto - parseFloat(valor_investido);

  // IR regressivo (apenas se não isento)
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

  // Dias para vencer
  const diasParaVencer = Math.max(0, Math.floor((vencimento - hoje) / 86400000));
  let alertaVencimento = null;
  if (diasParaVencer <= 30)       alertaVencimento = 'critico';
  else if (diasParaVencer <= 90)  alertaVencimento = 'atencao';
  else if (diasParaVencer <= 180) alertaVencimento = 'info';

  return {
    taxaAnual:      parseFloat(taxaAnual.toFixed(4)),
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
    const taxas = await buscarTaxasBancoCentral();
    res.json(taxas);
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar taxas.' });
  }
});

// ─── GET /api/renda-fixa ──────────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const [result, taxas] = await Promise.all([
      pool.query('SELECT * FROM renda_fixa WHERE usuario_id=$1 ORDER BY data_vencimento ASC', [req.userId]),
      buscarTaxasBancoCentral(),
    ]);
    const itens = result.rows.map(item => ({
      ...item,
      ...calcularRendimento(item, taxas),
    }));
    res.json({ itens, taxas });
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
    const taxas = await buscarTaxasBancoCentral();
    res.status(201).json({ ...result.rows[0], ...calcularRendimento(result.rows[0], taxas) });
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
    const taxas = await buscarTaxasBancoCentral();
    res.json({ ...result.rows[0], ...calcularRendimento(result.rows[0], taxas) });
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

// ─── POST /api/renda-fixa/:id/vender ─────────────────────────────────────
// Registra venda parcial ou total. Se total, remove o registro.
// Body: { valor_venda, data_venda }
router.post('/:id/vender', async (req, res) => {
  const { valor_venda, data_venda } = req.body;
  if (!valor_venda) return res.status(400).json({ error: 'valor_venda obrigatório.' });
  try {
    const inv = await pool.query(
      'SELECT * FROM renda_fixa WHERE id=$1 AND usuario_id=$2', [req.params.id, req.userId]
    );
    if (!inv.rows.length) return res.status(404).json({ error: 'Investimento não encontrado.' });
    const item = inv.rows[0];
    const novoValor = parseFloat(item.valor_investido) - parseFloat(valor_venda);
    if (novoValor <= 0.01) {
      // Venda total: remove o registro
      await pool.query('DELETE FROM renda_fixa WHERE id=$1 AND usuario_id=$2', [req.params.id, req.userId]);
      res.json({ vendido: true, message: 'Investimento encerrado (venda total).' });
    } else {
      // Venda parcial: atualiza o valor investido
      const result = await pool.query(
        'UPDATE renda_fixa SET valor_investido=$1, updated_at=NOW() WHERE id=$2 AND usuario_id=$3 RETURNING *',
        [novoValor.toFixed(2), req.params.id, req.userId]
      );
      const taxas = await buscarTaxasBancoCentral();
      res.json({ vendido: false, ...result.rows[0], ...calcularRendimento(result.rows[0], taxas) });
    }
  } catch (err) {
    console.error('[renda-fixa vender]', err);
    res.status(500).json({ error: 'Erro ao registrar venda.' });
  }
});

module.exports = router;
