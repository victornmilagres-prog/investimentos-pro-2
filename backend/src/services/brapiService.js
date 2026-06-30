const axios = require('axios');

const BRAPI_BASE = process.env.BRAPI_BASE_URL || 'https://brapi.dev/api';
const TOKEN = process.env.BRAPI_TOKEN;
const MODULES = 'summaryProfile,defaultKeyStatistics,financialData,balanceSheetHistory,incomeStatementHistory';

function numero(value) {
  if (value === null || value === undefined || value === '') return 0;
  if (typeof value === 'number') return isNaN(value) ? 0 : value;
  let s = String(value).replace('R$', '').replace('%', '').replace(/\s/g, '');
  if (s.includes(',') && s.includes('.')) s = s.replace(/\./g, '').replace(',', '.');
  else if (s.includes(',')) s = s.replace(',', '.');
  const n = Number(s);
  return isNaN(n) ? 0 : n;
}

function percentual(value) {
  const n = numero(value);
  if (n === 0) return 0;
  return Math.abs(n) <= 1 ? n * 100 : n;
}

function primeiroNumero(values) {
  for (const v of values) {
    const n = numero(v);
    if (n !== 0) return n;
  }
  return 0;
}

function buscar(obj, chaves) {
  if (!obj || typeof obj !== 'object') return 0;
  for (const chave of chaves) {
    for (const key of Object.keys(obj)) {
      if (key.toLowerCase() === chave.toLowerCase()) {
        const n = numero(obj[key]);
        if (n !== 0) return n;
      }
    }
  }
  for (const key of Object.keys(obj)) {
    if (obj[key] && typeof obj[key] === 'object' && !Array.isArray(obj[key])) {
      const resultado = buscar(obj[key], chaves);
      if (resultado !== 0) return resultado;
    }
  }
  return 0;
}

function calcularPrecoGraham(preco, pl, pvp) {
  if (!(preco > 0 && pl > 0 && pvp > 0)) return 0;
  const lpa = preco / pl;
  const vpa = preco / pvp;
  if (!(lpa > 0 && vpa > 0)) return 0;
  return Math.sqrt(22.5 * lpa * vpa);
}

function classificarGraham(precoAtual, precoGraham) {
  if (!(precoGraham > 0)) return 'SEM DADO';
  const margem = ((precoGraham - precoAtual) / precoGraham) * 100;
  if (margem >= 20) return 'DESCONTADO';
  if (margem >= 0) return 'JUSTO';
  return 'CARO';
}

// DY: >= 6 (era > 6). 6% exato agora aprova.
// Div/EBIT:
//   - divida === 0  → SEM DADO (API não retornou) → maxScore = 5, não pontua
//   - divida > 0 && < 2 → aprovado
//   - divida >= 2  → reprovado, maxScore continua 6
function scoreAcao(pl, pvp, margem, roe, divida, dy, ticker) {
  const bancos = ['BBAS3','ITUB4','ITSA4','BBDC4','SANB11','BPAC11','ITUB3','BBDC3'];
  let score = 0;
  let maxScore = 6;

  if (pl > 0 && pl < 15) score++;
  if (pvp > 0 && pvp < 1.5) score++;
  if (margem > 10) score++;
  if (roe > 10) score++;

  if (bancos.includes(ticker)) {
    score++;
  } else if (divida > 0 && divida < 2) {
    score++;
  } else if (divida === 0) {
    maxScore = 5;
  }

  if (dy >= 6) score++;

  return { score, maxScore };
}

function classificarAcao(score) {
  if (score >= 5) return 'EXCELENTE';
  if (score === 4) return 'BOM';
  if (score === 3) return 'ATENÇÃO';
  return 'RISCO';
}

function decisaoAcao(score) {
  if (score >= 5) return 'COMPRAR/ACUMULAR';
  if (score === 4) return 'MANTER';
  if (score === 3) return 'ACOMPANHAR';
  return 'EVITAR/REVER';
}

function observacaoAcao(pl, pvp, margem, roe, divida, dy) {
  const obs = [];
  if (!(pl > 0 && pl < 15)) obs.push('P/L fora ideal');
  if (!(pvp > 0 && pvp < 1.5)) obs.push('P/VP fora ideal');
  if (!(margem > 10)) obs.push('Margem baixa');
  if (!(roe > 10)) obs.push('ROE baixo');
  if (!(divida > 0 && divida < 2)) obs.push('Dívida alta');
  if (!(dy >= 6)) obs.push('DY baixo');
  return obs.length ? obs.join('; ') : 'Todos os critérios aprovados';
}

