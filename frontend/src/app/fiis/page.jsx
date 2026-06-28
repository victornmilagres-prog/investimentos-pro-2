'use client';
import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { RefreshCw, Building2 } from 'lucide-react';
import api from '@/lib/api';
import { fmt, calcPerformance } from '@/lib/utils';

function badgeDecisao(d = '') {
  const v = (d || '').toUpperCase();
  if (v.includes('COMPRAR') || v.includes('ACUMULAR')) return 'badge-comprar';
  if (v.includes('MANTER')) return 'badge-manter';
  if (v.includes('ACOMPANHAR') || v.includes('ATENÇÃO')) return 'badge-atencao';
  return 'badge-risco';
}

function scoreBarColor(c = '') {
  const v = (c || '').toUpperCase();
  if (v.includes('EXCEL')) return '#2563EB';
  if (v.includes('BOM'))   return '#16A34A';
  if (v.includes('ATEN'))  return '#D97706';
  return '#DC2626';
}

const criteriosFII = [
  { label: 'DY Mensal',  key: 'dy_mensal',         ok: v => v > 1,             temCriterio: true,  fmt: v => fmt.pct(v) },
  { label: 'DY Anual',   key: 'dy_anual',           ok: null,                   temCriterio: false, fmt: v => fmt.pct(v) },
  { label: 'P/VP',       key: 'pvp',                ok: v => v > 0 && v < 1.05, temCriterio: true,  fmt: v => fmt.num(v) },
  { label: 'Volume Dia', key: 'volume_financeiro',  ok: v => v > 1000000,       temCriterio: true,  fmt: v => fmt.abrev(v) },
  { label: 'Patrimônio', key: 'patrimonio_liquido', ok: v => v > 1e9,           temCriterio: true,  fmt: v => fmt.abrev(v) },
  { label: 'Peso',       key: 'peso_sugerido',      ok: null,                   temCriterio: false, fmt: v => fmt.pct((v || 0) * 100) },
];

