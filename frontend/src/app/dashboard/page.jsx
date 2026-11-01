'use client';
import { useState, useEffect } from 'react';
import { RefreshCw } from 'lucide-react';
import api from '@/lib/api';
import { fmt } from '@/lib/utils';

function badgeDecisao(d = '') {
  const v = (d || '').toUpperCase();
  if (v.includes('COMPRAR') || v.includes('ACUMULAR')) return 'badge-comprar';
  if (v.includes('MANTER'))  return 'badge-manter';
  if (v.includes('ACOMPANHAR') || v.includes('ATENÇÃO') || v.includes('ATENCAO')) return 'badge-atencao';
  return 'badge-risco';
}
function labelDecisao(d = '') {
  const v = (d || '').toUpperCase();
  if (v.includes('COMPRAR') || v.includes('ACUMULAR')) return 'Comprar';
  if (v.includes('MANTER'))  return 'Manter';
  if (v.includes('ACOMPANHAR') || v.includes('ATENÇÃO') || v.includes('ATENCAO')) return 'Atenção';
  return 'Risco';
}

function ScoreDots({ score = 0, max = 5, color = 'var(--accent)' }) {
  return (
    <div style={{ display: 'flex', gap: 3 }}>
      {Array.from({ length: max }).map((_, i) => (
        <div key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: i < score ? color : 'var(--border)' }} />
      ))}
    </div>
  );
}

const S = {
  card:    { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '18px 20px' },
  label:   { fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' },
  muted:   { fontSize: 11, color: 'var(--text-muted)' },
  divider: { height: 1, background: 'var(--border)', margin: '12px 0' },
  dot:     c => ({ width: 7, height: 7, borderRadius: '50%', background: c, flexShrink: 0 }),
  tag:     (bg, color) => ({ display: 'inline-block', padding: '1px 7px', borderRadius: 10, fontSize: 10, fontWeight: 700, background: bg, color }),
  tile:    (borderColor) => ({ padding: '8px 10px', borderRadius: 8, border: `1px solid ${borderColor || 'var(--border)'}`, background: 'var(--bg)' }),
};

const secTitle = (dotColor, text, extra) => (
  <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 8, ...extra }}>
    <span style={S.dot(dotColor)} />{text}
  </p>
);