function scoreFII(dyMensal, pvp, volume, patrimonio) {
  let score = 0;
  if (dyMensal > 1) score++;
  if (pvp > 0 && pvp < 1.05) score++;
  if (volume > 1000000) score++;
  if (patrimonio > 1000000000) score++;
  return score;
}

function classificarFII(score) {
  if (score >= 4) return 'EXCELENTE';
  if (score === 3) return 'BOM';
  if (score === 2) return 'ATENÇÃO';
  return 'RISCO';
}

function decisaoFII(score) {
  if (score >= 4) return 'COMPRAR/ACUMULAR';
  if (score === 3) return 'MANTER';
  if (score === 2) return 'ACOMPANHAR';
  return 'EVITAR/REVER';
}

function observacaoFII(dyMensal, pvp, volume, patrimonio) {
  const obs = [];
  if (!(dyMensal > 1)) obs.push('DY abaixo');
  if (!(pvp > 0 && pvp < 1.05)) obs.push('P/VP fora ideal');
  if (!(volume > 1000000)) obs.push('Liquidez baixa');
  if (!(patrimonio > 1000000000)) obs.push('Patrimônio baixo');
  return obs.length ? obs.join('; ') : 'Todos os critérios aprovados';
}

async function buscarAcao(ticker, dividaManual = null) {
  ticker = ticker.trim().toUpperCase();
  const url = `${BRAPI_BASE}/quote/${ticker}?fundamental=true&dividends=true&modules=${encodeURIComponent(MODULES)}&token=${TOKEN}`;
  const response = await axios.get(url, { timeout: 15000 });
  const data = response.data;

  if (!data.results || !data.results.length) {
    throw new Error(`Ação ${ticker} não encontrada na Brapi.`);
  }

  const item = data.results[0];
  const preco = primeiroNumero([item.regularMarketPrice, item.currentPrice]);

  const pl = primeiroNumero([
    item.priceEarnings, item.trailingPE,
    buscar(item, ['priceEarnings','trailingPE','preco/lucro']),
    item['preço/lucro'],
    (item['lucro por ação'] && preco) ? preco / numero(item['lucro por ação']) : 0
  ]);

  const pvp = primeiroNumero([
    item.priceToBook,
    buscar(item, ['priceToBook','pvp','p/vp']),
    (item.bookValue && preco) ? preco / numero(item.bookValue) : 0
  ]);

  const margem = percentual(primeiroNumero([
    item.profitMargins,
    buscar(item, ['profitMargins','grossMargins','operatingMargins','margemLiquida'])
  ]));

  const roe = percentual(primeiroNumero([
    item.returnOnEquity,
    buscar(item, ['returnOnEquity','retorno sobre patrimônio líquido','retorno sobre patrimonio liquido','roe'])
  ]));

  const dy = percentual(primeiroNumero([
    item.dividendYield, item.trailingAnnualDividendYield,
    buscar(item, ['dividendYield','dy'])
  ]));

  const totalDebt = buscar(item, ['totalDebt','dívida total','total debt','totaldebt']);
  const ebitda = buscar(item, ['ebitda','EBITDA']);
  const dividaCalculada = (totalDebt > 0 && ebitda > 0) ? totalDebt / ebitda : 0;
  const divida = (dividaManual !== null && dividaManual !== '') ? Number(dividaManual) : dividaCalculada;

  const precoGraham = calcularPrecoGraham(preco, pl, pvp);
  const statusGraham = classificarGraham(preco, precoGraham);
  const { score, maxScore } = scoreAcao(pl, pvp, margem, roe, divida, dy, ticker);

  console.log(`[${ticker}] pl=${pl} pvp=${pvp} margem=${margem} roe=${roe} dy=${dy} divida=${divida} score=${score}/${maxScore}`);

  const variacaoDia = numero(item.regularMarketChangePercent);
  const variacaoDiaReais = numero(item.regularMarketChange);
  const precoAbertura = numero(item.regularMarketOpen);
  const precoMinimo = numero(item.regularMarketDayLow);
  const precoMaximo = numero(item.regularMarketDayHigh);

  return {
    ticker, preco,
    precoGraham: parseFloat(precoGraham.toFixed(2)),
    statusGraham,
    pl: parseFloat(pl.toFixed(4)),
    pvp: parseFloat(pvp.toFixed(4)),
    margemLiquida: parseFloat(margem.toFixed(4)),
    roe: parseFloat(roe.toFixed(4)),
    dividaEbit: divida,
    dy: parseFloat(dy.toFixed(4)),
    variacaoDia: parseFloat(variacaoDia.toFixed(4)),
    variacaoDiaReais: parseFloat(variacaoDiaReais.toFixed(4)),
    precoAbertura: parseFloat(precoAbertura.toFixed(4)),
    precoMinimo: parseFloat(precoMinimo.toFixed(4)),
    precoMaximo: parseFloat(precoMaximo.toFixed(4)),
    score: `${score}/${maxScore}`,
    scoreNum: score,
    maxScore,
    classificacao: classificarAcao(score),
    decisao: decisaoAcao(score),
    observacoes: observacaoAcao(pl, pvp, margem, roe, divida, dy),
    ultimaAtualizacao: new Date(),
    fonte: 'brapi.dev Pro'
  };
}

