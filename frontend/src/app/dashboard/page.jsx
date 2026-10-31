'use client';
import { useState, useEffect } from 'react';
import { RefreshCw } from 'lucide-react';
import api from '@/lib/api';
import { fmt } from '@/lib/utils';

// ── badge helpers ────────────────────────────────────────────────────────────
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

function ScoreDots({ score = 0, max = 5, tipo = 'ACAO' }) {
  const color = tipo === 'FII' ? 'var(--success)' : 'var(--accent)';
  return (
    <div style={{ display: 'flex', gap: 3 }}>
      {Array.from({ length: max }).map((_, i) => (
        <div key={i} style={{
          width: 6, height: 6, borderRadius: '50%',
          background: i < score ? color : 'var(--border)',
          flexShrink: 0,
        }} />
      ))}
    </div>
  );
}

function diasAteVencimento(v) {
  if (!v) return null;
  return Math.ceil((new Date(v) - new Date()) / 86400000);
}

export default function DashboardPage() {
  const [dados, setDados]       = useState(null);
  const [loading, setLoading]   = useState(true);
  const [atualizando, setAtualizando] = useState(false);

  const carregar = async () => {
    try {
      const agora = new Date();
      const mes = agora.getMonth() + 1;
      const ano = agora.getFullYear();
      const [dash, rf, divFii, divAcao] = await Promise.all([
        api.get('/dashboard'),
        api.get('/renda-fixa').catch(() => ({ data: { itens: [] } })),
        api.get(`/fiis/dividendos?mes=${mes}&ano=${ano}`).catch(() => ({ data: [] })),
        api.get(`/acoes/dividendos?mes=${mes}&ano=${ano}`).catch(() => ({ data: [] })),
      ]);
      setDados({
        ...dash.data,
        rendaFixaLista: Array.isArray(rf.data?.itens) ? rf.data.itens : [],
        dividendosFii:  Array.isArray(divFii.data)    ? divFii.data    : [],
        dividendosAcao: Array.isArray(divAcao.data)   ? divAcao.data   : [],
      });
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

    // Auto-refresh a cada 15 min durante o pregão (10h–17h, seg–sex)
    const intervalo = setInterval(() => {
      const agora = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
      const hora      = agora.getHours();
      const diaSemana = agora.getDay(); // 0=dom … 6=sab
      const diaUtil   = diaSemana >= 1 && diaSemana <= 5;
      const pregaoAberto = hora >= 10 && hora < 17;
      if (diaUtil && pregaoAberto) {
        carregar();
      }
    }, 15 * 60 * 1000); // 15 minutos

    return () => clearInterval(intervalo);
  }, []);

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 260 }}>
      <div style={{ width: 32, height: 32, border: '3px solid var(--warning)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
    </div>
  );
  if (!dados) return <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Nenhum dado disponível.</p>;

  const {
    resumo = {},
    rankingAcoes = [],
    rankingFIIs  = [],
    oportunidades = [],
    riscos = [],
    rendaFixaLista = [],
    dividendosFii  = [],
    dividendosAcao = [],
  } = dados;

  // ── cálculos ────────────────────────────────────────────────────────────────
  const ganhoTotal  = (resumo.ganhoAcoes || 0) + (resumo.ganhoFIIs || 0);
  const custoTotal  = (resumo.patrimonioTotal || 0) - ganhoTotal;
  const pctTotal    = custoTotal > 0 ? (ganhoTotal / custoTotal) * 100 : 0;
  const totalPatr   = resumo.patrimonioTotal || 0;

  const pctAcoes = totalPatr > 0 ? ((resumo.patrimonioAcoes  || 0) / totalPatr) * 100 : 0;
  const pctFIIs  = totalPatr > 0 ? ((resumo.patrimonioFIIs   || 0) / totalPatr) * 100 : 0;
  const pctRF    = totalPatr > 0 ? ((resumo.patrimonioRendaFixa || 0) / totalPatr) * 100 : 0;

  const custoAcoes   = (resumo.patrimonioAcoes || 0) - (resumo.ganhoAcoes || 0);
  const custoFIIs    = (resumo.patrimonioFIIs  || 0) - (resumo.ganhoFIIs  || 0);
  const pctRetAcoes  = custoAcoes > 0 ? ((resumo.ganhoAcoes || 0) / custoAcoes) * 100 : 0;
  const pctRetFIIs   = custoFIIs  > 0 ? ((resumo.ganhoFIIs  || 0) / custoFIIs)  * 100 : 0;

  const rfOrdenada = rendaFixaLista.map(r => ({ ...r, dias: diasAteVencimento(r.data_vencimento) }))
    .sort((a, b) => (a.dias ?? 9999) - (b.dias ?? 9999));
  const rfAlerta = rfOrdenada.filter(r => r.dias !== null && r.dias <= 90);

  const movers = [...rankingAcoes, ...rankingFIIs]
    .filter(a => a.variacao_dia != null)
    .sort((a, b) => Math.abs(b.variacao_dia) - Math.abs(a.variacao_dia))
    .slice(0, 6);

  // ── estilos base reutilizados ────────────────────────────────────────────────
  const card   = { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '18px 20px' };
  const label  = { fontSize: 11, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' };
  const muted  = { fontSize: 11, color: 'var(--text-muted)' };
  const dot    = c => ({ width: 8, height: 8, borderRadius: '50%', background: c, flexShrink: 0 });
  const divider = { borderBottom: '1px solid var(--border)' };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* ── HEADER ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.5px' }}>Dashboard</h2>
          <p style={{ ...muted, marginTop: 2 }}>Visão geral do seu patrimônio</p>
        </div>
        <button onClick={atualizarTodos} disabled={atualizando} className="btn-secondary">
          <RefreshCw size={14} style={atualizando ? { animation: 'spin 0.7s linear infinite' } : {}} />
          {atualizando ? 'Atualizando...' : 'Atualizar tudo'}
        </button>
      </div>

      {/* ── HERO ── */}
      <div style={{
        ...card, padding: '22px 28px',
        display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 0,
        position: 'relative', overflow: 'hidden',
      }}>
        {/* barra colorida topo */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3,
          background: 'linear-gradient(90deg,var(--accent) 0%,var(--success) 50%,var(--warning) 100%)' }} />

        {[
          {
            lbl: 'Patrimônio total',
            val: fmt.brl(totalPatr),
            sub: `${resumo.totalAtivos||0} ativos · ${resumo.totalAcoes||0} ações · ${resumo.totalFIIs||0} FIIs`,
            color: 'var(--text-primary)',
          },
          {
            lbl: 'Retorno acumulado',
            val: `${ganhoTotal >= 0 ? '+' : ''}${fmt.brl(ganhoTotal)}`,
            sub: `${ganhoTotal >= 0 ? '+' : ''}${fmt.pct(pctTotal)} desde o início`,
            color: ganhoTotal >= 0 ? 'var(--success)' : 'var(--danger)',
          },
          {
            lbl: 'Renda recebida (ano)',
            val: '—',
            sub: 'importe extrato B3 →',
            color: 'var(--text-muted)',
          },
          {
            lbl: 'Variação hoje',
            val: resumo.variacaoHoje != null ? `${resumo.variacaoHoje >= 0 ? '+' : ''}${fmt.pct(resumo.variacaoHoje)}` : '—',
            sub: 'via Brapi · cotação ao vivo',
            color: (resumo.variacaoHoje||0) >= 0 ? 'var(--success)' : 'var(--danger)',
          },
        ].map(({ lbl, val, sub, color }, i, arr) => (
          <div key={lbl} style={{
            padding: '0 24px',
            paddingLeft:  i === 0 ? 0 : 24,
            paddingRight: i === arr.length - 1 ? 0 : 24,
            borderRight:  i < arr.length - 1 ? '1px solid var(--border)' : 'none',
          }}>
            <p style={{ ...label, marginBottom: 8 }}>{lbl}</p>
            <p style={{ fontSize: 28, fontWeight: 800, color, letterSpacing: '-1px', lineHeight: 1, marginBottom: 5 }}>{val}</p>
            <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>{sub}</p>
          </div>
        ))}
      </div>

      {/* ── KPI ROW ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 12 }}>
        {[
          { icon: '📈', lbl: 'Ações',      val: fmt.brl(resumo.patrimonioAcoes||0),        sub: `${resumo.totalAcoes||0} ativos · ${fmt.pct(pctAcoes)}`,    delta: `${pctRetAcoes>=0?'+':''}${fmt.pct(pctRetAcoes)} retorno`, up: pctRetAcoes>=0, anchor: 'sec-ranking-acoes' },
          { icon: '🏢', lbl: 'FIIs',       val: fmt.brl(resumo.patrimonioFIIs||0),          sub: `${resumo.totalFIIs||0} fundos · ${fmt.pct(pctFIIs)}`,       delta: `${pctRetFIIs>=0?'+':''}${fmt.pct(pctRetFIIs)} retorno`,  up: pctRetFIIs>=0,  anchor: 'sec-ranking-fiis' },
          { icon: '📄', lbl: 'Renda Fixa', val: fmt.brl(resumo.patrimonioRendaFixa||0),     sub: `${rendaFixaLista.length} aplicações · ${fmt.pct(pctRF)}`,   delta: 'ver vencimentos ↓', up: true, anchor: 'sec-renda-fixa' },
          { icon: '🔭', lbl: 'No radar',   val: `${resumo.totalWatchlist||0} ativos`,       sub: 'monitorados',                                                delta: `${oportunidades.length} oportunidades`, up: oportunidades.length > 0, anchor: 'sec-radar' },
          { icon: '💰', lbl: 'Qualidade',  val: `${resumo.ativosExcelentes||0} excelentes`, sub: `${resumo.ativosRisco||0} em risco`,                         delta: `de ${resumo.totalAtivos||0} ativos`, up: true, anchor: null },
        ].map(({ icon, lbl, val, sub, delta, up, anchor }) => (
          <div
            key={lbl}
            onClick={anchor ? () => document.getElementById(anchor)?.scrollIntoView({ behavior: 'smooth' }) : undefined}
            style={{
              ...card, padding: '14px 16px',
              display: 'flex', flexDirection: 'column', gap: 3,
              cursor: anchor ? 'pointer' : 'default',
              transition: 'border-color 0.15s',
            }}
            onMouseEnter={e => anchor && (e.currentTarget.style.borderColor = 'var(--accent)')}
            onMouseLeave={e => anchor && (e.currentTarget.style.borderColor = 'var(--border)')}
          >
            <span style={{ fontSize: 18 }}>{icon}</span>
            <p style={{ ...label, marginTop: 2 }}>{lbl}</p>
            <p style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.5px' }}>{val}</p>
            <p style={muted}>{sub}</p>
            <p style={{ fontSize: 11, fontWeight: 700, color: up ? 'var(--success)' : 'var(--danger)', marginTop: 2 }}>{delta}</p>
          </div>
        ))}
      </div>

      {/* ── LINHA MÉDIA: Distribuição + Renda passiva + Variação hoje ── */}
      <div className="grid-3">

        {/* Distribuição */}
        <div style={card}>
          <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
            Distribuição do patrimônio
          </p>
          {[
            { lbl: 'Ações',      val: resumo.patrimonioAcoes||0,      pct: pctAcoes, color: 'var(--accent)'  },
            { lbl: 'FIIs',       val: resumo.patrimonioFIIs||0,        pct: pctFIIs,  color: 'var(--success)' },
            { lbl: 'Renda Fixa', val: resumo.patrimonioRendaFixa||0,   pct: pctRF,    color: 'var(--warning)' },
          ].filter(d => d.val > 0).map(d => (
            <div key={d.lbl} style={{ display: 'grid', gridTemplateColumns: '110px 1fr 40px 80px', gap: 8, alignItems: 'center', marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <div style={dot(d.color)} />
                <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{d.lbl}</span>
              </div>
              {/* barra */}
              <div style={{ height: 8, background: 'var(--bg)', borderRadius: 4, overflow: 'hidden', border: '1px solid var(--border)' }}>
                <div style={{ width: `${d.pct}%`, height: '100%', background: d.color, borderRadius: 4, minWidth: 4 }} />
              </div>
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', textAlign: 'right' }}>{fmt.pct(d.pct)}</span>
              <span style={{ ...muted, textAlign: 'right' }}>{fmt.brl(d.val)}</span>
            </div>
          ))}
          {totalPatr === 0 && <p style={muted}>Nenhum ativo cadastrado.</p>}
        </div>

        {/* Renda passiva */}
        {(() => {
          const totalRendBruto = rendaFixaLista.reduce((s, r) => s + parseFloat(r.rendBruto   || 0), 0);
          const totalRendLiq   = rendaFixaLista.reduce((s, r) => s + parseFloat(r.rendLiquido || 0), 0);
          const totalInvestido = rendaFixaLista.reduce((s, r) => s + parseFloat(r.valor_investido || 0), 0);

          // agrupar FII por ticker (soma valor_total)
          const fiiMap = {};
          dividendosFii.forEach(d => {
            fiiMap[d.ticker] = (fiiMap[d.ticker] || 0) + parseFloat(d.valor_total || 0);
          });
          const fiiLista = Object.entries(fiiMap)
            .map(([ticker, total]) => ({ ticker, total }))
            .sort((a, b) => b.total - a.total);
          const totalFii = fiiLista.reduce((s, d) => s + d.total, 0);

          // agrupar Ações por ticker
          const acaoMap = {};
          dividendosAcao.forEach(d => {
            acaoMap[d.ticker] = (acaoMap[d.ticker] || 0) + parseFloat(d.valor_total || 0);
          });
          const acaoLista = Object.entries(acaoMap)
            .map(([ticker, total]) => ({ ticker, total }))
            .sort((a, b) => b.total - a.total);
          const totalAcao = acaoLista.reduce((s, d) => s + d.total, 0);

          const totalGeral = totalRendLiq + totalFii + totalAcao;
          const temDados = rendaFixaLista.length > 0 || fiiLista.length > 0 || acaoLista.length > 0;

          return (
            <div style={card}>
              <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={dot('var(--warning)')} />Renda passiva recebida
              </p>

              {/* Total geral */}
              {temDados && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '9px 12px', borderRadius: 9, background: 'var(--bg-success)', border: '1px solid var(--border)', marginBottom: 14 }}>
                  <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Total recebido (mês)</span>
                  <span style={{ fontSize: 17, fontWeight: 800, color: 'var(--success)' }}>{fmt.brl(totalGeral)}</span>
                </div>
              )}

              {/* ── Renda Fixa ── */}
              {rendaFixaLista.length > 0 && (
                <div style={{ marginBottom: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--warning)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>📄 Renda Fixa</span>
                    <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{rendaFixaLista.length} aplicações</span>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
                    <div style={{ padding: '8px 10px', borderRadius: 8, background: 'var(--bg-warning)', border: '1px solid var(--border)' }}>
                      <p style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 2 }}>Rendimento bruto</p>
                      <p style={{ fontSize: 15, fontWeight: 800, color: 'var(--warning)' }}>{fmt.brl(totalRendBruto)}</p>
                      <p style={{ fontSize: 10, color: 'var(--text-muted)' }}>sobre {fmt.brl(totalInvestido)}</p>
                    </div>
                    <div style={{ padding: '8px 10px', borderRadius: 8, background: 'var(--bg-success)', border: '1px solid var(--border)' }}>
                      <p style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 2 }}>Rendimento líquido</p>
                      <p style={{ fontSize: 15, fontWeight: 800, color: 'var(--success)' }}>{fmt.brl(totalRendLiq)}</p>
                      <p style={{ fontSize: 10, color: 'var(--text-muted)' }}>após IR regressivo</p>
                    </div>
                  </div>
                  {rendaFixaLista.slice(0, 3).map((r, i) => (
                    <div key={r.id || i} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0', borderBottom: i < Math.min(rendaFixaLista.length, 3) - 1 ? '1px solid var(--border)' : 'none' }}>
                      <span style={{ fontSize: 11, color: 'var(--text-secondary)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.nome || r.instituicao}</span>
                      <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--success)', whiteSpace: 'nowrap' }}>+{fmt.brl(r.rendLiquido || 0)}</span>
                      <span style={{ fontSize: 10, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>{r.rendLiquidoPct ? `${Number(r.rendLiquidoPct).toFixed(1)}%` : ''}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* ── FIIs ── */}
              {fiiLista.length > 0 && (
                <>
                  {rendaFixaLista.length > 0 && <div style={{ height: 1, background: 'var(--border)', margin: '0 0 14px' }} />}
                  <div style={{ marginBottom: 14 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--success)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>🏢 FIIs</span>
                      <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{fiiLista.length} fundos</span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
                      <div style={{ padding: '8px 10px', borderRadius: 8, background: 'var(--bg-success)', border: '1px solid var(--border)' }}>
                        <p style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 2 }}>Dividendos recebidos</p>
                        <p style={{ fontSize: 15, fontWeight: 800, color: 'var(--success)' }}>{fmt.brl(totalFii)}</p>
                        <p style={{ fontSize: 10, color: 'var(--text-muted)' }}>isentos de IR</p>
                      </div>
                      <div style={{ padding: '8px 10px', borderRadius: 8, background: 'var(--bg)', border: '1px solid var(--border)' }}>
                        <p style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 2 }}>Rendimentos lançados</p>
                        <p style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-primary)' }}>{dividendosFii.length}</p>
                        <p style={{ fontSize: 10, color: 'var(--text-muted)' }}>no mês</p>
                      </div>
                    </div>
                    {fiiLista.slice(0, 3).map((d, i) => (
                      <div key={d.ticker} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0', borderBottom: i < Math.min(fiiLista.length, 3) - 1 ? '1px solid var(--border)' : 'none' }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-primary)', minWidth: 58 }}>{d.ticker}</span>
                        <span style={{ flex: 1 }} />
                        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--success)', whiteSpace: 'nowrap' }}>+{fmt.brl(d.total)}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {/* ── Ações ── */}
              {acaoLista.length > 0 && (
                <>
                  {(rendaFixaLista.length > 0 || fiiLista.length > 0) && <div style={{ height: 1, background: 'var(--border)', margin: '0 0 14px' }} />}
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                      <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>📈 Ações</span>
                      <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>{acaoLista.length} empresas</span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
                      <div style={{ padding: '8px 10px', borderRadius: 8, background: 'var(--bg-accent)', border: '1px solid var(--border)' }}>
                        <p style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 2 }}>Dividendos recebidos</p>
                        <p style={{ fontSize: 15, fontWeight: 800, color: 'var(--accent)' }}>{fmt.brl(totalAcao)}</p>
                        <p style={{ fontSize: 10, color: 'var(--text-muted)' }}>bruto (IRRF 15%)</p>
                      </div>
                      <div style={{ padding: '8px 10px', borderRadius: 8, background: 'var(--bg)', border: '1px solid var(--border)' }}>
                        <p style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 2 }}>Lançamentos</p>
                        <p style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-primary)' }}>{dividendosAcao.length}</p>
                        <p style={{ fontSize: 10, color: 'var(--text-muted)' }}>no mês</p>
                      </div>
                    </div>
                    {acaoLista.slice(0, 3).map((d, i) => (
                      <div key={d.ticker} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0', borderBottom: i < Math.min(acaoLista.length, 3) - 1 ? '1px solid var(--border)' : 'none' }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-primary)', minWidth: 58 }}>{d.ticker}</span>
                        <span style={{ flex: 1 }} />
                        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent)', whiteSpace: 'nowrap' }}>+{fmt.brl(d.total)}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {/* Aviso se nenhum dado ainda */}
              {!temDados && (
                <div style={{ padding: '10px 12px', borderRadius: 8, border: '1.5px dashed var(--border)', background: 'var(--bg)', fontSize: 11, color: 'var(--text-muted)', lineHeight: 1.6 }}>
                  <p style={{ fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 4 }}>📥 Para relatório completo, adicione:</p>
                  <p>• <strong>Dividendos de FIIs</strong> — Acesse <strong>FIIs → Importar B3</strong></p>
                  <p>• <strong>Dividendos de Ações</strong> — registre em <strong>Ações → Dividendos</strong></p>
                </div>
              )}
            </div>
          );
        })()}

        {/* Variação hoje */}
        <div style={card}>
          <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={dot('var(--accent)')} />Variação hoje
          </p>
          {movers.length === 0 && <p style={muted}>Atualize os ativos para ver a variação.</p>}
          {movers.map(a => (
            <div key={a.ticker} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 0', ...divider }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-primary)', minWidth: 58 }}>{a.ticker}</span>
              <span style={{ fontSize: 12, color: 'var(--text-muted)', flex: 1 }}>{fmt.brl(a.preco_atual)}</span>
              <span style={{
                fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20,
                background: (a.variacao_dia||0) >= 0 ? 'var(--bg-success)' : 'var(--bg-danger)',
                color:      (a.variacao_dia||0) >= 0 ? 'var(--success)'    : 'var(--danger)',
              }}>
                {(a.variacao_dia||0) >= 0 ? '+' : ''}{fmt.pct(a.variacao_dia)}
              </span>
            </div>
          ))}
          <p style={{ ...muted, marginTop: 10 }}>via Brapi.dev · cotações ao vivo</p>
        </div>
      </div>

      {/* ── RANKINGS ── */}
      <div className="grid-2" id="sec-ranking-acoes">

        {/* Ranking Ações */}
        <div style={card}>
          <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={dot('var(--accent)')} />Top Ações por score
          </p>
          {rankingAcoes.length === 0 && <p style={muted}>Nenhuma ação adicionada.</p>}
          {rankingAcoes.slice(0, 6).map((a, i) => (
            <div key={a.ticker} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0', ...(i < Math.min(rankingAcoes.length, 6) - 1 ? divider : {}) }}>
              <span style={{ ...muted, width: 16 }}>{i + 1}</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--accent)', minWidth: 58 }}>{a.ticker}</span>
              <span style={{ fontSize: 11, color: 'var(--text-muted)', flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.nome_ativo || ''}</span>
              <ScoreDots score={a.score} max={a.max_score || 6} tipo="ACAO" />
              <span className={badgeDecisao(a.decisao)} style={{ marginLeft: 4 }}>{labelDecisao(a.decisao)}</span>
              {a.variacao_dia != null && (
                <span style={{ fontSize: 11, fontWeight: 600, minWidth: 44, textAlign: 'right', color: (a.variacao_dia||0) >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                  {(a.variacao_dia||0) >= 0 ? '+' : ''}{fmt.pct(a.variacao_dia)}
                </span>
              )}
            </div>
          ))}
        </div>

        {/* Ranking FIIs */}
        <div style={card} id="sec-ranking-fiis">
          <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={dot('var(--success)')} />Top FIIs por score
          </p>
          {rankingFIIs.length === 0 && <p style={muted}>Nenhum FII adicionado.</p>}
          {rankingFIIs.slice(0, 6).map((f, i) => (
            <div key={f.ticker} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 0', ...(i < Math.min(rankingFIIs.length, 6) - 1 ? divider : {}) }}>
              <span style={{ ...muted, width: 16 }}>{i + 1}</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--success)', minWidth: 58 }}>{f.ticker}</span>
              <span style={{ fontSize: 11, color: 'var(--text-muted)', flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{f.nome_ativo || ''}</span>
              <ScoreDots score={f.score} max={f.max_score || 4} tipo="FII" />
              <span className={badgeDecisao(f.decisao)} style={{ marginLeft: 4 }}>{labelDecisao(f.decisao)}</span>
              {f.variacao_dia != null && (
                <span style={{ fontSize: 11, fontWeight: 600, minWidth: 44, textAlign: 'right', color: (f.variacao_dia||0) >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                  {(f.variacao_dia||0) >= 0 ? '+' : ''}{fmt.pct(f.variacao_dia)}
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ── RADAR + RENDA FIXA ── */}
      <div className="grid-3" id="sec-radar">

        {/* Radar Oportunidades */}
        <div style={card}>
          <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={dot('var(--success)')} />Radar de oportunidades
          </p>
          {oportunidades.length === 0 && <p style={muted}>Nenhuma oportunidade identificada.</p>}
          {oportunidades.slice(0, 5).map(a => (
            <div key={a.ticker} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 8, marginBottom: 6, background: 'var(--bg-success)' }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--success)', minWidth: 58 }}>{a.ticker}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>{a.tipo === 'FII' ? 'FII' : 'Ação'}</p>
                <p style={{ fontSize: 11, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {[a.pvp && `P/VP ${Number(a.pvp).toFixed(2)}`, a.dy_anual && `DY ${Number(a.dy_anual).toFixed(1)}%`, a.score && `Score ${a.score}/${a.max_score||4}`].filter(Boolean).join(' · ')}
                </p>
              </div>
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>{a.preco_atual ? fmt.brl(a.preco_atual) : ''}</span>
            </div>
          ))}
          <div style={{ marginTop: 10, padding: '8px 10px', borderRadius: 8, background: 'var(--bg)', border: '1px solid var(--border)', fontSize: 10, color: 'var(--text-muted)', lineHeight: 1.6 }}>
            💡 Critérios: P/VP &lt; 1 (FII) · DY acima da média · Score ≥ 4 · via Brapi.dev
          </div>
        </div>

        {/* Radar Risco */}
        <div style={card}>
          <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={dot('var(--danger)')} />Radar de risco
          </p>
          {riscos.length === 0 && <p style={muted}>Nenhum risco identificado.</p>}
          {riscos.slice(0, 5).map(a => (
            <div key={a.ticker} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 8, marginBottom: 6, background: 'var(--bg-danger)' }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--danger)', minWidth: 58 }}>{a.ticker}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>{a.tipo === 'FII' ? 'FII' : 'Ação'}</p>
                <p style={{ fontSize: 11, color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {[a.pvp && `P/VP ${Number(a.pvp).toFixed(2)}`, a.pl && `P/L ${Number(a.pl).toFixed(1)}`, a.score && `Score ${a.score}/${a.max_score||5}`].filter(Boolean).join(' · ')}
                </p>
              </div>
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>{a.preco_atual ? fmt.brl(a.preco_atual) : ''}</span>
            </div>
          ))}
          <div style={{ marginTop: 10, padding: '8px 10px', borderRadius: 8, background: 'var(--bg)', border: '1px solid var(--border)', fontSize: 10, color: 'var(--text-muted)', lineHeight: 1.6 }}>
            ⚠️ Critérios: P/VP &gt; 1,2 (FII) · P/L &gt; 30 (ação) · Score ≤ 2
          </div>
        </div>

        {/* Renda Fixa */}
        <div style={card} id="sec-renda-fixa">
          <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={dot('var(--warning)')} />Renda fixa
          </p>
          {rfAlerta.length > 0 && (
            <div style={{ marginBottom: 12, padding: '8px 10px', background: 'var(--bg-warning)', borderRadius: 8, border: '1px solid var(--warning)', fontSize: 11, color: 'var(--warning)', fontWeight: 600 }}>
              ⚠️ {rfAlerta[0].nome || rfAlerta[0].instituicao} vence em {rfAlerta[0].dias} dias — planeje o reinvestimento
            </div>
          )}
          {rendaFixaLista.length === 0 && <p style={muted}>Nenhuma aplicação cadastrada.</p>}
          {rfOrdenada.slice(0, 5).map((r, i) => {
            const alerta = r.dias !== null && r.dias <= 90;
            return (
              <div key={r.id || i} style={{
                display: 'grid', gridTemplateColumns: '1fr auto auto', alignItems: 'center', gap: 8,
                padding: alerta ? '8px 8px' : '8px 0',
                ...(i < rfOrdenada.length - 1 ? divider : {}),
                background: alerta ? 'var(--bg-warning)' : 'transparent',
                borderRadius: alerta ? 8 : 0,
              }}>
                <div>
                  <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>{r.nome || r.instituicao}</p>
                  <p style={{ fontSize: 10, color: alerta ? 'var(--warning)' : 'var(--text-muted)', fontWeight: alerta ? 600 : 400 }}>
                    {r.data_vencimento
                      ? `Vence ${new Date(r.data_vencimento).toLocaleDateString('pt-BR')}${r.dias !== null ? ` · ${r.dias} dias` : ''}`
                      : 'Sem vencimento'}
                  </p>
                </div>
                <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--success)', background: 'var(--bg-success)', padding: '2px 6px', borderRadius: 20, whiteSpace: 'nowrap' }}>
                  {r.indexador || r.tipo || ''}
                </span>
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', textAlign: 'right', whiteSpace: 'nowrap' }}>
                  {fmt.brl(r.valor_investido)}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── FOOTER ── */}
      <p style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'center', paddingBottom: 8 }}>
        Atualizado em {fmt.dataHora(dados.atualizadoEm)} · Dados via Brapi.dev · Não é recomendação de investimento
      </p>

    </div>
  );
}
