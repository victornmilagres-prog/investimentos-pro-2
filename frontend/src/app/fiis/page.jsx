'use client';
import { useState, useEffect } from 'react';
import { Plus, Trash2, RefreshCw, Search, TrendingUp, TrendingDown, Building2 } from 'lucide-react';
import api from '@/lib/api';
import { fmt, badgeClassificacao, classeDecisao, calcPerformance } from '@/lib/utils';

export default function FIIsPage() {
  const [fiis, setFiis] = useState([]);
  const [loading, setLoading] = useState(true);
  const [buscando, setBuscando] = useState(false);
  const [atualizando, setAtualizando] = useState(false);
  const [ticker, setTicker] = useState('');
  const [quantidade, setQuantidade] = useState('');
  const [precoCompra, setPrecoCompra] = useState('');
  const [erro, setErro] = useState('');
  const [editando, setEditando] = useState(null);

  const carregar = async () => {
    try { const r = await api.get('/fiis'); setFiis(r.data); }
    finally { setLoading(false); }
  };

  useEffect(() => { carregar(); }, []);

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
      await carregar();
    } catch (err) {
      setErro(err.response?.data?.error || 'Erro ao adicionar FII.');
    } finally { setBuscando(false); }
  };

  const remover = async (t) => {
    if (!confirm(`Remover ${t}?`)) return;
    await api.delete(`/fiis/${t}`);
    await carregar();
  };

  const salvarEdicao = async (t, qtd, preco) => {
    await api.put(`/fiis/${t}`, { quantidade: Number(qtd), preco_compra: Number(preco) });
    setEditando(null); await carregar();
  };

  const atualizar = async () => {
    setAtualizando(true);
    try { await api.post('/fiis/atualizar-todos'); await carregar(); }
    finally { setAtualizando(false); }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-brand-600 border-t-transparent rounded-full animate-spin"/>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Avaliação de FIIs</h2>
          <p className="text-sm text-slate-500">Fundos Imobiliários avaliados por critérios de renda e qualidade</p>
        </div>
        <button onClick={atualizar} disabled={atualizando} className="btn-secondary flex items-center gap-2">
          <RefreshCw size={15} className={atualizando ? 'animate-spin' : ''}/>
          {atualizando ? 'Atualizando...' : 'Atualizar todos'}
        </button>
      </div>

      <div className="card p-5">
        <h3 className="text-sm font-semibold text-slate-900 mb-4">Adicionar FII</h3>
        <form onSubmit={adicionar} className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Ticker *</label>
            <input className="input w-32 uppercase" placeholder="Ex: CPTS11"
              value={ticker} onChange={e => setTicker(e.target.value.toUpperCase())} required/>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Qtd. que você tem</label>
            <input className="input w-32" type="number" min="0" step="0.000001" placeholder="0"
              value={quantidade} onChange={e => setQuantidade(e.target.value)}/>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Preço médio de compra</label>
            <input className="input w-36" type="number" min="0" step="0.01" placeholder="R$ 0,00"
              value={precoCompra} onChange={e => setPrecoCompra(e.target.value)}/>
          </div>
          <button type="submit" disabled={buscando} className="btn-primary flex items-center gap-2">
            {buscando ? <RefreshCw size={14} className="animate-spin"/> : <Search size={14}/>}
            {buscando ? 'Buscando...' : 'Buscar e Avaliar'}
          </button>
        </form>
        {erro && <p className="mt-2 text-sm text-red-600">{erro}</p>}
      </div>

      <div className="card p-4">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Critérios de avaliação (Score /4)</p>
        <div className="flex flex-wrap gap-2 text-xs text-slate-600">
          <span className="px-2 py-1 bg-slate-100 rounded">DY Mensal &gt; 1%</span>
          <span className="px-2 py-1 bg-slate-100 rounded">P/VP &lt; 1,05</span>
          <span className="px-2 py-1 bg-slate-100 rounded">Volume Diário &gt; R$ 1M</span>
          <span className="px-2 py-1 bg-slate-100 rounded">Patrimônio &gt; R$ 1B</span>
        </div>
      </div>

      {fiis.length > 0 ? (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Ticker</th>
                <th>Preço Atual</th>
                <th>DY Mensal</th>
                <th>DY Anual</th>
                <th>P/VP</th>
                <th>Volume Dia</th>
                <th>Patrimônio</th>
                <th>Score</th>
                <th>Classificação</th>
                <th>Decisão</th>
                <th>Qtd.</th>
                <th>Preço Médio</th>
                <th>Val. Atual</th>
                <th>Retorno</th>
                <th>Peso</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {fiis.map(f => {
                const perf = calcPerformance(f.preco_atual, f.preco_compra, f.quantidade);
                const isEdit = editando === f.ticker;
                return (
                  <tr key={f.ticker}>
                    <td className="font-mono font-bold text-brand-700">{f.ticker}</td>
                    <td className="font-semibold">{fmt.brl(f.preco_atual)}</td>
                    <td>{f.dy_mensal ? fmt.pct(f.dy_mensal) : '-'}</td>
                    <td>{f.dy_anual ? fmt.pct(f.dy_anual) : '-'}</td>
                    <td>{f.pvp ? fmt.num(f.pvp) : '-'}</td>
                    <td className="text-xs">{f.volume_financeiro ? fmt.brl(f.volume_financeiro) : '-'}</td>
                    <td className="text-xs">{f.patrimonio_liquido ? fmt.brl(f.patrimonio_liquido) : '-'}</td>
                    <td className="font-mono font-semibold">{f.score}</td>
                    <td><span className={badgeClassificacao(f.classificacao)}>{f.classificacao}</span></td>
                    <td><span className={classeDecisao(f.decisao)}>{f.decisao}</span></td>
                    <td>
                      {isEdit
                        ? <input className="input w-20 text-xs" type="number" defaultValue={f.quantidade} id={`qtd-${f.ticker}`}/>
                        : fmt.num(f.quantidade, 0) || '-'}
                    </td>
                    <td>
                      {isEdit
                        ? <input className="input w-24 text-xs" type="number" defaultValue={f.preco_compra} id={`preco-${f.ticker}`} step="0.01"/>
                        : f.preco_compra ? fmt.brl(f.preco_compra) : '-'}
                    </td>
                    <td>{perf.valorAtual ? fmt.brl(perf.valorAtual) : '-'}</td>
                    <td>
                      {perf.custo > 0 && (
                        <span className={`flex items-center gap-1 text-xs font-medium ${perf.ganho >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                          {perf.ganho >= 0 ? <TrendingUp size={12}/> : <TrendingDown size={12}/>}
                          {fmt.pct(perf.pct)}
                        </span>
                      )}
                    </td>
                    <td className="text-slate-500">{f.peso_sugerido ? fmt.pct(f.peso_sugerido * 100) : '-'}</td>
                    <td>
                      <div className="flex items-center gap-1">
                        {isEdit ? (
                          <>
                            <button className="btn-primary text-xs px-2 py-1" onClick={() => {
                              salvarEdicao(f.ticker,
                                document.getElementById(`qtd-${f.ticker}`)?.value,
                                document.getElementById(`preco-${f.ticker}`)?.value
                              );
                            }}>Salvar</button>
                            <button className="btn-secondary text-xs px-2 py-1" onClick={() => setEditando(null)}>Cancelar</button>
                          </>
                        ) : (
                          <button className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-brand-600 text-xs"
                            onClick={() => setEditando(f.ticker)}>Editar</button>
                        )}
                        <button onClick={() => remover(f.ticker)} className="p-1 rounded hover:bg-red-50 text-slate-400 hover:text-red-600">
                          <Trash2 size={14}/>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="card p-10 text-center">
          <Building2 size={40} className="text-slate-300 mx-auto mb-3"/>
          <p className="text-slate-500 font-medium">Nenhum FII adicionado</p>
          <p className="text-slate-400 text-sm mt-1">Digite um ticker acima para buscar e avaliar um fundo imobiliário.</p>
        </div>
      )}
    </div>
  );
}
