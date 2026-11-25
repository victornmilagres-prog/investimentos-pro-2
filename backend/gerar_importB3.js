/**
 * Regenera backend/src/migrations/importB3.js a partir do xlsx B3.
 * Corrige: classificação de units (KLBN11/SAPR11), nome, PM das compras.
 */
const path = require('path');
const XLSX = require(path.resolve(__dirname, '../frontend/node_modules/xlsx'));
const fs   = require('fs');

const FILE  = 'C:/Users/vmila/Downloads/movimentacao-2026-11-24-16-47-33.xlsx';
const CORTE = new Date(2026, 8, 30); // 30/09/2026
const EMAIL = 'victornmilagres@gmail.com';
const OUT   = path.join(__dirname, 'src/migrations/importB3.js');

// Tickers que terminam em 11/12 MAS são ações (units), NÃO fundos imobiliários
const ACOES_UNITS = new Set([
  'KLBN11','SAPR11','TAEE11','ALUP11','CGAS5','TRPL4',
  'TIET11','TIET3','TIET4','CESP6','CLSC4','EGIE3',
]);

function parseDateBR(s) {
  const [d, m, a] = String(s).split('/');
  return new Date(Number(a), Number(m) - 1, Number(d));
}
function toISODate(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-01`;
}
function toFullISODate(d) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}
function extractTicker(produto) {
  const m = String(produto).match(/^([A-Z]{4}\d{1,2}[A-Z]?)/);
  return m ? m[1] : null;
}
function extractNome(produto) {
  const s = String(produto).trim();
  const m1 = s.match(/^[A-Z]{4}\d{1,2}[A-Z]?\s*[-–]\s*(.+)$/);
  if (m1) return m1[1].trim().slice(0, 199);
  const m2 = s.match(/^[A-Z]{4}\d{1,2}[A-Z]?\s{2,}(.+)$/);
  if (m2) return m2[1].trim().slice(0, 199);
  return '';
}
function isFII(ticker) {
  if (ACOES_UNITS.has(ticker)) return false;
  return /\d{2}$/.test(ticker);
}
function esc(s) { return String(s).replace(/\\/g,'\\\\').replace(/'/g,"\\'"); }

// ─── LER XLSX ─────────────────────────────────────────────────────────────────
const wb   = XLSX.readFile(FILE);
const rows = XLSX.utils.sheet_to_json(wb.Sheets['Movimentação'], { defval: '' });
console.log('Total linhas:', rows.length);

// Inspecionar colunas disponíveis
if (rows.length) {
  console.log('Colunas:', Object.keys(rows[0]).join(' | '));
  console.log('Exemplo Produto:', rows.find(r => r['Produto'])?.['Produto']);
}

// ─── PM E NOME: a partir das COMPRAS ──────────────────────────────────────────
const pmAcum      = {};  // ticker -> { total, qtd }
const nomePorTick = {};

const compras = rows.filter(r =>
  r['Entrada/Saída'] === 'Credito' &&
  r['Movimentação']  === 'Transferência - Liquidação' &&
  Number(r['Valor da Operação']) > 0
);
console.log('Compras encontradas:', compras.length);

for (const c of compras) {
  const ticker = extractTicker(c['Produto']);
  if (!ticker) continue;
  const nome = extractNome(c['Produto']);
  if (nome && !nomePorTick[ticker]) nomePorTick[ticker] = nome;
  const pUnit = Number(c['Preço unitário']) || 0;
  const qtd   = Number(c['Quantidade'])    || 0;
  if (!pmAcum[ticker]) pmAcum[ticker] = { total: 0, qtd: 0 };
  pmAcum[ticker].total += pUnit * qtd;
  pmAcum[ticker].qtd   += qtd;
}

// Também extrai nomes das vendas e proventos
for (const r of rows) {
  const ticker = extractTicker(r['Produto']);
  if (!ticker || nomePorTick[ticker]) continue;
  const nome = extractNome(r['Produto']);
  if (nome) nomePorTick[ticker] = nome;
}

const getPM = t => {
  const a = pmAcum[t];
  if (!a || a.qtd === 0) return 0;
  return Math.round(a.total / a.qtd * 10000) / 10000;
};

// ─── VENDAS ───────────────────────────────────────────────────────────────────
const vendas = rows.filter(r =>
  r['Entrada/Saída'] === 'Debito' &&
  r['Movimentação']  === 'Transferência - Liquidação' &&
  Number(r['Valor da Operação']) > 0
);

const ultimaVenda = {};
for (const v of vendas) {
  const ticker = extractTicker(v['Produto']);
  if (!ticker) continue;
  const dt = parseDateBR(v['Data']);
  if (!ultimaVenda[ticker] || dt > ultimaVenda[ticker].dt)
    ultimaVenda[ticker] = { dt, v };
}

const tickersVendidosAcoes = new Set();
const tickersVendidosFiis  = new Set();
const VENDAS = [];

for (const [ticker, { dt, v }] of Object.entries(ultimaVenda)) {
  const fii  = isFII(ticker);
  const tb   = fii ? 'fiis_carteira' : 'acoes_carteira';
  const dv   = toFullISODate(dt);
  const pv   = Number(v['Preço unitário']);
  const qtd  = Number(v['Quantidade']);
  const pm   = getPM(ticker);
  const nome = nomePorTick[ticker] || '';
  if (fii) tickersVendidosFiis.add(ticker);
  else      tickersVendidosAcoes.add(ticker);
  VENDAS.push({ tb, t: ticker, qtd, pm, pv, dv, nome });
}
console.log('Vendas únicas:', VENDAS.length);

// ─── PROVENTOS ────────────────────────────────────────────────────────────────
const TIPOS_PROV = ['Rendimento','Dividendo','Juros Sobre Capital Próprio'];
const proventos  = rows.filter(r => {
  if (r['Entrada/Saída'] !== 'Credito') return false;
  if (!TIPOS_PROV.some(t => r['Movimentação'].includes(t))) return false;
  if (!r['Data'] || Number(r['Valor da Operação']) <= 0) return false;
  return parseDateBR(r['Data']) <= CORTE;
});

const PROVENTOS = [];
const vistos    = new Set();

for (const p of proventos) {
  const ticker = extractTicker(p['Produto']);
  if (!ticker) continue;
  const fii = isFII(ticker);
  if (fii  && !tickersVendidosFiis.has(ticker))  continue;
  if (!fii && !tickersVendidosAcoes.has(ticker)) continue;

  const dt    = parseDateBR(p['Data']);
  const mr    = toISODate(dt);
  const dp    = toFullISODate(dt);
  const vpc   = Number(p['Preço unitário']) || 0;
  const qtd   = Number(p['Quantidade'])    || 1;
  const mov   = p['Movimentação'];
  const tipo  = mov.includes('Juros') ? 'JCP' : mov.includes('Dividendo') ? 'Dividendo' : 'Rendimento';
  const tb    = fii ? 'fiis_proventos' : 'acoes_proventos';
  const key   = `${tb}|${ticker}|${mr}`;
  if (vistos.has(key)) continue;
  vistos.add(key);
  PROVENTOS.push({ tb, t: ticker, tipo, mr, vpc, qtd, dp });
}
console.log('Proventos únicos:', PROVENTOS.length);

// ─── TOTAIS DE PROVENTOS POR TICKER (para alimentar dividendos_geral / dividendos_ano) ──
const totaisProv = {}; // ticker -> { tb_carteira, total }
for (const p of PROVENTOS) {
  const tbCart = p.tb === 'fiis_proventos' ? 'fiis_carteira' : 'acoes_carteira';
  if (!totaisProv[p.t]) totaisProv[p.t] = { tbCart, total: 0 };
  totaisProv[p.t].total = Math.round((totaisProv[p.t].total + p.vpc * p.qtd) * 100) / 100;
}
console.log('\n=== TOTAIS PROVENTOS POR TICKER ===');
for (const [t, v] of Object.entries(totaisProv))
  console.log(`  ${v.tbCart==='fiis_carteira'?'FII ':'AÇÃO'} ${t.padEnd(8)} total:R$${v.total}`);

// ─── SUMÁRIO ──────────────────────────────────────────────────────────────────
console.log('\n=== VENDAS ===');
for (const v of VENDAS)
  console.log(`  ${v.tb==='fiis_carteira'?'FII ':'AÇÃO'} ${v.t.padEnd(8)} qtd:${String(v.qtd).padStart(4)} PM:${String(v.pm).padStart(8)} pv:${String(v.pv).padStart(8)} dv:${v.dv}  nome:${v.nome}`);

console.log('\n=== PROVENTOS (primeiros 20) ===');
for (const p of PROVENTOS.slice(0,20))
  console.log(`  ${p.tb.includes('fiis')?'FII ':'AÇÃO'} ${p.t.padEnd(8)} ${p.mr} tipo:${p.tipo.padEnd(10)} vpc:${p.vpc} qtd:${p.qtd}`);

// ─── GERAR importB3.js ────────────────────────────────────────────────────────
const vendasJS    = JSON.stringify(VENDAS,    null, 2);
const proventosJS = JSON.stringify(PROVENTOS, null, 2);
const totaisJS    = JSON.stringify(totaisProv, null, 2);

const content = `// ONE-TIME B3 IMPORT — gerado por gerar_importB3.js
const pool = require("../config/database");
const EMAIL = "${EMAIL}";

const VENDAS = ${vendasJS};

const PROVENTOS = ${proventosJS};

// Total de proventos por ticker: { ticker -> { tbCart, total } }
const TOTAIS = ${totaisJS};

async function importB3() {
  try {
    // Garantir tabelas de proventos
    await pool.query(\`CREATE TABLE IF NOT EXISTS fiis_proventos(id SERIAL PRIMARY KEY,usuario_id INTEGER NOT NULL,ticker VARCHAR(20) NOT NULL,tipo VARCHAR(20) NOT NULL DEFAULT 'Rendimento',mes_referencia DATE NOT NULL,valor_por_cota NUMERIC(10,4) NOT NULL,quantidade INTEGER NOT NULL,total NUMERIC(12,2) GENERATED ALWAYS AS (valor_por_cota*quantidade) STORED,data_pagamento DATE,created_at TIMESTAMP DEFAULT NOW())\`);
    await pool.query(\`CREATE TABLE IF NOT EXISTS acoes_proventos(id SERIAL PRIMARY KEY,usuario_id INTEGER NOT NULL,ticker VARCHAR(20) NOT NULL,tipo VARCHAR(20) NOT NULL DEFAULT 'Dividendo',mes_referencia DATE NOT NULL,valor_por_cota NUMERIC(10,4) NOT NULL,quantidade INTEGER NOT NULL,total NUMERIC(12,2) GENERATED ALWAYS AS (valor_por_cota*quantidade) STORED,data_pagamento DATE,created_at TIMESTAMP DEFAULT NOW())\`);
    // Garantir colunas nas carteiras
    await pool.query(\`ALTER TABLE acoes_carteira ADD COLUMN IF NOT EXISTS vendido BOOLEAN DEFAULT FALSE\`);
    await pool.query(\`ALTER TABLE acoes_carteira ADD COLUMN IF NOT EXISTS preco_venda NUMERIC(10,4) DEFAULT 0\`);
    await pool.query(\`ALTER TABLE acoes_carteira ADD COLUMN IF NOT EXISTS data_venda DATE\`);
    await pool.query(\`ALTER TABLE fiis_carteira ADD COLUMN IF NOT EXISTS vendido BOOLEAN DEFAULT FALSE\`);
    await pool.query(\`ALTER TABLE fiis_carteira ADD COLUMN IF NOT EXISTS preco_venda NUMERIC(10,4) DEFAULT 0\`);
    await pool.query(\`ALTER TABLE fiis_carteira ADD COLUMN IF NOT EXISTS data_venda DATE\`);
    // Corrigir registros inseridos com coluna errada (vendida->vendido)
    await pool.query(\`UPDATE acoes_carteira SET vendido=TRUE WHERE vendida IS TRUE AND (vendido IS NOT TRUE)\`).catch(()=>{});
    await pool.query(\`UPDATE fiis_carteira SET vendido=TRUE WHERE vendida IS TRUE AND (vendido IS NOT TRUE)\`).catch(()=>{});
    // Mover KLBN11 e SAPR11 de fiis_carteira para acoes_carteira (eram units, não FIIs)
    for (const unit of ['KLBN11','SAPR11']) {
      await pool.query(\`DELETE FROM fiis_carteira WHERE usuario_id=(SELECT id FROM usuarios WHERE email=$1) AND ticker=$2 AND vendido=TRUE\`,[EMAIL,unit]).catch(()=>{});
      await pool.query(\`DELETE FROM fiis_proventos WHERE usuario_id=(SELECT id FROM usuarios WHERE email=$1) AND ticker=$2\`,[EMAIL,unit]).catch(()=>{});
    }
  } catch(e) { console.error('[importB3 tables]', e.message); }

  let ok = 0, er = 0;

  for (const v of VENDAS) {
    try {
      const nomeCol = v.tb === 'fiis_carteira' ? 'nome_fundo' : 'nome_empresa';
      await pool.query(
        "INSERT INTO "+v.tb+" (usuario_id,ticker,quantidade,preco_compra,vendido,preco_venda,data_venda,peso_base,peso_sugerido,"+nomeCol+") "+
        "SELECT id,$2::VARCHAR,$3,$4,true,$5,$6,0,0,$7 FROM usuarios WHERE email=$1 "+
        "AND NOT EXISTS (SELECT 1 FROM "+v.tb+" WHERE usuario_id=(SELECT id FROM usuarios WHERE email=$1) AND ticker=$2::VARCHAR)",
        [EMAIL, v.t, v.qtd, v.pm, v.pv, v.dv, v.nome]
      );
      // UPDATE campos faltantes para registros pré-existentes
      const nc = v.tb==='fiis_carteira'?'nome_fundo':'nome_empresa';
      await pool.query(
        "UPDATE "+v.tb+" SET "+
        "preco_compra=CASE WHEN preco_compra=0 OR preco_compra IS NULL THEN $3 ELSE preco_compra END, "+
        "quantidade=CASE WHEN quantidade=0 OR quantidade IS NULL THEN $4 ELSE quantidade END, "+
        "preco_venda=CASE WHEN preco_venda=0 OR preco_venda IS NULL THEN $5 ELSE preco_venda END, "+
        "data_venda=CASE WHEN data_venda IS NULL THEN $6::DATE ELSE data_venda END, "+
        nc+"=CASE WHEN ("+nc+" IS NULL OR "+nc+"='') THEN $7 ELSE "+nc+" END "+
        "WHERE usuario_id=(SELECT id FROM usuarios WHERE email=$1) AND ticker=$2::VARCHAR AND vendido=TRUE",
        [EMAIL, v.t, v.pm, v.qtd, v.pv, v.dv, v.nome]
      );
      ok++;
    } catch(e) { er++; console.error('[importB3 venda]', v.t, e.message); }
  }

  for (const p of PROVENTOS) {
    try {
      await pool.query(
        "INSERT INTO "+p.tb+" (usuario_id,ticker,tipo,mes_referencia,valor_por_cota,quantidade,data_pagamento) "+
        "SELECT id,$2::VARCHAR,$3,$4::DATE,$5,$6,$7 FROM usuarios WHERE email=$1 "+
        "AND NOT EXISTS (SELECT 1 FROM "+p.tb+" WHERE usuario_id=(SELECT id FROM usuarios WHERE email=$1) AND ticker=$2::VARCHAR AND mes_referencia=$4::DATE)",
        [EMAIL, p.t, p.tipo, p.mr, p.vpc, p.qtd, p.dp]
      );
      ok++;
    } catch(e) { er++; console.error('[importB3 prov]', p.t, e.message); }
  }

  // Atualizar dividendos_geral (FIIs) e dividendos_ano (ações) nas carteiras vendidas (sempre, sem condição de valor atual)
  for (const [ticker, { tbCart, total }] of Object.entries(TOTAIS)) {
    try {
      const divCol = tbCart === 'fiis_carteira' ? 'dividendos_geral' : 'dividendos_ano';
      const r = await pool.query(
        "UPDATE "+tbCart+" SET "+divCol+"=$3 "+
        "WHERE usuario_id=(SELECT id FROM usuarios WHERE email=$1) AND ticker=$2::VARCHAR",
        [EMAIL, ticker, total]
      );
      console.log('[importB3 div]', ticker, divCol+'='+total, '| rows:', r.rowCount);
      ok++;
    } catch(e) { er++; console.error('[importB3 div ERR]', ticker, e.message); }
  }

  console.log('[importB3] Done:', ok, 'ok,', er, 'erros');
}

module.exports = importB3;
`;

fs.writeFileSync(OUT, content, 'utf8');
console.log('\nArquivo gerado:', OUT);
console.log('Vendas:', VENDAS.length, '| Proventos:', PROVENTOS.length);
