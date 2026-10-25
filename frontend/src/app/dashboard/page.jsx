'use client';
import { useState, useEffect } from 'react';
import { RefreshCw } from 'lucide-react';
import api from '@/lib/api';
import { fmt } from '@/lib/utils';

// ── helpers ─────────────────────────────────────────────────────────────────
function badgeDecisao(d = '') {
  const v = (d || '').toUpperCase();
  if (v.includes('COMPRAR') || v.includes('ACUMULAR')) return 'badge-comprar';
  if (v.includes('MANTER')) return 'badge-manter';
  if (v.includes('ACOMPANHAR') || v.includes('ATENÇÃO') || v.includes('ATENCAO')) return 'badge-atencao';
  return 'badge-risco';
}
function labelDecisao(d = '') {
  const v = (d || '').toUpperCase();
  if (v.includes('COMPRAR') || v.includes('ACUMULAR')) return 'Comprar';
  if (v.includes('MANTER')) return 'Manter';
  if (v.includes('ACOMPANHAR') || v.includes('ATENÇÃO') || v.includes('ATENCAO')) return 'Atenção';
  return 'Risco';
}
function ScoreDots({ score, max, tipo }) {
  const color = tipo === 'ACAO' ? 'var(--clr-accent)' : 'var(--clr-green)';
  return (
    <div style={{ display: 'flex', gap: 2 }}>
      {Array.from({ length: max || 5 }).map((_, i) => (
        <div key={i} style={{
          width: 6, height: 6, borderRadius: '50%',
          background: i < (score || 0) ? color : 'var(--clr-border)',
        }} />
      ))}
    </div>
  );
}

// ── card de seção vazia ──────────────────────────────────────────────────────
function EmptyMsg({ msg }) {
  return <p style={{ fontSize: 12, color: 'var(--clr-fg3)', padding: '12px 0' }}>{msg}</p>;
}

// ── alerta de vencimento RF ──────────────────────────────────────────────────
function diasAteVencimento(vencimento) {
  if (!vencimento) return null;
  const diff = (new Date(vencimento) - new Date()) / (1000 * 60 * 60 * 24);
  return Math.ceil(diff);
}

