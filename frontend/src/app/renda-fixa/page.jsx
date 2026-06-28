'use client';
import { useState, useEffect } from 'react';
import { Plus, Landmark, X } from 'lucide-react';
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
    e.preventDefault(); setErro('');
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
  const mediaRendimento = itens.length > 0
    ? itens.reduce((s, i) => s + Number(i.rendimento_anual || 0), 0) / itens.length
    : 0;

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 256 }}>
      <div style={{ width: 32, height: 32, border: '2px solid #C9A84C', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }}/>
    </div>
  );

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 600, color: '#1A1A2E', marginBottom: 4 }}>Carteira Renda Fixa</h2>
          <p style={{ fontSize: 13, color: '#8896A8' }}>Registre seus investimentos em renda fixa para o planejamento patrimonial</p>
        </div>
        <button onClick={() => abrirForm()} className="btn-primary">
          <Plus size={15}/> Adicionar
        </button>
      </div>

      {/* Resumo */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 24 }}>
        {[
          { label: 'Total investido',    valor: fmt.brl(totalInvestido),              color: '#1A1A2E' },
          { label: 'Qtd. de aplicações', valor: String(itens.length),                 color: '#1A1A2E' },
          { label: 'Rendimento médio',   valor: itens.length > 0 ? fmt.pct(mediaRendimento) + ' a.a.' : '-', color: '#16A34A' },
        ].map(({ label, valor, color }) => (
          <div key={label} style={{ background: '#FFFFFF', border: '1px solid #E8ECF0', borderRadius: 14, padding: '14px 16px' }}>
            <p style={{ fontSize: 11, color: '#8896A8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6 }}>{label}</p>
            <p style={{ fontSize: 18, fontWeight: 700, color }}>{valor}</p>
          </div>
        ))}
      </div>

      {/* Modal form */}
      {showForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div style={{ background: '#FFFFFF', borderRadius: 16, boxShadow: '0 25px 50px rgba(0,0,0,0.15)', width: '100%', maxWidth: 440, padding: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <h3 style={{ fontSize: 16, fontWeight: 600, color: '#1A1A2E' }}>{editItem ? 'Editar' : 'Adicionar'} Renda Fixa</h3>
              <button onClick={() => setShowForm(false)} className="btn-icon"><X size={16}/></button>
            </div>
            {erro && <p style={{ marginBottom: 12, fontSize: 13, color: '#DC2626' }}>{erro}</p>}
            <form onSubmit={salvar}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div style={{ gridColumn: '1/-1' }}>
                  <label style={{ fontSize: 11, color: '#8896A8', fontWeight: 600, display: 'block', marginBottom: 4 }}>Nome / Descrição *</label>
                  <input className="input" placeholder="Ex: CDB XP 110% CDI" value={form.nome}
                    onChange={e => setForm({...form, nome: e.target.value})} required/>
                </div>
                <div>
                  <label style={{ fontSize: 11, color: '#8896A8', fontWeight: 600, display: 'block', marginBottom: 4 }}>Instituição</label>
                  <input className="input" placeholder="XP, Nubank..." value={form.instituicao}
                    onChange={e => setForm({...form, instituicao: e.target.value})}/>
                </div>
                <div>
                  <label style={{ fontSize: 11, color: '#8896A8', fontWeight: 600, display: 'block', marginBottom: 4 }}>Tipo</label>
                  <select className="input" value={form.tipo} onChange={e => setForm({...form, tipo: e.target.value})}>
                    {TIPOS.map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 11, color: '#8896A8', fontWeight: 600, display: 'block', marginBottom: 4 }}>Valor investido (R$) *</label>
                  <input className="input" type="number" min="0" step="0.01" placeholder="0,00"
                    value={form.valor_investido} onChange={e => setForm({...form, valor_investido: e.target.value})} required/>
                </div>
                <div>
                  <label style={{ fontSize: 11, color: '#8896A8', fontWeight: 600, display: 'block', marginBottom: 4 }}>Rendimento anual (%)</label>
                  <input className="input" type="number" step="0.01" placeholder="Ex: 12.5"
                    value={form.rendimento_anual} onChange={e => setForm({...form, rendimento_anual: e.target.value})}/>
                </div>
                <div>
                  <label style={{ fontSize: 11, color: '#8896A8', fontWeight: 600, display: 'block', marginBottom: 4 }}>Indexador</label>
                  <select className="input" value={form.indexador} onChange={e => setForm({...form, indexador: e.target.value})}>
                    {INDEXADORES.map(i => <option key={i}>{i}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 11, color: '#8896A8', fontWeight: 600, display: 'block', marginBottom: 4 }}>Vencimento</label>
                  <input className="input" type="date" value={form.vencimento}
                    onChange={e => setForm({...form, vencimento: e.target.value})}/>
                </div>
                <div style={{ gridColumn: '1/-1' }}>
                  <label style={{ fontSize: 11, color: '#8896A8', fontWeight: 600, display: 'block', marginBottom: 4 }}>Observações</label>
                  <textarea className="input" rows={2} placeholder="Opcional..."
                    value={form.observacoes} onChange={e => setForm({...form, observacoes: e.target.value})}/>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                <button type="submit" className="btn-primary" style={{ flex: 1, justifyContent: 'center' }}>Salvar</button>
                <button type="button" className="btn-secondary" style={{ flex: 1, justifyContent: 'center' }} onClick={() => setShowForm(false)}>Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Lista cards */}
      {itens.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {itens.map(i => (
            <div key={i.id} style={{ background: '#FFFFFF', border: '1px solid #E8ECF0', borderRadius: 14, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 16 }}>
              <div style={{ width: 42, height: 42, borderRadius: '50%', background: '#F0FDF4', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, flexShrink: 0 }}>
                🏦
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 14, fontWeight: 700, color: '#1A1A2E' }}>{i.nome}</p>
                <p style={{ fontSize: 12, color: '#8896A8', marginTop: 2 }}>
                  {[i.instituicao, i.tipo, i.indexador].filter(Boolean).join(' · ')}
                </p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <p style={{ fontSize: 15, fontWeight: 700, color: '#1A1A2E' }}>{fmt.brl(i.valor_investido)}</p>
                {i.rendimento_anual && (
                  <p style={{ fontSize: 12, fontWeight: 600, color: '#16A34A', marginTop: 2 }}>{fmt.pct(i.rendimento_anual)} a.a.</p>
                )}
                {i.vencimento && (
                  <p style={{ fontSize: 11, color: '#8896A8', marginTop: 2 }}>Vence {fmt.data(i.vencimento)}</p>
                )}
              </div>
              <div style={{ display: 'flex', gap: 6, marginLeft: 16 }}>
                <button className="btn-icon" onClick={() => abrirForm(i)}>✏️</button>
                <button className="btn-icon" onClick={() => remover(i.id)}>🗑️</button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{ background: '#FFF', border: '1px solid #E8ECF0', borderRadius: 14, padding: 40, textAlign: 'center' }}>
          <Landmark size={40} style={{ color: '#D0D8E0', margin: '0 auto 12px' }}/>
          <p style={{ color: '#4A5568', fontWeight: 500, marginBottom: 4 }}>Nenhum investimento em renda fixa</p>
          <p style={{ color: '#8896A8', fontSize: 13 }}>Adicione seus CDBs, LCIs, Tesouro Direto e outros.</p>
        </div>
      )}
    </div>
  );
}
