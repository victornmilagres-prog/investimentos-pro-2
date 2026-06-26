'use client';
import { useState, useEffect } from 'react';
import { Plus, Trash2, RefreshCw, Search, TrendingUp, TrendingDown } from 'lucide-react';
import api from '@/lib/api';
import { fmt, badgeClassificacao, badgeGraham, classeDecisao, calcPerformance } from '@/lib/utils';

export default function AcoesPage() {
  const [acoes, setAcoes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [buscando, setBuscando] = useState(false);
  const [atualizando, setAtualizando] = useState(false);
  const [ticker, setTicker] = useState('');
  const [quantidade, setQuantidade] = useState('');
  const [precoCompra, setPrecoCompra] = useState('');
  const [erro, setErro] = useState('');
  const [editando, setEditando] = useState(null);

  const carregar = async () => {
    try {
      const r = await api.get('/acoes');
      setAcoes(r.data);
    } finally { setLoading(false); }
  };

  useEffect(() => { carregar(); }, []);

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
      await carregar();
    } catch (err) {
      setErro(err.response?.data?.error || 'Erro ao adicionar ação.');
    } finally { setBuscando(false); }
  };

  const remover = async (t) => {
    if (!confirm(`Remover ${t}?`)) return;
    await api.delete(`/acoes/${t}`);
    await carregar();
  };

  const salvarEdicao = async (ticker, qtd, preco) => {
    await api.put(`/acoes/${ticker}`, { quantidade: Number(qtd), preco_compra: Number(preco) });
    setEditando(null);
    await carregar();
  };

  const atualizar = async () => {
    setAtualizando(true);
    try { await api.post('/acoes/atualizar-todos'); await carregar(); }
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
          <h2 className="text-xl font-bold text-slate-900">Avaliação de Ações</h2>
          <p className="text-sm text-slate-500">Busca dados em tempo real via Brapi e avalia por critérios fundamentalistas</p>
        </div>
        <button onClick={atualizar} disabled={atualizando} className="btn-secondary flex items-center gap-2">
          <RefreshCw size={15} className={atualizando ? 'animate-spin' : ''}/>
          {atualizando ? 'Atualizando...' : 'Atualizar todos'}
        </button>
      </div>

      {/* Form de adicionar */}
      <div className="card p-5">
        <h3 className="text-sm font-semibold text-slate-900 mb-4">Adicionar ação</h3>
        <form onSubmit={adicionar} className="flex flex-wrap gap-3 items-end">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Ticker *</label>
            <input className="input w-32 uppercase" placeholder="Ex: PETR4"
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

      {/* Critérios */}
      <div className="card p-4">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Critérios de avaliação (Score /6)</p>
        <div className="flex flex-wrap gap-2 text-xs text-slate-600">
          <span className="px-2 py-1 bg-slate-100 rounded">P/L &lt; 15</span>
          <span className="px-2 py-1 bg-slate-100 rounded">P/VP &lt; 1,5</span>
          <span className="px-2 py-1 bg-slate-100 rounded">Margem Liq. &gt; 10%</span>
          <span className="px-2 py-1 bg-slate-100 rounded">ROE &gt; 10%</span>
          <span className="px-2 py-1 bg-slate-100 rounded">Dívida/EBIT &lt; 2x</span>
          <span className="px-2 py-1 bg-slate-100 rounded">DY &gt; 6%</span>
        </div>
      </div>

      {/* Tabela */}
      {acoes.length > 0 ? (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Ticker</th>
                <th>Preço Atual</th>
                <th>Preço Graham</th>
                <th>Graham</th>
                <th>P/L</th>
                <th>P/VP</th>
                <th>Margem %</th>
                <th>ROE %</th>
                <th>Dív/EBIT</th>
                <th>DY %</th>
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
              {acoes.map(a => {
                const perf = calcPerformance(a.preco_atual, a.preco_compra, a.quantidade);
                const isEditando = editando === a.ticker;
                return (
                  <tr key={a.ticker}>
                    <td className="font-mono font-bold text-brand-700">{a.ticker}</td>
                    <td className="font-semibold">{fmt.brl(a.preco_atual)}</td>
                    <td>{a.preco_graham ? fmt.brl(a.preco_graham) : '-'}</td>
                    <td><span className={badgeGraham(a.status_graham)}>{a.status_graham || '-'}</span></td>
                    <td>{a.pl ? fmt.num(a.pl) : '-'}</td>
                    <td>{a.pvp ? fmt.num(a.pvp) : '-'}</td>
                    <td>{a.margem_liquida ? fmt.pct(a.margem_liquida) : '-'}</td>
                    <td>{a.roe ? fmt.pct(a.roe) : '-'}</td>
                    <td>{a.divida_ebit ? fmt.num(a.divida_ebit) : '-'}</td>
                    <td>{a.dy ? fmt.pct(a.dy) : '-'}</td>
                    <td className="font-mono font-semibold">{a.score}</td>
                    <td><span className={badgeClassificacao(a.classificacao)}>{a.classificacao}</span></td>
                    <td><span className={classeDecisao(a.decisao)}>{a.decisao}</span></td>
                    <td>
                      {isEditando
                        ? <input className="input w-20 text-xs" type="number" defaultValue={a.quantidade}
                            id={`qtd-${a.ticker}`} step="0.000001" min="0"/>
                        : fmt.num(a.quantidade, 0) || '-'}
                    </td>
                    <td>
                      {isEditando
                        ? <input className="input w-24 text-xs" type="number" defaultValue={a.preco_compra}
                            id={`preco-${a.ticker}`} step="0.01" min="0"/>
                        : a.preco_compra ? fmt.brl(a.preco_compra) : '-'}
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
                    <td className="text-slate-500">{a.peso_sugerido ? fmt.pct(a.peso_sugerido * 100) : '-'}</td>
                    <td>
                      <div className="flex items-center gap-1">
                        {isEditando ? (
                          <>
                            <button className="btn-primary text-xs px-2 py-1" onClick={() => {
                              const qtd = document.getElementById(`qtd-${a.ticker}`)?.value;
                              const preco = document.getElementById(`preco-${a.ticker}`)?.value;
                              salvarEdicao(a.ticker, qtd, preco);
                            }}>Salvar</button>
                            <button className="btn-secondary text-xs px-2 py-1" onClick={() => setEditando(null)}>Cancelar</button>
                          </>
                        ) : (
                          <button className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-brand-600 text-xs"
                            onClick={() => setEditando(a.ticker)}>Editar</button>
                        )}
                        <button onClick={() => remover(a.ticker)}
                          className="p-1 rounded hover:bg-red-50 text-slate-400 hover:text-red-600">
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
          <TrendingUp size={40} className="text-slate-300 mx-auto mb-3"/>
          <p className="text-slate-500 font-medium">Nenhuma ação adicionada</p>
          <p className="text-slate-400 text-sm mt-1">Digite um ticker acima para buscar e avaliar uma ação.</p>
        </div>
      )}
    </div>
  );
}
