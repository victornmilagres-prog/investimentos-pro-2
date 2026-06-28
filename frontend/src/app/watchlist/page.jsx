'use client';
import { useState, useEffect } from 'react';
import { Plus, RefreshCw, Eye, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { fmt } from '@/lib/utils';

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

const CRITERIOS_ACAO = [
  { label: 'P/L < 15',           fn: a => a.pl != null && a.pl > 0 && a.pl < 15,              val: a => a.pl != null ? fmt.num(a.pl) : '-' },
  { label: 'P/VP < 1,5',         fn: a => a.pvp != null && a.pvp > 0 && a.pvp < 1.5,          val: a => a.pvp != null ? fmt.num(a.pvp) : '-' },
  { label: 'Margem Liq. > 10%',  fn: a => a.margem_liquida != null && a.margem_liquida > 10,   val: a => a.margem_liquida != null ? fmt.pct(a.margem_liquida) : '-' },
  { label: 'ROE > 10%',          fn: a => a.roe != null && a.roe > 10,                         val: a => a.roe != null ? fmt.pct(a.roe) : '-' },
  { label: 'Dívida/EBIT < 2x',   fn: a => a.divida_ebit != null && a.divida_ebit > 0 && a.divida_ebit < 2, val: a => a.divida_ebit != null ? fmt.num(a.divida_ebit) + 'x' : '-' },
  { label: 'DY > 6%',            fn: a => a.dy != null && a.dy > 6,                            val: a => a.dy != null ? fmt.pct(a.dy) : '-' },
];

const CRITERIOS_FII = [
  { label: 'DY Mensal > 1%',         fn: f => f.dy_mensal != null && f.dy_mensal > 1,                         val: f => f.dy_mensal != null ? fmt.pct(f.dy_mensal) : '-' },
  { label: 'P/VP < 1,05',            fn: f => f.pvp != null && f.pvp > 0 && f.pvp < 1.05,                    val: f => f.pvp != null ? fmt.num(f.pvp) : '-' },
  { label: 'Volume Diário > R$ 1M',  fn: f => f.volume_financeiro != null && f.volume_financeiro > 1000000,  val: f => f.volume_financeiro != null ? fmt.abrev(f.volume_financeiro) : '-' },
  { label: 'Patrimônio > R$ 1B',     fn: f => f.patrimonio_liquido != null && f.patrimonio_liquido > 1e9,    val: f => f.patrimonio_liquido != null ? fmt.abrev(f.patrimonio_liquido) : '-' },
];

function RadarCard({ item, onRemover, onAddCarteira }) {
  const isAcao = (item.tipo || '').toUpperCase() === 'ACAO' || (item.tipo || '').toUpperCase() === 'AÇÃO';
  const criterios = isAcao ? CRITERIOS_ACAO : CRITERIOS_FII;
  const maxScore = item.max_score || (isAcao ? 6 : 4);
  const scoreNum = typeof item.score === 'string' ? parseInt(item.score) : (item.score ?? 0);
  const fillPct = (scoreNum / maxScore) * 100;
  const dividaSemDado = isAcao && (!item.divida_ebit || item.divida_ebit === 0);
  const varPos = (item.variacao_dia ?? 0) >= 0;

  const C = {
    label: { fontSize: 11, color: '#8896A8', marginBottom: 2 },
    muted: { fontSize: 11, color: '#8896A8' },
  };

  return (
    <div style={{ background: '#FFFFFF', border: '1px solid #E8ECF0', borderRadius: 14, padding: '18px 20px', display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 18, fontWeight: 700, color: '#2563EB' }}>{item.ticker}</span>
          <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 20, background: '#F8F9FA', color: '#8896A8', border: '1px solid #E8ECF0' }}>
            {item.tipo}
          </span>
        </div>
        <span className={badgeDecisao(item.decisao)}>{item.decisao}</span>
      </div>

      {/* Score bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ flex: 1, height: 5, background: '#E8ECF0', borderRadius: 4, overflow: 'hidden' }}>
          <div style={{ width: `${fillPct}%`, height: '100%', background: scoreBarColor(item.classificacao), borderRadius: 4 }}/>
        </div>
        <span style={{ fontSize: 13, fontWeight: 600, color: '#1A1A2E', whiteSpace: 'nowrap' }}>{scoreNum}/{maxScore}</span>
        <span style={{ fontSize: 12, color: '#8896A8' }}>{item.classificacao}</span>
      </div>

      {/* Critérios */}
      <div>
        <p style={{ fontSize: 11, color: '#8896A8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
          Critérios do score
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          {criterios.map(c => {
            const ok = c.fn(item);
            const v = c.val(item);
            const isDividaEbit = c.label === 'Dívida/EBIT < 2x';
            const semDado = isDividaEbit && (!item.divida_ebit || item.divida_ebit === 0);
            const dotColor = semDado ? '#D97706' : (ok ? '#16A34A' : '#DC2626');
            const bgItem = semDado ? '#FFFBEB' : '#F8F9FA';
            const corValor = semDado ? '#D97706' : '#1A1A2E';
            return (
              <div key={c.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '5px 10px', borderRadius: 8, background: bgItem }}>
                <span style={{ fontSize: 12, color: '#4A5568', flex: 1 }}>{c.label}</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: corValor, margin: '0 8px' }}>{semDado ? 'sem dado' : v}</span>
                <div style={{ width: 7, height: 7, borderRadius: '50%', flexShrink: 0, background: dotColor }}/>
              </div>
            );
          })}
        </div>
        {dividaSemDado && (
          <div style={{ fontSize: 11, color: '#D97706', background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 8, padding: '6px 10px', marginTop: 6 }}>
            ⚠️ Dívida/EBIT sem dado — critério não pontuado. Score máximo: {maxScore}/{maxScore}
          </div>
        )}
      </div>

      {/* Graham (apenas ações) */}
      {isAcao && item.preco_graham != null && item.preco_graham > 0 && (
        <div>
          <p style={{ fontSize: 11, color: '#8896A8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
            Preço Graham
          </p>
          <div style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 10, padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div>
              <p style={{ fontSize: 11, color: '#3B82F6', marginBottom: 3 }}>Preço Graham calculado</p>
              <p style={{ fontSize: 15, fontWeight: 700, color: '#2563EB' }}>{fmt.brl(item.preco_graham)}</p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <p style={{ fontSize: 11, color: '#3B82F6', marginBottom: 3 }}>Situação vs Graham</p>
              <span style={{
                fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20,
                background: item.status_graham === 'DESCONTADO' ? '#D1FAE5' : item.status_graham === 'JUSTO' ? '#FEF3C7' : '#FEE2E2',
                color: item.status_graham === 'DESCONTADO' ? '#065F46' : item.status_graham === 'JUSTO' ? '#92400E' : '#991B1B',
              }}>{item.status_graham || 'SEM DADO'}</span>
            </div>
          </div>
        </div>
      )}

      {/* Variação do dia */}
      <div>
        <p style={{ fontSize: 11, color: '#8896A8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
          Variação do dia
        </p>
        <div style={{
          background: varPos ? '#F0FDF4' : '#FEF2F2',
          border: `1px solid ${varPos ? '#BBF7D0' : '#FECACA'}`,
          borderRadius: 10, padding: '12px 14px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8,
        }}>
          <div>
            <p style={{ fontSize: 11, color: varPos ? '#16A34A' : '#DC2626', marginBottom: 3 }}>Preço atual</p>
            <p style={{ fontSize: 18, fontWeight: 700, color: '#1A1A2E' }}>{item.preco_atual ? fmt.brl(item.preco_atual) : '-'}</p>
            {item.preco_abertura && (
              <p style={{ fontSize: 11, color: '#8896A8', marginTop: 2 }}>Abertura: {fmt.brl(item.preco_abertura)}</p>
            )}
          </div>
          <div style={{ textAlign: 'right' }}>
            {item.variacao_dia != null ? (
              <>
                <p style={{ fontSize: 22, fontWeight: 700, color: varPos ? '#16A34A' : '#DC2626' }}>
                  {varPos ? '+' : ''}{fmt.pct(item.variacao_dia)}
                </p>
                {item.variacao_dia_reais != null && (
                  <p style={{ fontSize: 12, color: varPos ? '#16A34A' : '#DC2626' }}>
                    {varPos ? '+' : ''}{fmt.brl(item.variacao_dia_reais)} hoje
                  </p>
                )}
              </>
            ) : (
              <p style={{ fontSize: 14, color: '#8896A8' }}>-</p>
            )}
          </div>
        </div>

        {/* Barra Min/Max */}
        {item.preco_minimo != null && item.preco_maximo != null && item.preco_atual != null && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#8896A8', marginBottom: 4 }}>
              <span>Mín {fmt.brl(item.preco_minimo)}</span>
              <span>Máx {fmt.brl(item.preco_maximo)}</span>
            </div>
            <div style={{ height: 5, background: '#E8ECF0', borderRadius: 4, overflow: 'hidden', marginBottom: 12 }}>
              {(() => {
                const range = item.preco_maximo - item.preco_minimo;
                const pos = range > 0 ? ((item.preco_atual - item.preco_minimo) / range) * 100 : 50;
                return <div style={{ width: `${Math.max(0, Math.min(100, pos))}%`, height: '100%', background: varPos ? '#16A34A' : '#DC2626', borderRadius: 4 }}/>;
              })()}
            </div>
          </>
        )}
      </div>

      {/* Preço atual vs alvo */}
      <div style={{ background: '#F8F9FA', border: '1px solid #E8ECF0', borderRadius: 10, padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <p style={C.label}>Preço atual</p>
          <p style={{ fontSize: 15, fontWeight: 700, color: '#1A1A2E' }}>{item.preco_atual ? fmt.brl(item.preco_atual) : '-'}</p>
        </div>
        <span style={{ color: '#8896A8', fontSize: 18 }}>→</span>
        <div style={{ textAlign: 'right' }}>
          <p style={C.label}>Seu preço alvo</p>
          {item.preco_alvo ? (
            <>
              <p style={{ fontSize: 15, fontWeight: 700, color: '#16A34A' }}>{fmt.brl(item.preco_alvo)}</p>
              {item.preco_atual && (
                <p style={{ fontSize: 11, color: '#16A34A' }}>
                  {fmt.pct(Math.abs(((item.preco_alvo - item.preco_atual) / item.preco_atual) * 100))} para atingir
                </p>
              )}
            </>
          ) : (
            <p style={{ fontSize: 15, fontWeight: 700, color: '#8896A8' }}>—</p>
          )}
        </div>
      </div>

      {/* Observações */}
      {item.observacoes && (
        <div style={{ background: '#EFF6FF', borderLeft: '3px solid #2563EB', padding: '8px 12px', fontSize: 12, color: '#4A5568', borderRadius: '0 8px 8px 0' }}>
          📝 {item.observacoes}
        </div>
      )}

      {/* Botão Adicionar à carteira */}
      <button
        onClick={() => onAddCarteira(item)}
        style={{ width: '100%', background: '#2563EB', color: '#fff', border: 'none', borderRadius: 8, padding: 9, fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
      >
        ➕ Adicionar à carteira
      </button>

      {/* Footer */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 12, color: '#8896A8' }}>
          Atualizado em {fmt.data(item.ultima_atualizacao)}
        </span>
        <button className="btn-icon" onClick={() => onRemover(item.ticker)}><Trash2 size={14}/></button>
      </div>
    </div>
  );
}

export default function WatchlistPage() {
  const [itens, setItens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [atualizando, setAtualizando] = useState(false);
  const [form, setForm] = useState({ ticker: '', tipo: 'ACAO', preco_alvo: '', observacoes: '' });
  const [erro, setErro] = useState('');
  const router = useRouter();

  const carregar = async () => {
    try { const r = await api.get('/watchlist'); setItens(r.data); }
    finally { setLoading(false); }
  };

  useEffect(() => { carregar(); }, []);

  const adicionar = async (e) => {
    e.preventDefault(); setErro('');
    try {
      await api.post('/watchlist', { ...form, ticker: form.ticker.toUpperCase(), preco_alvo: Number(form.preco_alvo) || null });
      setForm({ ticker: '', tipo: 'ACAO', preco_alvo: '', observacoes: '' });
      await carregar();
    } catch (err) { setErro(err.response?.data?.error || 'Erro ao adicionar.'); }
  };

  const remover = async (ticker) => {
    if (!confirm(`Remover ${ticker} do radar?`)) return;
    await api.delete(`/watchlist/${ticker}`); await carregar();
  };

  const atualizar = async () => {
    setAtualizando(true);
    try { await api.post('/watchlist/atualizar-todos'); await carregar(); }
    finally { setAtualizando(false); }
  };

  const addCarteira = (item) => {
    const isAcao = (item.tipo || '').toUpperCase() === 'ACAO' || (item.tipo || '').toUpperCase() === 'AÇÃO';
    router.push(`${isAcao ? '/acoes' : '/fiis'}?ticker=${item.ticker}`);
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
          <h2 style={{ fontSize: 22, fontWeight: 600, color: '#1A1A2E', marginBottom: 4 }}>No Radar</h2>
          <p style={{ fontSize: 13, color: '#8896A8', marginBottom: 24 }}>Ativos que você acompanha antes de comprar</p>
        </div>
        <button onClick={atualizar} disabled={atualizando} className="btn-secondary">
          <RefreshCw size={15} style={atualizando ? { animation: 'spin 0.7s linear infinite' } : {}}/>
          Atualizar cotações
        </button>
      </div>

      {/* Form */}
      <div style={{ background: '#FFFFFF', border: '1px solid #E8ECF0', borderRadius: 14, padding: 20, marginBottom: 24 }}>
        <p style={{ fontSize: 14, fontWeight: 700, color: '#1A1A2E', marginBottom: 14 }}>Adicionar ao radar</p>
        <form onSubmit={adicionar} className="form-row" style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 100 }}>
            <label style={{ fontSize: 11, color: '#8896A8', fontWeight: 600, display: 'block', marginBottom: 4 }}>Ticker *</label>
            <input className="input" placeholder="Ex: VALE3" style={{ textTransform: 'uppercase' }}
              value={form.ticker} onChange={e => setForm({...form, ticker: e.target.value.toUpperCase()})} required/>
          </div>
          <div style={{ minWidth: 100 }}>
            <label style={{ fontSize: 11, color: '#8896A8', fontWeight: 600, display: 'block', marginBottom: 4 }}>Tipo *</label>
            <select className="input" value={form.tipo} onChange={e => setForm({...form, tipo: e.target.value})}>
              <option value="ACAO">Ação</option>
              <option value="FII">FII</option>
            </select>
          </div>
          <div style={{ flex: 1, minWidth: 100 }}>
            <label style={{ fontSize: 11, color: '#8896A8', fontWeight: 600, display: 'block', marginBottom: 4 }}>Preço alvo (R$)</label>
            <input className="input" type="number" step="0.01" placeholder="Opcional"
              value={form.preco_alvo} onChange={e => setForm({...form, preco_alvo: e.target.value})}/>
          </div>
          <div style={{ flex: 2, minWidth: 140 }}>
            <label style={{ fontSize: 11, color: '#8896A8', fontWeight: 600, display: 'block', marginBottom: 4 }}>Observações</label>
            <input className="input" placeholder="Opcional"
              value={form.observacoes} onChange={e => setForm({...form, observacoes: e.target.value})}/>
          </div>
          <button type="submit" className="btn-primary">
            <Plus size={14}/> Adicionar
          </button>
        </form>
        {erro && <p style={{ marginTop: 8, fontSize: 13, color: '#DC2626' }}>{erro}</p>}
      </div>

      {/* Legenda */}
      {itens.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: 11, color: '#8896A8', marginBottom: 8, flexWrap: 'wrap' }}>
          <span style={{ fontWeight: 600, color: '#4A5568' }}>Legenda:</span>
          {[
            { color: '#16A34A', label: 'Aprovado' },
            { color: '#DC2626', label: 'Reprovado' },
            { color: '#D97706', label: 'Sem dado (não pontua)' },
          ].map(l => (
            <span key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: l.color, display: 'inline-block' }}/>
              {l.label}
            </span>
          ))}
        </div>
      )}

      {itens.length > 0 ? (() => {
        const acoes = itens.filter(i => (i.tipo || '').toUpperCase() === 'ACAO' || (i.tipo || '').toUpperCase() === 'AÇÃO');
        const fiis = itens.filter(i => (i.tipo || '').toUpperCase() === 'FII');
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
            {acoes.length > 0 && (
              <div>
                <p style={{ fontSize: 14, fontWeight: 700, color: '#1A1A2E', marginBottom: 14 }}>📈 Ações no Radar</p>
                <div className="grid-cards">
                  {acoes.map(i => <RadarCard key={i.ticker} item={i} onRemover={remover} onAddCarteira={addCarteira}/>)}
                </div>
              </div>
            )}
            {fiis.length > 0 && (
              <div>
                <p style={{ fontSize: 14, fontWeight: 700, color: '#1A1A2E', marginBottom: 14 }}>🏢 FIIs no Radar</p>
                <div className="grid-cards">
                  {fiis.map(i => <RadarCard key={i.ticker} item={i} onRemover={remover} onAddCarteira={addCarteira}/>)}
                </div>
              </div>
            )}
          </div>
        );
      })() : (
        <div style={{ background: '#FFF', border: '1px solid #E8ECF0', borderRadius: 14, padding: 40, textAlign: 'center' }}>
          <Eye size={40} style={{ color: '#D0D8E0', margin: '0 auto 12px' }}/>
          <p style={{ color: '#4A5568', fontWeight: 500, marginBottom: 4 }}>Radar vazio</p>
          <p style={{ color: '#8896A8', fontSize: 13 }}>Adicione ativos que você quer acompanhar antes de investir.</p>
        </div>
      )}
    </div>
  );
}
