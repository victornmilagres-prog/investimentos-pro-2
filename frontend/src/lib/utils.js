export const fmt = {
  brl: (v) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0),
  pct: (v, casas = 2) => `${Number(v || 0).toFixed(casas)}%`,
  num: (v, casas = 2) => Number(v || 0).toFixed(casas),
  data: (v) => v ? new Date(v).toLocaleDateString('pt-BR') : '-',
  dataHora: (v) => v ? new Date(v).toLocaleString('pt-BR') : '-',
  abrev: (v) => {
    const n = Number(v || 0);
    if (n >= 1e9) return `R$ ${(n / 1e9).toFixed(1)}B`;
    if (n >= 1e6) return `R$ ${(n / 1e6).toFixed(1)}M`;
    if (n >= 1e3) return `R$ ${(n / 1e3).toFixed(0)}K`;
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n);
  },
};

export function badgeClassificacao(classificacao) {
  const map = {
    'EXCELENTE': 'badge-excelente',
    'BOM':       'badge-bom',
    'ATENÇÃO':   'badge-atencao',
    'RISCO':     'badge-risco',
  };
  return `badge ${map[classificacao] || 'badge-atencao'}`;
}

export function badgeGraham(status) {
  const map = {
    'DESCONTADO': 'badge-descontado',
    'JUSTO':      'badge-justo',
    'CARO':       'badge-caro',
  };
  return `badge ${map[status] || ''}`;
}

export function classeDecisao(decisao) {
  if (!decisao) return '';
  if (decisao.includes('COMPRAR')) return 'decisao-comprar';
  if (decisao.includes('MANTER')) return 'decisao-manter';
  if (decisao.includes('ACOMPANHAR')) return 'decisao-acompanhar';
  return 'decisao-evitar';
}

export function calcPerformance(precoAtual, precoCompra, quantidade) {
  if (!precoAtual || !precoCompra || !quantidade) return { valorAtual: 0, custo: 0, ganho: 0, pct: 0 };
  const valorAtual = precoAtual * quantidade;
  const custo = precoCompra * quantidade;
  const ganho = valorAtual - custo;
  const pct = custo > 0 ? (ganho / custo) * 100 : 0;
  return { valorAtual, custo, ganho, pct };
}