function FIICard({ f, onRemover, onSalvar }) {
  const [editando, setEditando] = useState(false);
  const [qtd, setQtd] = useState(String(f.quantidade ?? ''));
  const [preco, setPreco] = useState(String(f.preco_compra ?? ''));
  const perf = calcPerformance(f.preco_atual, f.preco_compra, f.quantidade);
  const maxScore = 4;
  const scoreNum = typeof f.score === 'string' ? parseInt(f.score) : (f.score ?? 0);
  const fillPct = (scoreNum / maxScore) * 100;

  const salvar = async () => {
    await onSalvar(f.ticker, qtd, preco);
    setEditando(false);
  };

  const C = {
    label: { fontSize: 11, color: '#8896A8', marginBottom: 2 },
    value: { fontSize: 13, fontWeight: 600, color: '#1A1A2E' },
    groupLabel: { fontSize: 11, color: '#8896A8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 },
  };

  return (
    <div style={{ background: '#FFFFFF', border: '1px solid #E8ECF0', borderRadius: 14, padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 18, fontWeight: 700, color: '#2563EB' }}>{f.ticker}</span>
        <span className={badgeDecisao(f.decisao)}>{f.decisao}</span>
      </div>

      {/* Score bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ flex: 1, height: 5, background: '#E8ECF0', borderRadius: 4, overflow: 'hidden' }}>
          <div style={{ width: `${fillPct}%`, height: '100%', background: scoreBarColor(f.classificacao), borderRadius: 4 }}/>
        </div>
        <span style={{ fontSize: 13, fontWeight: 600, color: '#1A1A2E', whiteSpace: 'nowrap' }}>{scoreNum}/{maxScore}</span>
        <span style={{ fontSize: 12, color: '#8896A8' }}>{f.classificacao}</span>
      </div>

      {/* Rendimento & Qualidade */}
      <div>
        <p style={C.groupLabel}>Rendimento & Qualidade</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
          {criteriosFII.map(({ label, key, ok, temCriterio, fmt: fmtFn }) => {
            const v = f[key];
            const passou = temCriterio && v != null && ok(v);
            return (
              <div key={label}>
                <p style={C.label}>{label}</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  {temCriterio && (
                    <div style={{ width: 7, height: 7, borderRadius: '50%', flexShrink: 0,
                      background: v != null ? (passou ? '#16A34A' : '#DC2626') : '#D0D8E0' }}/>
                  )}
                  <p style={C.value}>{v != null ? fmtFn(v) : '-'}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Posição */}
      <div>
        <p style={C.groupLabel}>Sua posição</p>
        {editando ? (
          <div style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 10, padding: 14 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
              <div>
                <label style={{ ...C.label, display: 'block', marginBottom: 4 }}>Quantidade</label>
                <input className="input" type="number" min="0" step="1" value={qtd} onChange={e => setQtd(e.target.value)}/>
              </div>
              <div>
                <label style={{ ...C.label, display: 'block', marginBottom: 4 }}>Preço médio (R$)</label>
                <input className="input" type="number" min="0" step="0.01" value={preco} onChange={e => setPreco(e.target.value)}/>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn-primary" style={{ flex: 1, justifyContent: 'center' }} onClick={salvar}>Salvar</button>
              <button className="btn-secondary" style={{ flex: 1, justifyContent: 'center' }} onClick={() => setEditando(false)}>Cancelar</button>
            </div>
          </div>
        ) : (
          <div style={{ background: '#F8F9FA', border: '1px solid #E8ECF0', borderRadius: 10, padding: '12px 14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <div><p style={C.label}>Qtd. cotas</p><p style={C.value}>{f.quantidade ? fmt.num(f.quantidade, 0) : '-'}</p></div>
              <div style={{ textAlign: 'center' }}><p style={C.label}>Seu preço médio</p><p style={C.value}>{f.preco_compra ? fmt.brl(f.preco_compra) : '-'}</p></div>
              <div style={{ textAlign: 'right' }}><p style={C.label}>Val. investido</p><p style={C.value}>{perf.custo > 0 ? fmt.brl(perf.custo) : '-'}</p></div>
            </div>
            <hr style={{ border: 'none', borderTop: '1px solid #E8ECF0', margin: '8px 0' }}/>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <div><p style={C.label}>Val. atual</p><p style={C.value}>{perf.valorAtual > 0 ? fmt.brl(perf.valorAtual) : '-'}</p></div>
              <div style={{ textAlign: 'right' }}>
                <p style={C.label}>Retorno</p>
                {perf.custo > 0 ? (
                  <p style={{ fontSize: 13, fontWeight: 600, color: perf.ganho >= 0 ? '#16A34A' : '#DC2626' }}>
                    {perf.ganho >= 0 ? '+' : ''}{fmt.brl(perf.ganho)} ({perf.ganho >= 0 ? '+' : ''}{fmt.pct(perf.pct)})
                  </p>
                ) : <p style={C.value}>-</p>}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 4, borderTop: '1px solid #E8ECF0' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <span style={{ fontSize: 16, fontWeight: 700, color: '#1A1A2E' }}>{fmt.brl(f.preco_atual)}</span>
            {f.variacao_dia != null && (
              <span style={{
                fontSize: 12, fontWeight: 600,
                color: f.variacao_dia >= 0 ? '#16A34A' : '#DC2626',
                background: f.variacao_dia >= 0 ? '#F0FDF4' : '#FEF2F2',
                padding: '2px 8px', borderRadius: 20,
              }}>
                {f.variacao_dia >= 0 ? '▲' : '▼'} {f.variacao_dia >= 0 ? '+' : ''}{fmt.pct(f.variacao_dia)} hoje
              </span>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {!editando && <button className="btn-icon" onClick={() => setEditando(true)}>✏️</button>}
          <button className="btn-icon" onClick={() => onRemover(f.ticker)}>🗑️</button>
        </div>
      </div>
    </div>
  );
}

function FIIsForm({ onAdicionado }) {
  const searchParams = useSearchParams();
  const [ticker, setTicker] = useState(searchParams.get('ticker') || '');
  const [quantidade, setQuantidade] = useState('');
  const [precoCompra, setPrecoCompra] = useState('');
  const [buscando, setBuscando] = useState(false);
  const [erro, setErro] = useState('');

  const adicionar = async (e) => {
    e.preventDefault();
    if (!ticker.trim()) return;
    setBuscando(true); setErro('');
    try {
      await api.post('/fiis', {
        ticker: ticker.trim().toUpperCase(),
        quantidade: Number(quantidade) || 0,
        preco_compra: Number(precoCompra) || 0
      });
      setTicker(''); setQuantidade(''); setPrecoCompra('');
      onAdicionado();
    } catch (err) {
      setErro(err.response?.data?.error || 'Erro ao adicionar FII.');
    } finally { setBuscando(false); }
  };

  return (
    <div style={{ background: '#FFFFFF', border: '1px solid #E8ECF0', borderRadius: 14, padding: 20, marginBottom: 24 }}>
      <p style={{ fontSize: 14, fontWeight: 700, color: '#1A1A2E', marginBottom: 14 }}>Adicionar FII</p>
      <form onSubmit={adicionar} className="form-row" style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 100 }}>
          <label style={{ fontSize: 11, color: '#8896A8', fontWeight: 600, display: 'block', marginBottom: 4 }}>Ticker *</label>
          <input className="input" placeholder="Ex: CPTS11" style={{ textTransform: 'uppercase' }}
            value={ticker} onChange={e => setTicker(e.target.value.toUpperCase())} required/>
        </div>
        <div style={{ flex: 1, minWidth: 100 }}>
          <label style={{ fontSize: 11, color: '#8896A8', fontWeight: 600, display: 'block', marginBottom: 4 }}>Qtd. que você tem</label>
          <input className="input" type="number" min="0" step="1" placeholder="0"
            value={quantidade} onChange={e => setQuantidade(e.target.value)}/>
        </div>
        <div style={{ flex: 1, minWidth: 120 }}>
          <label style={{ fontSize: 11, color: '#8896A8', fontWeight: 600, display: 'block', marginBottom: 4 }}>Preço médio de compra</label>
          <input className="input" type="number" min="0" step="0.01" placeholder="R$ 0,00"
            value={precoCompra} onChange={e => setPrecoCompra(e.target.value)}/>
        </div>
        <button type="submit" disabled={buscando} className="btn-primary">
          {buscando ? <RefreshCw size={14} style={{ animation: 'spin 0.7s linear infinite' }}/> : '🔍'}
          {buscando ? 'Buscando...' : 'Buscar e Avaliar'}
        </button>
      </form>
      {erro && <p style={{ marginTop: 8, fontSize: 13, color: '#DC2626' }}>{erro}</p>}
    </div>
  );
}

export default function FIIsPage() {
  const [fiis, setFiis] = useState([]);
  const [loading, setLoading] = useState(true);
  const [atualizando, setAtualizando] = useState(false);

  const carregar = async () => {
    try { const r = await api.get('/fiis'); setFiis(r.data); }
    finally { setLoading(false); }
  };

  useEffect(() => { carregar(); }, []);

  const remover = async (t) => {
    if (!confirm(`Remover ${t}?`)) return;
    await api.delete(`/fiis/${t}`);
    await carregar();
  };

  const salvarEdicao = async (t, qtd, preco) => {
    await api.put(`/fiis/${t}`, { quantidade: Number(qtd), preco_compra: Number(preco) });
    await carregar();
  };

  const atualizar = async () => {
    setAtualizando(true);
    try { await api.post('/fiis/atualizar-todos'); await carregar(); }
    finally { setAtualizando(false); }
  };

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 256 }}>
      <div style={{ width: 32, height: 32, border: '2px solid #C9A84C', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }}/>
    </div>
  );

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 4 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 600, color: '#1A1A2E', marginBottom: 4 }}>Carteira FII</h2>
          <p style={{ fontSize: 13, color: '#8896A8', marginBottom: 24 }}>Fundos Imobiliários avaliados por critérios de renda e qualidade</p>
        </div>
        <button onClick={atualizar} disabled={atualizando} className="btn-secondary">
          <RefreshCw size={15} style={atualizando ? { animation: 'spin 0.7s linear infinite' } : {}}/>
          {atualizando ? 'Atualizando...' : 'Atualizar todos'}
        </button>
      </div>

      <Suspense fallback={<div style={{ background: '#FFF', border: '1px solid #E8ECF0', borderRadius: 14, padding: 20, marginBottom: 24, height: 90 }}/>}>
        <FIIsForm onAdicionado={carregar}/>
      </Suspense>

      <div style={{ background: '#FFFFFF', border: '1px solid #E8ECF0', borderRadius: 12, padding: '12px 20px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: '#8896A8', textTransform: 'uppercase', letterSpacing: '0.05em', marginRight: 4 }}>Critérios de avaliação (Score /4)</span>
        {['DY Mensal > 1%', 'P/VP < 1,05', 'Volume Diário > R$ 1M', 'Patrimônio > R$ 1B'].map(c => (
          <span key={c} style={{ fontSize: 12, fontWeight: 500, padding: '3px 10px', borderRadius: 20, background: '#F0F2F5', color: '#4A5568', border: '1px solid #E8ECF0' }}>{c}</span>
        ))}
      </div>

      {fiis.length > 0 ? (
        <div className="grid-cards">
          {fiis.map(f => (
            <FIICard key={f.ticker} f={f} onRemover={remover} onSalvar={salvarEdicao}/>
          ))}
        </div>
      ) : (
        <div style={{ background: '#FFF', border: '1px solid #E8ECF0', borderRadius: 14, padding: 40, textAlign: 'center' }}>
          <Building2 size={40} style={{ color: '#D0D8E0', margin: '0 auto 12px' }}/>
          <p style={{ color: '#4A5568', fontWeight: 500, marginBottom: 4 }}>Nenhum FII adicionado</p>
          <p style={{ color: '#8896A8', fontSize: 13 }}>Digite um ticker acima para buscar e avaliar um fundo imobiliário.</p>
        </div>
      )}
    </div>
  );
}