// ─── Fundamentus fallback (cache 1h) — cobre ~560 FIIs ───────────────────
let fundamentusCache = { data: null, timestamp: 0 };

async function buscarFundamentus() {
  const agora = Date.now();
  if (fundamentusCache.data && agora - fundamentusCache.timestamp < 3600000) return fundamentusCache.data;
  const res = await axios.get('https://www.fundamentus.com.br/fii_resultado.php', {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36', 'Accept-Language': 'pt-BR,pt;q=0.9' },
    responseType: 'arraybuffer',
    timeout: 15000
  });
  // HTML em latin-1
  const html = Buffer.from(res.data).toString('latin1');
  const rows = html.match(/<tr[^>]*>[\s\S]*?<\/tr>/gi) || [];
  const mapa = {};
  for (const row of rows) {
    const cells = (row.match(/<td[^>]*>([\s\S]*?)<\/td>/gi) || [])
      .map(c => c.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, '').trim());
    if (cells.length < 8) continue;
    const ticker = cells[0].toUpperCase();
    if (!/^[A-Z]{4}11B?$/.test(ticker)) continue;
    const parseNumBR = s => { const n = parseFloat(String(s).replace(/\./g,'').replace(',','.')); return isNaN(n) ? 0 : n; };
    const parsePct  = s => parseNumBR(String(s).replace('%',''));
    mapa[ticker] = {
      preco:            parseNumBR(cells[2]),
      dyAnual:          parsePct(cells[4]),
      pvp:              parseNumBR(cells[5]),
      patrimonioLiquido: parseNumBR(cells[6]),
      volumeFinanceiro: parseNumBR(cells[7]),
    };
  }
  fundamentusCache = { data: mapa, timestamp: agora };
  return mapa;
}

async function buscarFIIFundamentus(ticker) {
  const mapa = await buscarFundamentus();
  return mapa[ticker.toUpperCase()] || null;
}