export default function DashboardPage() {
  const [dados,       setDados]       = useState(null);
  const [acoes,       setAcoes]       = useState([]);
  const [fiis,        setFiis]        = useState([]);
  const [rf,          setRf]          = useState([]);
  const [taxas,       setTaxas]       = useState({});
  const [loading,     setLoading]     = useState(true);
  const [atualizando, setAtualizando] = useState(false);
  const [tabRenda,    setTabRenda]    = useState('ano');

  const carregar = async () => {
    try {
      const [dash, rfRes, acoesRes, fiisRes] = await Promise.all([
        api.get('/dashboard'),
        api.get('/renda-fixa').catch(() => ({ data: { itens: [], taxas: {} } })),
        api.get('/acoes').catch(() => ({ data: [] })),
        api.get('/fiis').catch(() => ({ data: [] })),
      ]);
      setDados(dash.data);
      setRf(Array.isArray(rfRes.data?.itens) ? rfRes.data.itens : []);
      setTaxas(rfRes.data?.taxas || {});
      setAcoes(Array.isArray(acoesRes.data)  ? acoesRes.data   : []);
      setFiis(Array.isArray(fiisRes.data)    ? fiisRes.data    : []);
    } catch { /* silencia */ }
    finally { setLoading(false); }
  };

  const atualizarTodos = async () => {
    setAtualizando(true);
    try {
      await Promise.all([api.post('/acoes/atualizar-todos'), api.post('/fiis/atualizar-todos')]);
      await carregar();
    } finally { setAtualizando(false); }
  };

  useEffect(() => {
    carregar();
    const iv = setInterval(() => {
      const t = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
      if (t.getDay() >= 1 && t.getDay() <= 5 && t.getHours() >= 10 && t.getHours() < 17) carregar();
    }, 15 * 60 * 1000);
    return () => clearInterval(iv);
  }, []);

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 260 }}>
      <div style={{ width: 32, height: 32, border: '3px solid var(--warning)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
    </div>
  );

  const { resumo = {}, rankingAcoes = [], rankingFIIs = [], oportunidades = [], riscos = [] } = dados || {};

  // ── RF aggregates ────────────────────────────────────────────────────────
  const rfTotalInv   = rf.reduce((s, r) => s + +r.valor_investido, 0);
  const rfTotalBruto = rf.reduce((s, r) => s + +(r.rendBruto    || 0), 0);
  const rfTotalLiq   = rf.reduce((s, r) => s + +(r.rendLiquido  || 0), 0);
  const rfTotalIR    = rf.reduce((s, r) => s + +(r.ir           || 0), 0);
  const rfLiqPct     = rfTotalInv > 0 ? (rfTotalLiq / rfTotalInv) * 100 : 0;

  // ── patrimônio ───────────────────────────────────────────────────────────
  const totalPatr   = resumo.patrimonioTotal     || 0;
  const patriAcoes  = resumo.patrimonioAcoes     || 0;
  const patriFIIs   = resumo.patrimonioFIIs      || 0;
  const patriRF     = resumo.patrimonioRendaFixa || 0;
  const ganhoAcoes  = resumo.ganhoAcoes          || 0;
  const ganhoFIIs   = resumo.ganhoFIIs           || 0;

  const custoAcoes  = patriAcoes - ganhoAcoes;
  const custoFIIs   = patriFIIs  - ganhoFIIs;
  const pctAcoes    = totalPatr > 0 ? (patriAcoes / totalPatr) * 100 : 0;
  const pctFIIs     = totalPatr > 0 ? (patriFIIs  / totalPatr) * 100 : 0;
  const pctRF       = totalPatr > 0 ? (patriRF    / totalPatr) * 100 : 0;
  const pctRetAcoes = custoAcoes > 0 ? (ganhoAcoes / custoAcoes) * 100 : 0;
  const pctRetFIIs  = custoFIIs  > 0 ? (ganhoFIIs  / custoFIIs)  * 100 : 0;

  const ganhoTotal  = ganhoAcoes + ganhoFIIs + rfTotalLiq;
  const custoTotal  = totalPatr - ganhoTotal;
  const pctTotal    = custoTotal > 0 ? (ganhoTotal / custoTotal) * 100 : 0;

  // ── score médio normalizado para /10 ─────────────────────────────────────
  const normScore = (a) => {
    const mx = Number(a.max_score || 5);
    return mx > 0 ? (Number(a.score || 0) / mx) * 10 : 0;
  };
  const todosAtivos  = [...rankingAcoes, ...rankingFIIs];
  const scoreMedio   = todosAtivos.length ? (todosAtivos.reduce((s, a) => s + normScore(a), 0) / todosAtivos.length).toFixed(1) : '—';
  const maxScoreAco  = rankingAcoes.length ? (rankingAcoes.reduce((s, a) => s + normScore(a), 0) / rankingAcoes.length).toFixed(1) : '—';
  const maxScoreFII  = rankingFIIs.length  ? (rankingFIIs.reduce((s,  f) => s + normScore(f), 0) / rankingFIIs.length).toFixed(1)  : '—';

  // ── RF vencimentos ordenados ──────────────────────────────────────────────
  const rfOrdenada = [...rf].sort((a, b) => new Date(a.data_vencimento) - new Date(b.data_vencimento));
  const rfAlertas  = rfOrdenada.filter(r => r.alertaVencimento);

  // ── movers (variação hoje) ────────────────────────────────────────────────
  const movers = [...rankingAcoes, ...rankingFIIs]
    .filter(a => a.variacao_dia != null)
    .sort((a, b) => Math.abs(b.variacao_dia) - Math.abs(a.variacao_dia))
    .slice(0, 5);

  // ── taxa RF média ─────────────────────────────────────────────────────────
  const rfTaxaMedia = rf.length > 0 ? (() => {
    const avgTaxa = rf.reduce((s, r) => s + Number(r.taxa || 0), 0) / rf.length;
    const mainIdx = rf[0]?.indexador || '';
    if (mainIdx === 'CDI')       return `CDI ${fmt.pct(avgTaxa)}`;
    if (mainIdx === 'IPCA')      return `IPCA + ${fmt.pct(avgTaxa)}`;
    if (mainIdx === 'Prefixado') return `${fmt.pct(avgTaxa)} a.a.`;
    return `${mainIdx} ${fmt.pct(avgTaxa)}`;
  })() : '—';

  // ── dividendos recebidos (lançados nas abas Ações e FIIs) ────────────────
  const divAcoes     = acoes.reduce((s, a) => s + Number(a.dividendos_ano  || 0), 0);
  const divFIIs      = fiis.reduce ((s, f) => s + Number(f.dividendos_ano  || 0), 0);
  const divFIIsGeral = fiis.reduce ((s, f) => s + Number(f.dividendos_geral|| 0), 0);
  const divAcoesLiq  = divAcoes * 0.85; // IRRF 15%

  // ── DY médio FIIs e Ações ─────────────────────────────────────────────────
  const dyFIIs  = rankingFIIs.filter(f => f.dy_anual).length > 0
    ? (rankingFIIs.filter(f => f.dy_anual).reduce((s, f) => s + Number(f.dy_anual), 0) / rankingFIIs.filter(f => f.dy_anual).length).toFixed(1)
    : null;
  const dyAcoes = rankingAcoes.filter(a => a.dy_anual).length > 0
    ? (rankingAcoes.filter(a => a.dy_anual).reduce((s, a) => s + Number(a.dy_anual), 0) / rankingAcoes.filter(a => a.dy_anual).length).toFixed(1)
    : null;

  const now = new Date();
  const dataHora = now.toLocaleDateString('pt-BR') + ' · ' + now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  const metaAcoes = 30, metaFIIs = 20, metaRF = 50;

  // ── CDI do BCB ───────────────────────────────────────────────────────────
  const cdiAnual = taxas.cdi || 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, fontVariantNumeric: 'tabular-nums' }}>

      {/* ── HEADER ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)' }}>Dashboard</h2>
          <p style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>{dataHora}</p>
        </div>
        <button onClick={atualizarTodos} disabled={atualizando} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <RefreshCw size={13} style={atualizando ? { animation: 'spin 0.7s linear infinite' } : {}} />
          {atualizando ? 'Atualizando...' : 'Atualizar tudo'}
        </button>
      </div>

      {/* ── KPIs ── */}
      <div style={{ ...S.card, padding: '20px 24px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 0 }}>
          {[
            {
              lbl: 'Patrimônio total',
              val: fmt.brl(totalPatr),
              sub: `${resumo.totalAtivos||0} ativos · ${resumo.totalAcoes||0} ações · ${resumo.totalFIIs||0} FIIs`,
              color: 'var(--text-primary)',
            },
            {
              lbl: 'Retorno preço',
              val: `${(ganhoAcoes+ganhoFIIs) >= 0 ? '+' : ''}${fmt.brl(ganhoAcoes+ganhoFIIs)}`,
              sub: `${pctRetAcoes >= 0 ? '+' : ''}${fmt.pct((custoAcoes+custoFIIs) > 0 ? ((ganhoAcoes+ganhoFIIs)/(custoAcoes+custoFIIs))*100 : 0)} desde o início`,
              color: (ganhoAcoes+ganhoFIIs) >= 0 ? 'var(--success)' : 'var(--danger)',
            },
            {
              lbl: 'Retorno total c/ dividendos',
              val: `${ganhoTotal >= 0 ? '+' : ''}${fmt.brl(ganhoTotal)}`,
              sub: `${ganhoTotal >= 0 ? '+' : ''}${fmt.pct(pctTotal)} desde o início`,
              color: ganhoTotal >= 0 ? 'var(--success)' : 'var(--danger)',
            },
            {
              lbl: 'Renda recebida',
              valExtra: (
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 2 }}>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>total líq.</span>
                  <span style={{ fontSize: 20, fontWeight: 800, color: 'var(--success)', letterSpacing: '-0.5px', lineHeight: 1.1 }}>{fmt.brl(rfTotalLiq + divFIIs + divAcoesLiq)}</span>
                </div>
              ),
              sub: `RF: ${fmt.brl(rfTotalLiq)} · FIIs: ${fmt.brl(divFIIs)} · Ações: ${fmt.brl(divAcoesLiq)}`,
              color: 'var(--success)',
            },
          ].map(({ lbl, val, valExtra, sub, color }, i, arr) => (
            <div key={lbl} style={{
              padding: '0 22px',
              paddingLeft:  i === 0 ? 0 : 22,
              paddingRight: i === arr.length - 1 ? 0 : 22,
              borderRight:  i < arr.length - 1 ? '1px solid var(--border)' : 'none',
            }}>
              <p style={{ ...S.label, marginBottom: 6 }}>{lbl}</p>
              {valExtra || (
                <p style={{ fontSize: 22, fontWeight: 800, color, letterSpacing: '-0.5px', lineHeight: 1.1, marginBottom: 4 }}>{val}</p>
              )}
              <p style={{ ...S.muted, marginTop: valExtra ? 4 : 0 }}>{sub}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ── ASSET CARDS ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>

        {/* Ações */}
        <div style={{ ...S.card, padding: 16 }}>
          <p style={{ ...S.label, color: 'var(--accent)', marginBottom: 8 }}>📈 Ações</p>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 2 }}>
            <span style={{ fontSize: 18, fontWeight: 800, color: ganhoAcoes >= 0 ? 'var(--success)' : 'var(--danger)' }}>
              {ganhoAcoes >= 0 ? '+' : ''}{fmt.brl(ganhoAcoes)}
            </span>
            <span style={{ fontSize: 13, fontWeight: 700, color: ganhoAcoes >= 0 ? 'var(--success)' : 'var(--danger)' }}>
              {pctRetAcoes >= 0 ? '+' : ''}{fmt.pct(pctRetAcoes)}
            </span>
          </div>
          <p style={{ fontSize: 10, color: ganhoAcoes >= 0 ? 'var(--success)' : 'var(--danger)', fontWeight: 600, marginBottom: 8 }}>Valorização de preço</p>
          <div style={{ height: 1, background: 'var(--border)', marginBottom: 8 }} />
          {[
            ['Posição total',      fmt.brl(patriAcoes),                   'inherit'],
            [`${resumo.totalAcoes||0} ativos · ${fmt.pct(pctAcoes)} carteira`, '—', 'var(--accent)'],
            ['Dividendos recebidos', divAcoes > 0 ? fmt.brl(divAcoes) : '—', 'var(--success)'],
            ['DY médio a.a.',      dyAcoes ? `${dyAcoes}% a.a.` : '—',   'var(--accent)'],
            ['Retorno total',      `${pctRetAcoes >= 0 ? '+' : ''}${fmt.pct(pctRetAcoes)}`, pctRetAcoes >= 0 ? 'var(--success)' : 'var(--danger)'],
          ].map(([k, v, c]) => (
            <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 4 }}>
              <span style={{ color: 'var(--text-muted)' }}>{k}</span>
              <span style={{ fontWeight: 700, color: c }}>{v}</span>
            </div>
          ))}
        </div>

        {/* FIIs */}
        <div style={{ ...S.card, padding: 16 }}>
          <p style={{ ...S.label, color: 'var(--success)', marginBottom: 8 }}>🏢 FIIs</p>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 2 }}>
            <span style={{ fontSize: 18, fontWeight: 800, color: ganhoFIIs >= 0 ? 'var(--success)' : 'var(--danger)' }}>
              {ganhoFIIs >= 0 ? '+' : ''}{fmt.brl(ganhoFIIs)}
            </span>
            <span style={{ fontSize: 13, fontWeight: 700, color: ganhoFIIs >= 0 ? 'var(--success)' : 'var(--danger)' }}>
              {pctRetFIIs >= 0 ? '+' : ''}{fmt.pct(pctRetFIIs)}
            </span>
          </div>
          <p style={{ fontSize: 10, color: ganhoFIIs >= 0 ? 'var(--success)' : 'var(--danger)', fontWeight: 600, marginBottom: 8 }}>Variação de preço</p>
          <div style={{ height: 1, background: 'var(--border)', marginBottom: 8 }} />
          {[
            ['Posição total',      fmt.brl(patriFIIs),                  'inherit'],
            [`${resumo.totalFIIs||0} fundos · ${fmt.pct(pctFIIs)} carteira`, '—', 'var(--success)'],
            ['Dividendos recebidos', divFIIs > 0 ? fmt.brl(divFIIs) : '—', 'var(--success)'],
            ['DY médio a.a.',      dyFIIs ? `${dyFIIs}% a.a.` : '—',   'var(--success)'],
            ['Isentos IR',         '✓ 100%',                            'var(--success)'],
            ['Retorno total',      `${pctRetFIIs >= 0 ? '+' : ''}${fmt.pct(pctRetFIIs)}`, pctRetFIIs >= 0 ? 'var(--success)' : 'var(--danger)'],
          ].map(([k, v, c]) => (
            <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 4 }}>
              <span style={{ color: 'var(--text-muted)' }}>{k}</span>
              <span style={{ fontWeight: 700, color: c || 'inherit' }}>{v}</span>
            </div>
          ))}
        </div>

        {/* Renda Fixa */}
        <div style={{ ...S.card, padding: 16 }}>
          <p style={{ ...S.label, color: 'var(--warning)', marginBottom: 8 }}>📄 Renda Fixa</p>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 2 }}>
            <span style={{ fontSize: 18, fontWeight: 800, color: 'var(--success)' }}>
              +{fmt.brl(rfTotalLiq)}
            </span>
            <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--success)' }}>líq.</span>
          </div>
          <p style={{ fontSize: 10, color: 'var(--success)', fontWeight: 600, marginBottom: 8 }}>Rendimento acumulado</p>
          <div style={{ height: 1, background: 'var(--border)', marginBottom: 8 }} />
          {[
            ['Posição total',         fmt.brl(rfTotalInv),       'inherit'],
            [`${rf.length} aplicações · ${fmt.pct(pctRF)} cart.`, '—',     'var(--warning)'],
            ['Rendimento bruto',       `+${fmt.brl(rfTotalBruto)}`, 'var(--success)'],
            ['IR regressivo',          `-${fmt.brl(rfTotalIR)}`,   'var(--danger)'],
            ['Taxa média',            rfTaxaMedia,                'var(--warning)'],
            ['Rendimento líq. a.a.',  `~${fmt.pct(rfLiqPct)} a.a.`, 'var(--success)'],
          ].map(([k, v, c]) => (
            <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 4 }}>
              <span style={{ color: 'var(--text-muted)' }}>{k}</span>
              <span style={{ fontWeight: 700, color: c }}>{v}</span>
            </div>
          ))}
        </div>

        {/* Score */}
        <div style={{ ...S.card, padding: 16 }}>
          <p style={{ ...S.label, color: 'var(--text-muted)', marginBottom: 8 }}>🎯 Score médio</p>
          <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 2 }}>
            {scoreMedio}<span style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 500 }}>/10</span>
          </div>
          <p style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 10 }}>carteira geral</p>
          <div style={{ height: 1, background: 'var(--border)', marginBottom: 8 }} />
          {[
            ['Ações',       `${maxScoreAco}/10`,                      'inherit'],
            ['FIIs',        `${maxScoreFII}/10`,                      'inherit'],
            ['Excelentes',  `${resumo.ativosExcelentes||0} ativos`,   'var(--success)'],
            ['Em risco',    `${resumo.ativosRisco||0} ativos`,        'var(--danger)'],
          ].map(([k, v, c]) => (
            <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 4 }}>
              <span style={{ color: c !== 'inherit' ? c : 'var(--text-muted)' }}>{k}</span>
              <span style={{ fontWeight: 700, color: c }}>{v}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ── ALERTAS ── */}
      <div style={S.card}>
        {secTitle('var(--warning)', 'Alertas inteligentes')}
        {rfAlertas.length === 0 && oportunidades.length === 0 && pctAcoes < metaAcoes && pctAcoes > 0 && (
          <p style={S.muted}>Nenhum alerta no momento.</p>
        )}
        {rfAlertas.slice(0, 2).map(r => (
          <div key={r.id} style={{ display: 'flex', gap: 10, padding: '10px 12px', background: 'var(--bg-warning)', border: '1px solid var(--warning)', borderRadius: 8, marginBottom: 8, fontSize: 11 }}>
            <span style={{ fontSize: 14 }}>⏰</span>
            <div>
              <p style={{ fontWeight: 700, color: 'var(--warning)', marginBottom: 2 }}>{r.nome} vence em {r.diasParaVencer} dias</p>
              <p style={{ color: 'var(--text-muted)' }}>{fmt.brl(r.valor_investido)} vencem em {new Date(r.data_vencimento).toLocaleDateString('pt-BR')} — planeje o reinvestimento.</p>
            </div>
          </div>
        ))}
        {oportunidades.slice(0, 1).map(a => (
          <div key={a.ticker} style={{ display: 'flex', gap: 10, padding: '10px 12px', background: 'var(--bg-success)', border: '1px solid var(--success)', borderRadius: 8, marginBottom: 8, fontSize: 11 }}>
            <span style={{ fontSize: 14 }}>💡</span>
            <div>
              <p style={{ fontWeight: 700, color: 'var(--success)', marginBottom: 2 }}>{a.ticker} — oportunidade identificada</p>
              <p style={{ color: 'var(--text-muted)' }}>
                {[a.pvp && `P/VP ${Number(a.pvp).toFixed(2)}`, a.dy_anual && `DY ${Number(a.dy_anual).toFixed(1)}%`, a.score && `Score ${a.score}/${a.max_score||4}`].filter(Boolean).join(' · ')} · {a.preco_atual ? fmt.brl(a.preco_atual) : ''}
              </p>
            </div>
          </div>
        ))}
        {pctAcoes > 0 && pctAcoes < metaAcoes && (
          <div style={{ display: 'flex', gap: 10, padding: '10px 12px', background: 'var(--bg-accent)', border: '1px solid var(--accent)', borderRadius: 8, fontSize: 11 }}>
            <span style={{ fontSize: 14 }}>📊</span>
            <div>
              <p style={{ fontWeight: 700, color: 'var(--accent)', marginBottom: 2 }}>Ações estão abaixo da meta de alocação</p>
              <p style={{ color: 'var(--text-muted)' }}>Você tem {fmt.pct(pctAcoes)} em ações — meta é {metaAcoes}%. Considere aportar mais em renda variável.</p>
            </div>
          </div>
        )}
      </div>

      {/* ── LINHA PRINCIPAL 3 colunas ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>

        {/* ── COL 1: RENDA PASSIVA ── */}
        <div style={S.card}>
          {secTitle('var(--success)', 'Renda passiva recebida')}

          {/* Tabs */}
          <div style={{ display: 'flex', gap: 4, marginBottom: 14 }}>
            {[['mes','Mês ant.'],['ano','Ano 2026'],['total','Desde início']].map(([k,l]) => (
              <button key={k} onClick={() => setTabRenda(k)} style={{
                padding: '4px 12px', borderRadius: 20, fontSize: 11, fontWeight: 600, cursor: 'pointer',
                border: `1px solid ${tabRenda === k ? 'var(--accent)' : 'var(--border)'}`,
                background: tabRenda === k ? 'var(--accent)' : 'transparent',
                color: tabRenda === k ? '#fff' : 'var(--text-muted)',
                transition: 'all .15s',
              }}>{l}</button>
            ))}
          </div>

          {/* 2026 acumulado box */}
          <div style={{ background: 'linear-gradient(135deg,var(--bg-accent),var(--bg-success))', border: '1px solid var(--accent)', borderRadius: 10, padding: '12px 14px', marginBottom: 14 }}>
            <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--accent)', marginBottom: 8 }}>📅 2026 acumulado até agora</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
              <div style={{ background: 'var(--surface)', border: '1px solid var(--warning)', borderRadius: 8, padding: 8, textAlign: 'center' }}>
                <p style={{ fontSize: 9, color: 'var(--warning)', fontWeight: 700, textTransform: 'uppercase', marginBottom: 3 }}>Renda Fixa</p>
                <p style={{ fontSize: 14, fontWeight: 800, color: 'var(--warning)' }}>{fmt.brl(rfTotalBruto)}</p>
                <p style={{ fontSize: 9, color: 'var(--text-muted)', marginTop: 1 }}>líq. {fmt.brl(rfTotalLiq)}</p>
              </div>
              <div style={{ background: 'var(--surface)', border: '1px solid var(--success)', borderRadius: 8, padding: 8, textAlign: 'center' }}>
                <p style={{ fontSize: 9, color: 'var(--success)', fontWeight: 700, textTransform: 'uppercase', marginBottom: 3 }}>FIIs</p>
                <p style={{ fontSize: 14, fontWeight: 800, color: 'var(--success)' }}>{divFIIs > 0 ? fmt.brl(divFIIs) : '—'}</p>
                <p style={{ fontSize: 9, color: 'var(--text-muted)', marginTop: 1 }}>isento IR</p>
              </div>
              <div style={{ background: 'var(--surface)', border: '1px solid var(--accent)', borderRadius: 8, padding: 8, textAlign: 'center' }}>
                <p style={{ fontSize: 9, color: 'var(--accent)', fontWeight: 700, textTransform: 'uppercase', marginBottom: 3 }}>Ações</p>
                <p style={{ fontSize: 14, fontWeight: 800, color: 'var(--accent)' }}>{divAcoes > 0 ? fmt.brl(divAcoes) : '—'}</p>
                <p style={{ fontSize: 9, color: 'var(--text-muted)', marginTop: 1 }}>líq. {divAcoesLiq > 0 ? fmt.brl(divAcoesLiq) : '—'}</p>
              </div>
            </div>
            <p style={{ marginTop: 8, fontSize: 11, fontWeight: 700, color: 'var(--success)', textAlign: 'center' }}>
              Total: {fmt.brl(rfTotalBruto + divFIIs + divAcoes)} recebido em 2026
            </p>
          </div>

          {/* Total box */}
          <div style={{ background: 'var(--bg-success)', border: '1px solid var(--success)', borderRadius: 10, padding: '10px 14px', marginBottom: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 11, color: 'var(--success)', fontWeight: 600 }}>Total recebido líquido</span>
            <span style={{ fontSize: 18, fontWeight: 800, color: 'var(--success)' }}>{fmt.brl(rfTotalLiq + divFIIs + divAcoesLiq)}</span>
          </div>

          {/* RF */}
          <div style={{ marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, fontWeight: 700, color: 'var(--warning)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                <span style={S.dot('var(--warning)')} />Renda Fixa
              </span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 6 }}>
              {[
                ['Rendimento recebido', fmt.brl(rfTotalBruto), 'var(--warning)'],
                ['Líquido (após IR)',   fmt.brl(rfTotalLiq),   'var(--success)'],
              ].map(([lbl, val, c]) => (
                <div key={lbl} style={S.tile()}>
                  <p style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 2 }}>{lbl}</p>
                  <p style={{ fontSize: 13, fontWeight: 700, color: c }}>{val}</p>
                </div>
              ))}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
              {[
                ['Taxa média bruta a.a.', rfTaxaMedia,             'var(--warning)'],
                ['Rendimento líq. a.a.', `~${fmt.pct(rfLiqPct)}`, 'var(--success)'],
              ].map(([lbl, val, c]) => (
                <div key={lbl} style={S.tile()}>
                  <p style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 2 }}>{lbl}</p>
                  <p style={{ fontSize: 13, fontWeight: 700, color: c }}>{val}</p>
                </div>
              ))}
            </div>
          </div>

          <div style={S.divider} />

          {/* FIIs */}
          <div style={{ marginBottom: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, fontWeight: 700, color: 'var(--success)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                <span style={S.dot('var(--success)')} />FIIs
              </span>
              <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>isentos IR</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
              <div style={S.tile()}>
                <p style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 2 }}>Dividendos recebidos</p>
                <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--success)' }}>{divFIIs > 0 ? fmt.brl(divFIIs) : '—'}</p>
                {divFIIs === 0 && <p style={{ fontSize: 9, color: 'var(--text-muted)' }}>Lance na aba FIIs</p>}
              </div>
              <div style={S.tile()}>
                <p style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 2 }}>DY médio a.a.</p>
                <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--success)' }}>
                  {dyFIIs ? `${dyFIIs}% a.a.` : '—'}
                </p>
              </div>
            </div>
          </div>

          <div style={S.divider} />

          {/* Ações */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 10, fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                <span style={S.dot('var(--accent)')} />Ações
              </span>
              <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>IRRF 15%</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 6 }}>
              <div style={S.tile()}>
                <p style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 2 }}>Proventos brutos</p>
                <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--accent)' }}>{divAcoes > 0 ? fmt.brl(divAcoes) : '—'}</p>
                {divAcoes === 0 && <p style={{ fontSize: 9, color: 'var(--text-muted)' }}>Registre em Ações</p>}
              </div>
              <div style={S.tile()}>
                <p style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 2 }}>DY médio a.a.</p>
                <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--accent)' }}>
                  {dyAcoes ? `${dyAcoes}% a.a.` : '—'}
                </p>
              </div>
            </div>
            <div style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid var(--success)', background: 'var(--bg-success)' }}>
              <p style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 2 }}>Líquido após IRRF 15%</p>
              <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--success)' }}>{divAcoesLiq > 0 ? fmt.brl(divAcoesLiq) : '—'}</p>
            </div>
          </div>
        </div>

        {/* ── COL 2: GRÁFICO + BENCHMARK + MÉDIA MENSAL + CRESCIMENTO ── */}
        <div style={S.card}>
          {secTitle('var(--accent)', 'Renda recebida — últimos 12 meses')}

          {/* Bar chart placeholder */}
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 70, marginBottom: 6 }}>
            {['N','D','J','F','M','A','M','J','J','A','S','O'].map((mes, i) => {
              const rfH = i < 11 ? 20 + (i * 3) : 60;
              return (
                <div key={`${mes}-${i}`} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                  <div style={{ width: '100%', height: rfH, borderRadius: '3px 3px 0 0', background: i === 11 ? 'var(--warning)' : 'var(--border)', minHeight: 3 }} />
                  <span style={{ fontSize: 9, color: 'var(--text-muted)' }}>{mes}</span>
                </div>
              );
            })}
          </div>
          <p style={{ fontSize: 10, color: 'var(--text-muted)', textAlign: 'center', marginBottom: 4 }}>
            valores em R$ · <span style={{ color: 'var(--warning)' }}>■ RF</span> <span style={{ color: 'var(--success)' }}>■ FIIs</span> <span style={{ color: 'var(--accent)' }}>■ Ações</span>
          </p>
          <p style={{ fontSize: 9, color: 'var(--text-muted)', textAlign: 'center', marginBottom: 14 }}>Importe extrato B3 para ver histórico mensal completo</p>

          {/* Benchmark */}
          <div style={S.divider} />
          {secTitle('var(--warning)', 'Comparativo vs benchmark')}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, textAlign: 'center' }}>
            {[
              ['Sua carteira', `${pctTotal >= 0 ? '+' : ''}${fmt.pct(pctTotal)}`, 'var(--success)', 'retorno total'],
              ['CDI', cdiAnual > 0 ? `+${fmt.pct(cdiAnual)}` : '—', 'var(--warning)', 'no período'],
              ['Ibovespa', 'via Brapi', 'var(--text-muted)', 'benchmark'],
            ].map(([lbl, val, c, sub]) => (
              <div key={lbl} style={{ padding: '10px 6px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8 }}>
                <p style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 4 }}>{lbl}</p>
                <p style={{ fontSize: 15, fontWeight: 800, color: c }}>{val}</p>
                <p style={{ fontSize: 9, color: 'var(--text-muted)' }}>{sub}</p>
              </div>
            ))}
          </div>
          {pctTotal > 0 && cdiAnual > 0 && (
            <div style={{ marginTop: 8, padding: '8px 10px', borderRadius: 8, background: pctTotal > cdiAnual ? 'var(--bg-success)' : 'var(--bg-danger)', border: `1px solid ${pctTotal > cdiAnual ? 'var(--success)' : 'var(--danger)'}`, fontSize: 10, color: pctTotal > cdiAnual ? 'var(--success)' : 'var(--danger)', fontWeight: 600, textAlign: 'center' }}>
              {pctTotal > cdiAnual
                ? `✅ Carteira bateu o CDI em +${fmt.pct(pctTotal - cdiAnual)}`
                : `⚠️ Carteira abaixo do CDI em ${fmt.pct(cdiAnual - pctTotal)}`}
            </div>
          )}

          {/* Média mensal */}
          <div style={S.divider} />
          {secTitle('var(--warning)', 'Renda recebida — média mensal')}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
            <div style={{ padding: '10px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, textAlign: 'center' }}>
              <p style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 4 }}>Média mensal (RF)</p>
              <p style={{ fontSize: 15, fontWeight: 800, color: 'var(--success)' }}>{fmt.brl(rfTotalLiq / 12)}</p>
              <p style={{ fontSize: 9, color: 'var(--text-muted)' }}>RF líq. ÷ 12 meses</p>
            </div>
            <div style={{ padding: '10px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, textAlign: 'center' }}>
              <p style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 4 }}>Aplicações ativas</p>
              <p style={{ fontSize: 15, fontWeight: 800, color: 'var(--success)' }}>{rf.length}</p>
              <p style={{ fontSize: 9, color: 'var(--text-muted)' }}>renda fixa</p>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
            {[
              ['RF média/mês', fmt.brl(rfTotalLiq / 12), 'var(--warning)'],
              ['FII média/mês', '—', 'var(--success)'],
              ['Ações média/mês', '—', 'var(--accent)'],
            ].map(([lbl, val, c]) => (
              <div key={lbl} style={{ background: 'var(--bg)', border: `1px solid ${c}`, borderRadius: 7, padding: 8, textAlign: 'center' }}>
                <p style={{ fontSize: 9, color: c, fontWeight: 700, marginBottom: 2 }}>{lbl}</p>
                <p style={{ fontSize: 13, fontWeight: 800, color: c }}>{val}</p>
              </div>
            ))}
          </div>

          {/* Crescimento */}
          <div style={S.divider} />
          {secTitle('var(--accent)', 'Crescimento da renda passiva')}
          {[
            ['2024 (ano completo)', null,        0,  'var(--accent)'],
            ['2025 (ano completo)', null,        0,  'var(--accent)'],
            ['2026 (até out)',      rfTotalLiq,  60, 'var(--success)'],
          ].map(([lbl, val, pct, c]) => (
            <div key={lbl} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 11, marginBottom: 6 }}>
              <span style={{ color: c === 'var(--success)' ? c : 'var(--text-muted)', fontWeight: c === 'var(--success)' ? 700 : 400, minWidth: 130 }}>{lbl}</span>
              <div style={{ flex: 1, margin: '0 8px', height: 6, background: 'var(--border)', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{ width: `${pct}%`, height: '100%', background: c, borderRadius: 3 }} />
              </div>
              <span style={{ fontWeight: 700, color: val ? c : 'var(--text-muted)', minWidth: 70, textAlign: 'right' }}>
                {val ? fmt.brl(val) : '—'}
              </span>
            </div>
          ))}
          <div style={{ padding: '7px 10px', borderRadius: 7, background: 'var(--bg-accent)', border: '1px solid var(--accent)', fontSize: 10, color: 'var(--accent)', fontWeight: 600, marginTop: 4 }}>
            📈 Importe extrato para ver histórico completo 2024/2025
          </div>
        </div>

        {/* ── COL 3: DISTRIBUIÇÃO + VARIAÇÃO HOJE + VENCIMENTOS ── */}
        <div style={S.card}>
          {secTitle('var(--accent)', 'Distribuição do patrimônio')}
          <div style={{ height: 8, borderRadius: 4, background: 'var(--border)', marginBottom: 10, overflow: 'hidden', display: 'flex' }}>
            {pctAcoes > 0 && <div style={{ width: `${pctAcoes}%`, height: '100%', background: 'var(--accent)' }} />}
            {pctFIIs  > 0 && <div style={{ width: `${pctFIIs}%`,  height: '100%', background: 'var(--success)' }} />}
            {pctRF    > 0 && <div style={{ width: `${pctRF}%`,    height: '100%', background: 'var(--warning)' }} />}
          </div>
          {[
            ['Ações',      pctAcoes, patriAcoes, 'var(--accent)'],
            ['FIIs',       pctFIIs,  patriFIIs,  'var(--success)'],
            ['Renda Fixa', pctRF,    patriRF,    'var(--warning)'],
          ].filter(d => d[2] > 0).map(([lbl, pct, val, c]) => (
            <div key={lbl} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0', borderBottom: '1px solid var(--border)' }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: c, flexShrink: 0 }} />
              <span style={{ flex: 1, fontSize: 12 }}>{lbl}</span>
              <span style={{ fontSize: 11, fontWeight: 700, color: c, minWidth: 40, textAlign: 'right' }}>{fmt.pct(pct)}</span>
              <span style={{ fontSize: 11, color: 'var(--text-muted)', minWidth: 80, textAlign: 'right' }}>{fmt.brl(val)}</span>
            </div>
          ))}
          {totalPatr === 0 && <p style={S.muted}>Nenhum ativo cadastrado.</p>}

          <div style={S.divider} />

          {/* Variação hoje */}
          {secTitle('var(--accent)', 'Variação hoje', { marginBottom: 8 })}
          {movers.length === 0 ? (
            <p style={{ ...S.muted, marginBottom: 8 }}>Atualize os ativos para ver a variação.</p>
          ) : (
            movers.map((a, i) => (
              <div key={a.ticker} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '5px 0', borderBottom: i < movers.length - 1 ? '1px solid var(--border)' : 'none' }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: (a.variacao_dia||0) >= 0 ? 'var(--success)' : 'var(--danger)' }}>{a.ticker}</span>
                <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{fmt.brl(a.preco_atual)}</span>
                <span style={{
                  fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 20,
                  background: (a.variacao_dia||0) >= 0 ? 'var(--bg-success)' : 'var(--bg-danger)',
                  color: (a.variacao_dia||0) >= 0 ? 'var(--success)' : 'var(--danger)',
                }}>
                  {(a.variacao_dia||0) >= 0 ? '+' : ''}{fmt.pct(a.variacao_dia)}
                </span>
              </div>
            ))
          )}

          <div style={S.divider} />

          {/* Vencimentos RF */}
          {secTitle('var(--warning)', 'Renda Fixa — vencimentos', { marginBottom: 8 })}
          {rfOrdenada.length === 0 && <p style={S.muted}>Nenhuma aplicação cadastrada.</p>}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            {rfOrdenada.slice(0, 4).map(r => {
              const dias = r.diasParaVencer;
              const alerta = dias !== undefined && dias <= 90;
              return (
                <div key={r.id} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '5px 8px', borderRadius: 7,
                  background: alerta ? 'var(--bg-warning)' : 'var(--bg)',
                  border: `1px solid ${alerta ? 'var(--warning)' : 'var(--border)'}`,
                }}>
                  <div>
                    <p style={{ fontSize: 11, fontWeight: 700 }}>{r.nome}</p>
                    <p style={{ fontSize: 9, color: 'var(--text-muted)' }}>
                      Vence {new Date(r.data_vencimento).toLocaleDateString('pt-BR')}{dias !== undefined ? ` · ${dias} dias` : ''}
                    </p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={S.tag('var(--bg-warning)', 'var(--warning)')}>{r.indexador}</span>
                    <p style={{ fontSize: 11, fontWeight: 700, marginTop: 2 }}>{fmt.brl(r.valor_investido)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* ── RANKINGS ── */}
      <div className="grid-2">

        {/* Top Ações */}
        <div style={S.card}>
          {secTitle('var(--accent)', 'Top Ações por score')}
          {rankingAcoes.length === 0 && <p style={S.muted}>Nenhuma ação adicionada.</p>}
          {rankingAcoes.slice(0, 6).map((a, i) => (
            <div key={a.ticker} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0', borderBottom: i < 5 ? '1px solid var(--border)' : 'none' }}>
              <span style={{ ...S.muted, width: 14 }}>{i + 1}</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--accent)', flex: 1 }}>{a.ticker}</span>
              <ScoreDots score={a.score} max={a.max_score || 6} color="var(--accent)" />
              <span className={badgeDecisao(a.decisao)} style={{ marginLeft: 4 }}>{labelDecisao(a.decisao)}</span>
              {a.variacao_dia != null && (
                <span style={{ fontSize: 11, fontWeight: 600, minWidth: 46, textAlign: 'right', color: (a.variacao_dia||0) >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                  {(a.variacao_dia||0) >= 0 ? '+' : ''}{fmt.pct(a.variacao_dia)}
                </span>
              )}
            </div>
          ))}
        </div>

        {/* Top FIIs */}
        <div style={S.card}>
          {secTitle('var(--success)', 'Top FIIs por score')}
          {rankingFIIs.length === 0 && <p style={S.muted}>Nenhum FII adicionado.</p>}
          {rankingFIIs.slice(0, 6).map((f, i) => (
            <div key={f.ticker} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0', borderBottom: i < 5 ? '1px solid var(--border)' : 'none' }}>
              <span style={{ ...S.muted, width: 14 }}>{i + 1}</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--success)', flex: 1 }}>{f.ticker}</span>
              <ScoreDots score={f.score} max={f.max_score || 4} color="var(--success)" />
              <span className={badgeDecisao(f.decisao)} style={{ marginLeft: 4 }}>{labelDecisao(f.decisao)}</span>
              {f.variacao_dia != null && (
                <span style={{ fontSize: 11, fontWeight: 600, minWidth: 46, textAlign: 'right', color: (f.variacao_dia||0) >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                  {(f.variacao_dia||0) >= 0 ? '+' : ''}{fmt.pct(f.variacao_dia)}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ── RADAR + METAS ── */}
      <div className="grid-2">

        {/* Radar Oportunidades */}
        <div style={S.card}>
          {secTitle('var(--success)', 'Radar de oportunidades')}
          {oportunidades.length === 0 && <p style={S.muted}>Nenhuma oportunidade identificada.</p>}
          {oportunidades.slice(0, 5).map(a => (
            <div key={a.ticker} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', background: 'var(--bg-success)', border: '1px solid var(--success)', borderRadius: 8, marginBottom: 6 }}>
              <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--success)', minWidth: 52 }}>{a.ticker}</span>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                  {a.tipo === 'FII' ? 'FII' : 'Ação'}{[a.pvp && ` · P/VP ${Number(a.pvp).toFixed(2)}`, a.dy_anual && ` · DY ${Number(a.dy_anual).toFixed(1)}%`, a.score && ` · Score ${a.score}/${a.max_score||4}`].filter(Boolean).join('')}
                </p>
              </div>
              <span style={{ fontSize: 12, fontWeight: 600 }}>{a.preco_atual ? fmt.brl(a.preco_atual) : ''}</span>
            </div>
          ))}
          <p style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 6 }}>💡 P/VP &lt; 1 (FII) · DY acima da média · Score ≥ 4</p>
        </div>

        {/* Radar Risco + Metas */}
        <div style={S.card}>
          {secTitle('var(--danger)', 'Radar de risco')}
          {riscos.length === 0 && <p style={S.muted}>Nenhum risco identificado.</p>}
          {riscos.slice(0, 3).map(a => (
            <div key={a.ticker} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', background: 'var(--bg-danger)', border: '1px solid var(--danger)', borderRadius: 8, marginBottom: 6 }}>
              <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--danger)', minWidth: 52 }}>{a.ticker}</span>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                  {a.tipo === 'FII' ? 'FII' : 'Ação'}{[a.pvp && ` · P/VP ${Number(a.pvp).toFixed(2)}`, a.pl && ` · P/L ${Number(a.pl).toFixed(1)}`, a.score && ` · Score ${a.score}/${a.max_score||5}`].filter(Boolean).join('')}
                </p>
              </div>
              <span style={{ fontSize: 12, fontWeight: 600 }}>{a.preco_atual ? fmt.brl(a.preco_atual) : ''}</span>
            </div>
          ))}
          <p style={{ fontSize: 10, color: 'var(--text-muted)', padding: '4px 8px', background: 'var(--bg-warning)', border: '1px solid var(--warning)', borderRadius: 6, marginBottom: 12 }}>⚠️ P/VP &gt; 1,2 (FII) · P/L &gt; 30 (ação) · Score ≤ 2</p>

          {secTitle('var(--warning)', 'Metas de alocação')}
          {[
            ['Ações',      pctAcoes, metaAcoes, 'var(--accent)'],
            ['FIIs',       pctFIIs,  metaFIIs,  'var(--success)'],
            ['Renda Fixa', pctRF,    metaRF,    'var(--warning)'],
          ].map(([lbl, atual, meta, c]) => (
            <div key={lbl} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
              <span style={{ fontSize: 11, width: 70 }}>{lbl}</span>
              <div style={{ flex: 1, height: 6, background: 'var(--border)', borderRadius: 3, overflow: 'hidden' }}>
                <div style={{ width: `${Math.min(100, atual)}%`, height: '100%', background: c, borderRadius: 3 }} />
              </div>
              <span style={{ fontSize: 10, color: 'var(--text-muted)', minWidth: 80, textAlign: 'right' }}>
                {fmt.pct(atual)} / meta {meta}%
              </span>
            </div>
          ))}
          <div style={{ marginTop: 4, padding: '6px 8px', borderRadius: 6, background: 'var(--bg-warning)', border: '1px solid var(--warning)', fontSize: 10, color: 'var(--warning)', fontWeight: 600 }}>
            📊 Aportar em Ações (+{fmt.brl(((metaAcoes - pctAcoes) / 100) * totalPatr)}) e FIIs (+{fmt.brl(((metaFIIs - pctFIIs) / 100) * totalPatr)}) para rebalancear
          </div>
        </div>
      </div>

      {/* ── TABELA AÇÕES ── */}
      {acoes.length > 0 && (
        <div style={S.card}>
          {secTitle('var(--accent)', 'Carteira de Ações — retorno completo')}
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
              <thead>
                <tr>
                  {['Ativo', 'PM', 'Cotação', 'Qtd', 'Posição', 'G/P preço', 'Dividendos rec.', 'DY a.a.', 'Retorno total'].map(h => (
                    <th key={h} style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', padding: '6px 8px', textAlign: h === 'Ativo' ? 'left' : 'right', borderBottom: '2px solid var(--border)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {acoes.map((a, i) => {
                  const gp    = (a.ganho_perda_pct || a.ganho_perda || 0);
                  const gpVal = a.ganho_perda || 0;
                  return (
                    <tr key={a.ticker || i} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '7px 8px', fontWeight: 700 }}>
                        {a.ticker}<span style={S.tag('var(--bg-accent)', 'var(--accent)')}> Ação</span>
                      </td>
                      <td style={{ padding: '7px 8px', textAlign: 'right' }}>{fmt.brl(a.preco_medio || a.preco_compra || 0)}</td>
                      <td style={{ padding: '7px 8px', textAlign: 'right' }}>{fmt.brl(a.preco_atual || 0)}</td>
                      <td style={{ padding: '7px 8px', textAlign: 'right' }}>{a.quantidade || 0}</td>
                      <td style={{ padding: '7px 8px', textAlign: 'right' }}>{fmt.brl(a.valor_total || a.valor_atual || 0)}</td>
                      <td style={{ padding: '7px 8px', textAlign: 'right', color: gpVal >= 0 ? 'var(--success)' : 'var(--danger)', fontWeight: 700 }}>
                        {gpVal >= 0 ? '+' : ''}{fmt.pct(gp)}
                      </td>
                      <td style={{ padding: '7px 8px', textAlign: 'right', color: 'var(--success)' }}>—</td>
                      <td style={{ padding: '7px 8px', textAlign: 'right', color: 'var(--accent)' }}>
                        {a.dy_anual ? `${Number(a.dy_anual).toFixed(1)}%` : '—'}
                      </td>
                      <td style={{ padding: '7px 8px', textAlign: 'right' }}>
                        <span style={S.tag(gpVal >= 0 ? 'var(--bg-success)' : 'var(--bg-danger)', gpVal >= 0 ? 'var(--success)' : 'var(--danger)')}>
                          {gpVal >= 0 ? '+' : ''}{fmt.pct(gp)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
                <tr style={{ background: 'var(--bg)', fontWeight: 700 }}>
                  <td style={{ padding: '7px 8px' }}>Total Ações</td>
                  <td style={{ padding: '7px 8px', textAlign: 'right' }}>—</td>
                  <td style={{ padding: '7px 8px', textAlign: 'right' }}>—</td>
                  <td style={{ padding: '7px 8px', textAlign: 'right' }}>—</td>
                  <td style={{ padding: '7px 8px', textAlign: 'right' }}>{fmt.brl(patriAcoes)}</td>
                  <td style={{ padding: '7px 8px', textAlign: 'right', color: ganhoAcoes >= 0 ? 'var(--success)' : 'var(--danger)' }}>{ganhoAcoes >= 0 ? '+' : ''}{fmt.pct(pctRetAcoes)}</td>
                  <td style={{ padding: '7px 8px', textAlign: 'right' }}>—</td>
                  <td style={{ padding: '7px 8px', textAlign: 'right', color: 'var(--accent)' }}>—</td>
                  <td style={{ padding: '7px 8px', textAlign: 'right', color: ganhoAcoes >= 0 ? 'var(--success)' : 'var(--danger)' }}>{ganhoAcoes >= 0 ? '+' : ''}{fmt.pct(pctRetAcoes)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── TABELA FIIs ── */}
      {fiis.length > 0 && (
        <div style={S.card}>
          {secTitle('var(--success)', 'Carteira de FIIs — retorno completo')}
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
              <thead>
                <tr>
                  {['Fundo', 'PM', 'Cotação', 'Qtd', 'Posição', 'G/P preço', 'Dividendos rec.', 'DY a.a.', 'Retorno total'].map(h => (
                    <th key={h} style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', padding: '6px 8px', textAlign: h === 'Fundo' ? 'left' : 'right', borderBottom: '2px solid var(--border)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {fiis.map((f, i) => {
                  const gp    = f.ganho_perda_pct || f.ganho_perda || 0;
                  const gpVal = f.ganho_perda || 0;
                  return (
                    <tr key={f.ticker || i} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '7px 8px', fontWeight: 700 }}>
                        {f.ticker}<span style={S.tag('var(--bg-success)', 'var(--success)')}> FII</span>
                      </td>
                      <td style={{ padding: '7px 8px', textAlign: 'right' }}>{fmt.brl(f.preco_medio || f.preco_compra || 0)}</td>
                      <td style={{ padding: '7px 8px', textAlign: 'right' }}>{fmt.brl(f.preco_atual || 0)}</td>
                      <td style={{ padding: '7px 8px', textAlign: 'right' }}>{f.quantidade || 0}</td>
                      <td style={{ padding: '7px 8px', textAlign: 'right' }}>{fmt.brl(f.valor_total || f.valor_atual || 0)}</td>
                      <td style={{ padding: '7px 8px', textAlign: 'right', color: gpVal >= 0 ? 'var(--success)' : 'var(--danger)', fontWeight: 700 }}>
                        {gpVal >= 0 ? '+' : ''}{fmt.pct(gp)}
                      </td>
                      <td style={{ padding: '7px 8px', textAlign: 'right', color: 'var(--success)' }}>—</td>
                      <td style={{ padding: '7px 8px', textAlign: 'right', color: 'var(--success)' }}>
                        {f.dy_anual ? `${Number(f.dy_anual).toFixed(1)}%` : '—'}
                      </td>
                      <td style={{ padding: '7px 8px', textAlign: 'right' }}>
                        <span style={S.tag(gpVal >= 0 ? 'var(--bg-success)' : 'var(--bg-danger)', gpVal >= 0 ? 'var(--success)' : 'var(--danger)')}>
                          {gpVal >= 0 ? '+' : ''}{fmt.pct(gp)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
                <tr style={{ background: 'var(--bg)', fontWeight: 700 }}>
                  <td style={{ padding: '7px 8px' }}>Total FIIs</td>
                  <td style={{ padding: '7px 8px', textAlign: 'right' }}>—</td>
                  <td style={{ padding: '7px 8px', textAlign: 'right' }}>—</td>
                  <td style={{ padding: '7px 8px', textAlign: 'right' }}>—</td>
                  <td style={{ padding: '7px 8px', textAlign: 'right' }}>{fmt.brl(patriFIIs)}</td>
                  <td style={{ padding: '7px 8px', textAlign: 'right', color: ganhoFIIs >= 0 ? 'var(--success)' : 'var(--danger)' }}>{ganhoFIIs >= 0 ? '+' : ''}{fmt.pct(pctRetFIIs)}</td>
                  <td style={{ padding: '7px 8px', textAlign: 'right' }}>—</td>
                  <td style={{ padding: '7px 8px', textAlign: 'right' }}>—</td>
                  <td style={{ padding: '7px 8px', textAlign: 'right', color: ganhoFIIs >= 0 ? 'var(--success)' : 'var(--danger)' }}>{ganhoFIIs >= 0 ? '+' : ''}{fmt.pct(pctRetFIIs)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── RENDA FIXA TABELA ── */}
      {rf.length > 0 && (
        <div style={S.card}>
          {secTitle('var(--warning)', 'Renda Fixa — detalhe completo')}
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
              <thead>
                <tr>
                  {['Nome', 'Tipo', 'Indexador', 'Taxa', 'Investido', 'Rend. Bruto', 'IR', 'Rend. Líq.', '% Líq.', 'Vencimento', 'Progresso'].map(h => (
                    <th key={h} style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', padding: '6px 8px', textAlign: h === 'Nome' ? 'left' : 'right', borderBottom: '2px solid var(--border)' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rf.map((r, i) => (
                  <tr key={r.id || i} style={{ borderBottom: '1px solid var(--border)', background: r.alertaVencimento === 'critico' ? 'var(--bg-danger)' : r.alertaVencimento === 'atencao' ? 'var(--bg-warning)' : 'transparent' }}>
                    <td style={{ padding: '7px 8px', fontWeight: 700 }}>{r.nome}</td>
                    <td style={{ padding: '7px 8px', textAlign: 'right' }}>{r.tipo}</td>
                    <td style={{ padding: '7px 8px', textAlign: 'right' }}><span style={S.tag('var(--bg-warning)', 'var(--warning)')}>{r.indexador}</span></td>
                    <td style={{ padding: '7px 8px', textAlign: 'right' }}>{r.taxa}%</td>
                    <td style={{ padding: '7px 8px', textAlign: 'right' }}>{fmt.brl(r.valor_investido)}</td>
                    <td style={{ padding: '7px 8px', textAlign: 'right', color: 'var(--warning)' }}>+{fmt.brl(r.rendBruto||0)}</td>
                    <td style={{ padding: '7px 8px', textAlign: 'right', color: 'var(--danger)' }}>{r.isento_ir ? 'Isento' : `-${fmt.brl(r.ir||0)}`}</td>
                    <td style={{ padding: '7px 8px', textAlign: 'right', color: 'var(--success)', fontWeight: 700 }}>+{fmt.brl(r.rendLiquido||0)}</td>
                    <td style={{ padding: '7px 8px', textAlign: 'right', color: 'var(--success)' }}>{r.rendLiquidoPct ? `+${Number(r.rendLiquidoPct).toFixed(2)}%` : '—'}</td>
                    <td style={{ padding: '7px 8px', textAlign: 'right' }}>{new Date(r.data_vencimento).toLocaleDateString('pt-BR')}</td>
                    <td style={{ padding: '7px 8px', textAlign: 'right', minWidth: 80 }}>
                      <div style={{ height: 6, background: 'var(--border)', borderRadius: 3, overflow: 'hidden' }}>
                        <div style={{ width: `${r.progressoPct||0}%`, height: '100%', background: 'var(--accent)', borderRadius: 3 }} />
                      </div>
                      <span style={{ fontSize: 9, color: 'var(--text-muted)' }}>{r.progressoPct||0}%</span>
                    </td>
                  </tr>
                ))}
                <tr style={{ background: 'var(--bg)', fontWeight: 700 }}>
                  <td style={{ padding: '7px 8px' }}>Total RF</td>
                  <td colSpan={3} />
                  <td style={{ padding: '7px 8px', textAlign: 'right' }}>{fmt.brl(rfTotalInv)}</td>
                  <td style={{ padding: '7px 8px', textAlign: 'right', color: 'var(--warning)' }}>+{fmt.brl(rfTotalBruto)}</td>
                  <td style={{ padding: '7px 8px', textAlign: 'right', color: 'var(--danger)' }}>-{fmt.brl(rfTotalIR)}</td>
                  <td style={{ padding: '7px 8px', textAlign: 'right', color: 'var(--success)' }}>+{fmt.brl(rfTotalLiq)}</td>
                  <td style={{ padding: '7px 8px', textAlign: 'right', color: 'var(--success)' }}>~{fmt.pct(rfLiqPct)}</td>
                  <td colSpan={2} />
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      <p style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'center', paddingBottom: 8 }}>
        Dados via Brapi.dev · Banco Central do Brasil · Não é recomendação de investimento
      </p>

    </div>
  );
}
