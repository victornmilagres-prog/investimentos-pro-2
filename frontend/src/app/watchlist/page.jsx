'use client';
import { useState, useEffect } from 'react';
import { Plus, Trash2, RefreshCw, Eye } from 'lucide-react';
import api from '@/lib/api';
import { fmt, badgeClassificacao, classeDecisao } from '@/lib/utils';

export default function WatchlistPage() {
  const [itens, setItens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [atualizando, setAtualizando] = useState(false);
  const [form, setForm] = useState({ ticker: '', tipo: 'ACAO', preco_alvo: '', observacoes: '' });
  const [erro, setErro] = useState('');

  const carregar = async () => {
    try { const r = await api.get('/watchlist'); setItens(r.data); }
    finally { setLoading(false); }
  };

  useEffect(() => { carregar(); }, []);

  const adicionar = async (e) => {
    e.preventDefault();
    setErro('');
    try {
      await api.post('/watchlist', { ...form, ticker: form.ticker.toUpperCase(), preco_alvo: Number(form.preco_alvo)||null });
      setForm({ ticker: '', tipo: 'ACAO', preco_alvo: '', observacoes: '' });
      await carregar();
    } catch (err) { setErro(err.response?.data?.error || 'Erro ao adicionar.'); }
  };

  const remover = async (ticker) => {
    if (!confirm(`Remover ${ticker} da watchlist?`)) return;
    await api.delete(`/watchlist/${ticker}`); await carregar();
  };

  const atualizar = async () => {
    setAtualizando(true);
    try { await api.post('/watchlist/atualizar-todos'); await carregar(); }
    finally { setAtualizando(false); }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-brand-600 border-t-transparent rounded-full animate-spin"/></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Watchlist</h2>
          <p className="text-sm text-slate-500">Ativos que você acompanha antes de comprar</p>
        </div>
        <button onClick={atualizar} disabled={atualizando} className="btn-secondary flex items-center gap-2">
          <RefreshCw size={15} className={atualizando ? 'animate-spin' : ''}/>
          Atualizar cotações
        </button>
      </div>

      <div className="card p-5">
        <h3 className="text-sm font-semibold text-slate-900 mb-4">Adicionar à watchlist</h3>
        <form onSubmit={adicionar} className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Ticker *</label>
            <input className="input w-32 uppercase" placeholder="Ex: VALE3"
              value={form.ticker} onChange={e => setForm({...form, ticker: e.target.value.toUpperCase()})} required/>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Tipo *</label>
            <select className="input w-28" value={form.tipo} onChange={e => setForm({...form, tipo: e.target.value})}>
              <option value="ACAO">Ação</option>
              <option value="FII">FII</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Preço alvo (R$)</label>
            <input className="input w-32" type="number" step="0.01" placeholder="Opcional"
              value={form.preco_alvo} onChange={e => setForm({...form, preco_alvo: e.target.value})}/>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Observações</label>
            <input className="input w-48" placeholder="Opcional"
              value={form.observacoes} onChange={e => setForm({...form, observacoes: e.target.value})}/>
          </div>
          <button type="submit" className="btn-primary flex items-center gap-2">
            <Plus size={14}/> Adicionar
          </button>
        </form>
        {erro && <p className="mt-2 text-sm text-red-600">{erro}</p>}
      </div>

      {itens.length > 0 ? (
        <div className="table-container">
          <table>
            <thead><tr>
              <th>Ticker</th><th>Tipo</th><th>Preço Atual</th><th>Preço Alvo</th>
              <th>Score</th><th>Classificação</th><th>Decisão</th><th>Observações</th><th>Atualizado</th><th></th>
            </tr></thead>
            <tbody>
              {itens.map(i => (
                <tr key={i.ticker}>
                  <td className="font-mono font-bold text-brand-700">{i.ticker}</td>
                  <td><span className="badge badge-bom">{i.tipo}</span></td>
                  <td>{i.preco_atual ? fmt.brl(i.preco_atual) : '-'}</td>
                  <td>{i.preco_alvo ? fmt.brl(i.preco_alvo) : '-'}</td>
                  <td className="font-mono">{i.score || '-'}</td>
                  <td>{i.classificacao ? <span className={badgeClassificacao(i.classificacao)}>{i.classificacao}</span> : '-'}</td>
                  <td>{i.decisao ? <span className={classeDecisao(i.decisao)}>{i.decisao}</span> : '-'}</td>
                  <td className="text-xs text-slate-500 max-w-xs truncate">{i.observacoes || '-'}</td>
                  <td className="text-xs text-slate-400">{fmt.data(i.ultima_atualizacao)}</td>
                  <td>
                    <button onClick={() => remover(i.ticker)} className="p-1 hover:bg-red-50 rounded text-slate-400 hover:text-red-600">
                      <Trash2 size={14}/>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="card p-10 text-center">
          <Eye size={40} className="text-slate-300 mx-auto mb-3"/>
          <p className="text-slate-500 font-medium">Watchlist vazia</p>
          <p className="text-slate-400 text-sm mt-1">Adicione ativos que você quer acompanhar antes de investir.</p>
        </div>
      )}
    </div>
  );
}