async function buscarFII(ticker, ajustes = {}) {
  ticker = ticker.trim().toUpperCase();

  const urlQuote = `${BRAPI_BASE}/quote/${ticker}?fundamental=true&dividends=true&modules=${encodeURIComponent(MODULES)}&token=${TOKEN}`;
  const resQuote = await axios.get(urlQuote, { timeout: 15000 });
  const quote = resQuote.data?.results?.[0] || {};

  let fiiBrapi = {};
  try {
    const urlInd = `${BRAPI_BASE}/v2/fii/indicators?symbols=${ticker}&token=${TOKEN}`;
    const resInd = await axios.get(urlInd, { timeout: 15000 });
    fiiBrapi = resInd.data?.fiis?.[0] || {};
    console.log(`[FII ${ticker}] indicators: equity=${fiiBrapi.equity} pvp=${fiiBrapi.priceToNav} dy12m=${fiiBrapi.dividendYield12m} dy1m=${fiiBrapi.dividendYield1m}`);
  } catch(e) {
    console.log(`[FII ${ticker}] Erro indicators:`, e.message);
    try {
      for (let page = 1; page <= 4; page++) {
        const urlFii = `${BRAPI_BASE}/v2/fii/list?limit=500&page=${page}&token=${TOKEN}`;
        const resFii = await axios.get(urlFii, { timeout: 15000 });
        const found = resFii.data?.fiis?.find(f => f.symbol === ticker);
        if (found) { fiiBrapi = found; break; }
        if (!resFii.data?.pagination?.hasNextPage) break;
      }
    } catch(e2) {}
  }

  let preco = primeiroNumero([fiiBrapi.price, quote.regularMarketPrice, quote.currentPrice]);

  let dyAnual = percentual(primeiroNumero([
    fiiBrapi.dividendYield12m,
    quote.dividendYield,
    quote.trailingAnnualDividendYield,
    buscar(quote, ['dividendYield','dy'])
  ]));

  // monthlyReturn é retorno de preço, não DY — não usar
  let dyMensal = percentual(fiiBrapi.dividendYield1m || 0);
  if (dyMensal === 0 && dyAnual > 0) dyMensal = dyAnual / 12;

  let pvp = primeiroNumero([
    fiiBrapi.priceToNav,
    quote.priceToBook,
    buscar(quote, ['priceToBook','pvp','p/vp'])
  ]);

  const volumeCotas = primeiroNumero([quote.regularMarketVolume, quote.volume]);
  let volume = (preco > 0 && volumeCotas > 0) ? preco * volumeCotas : 0;

  let patrimonio = primeiroNumero([
    fiiBrapi.equity,
    fiiBrapi.totalAssets,
    buscar(quote, ['netAssets','equity','netWorth','totalAssets'])
  ]);

  // Fallback Status Invest quando Brapi não tem pvp/dy
  if (pvp === 0 && dyAnual === 0) {
    try {
      const si = await buscarFIIFundamentus(ticker);
      if (si) {
        if (pvp === 0) pvp = si.pvp;
        if (dyAnual === 0) dyAnual = si.dyAnual;
        if (patrimonio === 0) patrimonio = si.patrimonioLiquido;
        if (volume === 0) volume = si.volumeFinanceiro;
        if (preco === 0) preco = si.preco;
        console.log(`[FII ${ticker}] fallback SI: dy=${dyAnual} pvp=${pvp}`);
      }
    } catch(e) { console.log(`[FII ${ticker}] SI fallback erro:`, e.message); }
  }

  if (ajustes.dyMensal) dyMensal = numero(ajustes.dyMensal);
  if (ajustes.dyAnual) dyAnual = numero(ajustes.dyAnual);
  if (ajustes.pvp) pvp = numero(ajustes.pvp);
  if (ajustes.volumeFinanceiroDia) volume = numero(ajustes.volumeFinanceiroDia);
  if (ajustes.patrimonioLiquido) patrimonio = numero(ajustes.patrimonioLiquido);

  // Recalcula dyMensal com dyAnual possivelmente atualizado pelo fallback
  if (dyMensal === 0 && dyAnual > 0) dyMensal = dyAnual / 12;

  const score = scoreFII(dyMensal, pvp, volume, patrimonio);
  console.log(`[FII ${ticker}] dy=${dyMensal} pvp=${pvp} vol=${volume} pat=${patrimonio} score=${score}`);

  const variacaoDia = numero(quote.regularMarketChangePercent);
  const variacaoDiaReais = numero(quote.regularMarketChange);
  const precoAbertura = numero(quote.regularMarketOpen);
  const precoMinimo = numero(quote.regularMarketDayLow);
  const precoMaximo = numero(quote.regularMarketDayHigh);

  return {
    ticker, preco,
    dyMensal: parseFloat(dyMensal.toFixed(4)),
    dyAnual: parseFloat(dyAnual.toFixed(4)),
    pvp: parseFloat(pvp.toFixed(4)),
    volumeFinanceiro: parseFloat(volume.toFixed(2)),
    patrimonioLiquido: parseFloat(patrimonio.toFixed(2)),
    variacaoDia: parseFloat(variacaoDia.toFixed(4)),
    variacaoDiaReais: parseFloat(variacaoDiaReais.toFixed(4)),
    precoAbertura: parseFloat(precoAbertura.toFixed(4)),
    precoMinimo: parseFloat(precoMinimo.toFixed(4)),
    precoMaximo: parseFloat(precoMaximo.toFixed(4)),
    score: `${score}/4`,
    scoreNum: score,
    classificacao: classificarFII(score),
    decisao: decisaoFII(score),
    observacoes: observacaoFII(dyMensal, pvp, volume, patrimonio),
    ultimaAtualizacao: new Date(),
    fonte: 'brapi.dev Pro'
  };
}

function calcularPesos(ativos) {
  const pesoBase = (cl) => cl === 'EXCELENTE' ? 5 : cl === 'BOM' ? 3 : cl === 'ATENÇÃO' ? 1 : 0;
  const total = ativos.reduce((s, a) => s + pesoBase(a.classificacao), 0);
  return ativos.map(a => ({
    ...a,
    pesoBase: pesoBase(a.classificacao),
    pesoSugerido: total > 0 ? pesoBase(a.classificacao) / total : 0
  }));
}

module.exports = {
  buscarAcao, buscarFII, calcularPesos,
  scoreAcao, classificarAcao, decisaoAcao,
  scoreFII, classificarFII, decisaoFII
};
