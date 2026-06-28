'use client';
import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { RefreshCw, Search, TrendingUp, TrendingDown } from 'lucide-react';
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

function grahamTag(s = '') {
  const v = (s || '').toUpperCase();
  if (v.includes('DESCONT')) return 'graham-descontado';
  if (v.includes('JUSTO'))   return 'graham-justo';
  return 'graham-caro';
}

const criteriosAcao = [
  { label: 'P/L',      key: 'pl',             ok: v => v > 0 && v < 15,  fmt: v => fmt.num(v) },
  { label: 'P/VP',     key: 'pvp',            ok: v => v > 0 && v < 1.5, fmt: v => fmt.num(v) },
  { label: 'DY %',     key: 'dy',             ok: v => v > 6,            fmt: v => fmt.pct(v) },
  { label: 'Margem',   key: 'margem_liquida', ok: v => v > 10,           fmt: v => fmt.pct(v) },
  { label: 'ROE',      key: 'roe',            ok: v => v > 10,           fmt: v => fmt.pct(v) },
  { label: 'Dív/EBIT', key: 'divida_ebit',    ok: v => v > 0 && v < 2,  fmt: v => fmt.num(v) },
];

function AcaoCard({ a, onRemover, onSalvar }) {
  const [editando, setEditando] = useState(false);
  const [qtd, setQtd] = useState(String(a.quantidade ?? ''));
  const [preco, setPreco] = useState(String(a.preco_compra ?? ''));
  const perf = calcPerformance(a.preco_atual, a.preco_compra, a.quantidade);
  const maxScore = 6;
  const scoreNum = typeof a.score === 'string' ? parseInt(a.score) : (a.score ?? 0);
  const fillPct = (scoreNum / maxScore) * 100;

  const salvar = async () => {
    await onSalvar(a.ticker, qtd, preco);
    setEditando(false);
  };

  const C = {
    card: { background: '#FFFFFF', border: '1px solid #E8ECF0', borderRadius: 14, padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 12 },
    label: { fontSize: 11, color: '#8896A8', marginBottom: 2 },
    value: { fontSize: 13, fontWeight: 600, color: '#1A1A2E' },
    groupLabel: { fontSize: 11, color: '#8896A8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 },
  };

  return (
    <div style={C.card}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 18, fontWeight: 700, color: '#2563EB' }}>{a.ticker}</span>
        <span className={badgeDecisao(a.decisao)}>{a.decisao}</span>
      </div>

      {/* Score bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ flex: 1, height: 5, background: '#E8ECF0', borderRadius: 4, overflow: 'hidden' }}>
          <div style={{ width: `${fillPct}%`, height: '100%', background: scoreBarColor(a.classificacao), borderRadius: 4 }}/>
        </div>
        <span style={{ fontSize: 13, fontWeight: 600, color: '#1A1A2E', whiteSpace: 'nowrap' }}>{scoreNum}/{maxScore}</span>
        <span style={{ fontSize: 12, color: '#8896A8' }}>{a.classificacao}</span>
      </div>

      {/* Fundamentos */}
      <div>
        <p style={C.groupLabel}>Fundamentos</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8 }}>
          {criteriosAcao.map(({ label, key, ok, fmt: fmtFn }) => {
            const v = a[key];
            const passou = v != null && ok(v);
            return (
              <div key={label}>
                <p style={C.label}>{label}</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <div style={{ width: 7, height: 7, borderRadius: '50%', flexShrink: 0,
                    background: v != null ? (passou ? '#16A34A' : '#DC2626') : '#D0D8E0' }}/>
                  <p style={C.value}>{v != null ? fmtFn(v) : '-'}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Graham */}
      {a.preco_graham != null && (
        <div style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 10, padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <p style={{ fontSize: 11, color: '#3B82F6', marginBottom: 3 }}>Preço Graham</p>
            <p style={{ fontSize: 15, fontWeight: 700, color: '#2563EB' }}>{fmt.brl(a.preco_graham)}</p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p style={{ fontSize: 11, color: '#3B82F6', marginBottom: 3 }}>Situação vs Graham</p>
            <span className={grahamTag(a.status_graham)}>{a.status_graham}</span>
          </div>
        </div>
      )}

      {/* Posição */}
      <div>
        <p style={C.groupLabel}>Sua posição</p>
        {editando ? (
          <div style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 10, padding: 14 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
              <div>
                <label style={{ ...C.label, display: 'block', marginBottom: 4 }}>Quantidade</label>
                <input className="input" type="number" min="0" step="0.000001" value={qtd} onChange={e => setQtd(e.target.value)}/>
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
              <div><p style={C.label}>Qtd. ações</p><p style={C.value}>{a.quantidade ? fmt.num(a.quantidade, 0) : '-'}</p></div>
              <div style={{ textAlign: 'center' }}><p style={C.label}>Seu preço médio</p><p style={C.value}>{a.preco_compra ? fmt.brl(a.preco_compra) : '-'}</p></div>
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
            <span style={{ fontSize: 16, fontWeight: 700, color: '#1A1A2E' }}>{fmt.brl(a.preco_atual)}</span>
            {a.variacao_dia != null && (
              <span style={{
                fontSize: 12, fontWeight: 600,
                color: a.variacao_dia >= 0 ? '#16A34A' : '#DC2626',
                background: a.variacao_dia >= 0 ? '#F0FDF4' : '#FEF2F2',
                padding: '2px 8px', borderRadius: 20,
              }}>
                {a.variacao_dia >= 0 ? '▲' : '▼'} {a.variacao_dia >= 0 ? '+' : ''}{fmt.pct(a.variacao_dia)} hoje
              </span>
            )}
          </div>
          {a.peso_sugerido != null && (
            <p style={{ fontSize: 12, color: '#8896A8', marginTop: 2 }}>Peso: {fmt.pct(a.peso_sugerido * 100)}</p>
          )}
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {!editando && <button className="btn-icon" onClick={() => setEditando(true)}>✏️</button>}
          <button className="btn-icon" onClick={() => onRemover(a.ticker)}>🗑️</button>
        </div>
      </div>
    </div>
  );
}

function AcoesForm({ onAdicionado }) {
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
      await api.post('/acoes', {
        ticker: ticker.trim().toUpperCase(),
        quantidade: Number(quantidade) || 0,
        preco_compra: Number(precoCompra) || 0
      });
      setTicker(''); setQuantidade(''); setPrecoCompra('');
      onAdicionado();
    } catch (err) {
      setErro(err.response?.data?.error || 'Erro ao adicionar ação.');
    } finally { setBuscando(false); }
  };

  return (
    <div style={{ background: '#FFFFFF', border: '1px solid #E8ECF0', borderRadius: 14, padding: 20, marginBottom: 24 }}>
      <p style={{ fontSize: 14, fontWeight: 700, color: '#1A1A2E', marginBottom: 14 }}>Adicionar ação</p>
      <form onSubmit={adicionar} style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 100 }}>
          <label style={{ fontSize: 11, color: '#8896A8', fontWeight: 600, display: 'block', marginBottom: 4 }}>Ticker *</label>
          <input className="input" placeholder="Ex: PETR4" style={{ textTransform: 'uppercase' }}
            value={ticker} onChange={e => setTicker(e.target.value.toUpperCase())} required/>
        </div>
        <div style={{ flex: 1, minWidth: 100 }}>
          <label style={{ fontSize: 11, color: '#8896A8', fontWeight: 600, display: 'block', marginBottom: 4 }}>Qtd. que você tem</label>
          <input className="input" type="number" min="0" step="0.000001" placeholder="0"
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

export default function AcoesPage() {
  const [acoes, setAcoes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [atualizando, setAtualizando] = useState(false);

  const carregar = async () => {
    try { const r = await api.get('/acoes'); setAcoes(r.data); }
    finally { setLoading(false); }
  };

  useEffect(() => { carregar(); }, []);

  const remover = async (t) => {
    if (!confirm(`Remover ${t}?`)) return;
    await api.delete(`/acoes/${t}`);
    await carregar();
  };

  const salvarEdicao = async (ticker, qtd, preco) => {
    await api.put(`/acoes/${ticker}`, { quantidade: Number(qtd), preco_compra: Number(preco) });
    await carregar();
  };

  const atualizar = async () => {
    setAtualizando(true);
    try { await api.post('/acoes/atualizar-todos'); await carregar(); }
    finally { setAtualizando(false); }
  };

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 256 }}>
      <div style={{ width: 32, height: 32, border: '2px solid #C9A84C', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }}/>
    </div>
  );

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 4 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 600, color: '#1A1A2E', marginBottom: 4 }}>Carteira Ações</h2>
          <p style={{ fontSize: 13, color: '#8896A8', marginBottom: 24 }}>Busca dados em tempo real via Brapi e avalia por critérios fundamentalistas</p>
        </div>
        <button onClick={atualizar} disabled={atualizando} className="btn-secondary">
          <RefreshCw size={15} style={atualizando ? { animation: 'spin 0.7s linear infinite' } : {}}/>
          {atualizando ? 'Atualizando...' : 'Atualizar todos'}
        </button>
      </div>

      <Suspense fallback={<div style={{ background: '#FFF', border: '1px solid #E8ECF0', borderRadius: 14, padding: 20, marginBottom: 24, height: 90 }}/>}>
        <AcoesForm onAdicionado={carregar}/>
      </Suspense>

      <div style={{ background: '#FFFFFF', border: '1px solid #E8ECF0', borderRadius: 12, padding: '12px 20px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: '#8896A8', textTransform: 'uppercase', letterSpacing: '0.05em', marginRight: 4 }}>Critérios de avaliação (Score /6)</span>
        {['P/L < 15', 'P/VP < 1,5', 'Margem Liq. > 10%', 'ROE > 10%', 'Dívida/EBIT < 2x', 'DY > 6%'].map(c => (
          <span key={c} style={{ fontSize: 12, fontWeight: 500, padding: '3px 10px', borderRadius: 20, background: '#F0F2F5', color: '#4A5568', border: '1px solid #E8ECF0' }}>{c}</span>
        ))}
      </div>

      {acoes.length > 0 ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
          {acoes.map(a => (
            <AcaoCard key={a.ticker} a={a} onRemover={remover} onSalvar={salvarEdicao}/>
          ))}
        </div>
      ) : (
        <div style={{ background: '#FFF', border: '1px solid #E8ECF0', borderRadius: 14, padding: 40, textAlign: 'center' }}>
          <TrendingUp size={40} style={{ color: '#D0D8E0', margin: '0 auto 12px' }}/>
          <p style={{ color: '#4A5568', fontWeight: 500, marginBottom: 4 }}>Nenhuma ação adicionada</p>
          <p style={{ color: '#8896A8', fontSize: 13 }}>Digite um ticker acima para buscar e avaliar uma ação.</p>
        </div>
      )}
    </div>
  );
}
