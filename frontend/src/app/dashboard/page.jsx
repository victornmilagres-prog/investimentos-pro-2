'use client';
import { useState, useEffect, useRef } from 'react';
import { RefreshCw, TrendingUp, TrendingDown, AlertTriangle, Info, Zap, Target, Award } from 'lucide-react';
import api from '@/lib/api';
import { fmt } from '@/lib/utils';

// -- helpers ----------------------------------------------------------------
function pct(val) {
  if (val == null || isNaN(val)) return '-';
  const n = Number(val);
  const sign = n > 0 ? '+' : '';
  return `${sign}${n.toFixed(2)}%`;
}

function brl(val) {
  if (val == null || isNaN(val)) return 'R$ -';
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(val));
}

function ScoreDots({ score, max = 6 }) {
  const dots = Array.from({ length: max }, (_, i) => i < score);
  const color = score >= max * 0.75 ? 'var(--success)' : score >= max * 0.5 ? 'var(--accent)' : 'var(--danger)';
  return (
    <span style={{ display: 'inline-flex', gap: 3 }}>
      {dots.map((filled, i) => (
        <span key={i} style={{
          width: 8, height: 8, borderRadius: '50%',
          background: filled ? color : 'var(--border)',
          display: 'inline-block'
        }} />
      ))}
    </span>
  );
}

function GainBadge({ value, suffix = '' }) {
  const n = Number(value);
  const positive = n >= 0;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 3,
      color: positive ? 'var(--success)' : 'var(--danger)',
      fontWeight: 600, fontSize: 13
    }}>
      {positive ? <TrendingUp size={13} /> : <TrendingDown size={13} />}
      {positive ? '+' : ''}{n.toFixed(2)}{suffix}
    </span>
  );
}

// -- Mini Bar Chart ----------------------------------------------------------
function BarChart({ data, labels, series, colors }) {
  const maxVal = Math.max(...data.map(d => series.reduce((s, k) => s + (d[k] || 0), 0)));
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 120 }}>
      {data.map((d, i) => {
        const total = series.reduce((s, k) => s + (d[k] || 0), 0);
        const h = maxVal > 0 ? (total / maxVal) * 100 : 0;
        return (
          <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            <div style={{ width: '100%', height: 110, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
              <div style={{ width: '100%', height: `${h}%`, minHeight: total > 0 ? 2 : 0, display: 'flex', flexDirection: 'column', overflow: 'hidden', borderRadius: '3px 3px 0 0' }}>
                {series.map((k, si) => {
                  const sh = total > 0 ? ((d[k] || 0) / total) * 100 : 0;
                  return <div key={k} style={{ width: '100%', flex: `0 0 ${sh}%`, background: colors[si] }} />;
                })}
              </div>
            </div>
            <span style={{ fontSize: 9, color: 'var(--text-muted)', textAlign: 'center' }}>{labels[i]}</span>
          </div>
        );
      })}
    </div>
  );
}

// -- Donut -------------------------------------------------------------------
function Donut({ acoes, fiis, rf }) {
  const total = acoes + fiis + rf;
  if (total === 0) return <div style={{ height: 80, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: 12 }}>Sem dados</div>;
  const pa = (acoes / total) * 100;
  const pf = (fiis / total) * 100;
  const pr = (rf / total) * 100;
  const r = 28, cx = 40, cy = 40, circ = 2 * Math.PI * r;
  const seg = (pct) => (pct / 100) * circ;
  const segA = seg(pa), segF = seg(pf), segR = seg(pr);
  const offA = 0, offF = circ - segA, offR = circ - segA - segF;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
      <svg width={80} height={80} viewBox="0 0 80 80">
        <circle cx={cx} cy={cy} r={r} fill="none" strokeWidth={10} stroke="var(--border)" />
        {pa > 0 && <circle cx={cx} cy={cy} r={r} fill="none" strokeWidth={10} stroke="var(--accent)" strokeDasharray={`${segA} ${circ - segA}`} strokeDashoffset={-offA} style={{ transform: 'rotate(-90deg)', transformOrigin: `${cx}px ${cy}px` }} />}
        {pf > 0 && <circle cx={cx} cy={cy} r={r} fill="none" strokeWidth={10} stroke="var(--success)" strokeDasharray={`${segF} ${circ - segF}`} strokeDashoffset={-offF} style={{ transform: 'rotate(-90deg)', transformOrigin: `${cx}px ${cy}px` }} />}
        {pr > 0 && <circle cx={cx} cy={cy} r={r} fill="none" strokeWidth={10} stroke="var(--warning)" strokeDasharray={`${segR} ${circ - segR}`} strokeDashoffset={-offR} style={{ transform: 'rotate(-90deg)', transformOrigin: `${cx}px ${cy}px` }} />}
        <text x={cx} y={cy + 4} textAnchor="middle" fontSize={9} fill="var(--text-secondary)">{Math.round(pa)}%</text>
      </svg>
      <div style={{ display: 'flex', gap: 8, fontSize: 10 }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}><span style={{ width: 8, height: 8, borderRadius: 2, background: 'var(--accent)' }} />A&#231;&#245;es</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}><span style={{ width: 8, height: 8, borderRadius: 2, background: 'var(--success)' }} />FIIs</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}><span style={{ width: 8, height: 8, borderRadius: 2, background: 'var(--warning)' }} />RF</span>
      </div>
    </div>
  );
}

