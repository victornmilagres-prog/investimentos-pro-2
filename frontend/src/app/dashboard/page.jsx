'use client';
import { useState, useEffect } from 'react';
import { RefreshCw } from 'lucide-react';
import api from '@/lib/api';
import { fmt } from '@/lib/utils';

const COLORS = {
  acoes: '#2563EB',
  fiis:  '#16A34A',
  rf:    '#D97706',
};

function badgeDecisao(d = '') {
  const v = d.toUpperCase();
  if (v.includes('COMPRAR') || v.includes('ACUMULAR')) return 'badge-comprar';
  if (v.includes('MANTER')) return 'badge-manter';
  if (v.includes('ACOMPANHAR') || v.includes('ATENÇÃO')) return 'badge-atencao';
  return 'badge-risco';
}

export default function DashboardPage() {
  const [dados, setDados] = useState(null);
  const [loading, setLoading] = useState(true);
  const [atualizando, setAtualizando] = useState(false);

  const carregar = async () => {
    try { const r = await api.get('/dashboard'); setDados(r.data); }
    catch { /* silencia */ }
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

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 256 }}>
      <div style={{ width: 32, height: 32, border: '2px solid #C9A84C', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }}/>
    </div>
  );

  if (!dados) return (
    <p style={{ color: '#8896A8', fontSize: 14 }}>Nenhum dado disponível. Adicione ações e FIIs nas abas de avaliação.</p>
  );

  const { resumo, rankingAcoes, rankingFIIs, oportunidades, riscos } = dados;
  const ganhoTotal = (resumo.ganhoAcoes || 0) + (resumo.ganhoFIIs || 0);
  const totalInvestido = (resumo.patrimonioTotal || 0) - ganhoTotal;
  const pctTotal = totalInvestido > 0 ? (ganhoTotal / totalInvestido) * 100 : 0;

  const totalPatr = resumo.patrimonioTotal || 0;
  const distribItems = [
    { label: 'Carteira Ações', valor: resumo.patrimonioAcoes || 0, color: COLORS.acoes },
    { label: 'Carteira FII',   valor: resumo.patrimonioFIIs  || 0, color: COLORS.fiis },
    { label: 'Renda Fixa',     valor: resumo.patrimonioRendaFixa || 0, color: COLORS.rf },
  ].filter(d => d.valor > 0);

  const pctAcoes = totalPatr > 0 ? (resumo.patrimonioAcoes / totalPatr) * 100 : 0;
  const pctFIIs  = totalPatr > 0 ? (resumo.patrimonioFIIs  / totalPatr) * 100 : 0;
  const pctAcoesCusto = resumo.patrimonioAcoes > 0 ? ((resumo.patrimonioAcoes - (resumo.ganhoAcoes||0)) || 1) : 1;
  const pctRetAcoes = (resumo.ganhoAcoes||0) / pctAcoesCusto * 100;
  const pctFIIsCusto = resumo.patrimonioFIIs > 0 ? ((resumo.patrimonioFIIs - (resumo.ganhoFIIs||0)) || 1) : 1;
  const pctRetFIIs  = (resumo.ganhoFIIs||0) / pctFIIsCusto * 100;

  const S = { // style helpers
    card: { background: '#FFFFFF', border: '1px solid #E8ECF0', borderRadius: 14 },
    muted: { fontSize: 11, color: '#8896A8' },
    primary: { color: '#1A1A2E' },
    secondary: { color: '#4A5568' },
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Header */}
      <div className="page-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 600, color: '#1A1A2E', marginBottom: 2 }}>Dashboard</h2>
          <p style={{ fontSize: 13, color: '#8896A8' }}>Visão geral do seu patrimônio</p>
        </div>
        <button onClick={atualizarTodos} disabled={atualizando} className="btn-secondary">
          <RefreshCw size={15} style={atualizando ? { animation: 'spin 0.7s linear infinite' } : {}}/>
          {atualizando ? 'Atualizando...' : 'Atualizar tudo'}
        </button>
      </div>

      {/* Card grande patrimônio */}
      <div className="patrimonio-hero" style={{ ...S.card, padding: '20px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <p style={{ ...S.muted, marginBottom: 4, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Patrimônio total</p>
          <p style={{ fontSize: 32, fontWeight: 800, color: '#1A1A2E' }}>{fmt.brl(resumo.patrimonioTotal)}</p>
          <p style={{ fontSize: 13, color: '#8896A8', marginTop: 4 }}>
            {resumo.totalAtivos} ativos · {resumo.totalAcoes} ações · {resumo.totalFIIs} FIIs
          </p>
        </div>
        <div style={{ textAlign: 'right' }}>
          <p style={{ ...S.muted, marginBottom: 4, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Retorno total</p>
          <p style={{ fontSize: 24, fontWeight: 800, color: ganhoTotal >= 0 ? '#16A34A' : '#DC2626' }}>
            {ganhoTotal >= 0 ? '+' : ''}{fmt.brl(ganhoTotal)}
          </p>
          <p style={{ fontSize: 13, color: '#8896A8', marginTop: 4 }}>
            <span style={{ color: ganhoTotal >= 0 ? '#16A34A' : '#DC2626', fontWeight: 600 }}>
              {ganhoTotal >= 0 ? '+' : ''}{fmt.pct(pctTotal)}
            </span>{' '}
            desde o início
          </p>
        </div>
      </div>

      {/* 4 carteiras */}
      <div className="grid-4">
        {[
          {
            label: 'Carteira Ações',
            valor: fmt.brl(resumo.patrimonioAcoes),
            sub: resumo.ganhoAcoes != null
              ? `${resumo.ganhoAcoes >= 0 ? '+' : ''}${fmt.brl(resumo.ganhoAcoes)} · ${resumo.ganhoAcoes >= 0 ? '+' : ''}${fmt.pct(pctRetAcoes)}`
              : null,
            subColor: (resumo.ganhoAcoes || 0) >= 0 ? '#16A34A' : '#DC2626',
          },
          {
            label: 'Carteira FII',
            valor: fmt.brl(resumo.patrimonioFIIs),
            sub: resumo.ganhoFIIs != null
              ? `${resumo.ganhoFIIs >= 0 ? '+' : ''}${fmt.brl(resumo.ganhoFIIs)} · ${resumo.ganhoFIIs >= 0 ? '+' : ''}${fmt.pct(pctRetFIIs)}`
              : null,
            subColor: (resumo.ganhoFIIs || 0) >= 0 ? '#16A34A' : '#DC2626',
          },
          {
            label: 'Carteira Renda Fixa',
            valor: fmt.brl(resumo.patrimonioRendaFixa),
            sub: null,
            subColor: '#8896A8',
          },
          {
            label: 'No Radar',
            valor: String(resumo.totalWatchlist ?? 0),
            sub: (resumo.totalWatchlist === 1 ? 'ativo monitorado' : 'ativos monitorados'),
            subColor: '#8896A8',
          },
        ].map(({ label, valor, sub, subColor }) => (
          <div key={label} style={{ ...S.card, padding: '14px 16px' }}>
            <p style={{ fontSize: 11, color: '#8896A8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6 }}>{label}</p>
            <p style={{ fontSize: 18, fontWeight: 700, color: '#1A1A2E', marginBottom: 3 }}>{valor}</p>
            {sub && <p style={{ fontSize: 11, color: subColor }}>{sub}</p>}
          </div>
        ))}
      </div>

      {/* 4 stats */}
      <div className="grid-4">
        {[
          { label: 'Total de ativos', valor: resumo.totalAtivos, sub: `${resumo.totalAcoes} ações · ${resumo.totalFIIs} FIIs`, color: '#1A1A2E' },
          { label: 'Excelentes',      valor: resumo.ativosExcelentes, sub: 'score máximo',    color: '#2563EB' },
          { label: 'Em risco',        valor: resumo.ativosRisco,      sub: 'atenção necessária', color: '#DC2626' },
          { label: 'Variação hoje',   valor: resumo.variacaoHoje != null ? `${resumo.variacaoHoje >= 0 ? '+' : ''}${fmt.pct(resumo.variacaoHoje)}` : '-', sub: 'carteira geral', color: resumo.variacaoHoje != null && resumo.variacaoHoje < 0 ? '#DC2626' : '#16A34A' },
        ].map(({ label, valor, sub, color }) => (
          <div key={label} style={{ ...S.card, padding: '14px 16px' }}>
            <p style={{ fontSize: 11, color: '#8896A8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6 }}>{label}</p>
            <p style={{ fontSize: 18, fontWeight: 700, color, marginBottom: 3 }}>{valor}</p>
            <p style={{ fontSize: 11, color: '#8896A8' }}>{sub}</p>
          </div>
        ))}
      </div>

      {/* Distribuição + Ranking Ações */}
      <div className="grid-2">
        {/* Distribuição barras */}
        <div style={{ ...S.card, padding: '18px 20px' }}>
          <p style={{ fontSize: 14, fontWeight: 700, color: '#1A1A2E', marginBottom: 14 }}>Distribuição do patrimônio</p>
          {distribItems.map(d => {
            const pct = totalPatr > 0 ? (d.valor / totalPatr) * 100 : 0;
            return (
              <div key={d.label} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, width: 130 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: d.color, flexShrink: 0 }}/>
                  <span style={{ fontSize: 12, color: '#4A5568' }}>{d.label}</span>
                </div>
                <div style={{ flex: 1, height: 6, background: '#E8ECF0', borderRadius: 4, overflow: 'hidden' }}>
                  <div style={{ width: `${pct}%`, height: '100%', background: d.color, borderRadius: 4 }}/>
                </div>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#1A1A2E', width: 38, textAlign: 'right' }}>{fmt.pct(pct)}</span>
                <span style={{ fontSize: 11, color: '#8896A8', width: 80, textAlign: 'right' }}>{fmt.brl(d.valor)}</span>
              </div>
            );
          })}
          {distribItems.length === 0 && <p style={{ fontSize: 12, color: '#8896A8' }}>Nenhum dado disponível.</p>}
        </div>

        {/* Ranking Ações */}
        <div style={{ ...S.card, padding: '18px 20px' }}>
          <p style={{ fontSize: 14, fontWeight: 700, color: '#1A1A2E', marginBottom: 14 }}>Ranking Ações</p>
          {rankingAcoes.slice(0, 5).map((a, i) => (
            <div key={a.ticker} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 0', borderBottom: i < Math.min(rankingAcoes.length, 5) - 1 ? '1px solid #E8ECF0' : 'none' }}>
              <span style={{ fontSize: 11, color: '#8896A8', width: 16 }}>{i + 1}</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#2563EB', flex: 1 }}>{a.ticker}</span>
              <span style={{ fontSize: 11, color: '#8896A8' }}>{a.score}</span>
              <span className={badgeDecisao(a.decisao)} style={{ marginLeft: 8 }}>{a.decisao?.split('/')[0]}</span>
            </div>
          ))}
          {rankingAcoes.length === 0 && <p style={{ fontSize: 12, color: '#8896A8' }}>Nenhuma ação adicionada.</p>}
        </div>
      </div>

      {/* Ranking FIIs + Radar Oportunidades + Radar Risco */}
      <div className="grid-3">
        {/* Ranking FIIs */}
        <div style={{ ...S.card, padding: '18px 20px' }}>
          <p style={{ fontSize: 14, fontWeight: 700, color: '#1A1A2E', marginBottom: 14 }}>Ranking FIIs</p>
          {rankingFIIs.slice(0, 5).map((f, i) => (
            <div key={f.ticker} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 0', borderBottom: i < Math.min(rankingFIIs.length, 5) - 1 ? '1px solid #E8ECF0' : 'none' }}>
              <span style={{ fontSize: 11, color: '#8896A8', width: 16 }}>{i + 1}</span>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#2563EB', flex: 1 }}>{f.ticker}</span>
              <span style={{ fontSize: 11, color: '#8896A8' }}>{f.score}</span>
              <span className={badgeDecisao(f.decisao)} style={{ marginLeft: 8 }}>{f.decisao?.split('/')[0]}</span>
            </div>
          ))}
          {rankingFIIs.length === 0 && <p style={{ fontSize: 12, color: '#8896A8' }}>Nenhum FII adicionado.</p>}
        </div>

        {/* Radar Oportunidades */}
        <div style={{ ...S.card, padding: '18px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#16A34A' }}/>
            <p style={{ fontSize: 14, fontWeight: 700, color: '#1A1A2E' }}>Radar de oportunidades</p>
          </div>
          {oportunidades.map(a => (
            <div key={a.ticker} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', borderRadius: 8, marginBottom: 5, background: '#F0FDF4' }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#16A34A', flex: 1 }}>{a.ticker}</span>
              <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 20, background: '#F8F9FA', color: '#8896A8', border: '1px solid #E8ECF0' }}>{a.tipo}</span>
              <span style={{ fontSize: 11, color: '#8896A8', marginLeft: 4 }}>{a.score}</span>
              <span className={badgeDecisao(a.decisao)} style={{ marginLeft: 4 }}>{a.decisao?.split('/')[0]}</span>
            </div>
          ))}
          {oportunidades.length === 0 && <p style={{ fontSize: 12, color: '#8896A8' }}>Nenhuma oportunidade identificada.</p>}
        </div>

        {/* Radar Risco */}
        <div style={{ ...S.card, padding: '18px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#DC2626' }}/>
            <p style={{ fontSize: 14, fontWeight: 700, color: '#1A1A2E' }}>Radar de risco</p>
          </div>
          {riscos.map(a => (
            <div key={a.ticker} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', borderRadius: 8, marginBottom: 5, background: '#FEF2F2' }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: '#DC2626', flex: 1 }}>{a.ticker}</span>
              <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 20, background: '#F8F9FA', color: '#8896A8', border: '1px solid #E8ECF0' }}>{a.tipo}</span>
              <span style={{ fontSize: 11, color: '#8896A8', marginLeft: 4 }}>{a.score}</span>
              <span className="badge-risco" style={{ marginLeft: 4 }}>{a.decisao?.split('/')[0]}</span>
            </div>
          ))}
          {riscos.length === 0 && <p style={{ fontSize: 12, color: '#8896A8' }}>Nenhum risco identificado.</p>}
        </div>
      </div>

      <p style={{ fontSize: 11, color: '#8896A8', textAlign: 'center' }}>
        Atualizado em {fmt.dataHora(dados.atualizadoEm)} · Dados via Brapi.dev · Não é recomendação de investimento
      </p>
    </div>
  );
}