export default function DashboardPage() {
  const [dados, setDados]       = useState(null);
  const [loading, setLoading]   = useState(true);
  const [atualizando, setAtualizando] = useState(false);
  const [periodo, setPeriodo]   = useState('ano');

  const carregar = async () => {
    try {
      const [dash, rf, divs] = await Promise.all([
        api.get('/dashboard'),
        api.get('/renda-fixa'),
        api.get('/fiis/dividendos-resumo').catch(() => ({ data: null })),
      ]);
      setDados({ ...dash.data, rendaFixaLista: rf.data?.itens || [], dividendosResumo: divs.data });
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

  useEffect(() => { carregar(); }, []);

  // ── loading ──────────────────────────────────────────────────────────────
  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 256 }}>
      <div style={{ width: 32, height: 32, border: '2px solid var(--clr-amber)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
    </div>
  );

  if (!dados) return (
    <p style={{ color: 'var(--clr-fg3)', fontSize: 14 }}>Nenhum dado disponível. Adicione ações e FIIs nas abas de avaliação.</p>
  );

  // ── cálculos ─────────────────────────────────────────────────────────────
  const {
    resumo = {},
    rankingAcoes = [],
    rankingFIIs = [],
    oportunidades = [],
    riscos = [],
    rendaFixaLista = [],
    dividendosResumo = null,
  } = dados || {};

  const ganhoTotal   = (resumo.ganhoAcoes || 0) + (resumo.ganhoFIIs || 0);
  const totalInvest  = (resumo.patrimonioTotal || 0) - ganhoTotal;
  const pctTotal     = totalInvest > 0 ? (ganhoTotal / totalInvest) * 100 : 0;
  const totalPatr    = resumo.patrimonioTotal || 0;

  const pctAcoes = totalPatr > 0 ? (resumo.patrimonioAcoes / totalPatr) * 100 : 0;
  const pctFIIs  = totalPatr > 0 ? (resumo.patrimonioFIIs  / totalPatr) * 100 : 0;
  const pctRF    = totalPatr > 0 ? ((resumo.patrimonioRendaFixa || 0) / totalPatr) * 100 : 0;

  const custoAcoes  = (resumo.patrimonioAcoes || 0) - (resumo.ganhoAcoes || 0);
  const custoFIIs   = (resumo.patrimonioFIIs  || 0) - (resumo.ganhoFIIs  || 0);
  const pctRetAcoes = custoAcoes > 0 ? ((resumo.ganhoAcoes || 0) / custoAcoes) * 100 : 0;
  const pctRetFIIs  = custoFIIs > 0 ? ((resumo.ganhoFIIs  || 0) / custoFIIs)  * 100 : 0;

  // renda passiva — usa dividendosResumo se disponível
  const rendaAnual    = dividendosResumo?.totalAno  || 0;
  const rendaFIIs     = dividendosResumo?.totalFIIs || 0;
  const rendaAcoes    = dividendosResumo?.totalAcoes || 0;
  const rendaRF       = dividendosResumo?.totalRF   || 0;
  const temRendaReal  = rendaAnual > 0;

  // renda fixa — alertas de vencimento
  const rfOrdenada = (rendaFixaLista || []).map(r => ({
    ...r,
    diasVenc: diasAteVencimento(r.vencimento),
  })).sort((a, b) => (a.diasVenc ?? 9999) - (b.diasVenc ?? 9999));

  const rfAlerta = rfOrdenada.filter(r => r.diasVenc !== null && r.diasVenc <= 90);

  // ── estilos inline base ───────────────────────────────────────────────────
  const card = {
    background: 'var(--clr-surface)',
    border: '1px solid var(--clr-border)',
    borderRadius: 14,
    padding: '18px 20px',
  };
  const cardTitle = {
    fontSize: 13, fontWeight: 700, color: 'var(--clr-fg)',
    marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8,
  };
  const dot = (color) => ({ width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0 });
  const muted = { fontSize: 11, color: 'var(--clr-fg3)' };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* ── HEADER ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: 'var(--clr-fg)', letterSpacing: '-0.5px' }}>Dashboard</h2>
          <p style={{ fontSize: 13, color: 'var(--clr-fg3)', marginTop: 2 }}>Visão geral do seu patrimônio</p>
        </div>
        <button onClick={atualizarTodos} disabled={atualizando} className="btn-secondary">
          <RefreshCw size={14} style={atualizando ? { animation: 'spin 0.7s linear infinite' } : {}} />
          {atualizando ? 'Atualizando...' : 'Atualizar tudo'}
        </button>
      </div>

      {/* ── HERO PATRIMÔNIO ── */}
      <div style={{
        ...card, padding: '22px 28px',
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 0,
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3,
          background: 'linear-gradient(90deg, var(--clr-accent) 0%, var(--clr-green) 50%, var(--clr-amber) 100%)' }} />

        {[
          {
            label: 'Patrimônio total',
            valor: fmt.brl(totalPatr),
            sub: `${resumo.totalAtivos || 0} ativos · ${resumo.totalAcoes || 0} ações · ${resumo.totalFIIs || 0} FIIs`,
            color: 'var(--clr-fg)',
          },
          {
            label: 'Retorno acumulado',
            valor: `${ganhoTotal >= 0 ? '+' : ''}${fmt.brl(ganhoTotal)}`,
            sub: `${ganhoTotal >= 0 ? '+' : ''}${fmt.pct(pctTotal)} desde o início`,
            color: ganhoTotal >= 0 ? 'var(--clr-green)' : 'var(--clr-red)',
          },
          {
            label: 'Renda recebida (ano)',
            valor: temRendaReal ? fmt.brl(rendaAnual) : '—',
            sub: temRendaReal ? 'dividendos + juros reais' : 'importe extrato B3 →',
            color: temRendaReal ? 'var(--clr-amber)' : 'var(--clr-fg3)',
          },
          {
            label: 'Variação hoje',
            valor: resumo.variacaoHoje != null ? `${resumo.variacaoHoje >= 0 ? '+' : ''}${fmt.pct(resumo.variacaoHoje)}` : '—',
            sub: 'via Brapi · cotação ao vivo',
            color: (resumo.variacaoHoje || 0) >= 0 ? 'var(--clr-green)' : 'var(--clr-red)',
          },
        ].map(({ label, valor, sub, color }, idx, arr) => (
          <div key={label} style={{
            padding: '0 20px',
            paddingLeft: idx === 0 ? 0 : 20,
            paddingRight: idx === arr.length - 1 ? 0 : 20,
            borderRight: idx < arr.length - 1 ? '1px solid var(--clr-border)' : 'none',
          }}>
            <p style={{ ...muted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>{label}</p>
            <p style={{ fontSize: 26, fontWeight: 800, color, letterSpacing: '-0.8px', lineHeight: 1, marginBottom: 5 }}>{valor}</p>
            <p style={{ fontSize: 12, color: 'var(--clr-fg3)' }}>{sub}</p>
          </div>
        ))}
      </div>

      {/* ── KPI ROW ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12 }}>
        {[
          { icon: '📈', label: 'Ações',        valor: fmt.brl(resumo.patrimonioAcoes || 0), sub: `${resumo.totalAcoes || 0} ativos · ${fmt.pct(pctAcoes)}`, delta: `${pctRetAcoes >= 0 ? '+' : ''}${fmt.pct(pctRetAcoes)} retorno`, up: pctRetAcoes >= 0, anchor: 'dash-ranking-acoes' },
          { icon: '🏢', label: 'FIIs',         valor: fmt.brl(resumo.patrimonioFIIs  || 0), sub: `${resumo.totalFIIs || 0} fundos · ${fmt.pct(pctFIIs)}`,   delta: `${pctRetFIIs  >= 0 ? '+' : ''}${fmt.pct(pctRetFIIs)}  retorno`, up: pctRetFIIs  >= 0, anchor: 'dash-ranking-fiis' },
          { icon: '📄', label: 'Renda Fixa',   valor: fmt.brl(resumo.patrimonioRendaFixa || 0), sub: `${(rendaFixaLista || []).length} aplicações · ${fmt.pct(pctRF)}`, delta: 'veja vencimentos ↓', up: true, anchor: 'dash-renda-fixa' },
          { icon: '🔭', label: 'No radar',     valor: `${resumo.totalWatchlist || 0} ativos`, sub: 'monitorados',      delta: `${oportunidades.length} oportunidades`, up: oportunidades.length > 0, anchor: 'dash-radar' },
          { icon: '💰', label: 'Qualidade',    valor: `${resumo.ativosExcelentes || 0} excelentes`, sub: `${resumo.ativosRisco || 0} em risco`, delta: `de ${resumo.totalAtivos || 0} ativos`, up: true, anchor: null },
        ].map(({ icon, label, valor, sub, delta, up, anchor }) => (
          <div
            key={label}
            onClick={anchor ? () => document.getElementById(anchor)?.scrollIntoView({ behavior: 'smooth' }) : undefined}
            style={{
              ...card, padding: '14px 16px',
              cursor: anchor ? 'pointer' : 'default',
              transition: 'border-color 0.15s, box-shadow 0.15s',
            }}
            onMouseEnter={e => anchor && (e.currentTarget.style.borderColor = 'var(--clr-accent)')}
            onMouseLeave={e => anchor && (e.currentTarget.style.borderColor = 'var(--clr-border)')}
          >
            <div style={{ fontSize: 18, marginBottom: 4 }}>{icon}</div>
            <p style={{ ...muted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>{label}</p>
            <p style={{ fontSize: 18, fontWeight: 800, color: 'var(--clr-fg)', marginBottom: 2 }}>{valor}</p>
            <p style={{ ...muted, marginBottom: 4 }}>{sub}</p>
            <p style={{ fontSize: 11, fontWeight: 700, color: up ? 'var(--clr-green)' : 'var(--clr-red)' }}>{delta}</p>
          </div>
        ))}
      </div>

      {/* ── LINHA: Distribuição + Renda passiva + Variação hoje ── */}
      <div className="grid-3">

        {/* Distribuição */}
        <div style={card}>
          <p style={cardTitle}>Distribuição do patrimônio</p>
          {[
            { label: 'Ações',      valor: resumo.patrimonioAcoes || 0,      pct: pctAcoes, color: 'var(--clr-accent)' },
            { label: 'FIIs',       valor: resumo.patrimonioFIIs  || 0,      pct: pctFIIs,  color: 'var(--clr-green)'  },
            { label: 'Renda Fixa', valor: resumo.patrimonioRendaFixa || 0,  pct: pctRF,    color: 'var(--clr-amber)'  },
          ].filter(d => d.valor > 0).map(d => (
            <div key={d.label} style={{ display: 'grid', gridTemplateColumns: '120px 1fr 38px 80px', gap: 8, alignItems: 'center', marginBottom: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={dot(d.color)} />
                <span style={{ fontSize: 12, color: 'var(--clr-fg2)' }}>{d.label}</span>
              </div>
              <div style={{ height: 7, background: 'var(--clr-surface2)', borderRadius: 4, overflow: 'hidden', border: '1px solid var(--clr-border)' }}>
                <div style={{ width: `${d.pct}%`, height: '100%', background: d.color, borderRadius: 4 }} />
              </div>
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--clr-fg)', textAlign: 'right' }}>{fmt.pct(d.pct)}</span>
              <span style={{ fontSize: 11, color: 'var(--clr-fg3)', textAlign: 'right' }}>{fmt.brl(d.valor)}</span>
            </div>
          ))}
          {totalPatr === 0 && <EmptyMsg msg="Nenhum ativo cadastrado ainda." />}
        </div>

        {/* Renda passiva */}
        <div style={card}>
          <p style={cardTitle}><span style={dot('var(--clr-amber)')} />Renda passiva recebida</p>
          {temRendaReal ? (
            <>
              <p style={{ fontSize: 30, fontWeight: 800, color: 'var(--clr-green)', letterSpacing: '-1px', lineHeight: 1, marginBottom: 4 }}>{fmt.brl(rendaAnual)}</p>
              <p style={{ fontSize: 12, color: 'var(--clr-fg3)', marginBottom: 12 }}>recebidos em {new Date().getFullYear()}</p>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
                {rendaFIIs   > 0 && <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 20, background: 'var(--clr-green-bg)', color: 'var(--clr-green)'  }}>FIIs {fmt.brl(rendaFIIs)}</span>}
                {rendaAcoes  > 0 && <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 20, background: 'var(--clr-accent-bg)', color: 'var(--clr-accent)' }}>Ações {fmt.brl(rendaAcoes)}</span>}
                {rendaRF     > 0 && <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 20, background: 'var(--clr-amber-bg)',  color: 'var(--clr-amber)'  }}>RF {fmt.brl(rendaRF)}</span>}
              </div>
              <p style={{ fontSize: 10, color: 'var(--clr-fg3)', lineHeight: 1.5 }}>
                ℹ️ Dividendos via extrato B3 · Juros de renda fixa calculados automaticamente
              </p>
            </>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, padding: '20px 12px', border: '1.5px dashed var(--clr-border)', borderRadius: 10, textAlign: 'center' }}>
              <span style={{ fontSize: 28 }}>📥</span>
              <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--clr-fg2)' }}>Sem dividendos lançados</p>
              <p style={{ fontSize: 11, color: 'var(--clr-fg3)', lineHeight: 1.5, maxWidth: 200 }}>
                Acesse <strong>FIIs → ⬆ Importar B3</strong> para carregar seu extrato e ver a renda real aqui.
              </p>
            </div>
          )}
        </div>

        {/* Variação hoje — top movers */}
        <div style={card}>
          <p style={cardTitle}><span style={dot('var(--clr-accent)')} />Variação hoje</p>
          {[...rankingAcoes, ...rankingFIIs]
            .filter(a => a.variacao_dia != null)
            .sort((a, b) => Math.abs(b.variacao_dia) - Math.abs(a.variacao_dia))
            .slice(0, 6)
            .map(a => (
              <div key={a.ticker} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 0', borderBottom: '1px solid var(--clr-border)' }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--clr-fg)', minWidth: 60 }}>{a.ticker}</span>
                <span style={{ fontSize: 12, color: 'var(--clr-fg2)', flex: 1 }}>{fmt.brl(a.preco_atual)}</span>
                <span style={{
                  fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20,
                  background: (a.variacao_dia || 0) >= 0 ? 'var(--clr-green-bg)' : 'var(--clr-red-bg)',
                  color:      (a.variacao_dia || 0) >= 0 ? 'var(--clr-green)'    : 'var(--clr-red)',
                }}>
                  {(a.variacao_dia || 0) >= 0 ? '+' : ''}{fmt.pct(a.variacao_dia)}
                </span>
              </div>
            ))}
          {[...rankingAcoes, ...rankingFIIs].filter(a => a.variacao_dia != null).length === 0 && (
            <EmptyMsg msg="Atualize os ativos para ver a variação de hoje." />
          )}
          <p style={{ ...muted, marginTop: 10 }}>via Brapi.dev · cotações ao vivo</p>
        </div>
      </div>

      {/* ── RANKINGS ── */}
      <div className="grid-2" id="dash-ranking-acoes">

        {/* Ranking Ações */}
        <div style={card}>
          <p style={cardTitle}><span style={dot('var(--clr-accent)')} />Top Ações por score</p>
          {rankingAcoes.slice(0, 6).map((a, i) => (
            <div key={a.ticker} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0', borderBottom: i < Math.min(rankingAcoes.length, 6) - 1 ? '1px solid var(--clr-border)' : 'none' }}>
              <span style={{ fontSize: 11, color: 'var(--clr-fg3)', width: 16 }}>{i + 1}</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--clr-accent)', minWidth: 58 }}>{a.ticker}</span>
              <span style={{ fontSize: 11, color: 'var(--clr-fg3)', flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.nome_ativo || ''}</span>
              <ScoreDots score={a.score} max={a.max_score || 6} tipo="ACAO" />
              <span className={badgeDecisao(a.decisao)} style={{ marginLeft: 6 }}>{labelDecisao(a.decisao)}</span>
              {a.variacao_dia != null && (
                <span style={{ fontSize: 11, fontWeight: 600, minWidth: 44, textAlign: 'right', color: (a.variacao_dia||0) >= 0 ? 'var(--clr-green)' : 'var(--clr-red)' }}>
                  {(a.variacao_dia||0) >= 0 ? '+' : ''}{fmt.pct(a.variacao_dia)}
                </span>
              )}
            </div>
          ))}
          {rankingAcoes.length === 0 && <EmptyMsg msg="Nenhuma ação adicionada." />}
        </div>

        {/* Ranking FIIs */}
        <div style={card} id="dash-ranking-fiis">
          <p style={cardTitle}><span style={dot('var(--clr-green)')} />Top FIIs por score</p>
          {rankingFIIs.slice(0, 6).map((f, i) => (
            <div key={f.ticker} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0', borderBottom: i < Math.min(rankingFIIs.length, 6) - 1 ? '1px solid var(--clr-border)' : 'none' }}>
              <span style={{ fontSize: 11, color: 'var(--clr-fg3)', width: 16 }}>{i + 1}</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--clr-green)', minWidth: 58 }}>{f.ticker}</span>
              <span style={{ fontSize: 11, color: 'var(--clr-fg3)', flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{f.nome_ativo || ''}</span>
              <ScoreDots score={f.score} max={f.max_score || 4} tipo="FII" />
              <span className={badgeDecisao(f.decisao)} style={{ marginLeft: 6 }}>{labelDecisao(f.decisao)}</span>
              {f.variacao_dia != null && (
                <span style={{ fontSize: 11, fontWeight: 600, minWidth: 44, textAlign: 'right', color: (f.variacao_dia||0) >= 0 ? 'var(--clr-green)' : 'var(--clr-red)' }}>
                  {(f.variacao_dia||0) >= 0 ? '+' : ''}{fmt.pct(f.variacao_dia)}
                </span>
              )}
            </div>
          ))}
          {rankingFIIs.length === 0 && <EmptyMsg msg="Nenhum FII adicionado." />}
        </div>
      </div>

      {/* ── RADAR + RENDA FIXA ── */}
      <div className="grid-3" id="dash-radar">

        {/* Radar Oportunidades */}
        <div style={card}>
          <p style={cardTitle}><span style={dot('var(--clr-green)')} />Radar de oportunidades</p>
          {oportunidades.slice(0, 5).map(a => (
            <div key={a.ticker} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 8, marginBottom: 6, background: 'var(--clr-green-bg)' }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--clr-green)', minWidth: 58 }}>{a.ticker}</span>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--clr-fg)' }}>{a.tipo === 'FII' ? 'FII' : 'Ação'}</p>
                <p style={{ fontSize: 11, color: 'var(--clr-fg3)' }}>
                  {a.pvp ? `P/VP ${Number(a.pvp).toFixed(2)}` : ''}{a.dy_anual ? ` · DY ${Number(a.dy_anual).toFixed(1)}% a.a.` : ''}{a.score ? ` · Score ${a.score}/${a.max_score || 4}` : ''}
                </p>
              </div>
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--clr-fg2)' }}>{a.preco_atual ? fmt.brl(a.preco_atual) : ''}</span>
            </div>
          ))}
          {oportunidades.length === 0 && <EmptyMsg msg="Nenhuma oportunidade identificada." />}
          <div style={{ marginTop: 10, padding: '8px 10px', borderRadius: 8, background: 'var(--clr-surface2)', border: '1px solid var(--clr-border)', fontSize: 10, color: 'var(--clr-fg3)', lineHeight: 1.5 }}>
            💡 Critérios: P/VP &lt; 1 (FII) · DY acima da média · Score ≥ 4 · Dados via Brapi.dev
          </div>
        </div>

        {/* Radar Risco */}
        <div style={card}>
          <p style={cardTitle}><span style={dot('var(--clr-red)')} />Radar de risco</p>
          {riscos.slice(0, 5).map(a => (
            <div key={a.ticker} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 8, marginBottom: 6, background: 'var(--clr-red-bg)' }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--clr-red)', minWidth: 58 }}>{a.ticker}</span>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--clr-fg)' }}>{a.tipo === 'FII' ? 'FII' : 'Ação'}</p>
                <p style={{ fontSize: 11, color: 'var(--clr-fg3)' }}>
                  {a.pvp ? `P/VP ${Number(a.pvp).toFixed(2)}` : ''}{a.pl ? ` · P/L ${Number(a.pl).toFixed(1)}` : ''}{a.score ? ` · Score ${a.score}/${a.max_score || 5}` : ''}
                </p>
              </div>
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--clr-fg2)' }}>{a.preco_atual ? fmt.brl(a.preco_atual) : ''}</span>
            </div>
          ))}
          {riscos.length === 0 && <EmptyMsg msg="Nenhum risco identificado." />}
          <div style={{ marginTop: 10, padding: '8px 10px', borderRadius: 8, background: 'var(--clr-surface2)', border: '1px solid var(--clr-border)', fontSize: 10, color: 'var(--clr-fg3)', lineHeight: 1.5 }}>
            ⚠️ Critérios: P/VP &gt; 1,2 (FII) · P/L &gt; 30 (ação) · Score ≤ 2
          </div>
        </div>

        {/* Renda Fixa com vencimentos */}
        <div style={card} id="dash-renda-fixa">
          <p style={cardTitle}><span style={dot('var(--clr-amber)')} />Renda fixa</p>
          {rfAlerta.length > 0 && (
            <div style={{ marginBottom: 12, padding: '8px 10px', background: 'var(--clr-amber-bg)', borderRadius: 8, border: '1px solid var(--clr-amber)', fontSize: 11, color: 'var(--clr-amber)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
              ⚠️ {rfAlerta[0].nome} vence em {rfAlerta[0].diasVenc} dias — planejar reinvestimento
            </div>
          )}
          {rfOrdenada.slice(0, 5).map(r => (
            <div key={r.id} style={{
              display: 'grid', gridTemplateColumns: '1fr auto auto', alignItems: 'center', gap: 8,
              padding: r.diasVenc !== null && r.diasVenc <= 90 ? '8px 8px' : '8px 0',
              borderBottom: '1px solid var(--clr-border)',
              background: r.diasVenc !== null && r.diasVenc <= 90 ? 'var(--clr-amber-bg)' : 'transparent',
              borderRadius: r.diasVenc !== null && r.diasVenc <= 90 ? 8 : 0,
            }}>
              <div>
                <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--clr-fg)' }}>{r.nome || r.instituicao}</p>
                <p style={{ fontSize: 10, color: r.diasVenc !== null && r.diasVenc <= 90 ? 'var(--clr-amber)' : 'var(--clr-fg3)', fontWeight: r.diasVenc !== null && r.diasVenc <= 90 ? 600 : 400 }}>
                  {r.vencimento ? `Vence ${new Date(r.vencimento).toLocaleDateString('pt-BR')}${r.diasVenc !== null ? ` · ${r.diasVenc} dias` : ''}` : 'Sem vencimento'}
                </p>
              </div>
              <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--clr-green)', background: 'var(--clr-green-bg)', padding: '2px 6px', borderRadius: 20, whiteSpace: 'nowrap' }}>
                {r.indexador || r.tipo || ''}
              </span>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--clr-fg)', textAlign: 'right', whiteSpace: 'nowrap' }}>
                {fmt.brl(r.valor_investido)}
              </span>
            </div>
          ))}
          {rendaFixaLista.length === 0 && <EmptyMsg msg="Nenhuma aplicação cadastrada." />}
        </div>
      </div>

      {/* ── FOOTER ── */}
      <p style={{ fontSize: 11, color: 'var(--clr-fg3)', textAlign: 'center' }}>
        Atualizado em {fmt.dataHora(dados.atualizadoEm)} · Dados via Brapi.dev · Não é recomendação de investimento
      </p>
    </div>
  );
}