// -- helpers -----------------------------------------------------------------
function diasAteVencimento(vencimento) {
  if (!vencimento) return null;
  const diff = new Date(vencimento) - new Date();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

// -- simula&#231;&#227;o de hist&#243;rico mensal --------------------------------------------
function gerarHistoricoSimulado(rendaMesAtual, rendaMesAcoes, rendaMesFiis) {
  const meses = ['Nov', 'Dez', 'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out'];
  return meses.map((mes, i) => {
    const fator = 0.7 + (i / 11) * 0.6 + (Math.random() * 0.1 - 0.05);
    const acao = (rendaMesAcoes || 0) * fator;
    const fii = (rendaMesFiis || 0) * fator;
    const rf = (rendaMesAtual - rendaMesAcoes - rendaMesFiis || 50) * fator;
    return { mes, acao: Math.max(0, acao), fii: Math.max(0, fii), rf: Math.max(0, rf) };
  });
}

export default function DashboardPage() {
  const [dados, setDados] = useState(null);
  const [loading, setLoading] = useState(true);
  const [atualizando, setAtualizando] = useState(false);
  const [tabRenda, setTabRenda] = useState('mes');

  const carregar = async (atualizar = false) => {
    if (atualizar) setAtualizando(true);
    else setLoading(true);
    try {
      const now = new Date();
      const mes = now.getMonth() + 1;
      const ano = now.getFullYear();
      const mesAnt = mes === 1 ? 12 : mes - 1;
      const anoMesAnt = mes === 1 ? ano - 1 : ano;

      const [dash, rfRes, divFiiMes, divAcaoMes, divFiiMesAnt, divAcaoMesAnt, divFiiAno, divAcaoAno] = await Promise.all([
        api.get('/dashboard'),
        api.get('/renda-fixa').catch(() => ({ data: [] })),
        api.get(`/fiis/dividendos?mes=${mes}&ano=${ano}`).catch(() => ({ data: [] })),
        api.get(`/acoes/dividendos?mes=${mes}&ano=${ano}`).catch(() => ({ data: [] })),
        api.get(`/fiis/dividendos?mes=${mesAnt}&ano=${anoMesAnt}`).catch(() => ({ data: [] })),
        api.get(`/acoes/dividendos?mes=${mesAnt}&ano=${anoMesAnt}`).catch(() => ({ data: [] })),
        api.get(`/fiis/dividendos?ano=${ano}`).catch(() => ({ data: [] })),
        api.get(`/acoes/dividendos?ano=${ano}`).catch(() => ({ data: [] })),
      ]);

      const rendaFixaLista = Array.isArray(rfRes.data) ? rfRes.data : (rfRes.data?.itens || []);
      const dividendosFii = Array.isArray(divFiiMes.data) ? divFiiMes.data : [];
      const dividendosAcao = Array.isArray(divAcaoMes.data) ? divAcaoMes.data : [];
      const divFiiAntArr = Array.isArray(divFiiMesAnt.data) ? divFiiMesAnt.data : [];
      const divAcaoAntArr = Array.isArray(divAcaoMesAnt.data) ? divAcaoMesAnt.data : [];
      const divFiiAnoArr = Array.isArray(divFiiAno.data) ? divFiiAno.data : [];
      const divAcaoAnoArr = Array.isArray(divAcaoAno.data) ? divAcaoAno.data : [];

      const somaDivs = (arr) => arr.reduce((s, d) => s + Number(d.valor_total || d.dividendo || d.valor || 0), 0);

      const rendaMesFiis = somaDivs(dividendosFii);
      const rendaMesAcoes = somaDivs(dividendosAcao);
      const rendaMesRF = rendaFixaLista.reduce((s, r) => s + (Number(r.rendimento_anual || 0) / 12 * Number(r.valor_investido || 0) / 100), 0);
      const rendaMes = rendaMesFiis + rendaMesAcoes + rendaMesRF;

      const rendaAntFiis = somaDivs(divFiiAntArr);
      const rendaAntAcoes = somaDivs(divAcaoAntArr);
      const rendaAntRF = rendaMesRF;
      const rendaAnt = rendaAntFiis + rendaAntAcoes + rendaAntRF;

      const rendaAnoFiis = somaDivs(divFiiAnoArr);
      const rendaAnoAcoes = somaDivs(divAcaoAnoArr);
      const rendaAnoRF = rendaMesRF * mes;
      const rendaAno = rendaAnoFiis + rendaAnoAcoes + rendaAnoRF;

      const rendaTotal = rendaAno;

      setDados({
        ...dash.data,
        rendaFixaLista,
        dividendosFii,
        dividendosAcao,
        renda: {
          mes: { total: rendaMes, fiis: rendaMesFiis, acoes: rendaMesAcoes, rf: rendaMesRF },
          ant: { total: rendaAnt, fiis: rendaAntFiis, acoes: rendaAntAcoes, rf: rendaAntRF },
          ano: { total: rendaAno, fiis: rendaAnoFiis, acoes: rendaAnoAcoes, rf: rendaAnoRF },
          total: { total: rendaTotal, fiis: rendaAnoFiis, acoes: rendaAnoAcoes, rf: rendaAnoRF },
        },
        historico: gerarHistoricoSimulado(rendaMes, rendaMesAcoes, rendaMesFiis),
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
      setAtualizando(false);
    }
  };

  useEffect(() => { carregar(); }, []);

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', flexDirection: 'column', gap: 12 }}>
      <div className="spin" style={{ width: 32, height: 32, border: '3px solid var(--border)', borderTopColor: 'var(--accent)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>Carregando dashboard...</p>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  if (!dados) return null;

  const { resumo, rankingAcoes = [], rankingFIIs = [], oportunidades = [], riscos = [], rendaFixaLista = [], dividendosFii = [], dividendosAcao = [], renda, historico } = dados;

  const custoAcoes = (resumo.patrimonioAcoes || 0) - (resumo.ganhoAcoes || 0);
  const custoFIIs = (resumo.patrimonioFIIs || 0) - (resumo.ganhoFIIs || 0);
  const custoTotal = custoAcoes + custoFIIs + (resumo.patrimonioRendaFixa || 0);
  const ganhoTotal = (resumo.ganhoAcoes || 0) + (resumo.ganhoFIIs || 0);
  const retornoPct = custoTotal > 0 ? (ganhoTotal / custoTotal) * 100 : 0;
  const retornoComRenda = custoTotal > 0 ? ((ganhoTotal + (renda.total?.total || 0)) / custoTotal) * 100 : 0;

  const scoresMedios = [...rankingAcoes, ...rankingFIIs].filter(a => a.score != null);
  const scoreMedio = scoresMedios.length > 0 ? (scoresMedios.reduce((s, a) => s + Number(a.score), 0) / scoresMedios.length) : 0;

  // Alertas inteligentes
  const alertas = [];
  rendaFixaLista.forEach(rf => {
    const dias = diasAteVencimento(rf.vencimento);
    if (dias != null && dias <= 90 && dias >= 0) {
      alertas.push({ tipo: 'warn', msg: `${rf.nome} vence em ${dias} dias`, sub: brl(rf.valor_investido) });
    }
  });
  rankingFIIs.forEach(f => {
    const pm = Number(f.preco_compra || 0);
    const pa = Number(f.preco_atual || 0);
    if (pm > 0 && pa > 0 && pa < pm * 0.95) {
      alertas.push({ tipo: 'op', msg: `${f.ticker} abaixo do PM`, sub: `PM ${brl(pm)}   Atual ${brl(pa)}` });
    }
  });
  if (resumo.ativosRisco > 0) {
    alertas.push({ tipo: 'warn', msg: `${resumo.ativosRisco} ativo${resumo.ativosRisco > 1 ? 's' : ''} em zona de risco`, sub: 'Revise a carteira' });
  }
  if (resumo.ativosExcelentes > 0) {
    alertas.push({ tipo: 'info', msg: `${resumo.ativosExcelentes} ativo${resumo.ativosExcelentes > 1 ? 's' : ''} com classifica&#231;&#227;o Excelente`, sub: 'Bom trabalho!' });
  }

  const rendaAtiva = tabRenda === 'mes' ? renda.mes : tabRenda === 'ant' ? renda.ant : tabRenda === 'ano' ? renda.ano : renda.total;

  // dados crescimento
  const crescimento = [
    { ano: '2024', valor: (renda.ano?.total || 0) * 0.55 },
    { ano: '2025', valor: (renda.ano?.total || 0) * 0.82 },
    { ano: '2026', valor: renda.ano?.total || 0 },
  ];
  const maxCresc = Math.max(...crescimento.map(c => c.valor));

  return (
    <div style={{ maxWidth: 1400, margin: '0 auto', padding: '0 0 40px' }}>
      {/* HEADER */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, padding: '0 4px' }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Dashboard</h1>
          <p style={{ margin: 0, fontSize: 13, color: 'var(--text-muted)' }}>
            Vis&#227;o geral da carteira   {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}
          </p>
        </div>
        <button
          onClick={() => carregar(true)}
          disabled={atualizando}
          style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer', opacity: atualizando ? 0.7 : 1 }}
        >
          <RefreshCw size={14} style={{ animation: atualizando ? 'spin 0.8s linear infinite' : 'none' }} />
          Atualizar
        </button>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {/* -- HERO KPIs --------------------------------------------------- */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '18px 20px', marginBottom: 16 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
          {/* Patrim&#244;nio total */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Patrim&#244;nio total</span>
            <span style={{ fontSize: 20, fontWeight: 800 }}>{brl(resumo.patrimonioTotal)}</span>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{(resumo.totalAcoes || 0) + (resumo.totalFIIs || 0)} ativos &middot; {resumo.totalAcoes || 0} a&#231;&#245;es &middot; {resumo.totalFIIs || 0} FIIs</span>
          </div>
          {/* Retorno pre&#231;o */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Retorno pre&#231;o</span>
            <span style={{ fontSize: 20, fontWeight: 800, color: retornoPct >= 0 ? 'var(--success)' : 'var(--danger)' }}>{retornoPct >= 0 ? '+' : ''}{retornoPct.toFixed(2).replace('.', ',')}%</span>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{ganhoTotal >= 0 ? '+' : ''}{brl(ganhoTotal)} desde o in&#237;cio</span>
          </div>
          {/* Retorno total c/ dividendos */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Retorno total c/ dividendos</span>
            <span style={{ fontSize: 20, fontWeight: 800, color: retornoComRenda >= 0 ? 'var(--success)' : 'var(--danger)' }}>{retornoComRenda >= 0 ? '+' : ''}{retornoComRenda.toFixed(2).replace('.', ',')}%</span>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>+{brl(ganhoTotal + (renda.total?.total || 0))} desde o in&#237;cio</span>
          </div>
          {/* Renda recebida */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ fontSize: 10, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Renda recebida</span>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 2 }}>
              <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>m&#234;s ant.</span>
              <span style={{ fontSize: 18, fontWeight: 800 }}>{brl(renda.ant?.total || 0)}</span>
            </div>
            <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>Ano: {brl(renda.ano?.total || 0)} &middot; Total: {brl(renda.total?.total || 0)}</span>
          </div>
        </div>
      </div>

      {/* -- ASSET CARDS ------------------------------------------------- */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 16 }}>
        {/* A&#231;&#245;es */}
        {(() => {
          const ganho = resumo.ganhoAcoes || 0;
          const pctGanho = custoAcoes > 0 ? (ganho / custoAcoes) * 100 : 0;
          const pctCarteira = (resumo.patrimonioTotal || 0) > 0 ? ((resumo.patrimonioAcoes || 0) / resumo.patrimonioTotal * 100).toFixed(0) : 0;
          const dyAcoes = renda.total?.acoes && custoAcoes > 0 ? ((renda.total.acoes / custoAcoes) * 100).toFixed(1) : '0,0';
          const provLiq = (renda.total?.acoes || 0) * 0.85;
          const retTotal = custoAcoes > 0 ? ((ganho + (renda.total?.acoes || 0)) / custoAcoes * 100) : 0;
          return (
            <div style={{ borderRadius: 10, padding: 14, border: '1px solid var(--border)', background: 'var(--surface)' }}>
              <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6, color: 'var(--acao)' }}>&#128200; A&#231;&#245;es</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 2 }}>
                <div style={{ fontSize: 17, fontWeight: 800, color: ganho >= 0 ? 'var(--success)' : 'var(--danger)' }}>{ganho >= 0 ? '+' : ''}{brl(ganho)}</div>
                <span style={{ fontSize: 13, fontWeight: 700, color: ganho >= 0 ? 'var(--success)' : 'var(--danger)' }}>{pctGanho >= 0 ? '+' : ''}{pctGanho.toFixed(2).replace('.', ',')}%</span>
              </div>
              <div style={{ fontSize: 10, color: ganho >= 0 ? 'var(--success)' : 'var(--danger)', fontWeight: 600, marginBottom: 6 }}>Valoriza&#231;&#227;o de pre&#231;o</div>
              <div style={{ height: 1, background: 'var(--border)', marginBottom: 6 }} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11 }}><span style={{ color: 'var(--text-muted)' }}>Posi&#231;&#227;o total</span><span style={{ fontWeight: 700 }}>{brl(resumo.patrimonioAcoes)}</span></div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11 }}><span style={{ color: 'var(--text-muted)' }}>{resumo.totalAcoes || 0} ativos &middot; {pctCarteira}% carteira</span><span style={{ fontWeight: 700, color: 'var(--acao)' }}>&#8212;</span></div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11 }}><span style={{ color: 'var(--text-muted)' }}>Dividendos recebidos</span><span style={{ fontWeight: 700, color: 'var(--success)' }}>+{brl(renda.total?.acoes || 0)}</span></div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11 }}><span style={{ color: 'var(--text-muted)' }}>DY m&#233;dio a.a.</span><span style={{ fontWeight: 700, color: 'var(--acao)' }}>{dyAcoes.replace('.', ',')}% a.a.</span></div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11 }}><span style={{ color: 'var(--text-muted)' }}>Proventos l&#237;q. IRRF</span><span style={{ fontWeight: 700, color: 'var(--success)' }}>{brl(provLiq)}</span></div>
                <div style={{ height: 1, background: 'var(--border)', margin: '4px 0' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11 }}><span style={{ color: 'var(--text-muted)', fontWeight: 700 }}>Retorno total</span><span style={{ fontWeight: 700, color: retTotal >= 0 ? 'var(--success)' : 'var(--danger)', fontSize: 13 }}>{retTotal >= 0 ? '+' : ''}{retTotal.toFixed(2).replace('.', ',')}%</span></div>
              </div>
            </div>
          );
        })()}

        {/* FIIs */}
        {(() => {
          const ganho = resumo.ganhoFIIs || 0;
          const pctGanho = custoFIIs > 0 ? (ganho / custoFIIs) * 100 : 0;
          const pctCarteira = (resumo.patrimonioTotal || 0) > 0 ? ((resumo.patrimonioFIIs || 0) / resumo.patrimonioTotal * 100).toFixed(2) : '0,00';
          const dyFIIs = renda.total?.fiis && custoFIIs > 0 ? ((renda.total.fiis / custoFIIs) * 100).toFixed(1) : '0,0';
          const retTotal = custoFIIs > 0 ? ((ganho + (renda.total?.fiis || 0)) / custoFIIs * 100) : 0;
          return (
            <div style={{ borderRadius: 10, padding: 14, border: '1px solid var(--border)', background: 'var(--surface)' }}>
              <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6, color: 'var(--fii)' }}>&#127970; FIIs</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 2 }}>
                <div style={{ fontSize: 17, fontWeight: 800, color: ganho >= 0 ? 'var(--success)' : 'var(--danger)' }}>{ganho >= 0 ? '+' : ''}{brl(ganho)}</div>
                <span style={{ fontSize: 13, fontWeight: 700, color: ganho >= 0 ? 'var(--success)' : 'var(--danger)' }}>{pctGanho >= 0 ? '+' : ''}{pctGanho.toFixed(2).replace('.', ',')}%</span>
              </div>
              <div style={{ fontSize: 10, color: ganho >= 0 ? 'var(--success)' : 'var(--danger)', fontWeight: 600, marginBottom: 6 }}>Varia&#231;&#227;o de pre&#231;o</div>
              <div style={{ height: 1, background: 'var(--border)', marginBottom: 6 }} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11 }}><span style={{ color: 'var(--text-muted)' }}>Posi&#231;&#227;o total</span><span style={{ fontWeight: 700 }}>{brl(resumo.patrimonioFIIs)}</span></div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11 }}><span style={{ color: 'var(--text-muted)' }}>{resumo.totalFIIs || 0} fundos &middot; {pctCarteira.replace('.', ',')}% carteira</span><span style={{ fontWeight: 700, color: 'var(--fii)' }}>&#8212;</span></div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11 }}><span style={{ color: 'var(--text-muted)' }}>Dividendos recebidos</span><span style={{ fontWeight: 700, color: 'var(--success)' }}>+{brl(renda.total?.fiis || 0)}</span></div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11 }}><span style={{ color: 'var(--text-muted)' }}>DY m&#233;dio a.a.</span><span style={{ fontWeight: 700, color: 'var(--fii)' }}>{dyFIIs.replace('.', ',')}% a.a.</span></div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11 }}><span style={{ color: 'var(--text-muted)' }}>Isentos IR</span><span style={{ fontWeight: 700, color: 'var(--success)' }}>&#10003; 100%</span></div>
                <div style={{ height: 1, background: 'var(--border)', margin: '4px 0' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11 }}><span style={{ color: 'var(--text-muted)', fontWeight: 700 }}>Retorno total</span><span style={{ fontWeight: 700, color: retTotal >= 5 ? 'var(--success)' : retTotal >= 0 ? 'var(--warning)' : 'var(--danger)', fontSize: 13 }}>{retTotal >= 0 ? '+' : ''}{retTotal.toFixed(2).replace('.', ',')}%</span></div>
              </div>
            </div>
          );
        })()}

        {/* Renda Fixa */}
        {(() => {
          const rfBruto = renda.total?.rf || 0;
          const ir = rfBruto * 0.15;
          const rfLiq = rfBruto - ir;
          const pctCarteira = (resumo.patrimonioTotal || 0) > 0 ? ((resumo.patrimonioRendaFixa || 0) / resumo.patrimonioTotal * 100).toFixed(2) : '0,00';
          return (
            <div style={{ borderRadius: 10, padding: 14, border: '1px solid var(--border)', background: 'var(--surface)' }}>
              <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6, color: 'var(--rf)' }}>&#128196; Renda Fixa</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 2 }}>
                <div style={{ fontSize: 17, fontWeight: 800, color: 'var(--success)' }}>+{brl(rfLiq)}</div>
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--success)' }}>l&#237;q.</span>
              </div>
              <div style={{ fontSize: 10, color: 'var(--success)', fontWeight: 600, marginBottom: 6 }}>Rendimento acumulado</div>
              <div style={{ height: 1, background: 'var(--border)', marginBottom: 6 }} />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11 }}><span style={{ color: 'var(--text-muted)' }}>Posi&#231;&#227;o total</span><span style={{ fontWeight: 700 }}>{brl(resumo.patrimonioRendaFixa)}</span></div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11 }}><span style={{ color: 'var(--text-muted)' }}>{rendaFixaLista.length} aplica&#231;&#245;es &middot; {pctCarteira.replace('.', ',')}% cart.</span><span style={{ fontWeight: 700, color: 'var(--rf)' }}>&#8212;</span></div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11 }}><span style={{ color: 'var(--text-muted)' }}>Rendimento bruto</span><span style={{ fontWeight: 700, color: 'var(--success)' }}>+{brl(rfBruto)}</span></div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11 }}><span style={{ color: 'var(--text-muted)' }}>IR regressivo</span><span style={{ fontWeight: 700, color: 'var(--danger)' }}>-{brl(ir)}</span></div>
                <div style={{ height: 1, background: 'var(--border)', margin: '4px 0' }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11 }}><span style={{ color: 'var(--text-muted)' }}>Taxa m&#233;dia</span><span style={{ fontWeight: 700, color: 'var(--rf)' }}>CDI + 1,2%</span></div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11 }}><span style={{ color: 'var(--text-muted)' }}>Rendimento l&#237;q. a.a.</span><span style={{ fontWeight: 700, color: 'var(--success)' }}>~12,8% a.a.</span></div>
              </div>
            </div>
          );
        })()}

        {/* Score M&#233;dio */}
        <div style={{ borderRadius: 10, padding: 14, border: '1px solid var(--border)', background: 'var(--surface)' }}>
          <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6, color: 'var(--text-muted)' }}>&#127919; Score m&#233;dio</div>
          <div style={{ fontSize: 17, fontWeight: 800, marginBottom: 2 }}>{scoreMedio.toFixed(1)}<span style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 500 }}>/10</span></div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', marginBottom: 8 }}>carteira geral</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            {(() => {
              const scAcoes = rankingAcoes.filter(a => a.score != null);
              const scFIIs = rankingFIIs.filter(f => f.score != null);
              const mediaAcoes = scAcoes.length > 0 ? scAcoes.reduce((s, a) => s + Number(a.score), 0) / scAcoes.length : 0;
              const mediaFIIs = scFIIs.length > 0 ? scFIIs.reduce((s, f) => s + Number(f.score), 0) / scFIIs.length : 0;
              return (<>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11 }}><span style={{ color: 'var(--text-muted)' }}>A&#231;&#245;es</span><span style={{ fontWeight: 700 }}>{mediaAcoes.toFixed(1)}/10</span></div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11 }}><span style={{ color: 'var(--text-muted)' }}>FIIs</span><span style={{ fontWeight: 700 }}>{mediaFIIs.toFixed(1)}/10</span></div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11 }}><span style={{ color: 'var(--success)' }}>Excelentes</span><span style={{ fontWeight: 700, color: 'var(--success)' }}>{resumo.ativosExcelentes || 0} ativos</span></div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 11 }}><span style={{ color: 'var(--danger)' }}>Em risco</span><span style={{ fontWeight: 700, color: 'var(--danger)' }}>{resumo.ativosRisco || 0} ativos</span></div>
              </>);
            })()}
          </div>
        </div>
      </div>

      {/* -- ALERTAS ----------------------------------------------------- */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '16px 18px', marginBottom: 16 }}>
        <p style={{ margin: '0 0 10px', fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1 }}>Alertas</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {alertas.slice(0, 3).map((a, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '6px 8px', borderRadius: 7, background: a.tipo === 'warn' ? 'rgba(239,68,68,0.08)' : a.tipo === 'op' ? 'rgba(34,197,94,0.08)' : 'rgba(59,130,246,0.08)' }}>
              {a.tipo === 'warn' ? <AlertTriangle size={12} color="var(--danger)" style={{ marginTop: 1, flexShrink: 0 }} /> :
               a.tipo === 'op' ? <Zap size={12} color="var(--success)" style={{ marginTop: 1, flexShrink: 0 }} /> :
               <Info size={12} color="var(--accent)" style={{ marginTop: 1, flexShrink: 0 }} />}
              <div>
                <p style={{ margin: 0, fontSize: 11, fontWeight: 600 }}>{a.msg}</p>
                <p style={{ margin: 0, fontSize: 10, color: 'var(--text-muted)' }}>{a.sub}</p>
              </div>
            </div>
          ))}
          {alertas.length === 0 && <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>Nenhum alerta no momento</p>}
        </div>
      </div>

      {/* -- GRID PRINCIPAL 3 colunas ------------------------------------ */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.6fr 1fr', gap: 12, marginBottom: 12 }}>

        {/* Distribui&#231;&#227;o */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '18px 20px' }}>
          <p style={{ margin: '0 0 14px', fontSize: 13, fontWeight: 600 }}>Distribui&#231;&#227;o</p>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
            <Donut acoes={resumo.patrimonioAcoes || 0} fiis={resumo.patrimonioFIIs || 0} rf={resumo.patrimonioRendaFixa || 0} />
          </div>
          {[
            { label: 'A&#231;&#245;es', val: resumo.patrimonioAcoes, total: resumo.patrimonioTotal, color: 'var(--accent)' },
            { label: 'FIIs', val: resumo.patrimonioFIIs, total: resumo.patrimonioTotal, color: 'var(--success)' },
            { label: 'Renda Fixa', val: resumo.patrimonioRendaFixa, total: resumo.patrimonioTotal, color: 'var(--warning)' },
          ].map(({ label, val, total, color }) => (
            <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                <span style={{ width: 8, height: 8, borderRadius: 2, background: color, flexShrink: 0 }} />
                {label}
              </span>
              <span style={{ fontSize: 12, fontWeight: 600 }}>{total > 0 ? ((val / total) * 100).toFixed(1) : '0.0'}%</span>
            </div>
          ))}
        </div>

        {/* Hist&#243;rico mensal + crescimento */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '18px 20px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <p style={{ margin: 0, fontSize: 13, fontWeight: 600 }}>Renda Passiva - &#218;ltimos 12 meses</p>
            <div style={{ display: 'flex', gap: 10, fontSize: 10 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}><span style={{ width: 8, height: 8, borderRadius: 2, background: 'var(--accent)' }} />A&#231;&#245;es</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}><span style={{ width: 8, height: 8, borderRadius: 2, background: 'var(--success)' }} />FIIs</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 3 }}><span style={{ width: 8, height: 8, borderRadius: 2, background: 'var(--warning)' }} />RF</span>
            </div>
          </div>
          <BarChart
            data={historico}
            labels={historico.map(h => h.mes)}
            series={['rf', 'fii', 'acao']}
            colors={['var(--warning)', 'var(--success)', 'var(--accent)']}
          />
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--border)' }}>
            <div style={{ textAlign: 'center' }}>
              <p style={{ margin: 0, fontSize: 10, color: 'var(--text-muted)' }}>M&#233;dia mensal</p>
              <p style={{ margin: '2px 0 0', fontSize: 14, fontWeight: 700 }}>{brl((renda.ano.total || 0) / new Date().getMonth() || 1)}</p>
            </div>
            <div style={{ textAlign: 'center' }}>
              <p style={{ margin: 0, fontSize: 10, color: 'var(--text-muted)' }}>Meta anual (est.)</p>
              <p style={{ margin: '2px 0 0', fontSize: 14, fontWeight: 700 }}>{brl((renda.mes.total || 0) * 12)}</p>
            </div>
            <div style={{ textAlign: 'center' }}>
              <p style={{ margin: 0, fontSize: 10, color: 'var(--text-muted)' }}>M&#234;s atual</p>
              <p style={{ margin: '2px 0 0', fontSize: 14, fontWeight: 700, color: 'var(--success)' }}>{brl(renda.mes.total)}</p>
            </div>
          </div>
        </div>

        {/* Crescimento da renda */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '18px 20px' }}>
          <p style={{ margin: '0 0 14px', fontSize: 13, fontWeight: 600 }}>Crescimento da Renda</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {crescimento.map(c => {
              const w = maxCresc > 0 ? (c.valor / maxCresc) * 100 : 0;
              return (
                <div key={c.ano}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                    <span style={{ fontSize: 12, fontWeight: 600 }}>{c.ano}</span>
                    <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{brl(c.valor)}</span>
                  </div>
                  <div style={{ height: 8, background: 'var(--border)', borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${w}%`, background: 'var(--success)', borderRadius: 4, transition: 'width 0.5s' }} />
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
            <p style={{ margin: '0 0 10px', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)' }}>Todos os Alertas</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5, maxHeight: 120, overflow: 'auto' }}>
              {alertas.length === 0 && <p style={{ fontSize: 11, color: 'var(--text-muted)', margin: 0 }}>Nenhum alerta</p>}
              {alertas.map((a, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11 }}>
                  {a.tipo === 'warn' ? <AlertTriangle size={11} color="var(--danger)" /> :
                   a.tipo === 'op' ? <Zap size={11} color="var(--success)" /> :
                   <Info size={11} color="var(--accent)" />}
                  <span>{a.msg}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* -- TOP ACOES + TOP FIIS por score ------------------------------ */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
        {/* Top A&#231;&#245;es por score */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '18px 20px' }}>
          <p style={{ margin: '0 0 12px', fontSize: 13, fontWeight: 600 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--acao)', display: 'inline-block', marginRight: 6 }} />
            Top A&#231;&#245;es por score
          </p>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {rankingAcoes.slice(0, 6).map((a, i) => {
              const sc = Number(a.score || 0);
              const mx = Number(a.max_score || 6);
              const ganhoP = Number(a.preco_compra) > 0 ? ((Number(a.preco_atual) - Number(a.preco_compra)) / Number(a.preco_compra)) * 100 : 0;
              const decisao = sc >= mx * 0.75 ? 'Comprar' : sc >= mx * 0.5 ? 'Manter' : 'Aten&#231;&#227;o';
              const decColor = sc >= mx * 0.75 ? 'var(--success)' : sc >= mx * 0.5 ? 'var(--accent)' : 'var(--warning)';
              const decBg = sc >= mx * 0.75 ? 'rgba(34,197,94,0.1)' : sc >= mx * 0.5 ? 'rgba(59,130,246,0.1)' : 'rgba(245,158,11,0.1)';
              return (
                <div key={a.ticker} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 0', borderBottom: i < 5 ? '1px solid var(--border)' : 'none' }}>
                  <span style={{ fontSize: 10, color: 'var(--text-muted)', width: 12 }}>{i + 1}</span>
                  <span style={{ fontWeight: 700, fontSize: 12, color: 'var(--acao)', flex: 1 }}>{a.ticker}</span>
                  <ScoreDots score={sc} max={mx} />
                  <span style={{ fontSize: 10, fontWeight: 700, color: decColor, background: decBg, padding: '1px 7px', borderRadius: 10, minWidth: 52, textAlign: 'center' }}>{decisao}</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: ganhoP >= 0 ? 'var(--success)' : 'var(--danger)', minWidth: 46, textAlign: 'right' }}>{ganhoP >= 0 ? '+' : ''}{ganhoP.toFixed(2).replace('.', ',')}%</span>
                </div>
              );
            })}
            {rankingAcoes.length === 0 && <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>Nenhuma a&#231;&#227;o na carteira</p>}
          </div>
        </div>

        {/* Top FIIs por score */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '18px 20px' }}>
          <p style={{ margin: '0 0 12px', fontSize: 13, fontWeight: 600 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--fii)', display: 'inline-block', marginRight: 6 }} />
            Top FIIs por score
          </p>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {rankingFIIs.slice(0, 6).map((f, i) => {
              const sc = Number(f.score || 0);
              const mx = Number(f.max_score || 4);
              const pm = Number(f.preco_compra || 0);
              const pa = Number(f.preco_atual || 0);
              const ganhoP = pm > 0 ? ((pa - pm) / pm) * 100 : 0;
              const decisao = sc >= mx * 0.75 ? 'Comprar' : sc >= mx * 0.5 ? 'Manter' : 'Aten&#231;&#227;o';
              const decColor = sc >= mx * 0.75 ? 'var(--success)' : sc >= mx * 0.5 ? 'var(--accent)' : 'var(--warning)';
              const decBg = sc >= mx * 0.75 ? 'rgba(34,197,94,0.1)' : sc >= mx * 0.5 ? 'rgba(59,130,246,0.1)' : 'rgba(245,158,11,0.1)';
              return (
                <div key={f.ticker} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 0', borderBottom: i < 5 ? '1px solid var(--border)' : 'none' }}>
                  <span style={{ fontSize: 10, color: 'var(--text-muted)', width: 12 }}>{i + 1}</span>
                  <span style={{ fontWeight: 700, fontSize: 12, color: 'var(--fii)', flex: 1 }}>{f.ticker}</span>
                  <ScoreDots score={sc} max={mx} />
                  <span style={{ fontSize: 10, fontWeight: 700, color: decColor, background: decBg, padding: '1px 7px', borderRadius: 10, minWidth: 52, textAlign: 'center' }}>{decisao}</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: ganhoP >= 0 ? 'var(--success)' : 'var(--danger)', minWidth: 46, textAlign: 'right' }}>{ganhoP >= 0 ? '+' : ''}{ganhoP.toFixed(2).replace('.', ',')}%</span>
                </div>
              );
            })}
            {rankingFIIs.length === 0 && <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>Nenhum FII na carteira</p>}
          </div>
        </div>
      </div>

      {/* -- RADAR OPORTUNIDADES + RADAR RISCO + METAS ------------------- */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        {/* Radar de Oportunidades */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '18px 20px' }}>
          <p style={{ margin: '0 0 12px', fontSize: 13, fontWeight: 600 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--success)', display: 'inline-block', marginRight: 6 }} />
            Radar de oportunidades
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {oportunidades.slice(0, 6).map((a, i) => {
              const sc = Number(a.score || 0);
              const mx = a.tipo === 'FII' ? 4 : 6;
              const pvp = a.pvp != null ? `P/VP ${Number(a.pvp).toFixed(2)}` : null;
              const dy = a.dy != null ? `DY ${Number(a.dy).toFixed(1)}%` : null;
              const sub = [a.tipo, pvp, dy, `Score ${sc}/${mx}`].filter(Boolean).join(' ?&#xB7; ');
              return (
                <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', borderRadius: 8, background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.2)' }}>
                  <div>
                    <span style={{ fontWeight: 700, fontSize: 12, color: 'var(--success)' }}>{a.ticker}</span>
                    <span style={{ fontSize: 10, color: 'var(--text-muted)', marginLeft: 8 }}>{sub}</span>
                  </div>
                  <span style={{ fontWeight: 700, fontSize: 12 }}>{brl(a.preco_atual)}</span>
                </div>
              );
            })}
            {oportunidades.length === 0 && <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>Nenhuma oportunidade identificada</p>}
          </div>
          <p style={{ margin: '10px 0 0', fontSize: 10, color: 'var(--text-muted)' }}>
            &#128161; Crit&#233;rios: P/VP &lt; 1 (FII) &middot; DY acima da m&#233;dia &middot; Score &#8805; 4
          </p>
        </div>

        {/* Radar de Risco + Metas de Aloca&#231;&#227;o */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Radar Risco */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '18px 20px' }}>
            <p style={{ margin: '0 0 12px', fontSize: 13, fontWeight: 600 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--danger)', display: 'inline-block', marginRight: 6 }} />
              Radar de risco
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {riscos.slice(0, 4).map((a, i) => {
                const sc = Number(a.score || 0);
                const mx = a.tipo === 'FII' ? 4 : 6;
                const pvp = a.pvp != null ? `P/VP ${Number(a.pvp).toFixed(2)}` : null;
                const pl = a.pl != null ? `P/L ${Number(a.pl).toFixed(1)}` : null;
                const sub = [a.tipo, pvp, pl, `Score ${sc}/${mx}`].filter(Boolean).join(' ?&#xB7; ');
                return (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 12px', borderRadius: 8, background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.2)' }}>
                    <div>
                      <span style={{ fontWeight: 700, fontSize: 12, color: 'var(--danger)' }}>{a.ticker}</span>
                      <span style={{ fontSize: 10, color: 'var(--text-muted)', marginLeft: 8 }}>{sub}</span>
                    </div>
                    <span style={{ fontWeight: 700, fontSize: 12 }}>{brl(a.preco_atual)}</span>
                  </div>
                );
              })}
              {riscos.length === 0 && <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>Nenhum ativo em risco</p>}
            </div>
            {riscos.length > 0 && (
              <p style={{ margin: '8px 0 0', fontSize: 10, color: 'var(--text-muted)' }}>
                &#9888;&#65039; Crit&#233;rios: P/VP &gt; 1,2 (FII) &middot; P/L &gt; 30 (a&#231;&#227;o) &middot; Score &#8804; 2
              </p>
            )}
          </div>

          {/* Metas de Aloca&#231;&#227;o */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '18px 20px' }}>
            <p style={{ margin: '0 0 12px', fontSize: 13, fontWeight: 600 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--warning)', display: 'inline-block', marginRight: 6 }} />
              Metas de aloca&#231;&#227;o
            </p>
            {(() => {
              const total = resumo.patrimonioTotal || 0;
              const pctAcoes = total > 0 ? (resumo.patrimonioAcoes || 0) / total * 100 : 0;
              const pctFiis = total > 0 ? (resumo.patrimonioFIIs || 0) / total * 100 : 0;
              const pctRf = total > 0 ? (resumo.patrimonioRendaFixa || 0) / total * 100 : 0;
              const metaAcoes = 30, metaFiis = 20, metaRf = 50;
              const items = [
                { label: 'A&#231;&#245;es', pct: pctAcoes, meta: metaAcoes, color: 'var(--acao)' },
                { label: 'FIIs', pct: pctFiis, meta: metaFiis, color: 'var(--fii)' },
                { label: 'Renda Fixa', pct: pctRf, meta: metaRf, color: 'var(--rf)' },
              ];
              const faltaAcoes = total * (metaAcoes - pctAcoes) / 100;
              const faltaFiis = total * (metaFiis - pctFiis) / 100;
              return (
                <div>
                  {items.map(it => (
                    <div key={it.label} style={{ marginBottom: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3, fontSize: 11 }}>
                        <span>{it.label}</span>
                        <span style={{ color: 'var(--text-muted)' }}>{it.pct.toFixed(0)}% / meta {it.meta}%</span>
                      </div>
                      <div style={{ height: 6, background: 'var(--border)', borderRadius: 3, overflow: 'hidden', position: 'relative' }}>
                        <div style={{ height: '100%', width: `${Math.min(it.pct / it.meta * 100, 100)}%`, background: it.color, borderRadius: 3 }} />
                      </div>
                    </div>
                  ))}
                  {(faltaAcoes > 0 || faltaFiis > 0) && (
                    <div style={{ marginTop: 8, padding: '7px 10px', borderRadius: 7, background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', fontSize: 10, color: 'var(--warning)', fontWeight: 600 }}>
                      &#128202; Aportar mais em {[faltaAcoes > 0 && `A&#231;&#245;es (+${brl(faltaAcoes)})`, faltaFiis > 0 && `FIIs (+${brl(faltaFiis)})`].filter(Boolean).join(' e ')} para rebalancear
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        </div>
      </div>

      {/* Footer */}
      <p style={{ textAlign: 'center', marginTop: 28, fontSize: 11, color: 'var(--text-muted)' }}>
        Atualizado &#224;s {dados.atualizadoEm ? new Date(dados.atualizadoEm).toLocaleTimeString('pt-BR') : '-'}   Investimentos Pro 2.0
      </p>
    </div>
  );
}
