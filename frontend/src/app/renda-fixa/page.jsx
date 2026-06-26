'use client';
import { useState, useEffect } from 'react';
import { Plus, Trash2, Pencil, Landmark, X } from 'lucide-react';
import api from '@/lib/api';
import { fmt } from '@/lib/utils';

const TIPOS = ['CDB','LCI','LCA','LIG','CRI','CRA','Debenture','Tesouro Direto','Poupança','Fundo RF','Outro'];
const INDEXADORES = ['CDI','IPCA','IGPM','SELIC','Prefixado','Outro'];

export default function RendaFixaPage() {
  const [itens, setItens] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState({ nome:'', instituicao:'', tipo:'CDB', valor_investido:'', rendimento_anual:'', vencimento:'', indexador:'CDI', observacoes:'' });
  const [erro, setErro] = useState('');

  const carregar = async () => {
    try { const r = await api.get('/renda-fixa'); setItens(r.data); }
    finally { setLoading(false); }
  };

  useEffect(() => { carregar(); }, []);

  const abrirForm = (item = null) => {
    if (item) {
      setForm({ nome: item.nome, instituicao: item.instituicao||'', tipo: item.tipo||'CDB',
        valor_investido: item.valor_investido, rendimento_anual: item.rendimento_anual||'',
        vencimento: item.vencimento ? item.vencimento.split('T')[0] : '',
        indexador: item.indexador||'CDI', observacoes: item.observacoes||'' });
      setEditItem(item);
    } else {
      setForm({ nome:'', instituicao:'', tipo:'CDB', valor_investido:'', rendimento_anual:'', vencimento:'', indexador:'CDI', observacoes:'' });
      setEditItem(null);
    }
    setShowForm(true); setErro('');
  };

  const salvar = async (e) => {
    e.preventDefault();
    setErro('');
    try {
      const payload = { ...form, valor_investido: Number(form.valor_investido), rendimento_anual: Number(form.rendimento_anual)||null };
      if (editItem) await api.put(`/renda-fixa/${editItem.id}`, payload);
      else await api.post('/renda-fixa', payload);
      setShowForm(false); await carregar();
    } catch (err) { setErro(err.response?.data?.error || 'Erro ao salvar.'); }
  };

  const remover = async (id) => {
    if (!confirm('Remover este investimento?')) return;
    await api.delete(`/renda-fixa/${id}`); await carregar();
  };

  const totalInvestido = itens.reduce((s, i) => s + Number(i.valor_investido), 0);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-brand-600 border-t-transparent rounded-full animate-spin"/></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Renda Fixa</h2>
          <p className="text-sm text-slate-500">Registre seus investimentos em renda fixa para o planejamento patrimonial</p>
        </div>
        <button onClick={() => abrirForm()} className="btn-primary flex items-center gap-2">
          <Plus size={15}/> Adicionar
        </button>
      </div>

      {/* Resumo */}
      <div className="grid grid-cols-3 gap-4">
        <div className="card p-4">
          <p className="text-xs text-slate-500 mb-1">Total investido</p>
          <p className="text-xl font-bold text-slate-900">{fmt.brl(totalInvestido)}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-slate-500 mb-1">Qtd. de aplicações</p>
          <p className="text-xl font-bold text-slate-900">{itens.length}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-slate-500 mb-1">Rendimento médio</p>
          <p className="text-xl font-bold text-slate-900">
            {itens.length > 0 ? fmt.pct(itens.reduce((s,i) => s + Number(i.rendimento_anual||0), 0) / itens.length) : '-'}
          </p>
        </div>
      </div>

      {/* Modal form */}
      {showForm && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-base font-semibold text-slate-900">{editItem ? 'Editar' : 'Adicionar'} Renda Fixa</h3>
              <button onClick={() => setShowForm(false)} className="p-1 hover:bg-slate-100 rounded-lg"><X size={18}/></button>
            </div>
            {erro && <p className="mb-3 text-sm text-red-600">{erro}</p>}
            <form onSubmit={salvar} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-slate-600 mb-1">Nome / Descrição *</label>
                  <input className="input" placeholder="Ex: CDB XP 110% CDI" value={form.nome}
                    onChange={e => setForm({...form, nome: e.target.value})} required/>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Instituição</label>
                  <input className="input" placeholder="XP, Nubank..." value={form.instituicao}
                    onChange={e => setForm({...form, instituicao: e.target.value})}/>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Tipo</label>
                  <select className="input" value={form.tipo} onChange={e => setForm({...form, tipo: e.target.value})}>
                    {TIPOS.map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Valor investido (R$) *</label>
                  <input className="input" type="number" min="0" step="0.01" placeholder="0,00"
                    value={form.valor_investido} onChange={e => setForm({...form, valor_investido: e.target.value})} required/>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Rendimento anual (%)</label>
                  <input className="input" type="number" step="0.01" placeholder="Ex: 12.5"
                    value={form.rendimento_anual} onChange={e => setForm({...form, rendimento_anual: e.target.value})}/>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Indexador</label>
                  <select className="input" value={form.indexador} onChange={e => setForm({...form, indexador: e.target.value})}>
                    {INDEXADORES.map(i => <option key={i}>{i}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Vencimento</label>
                  <input className="input" type="date" value={form.vencimento}
                    onChange={e => setForm({...form, vencimento: e.target.value})}/>
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-slate-600 mb-1">Observações</label>
                  <textarea className="input" rows={2} placeholder="Opcional..."
                    value={form.observacoes} onChange={e => setForm({...form, observacoes: e.target.value})}/>
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <button type="submit" className="btn-primary flex-1">Salvar</button>
                <button type="button" onClick={() => setShowForm(false)} className="btn-secondary flex-1">Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {itens.length > 0 ? (
        <div className="table-container">
          <table>
            <thead><tr>
              <th>Nome</th><th>Instituição</th><th>Tipo</th><th>Indexador</th>
              <th>Valor Investido</th><th>Rendimento</th><th>Vencimento</th><th>Obs.</th><th></th>
            </tr></thead>
            <tbody>
              {itens.map(i => (
                <tr key={i.id}>
                  <td className="font-medium">{i.nome}</td>
                  <td>{i.instituicao || '-'}</td>
                  <td><span className="badge badge-bom">{i.tipo}</span></td>
                  <td>{i.indexador || '-'}</td>
                  <td className="font-semibold">{fmt.brl(i.valor_investido)}</td>
                  <td>{i.rendimento_anual ? fmt.pct(i.rendimento_anual) + ' a.a.' : '-'}</td>
                  <td>{i.vencimento ? fmt.data(i.vencimento) : '-'}</td>
                  <td className="text-xs text-slate-500 max-w-xs truncate">{i.observacoes || '-'}</td>
                  <td>
                    <div className="flex gap-1">
                      <button onClick={() => abrirForm(i)} className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-brand-600"><Pencil size={14}/></button>
                      <button onClick={() => remover(i.id)} className="p-1 hover:bg-red-50 rounded text-slate-400 hover:text-red-600"><Trash2 size={14}/></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="card p-10 text-center">
          <Landmark size={40} className="text-slate-300 mx-auto mb-3"/>
          <p className="text-slate-500 font-medium">Nenhum investimento em renda fixa</p>
          <p className="text-slate-400 text-sm mt-1">Adicione seus CDBs, LCIs, Tesouro Direto e outros.</p>
        </div>
      )}
    </div>
  );
}
