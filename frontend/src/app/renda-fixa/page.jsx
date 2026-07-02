'use client';
import { useState, useEffect } from 'react';
import { RefreshCw, X, Plus } from 'lucide-react';
import api from '@/lib/api';
import { fmt } from '@/lib/utils';

const TIPOS = ['CDB', 'LCI', 'LCA', 'Tesouro Direto', 'Debenture', 'CRI', 'CRA', 'Poupança', 'Outro'];
const INDEXADORES = ['Prefixado', 'CDI', 'Selic', 'IPCA'];
const LIQUIDEZ = ['D+0', 'D+1', 'D+30', 'D+60', 'Vencimento'];

function corAlerta(a) {
  if (a === 'critico') return { bg: '#FEE2E2', cor: '#991B1B', texto: '🔴 Vence em breve!' };
  if (a === 'atencao') return { bg: '#FEF3C7', cor: '#92400E', texto: '⚠ Vence em 3 meses' };
  if (a === 'info')    return { bg: '#DBEAFE', cor: '#1E40AF', texto: 'ℹ Vence em 6 meses' };
  return null;
}

function corProgresso(pct) {
  if (pct >= 80) return '#DC2626';
  if (pct >= 50) return '#D97706';
  return '#2563EB';
}

function labelIndexador(indexador, taxa, taxas) {
  const t = parseFloat(taxa);
  switch (indexador) {
    case 'CDI':   return `${t}% do CDI (≈ ${((t/100)*taxas.cdi).toFixed(2)}% a.a.)`;
    case 'Selic': return `${t}% da Selic (≈ ${((t/100)*taxas.selic).toFixed(2)}% a.a.)`;
    case 'IPCA':  return `IPCA + ${t}% a.a. (≈ ${(taxas.ipca + t).toFixed(2)}% a.a.)`;
    default:      return `${t}% a.a.`;
  }
}

// ─── MODAL ADICIONAR / EDITAR ─────────────────────────────────────────────
function ModalForm({ item, onFechar, onSalvar }) {
  const [form, setForm] = useState({
    nome: '', tipo: 'CDB', indexador: 'CDI', taxa: '', valor_investido: '',
    data_inicio: new Date().toISOString().split('T')[0],
    data_vencimento: '', emissor: '', liquidez: 'Vencimento',
    isento_ir: false, observacoes: '',
    ...item
  });
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  useEffect(() => {
    if (['LCI', 'LCA'].includes(form.tipo)) set('isento_ir', true);
  }, [form.tipo]);

  const salvar = async () => {
    if (!form.nome || !form.taxa || !form.valor_investido || !form.data_vencimento)
      return setErro('Preencha todos os campos obrigatórios.');
    setSalvando(true); setErro('');
    try { await onSalvar(form); onFechar(); }
    catch (e) { setErro(e.response?.data?.error || 'Erro ao salvar.'); }
    finally { setSalvando(false); }
  };

  const st = {
    overlay: { position:'fixed',inset:0,background:'rgba(0,0,0,0.45)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:200 },
    modal:   { background:'#fff',borderRadius:14,padding:28,width:520,boxShadow:'0 20px 60px rgba(0,0,0,0.2)',maxHeight:'92vh',overflowY:'auto' },
    lbl:     { fontSize:12,color:'#8896A8',fontWeight:500,display:'block',marginBottom:5 },
    inp:     { width:'100%',padding:'9px 12px',border:'1px solid #E8ECF0',borderRadius:7,fontSize:13,outline:'none',color:'#1A1A2E' },
    g2:      { display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:14 },
  };

  return (
    <div style={st.overlay} onClick={e=>e.target===e.currentTarget&&onFechar()}>
      <div style={st.modal}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:20}}>
          <h3 style={{fontSize:17,fontWeight:700}}>{item ? 'Editar investimento' : '+ Novo investimento'}</h3>
          <button onClick={onFechar} style={{background:'none',border:'none',cursor:'pointer',color:'#8896A8'}}><X size={18}/></button>
        </div>

        <div style={{marginBottom:14}}>
          <label style={st.lbl}>Nome *</label>
          <input style={st.inp} placeholder="Ex: CDB Banco Inter 14,5%" value={form.nome} onChange={e=>set('nome',e.target.value)}/>
        </div>

        <div style={st.g2}>
          <div>
            <label style={st.lbl}>Tipo *</label>
            <select style={st.inp} value={form.tipo} onChange={e=>set('tipo',e.target.value)}>
              {TIPOS.map(t=><option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label style={st.lbl}>Indexador *</label>
            <select style={st.inp} value={form.indexador} onChange={e=>set('indexador',e.target.value)}>
              {INDEXADORES.map(i=><option key={i} value={i}>{i}</option>)}
            </select>
          </div>
        </div>

        <div style={st.g2}>
          <div>
            <label style={st.lbl}>
              Taxa * {form.indexador==='Prefixado'?'(% a.a.)':form.indexador==='IPCA'?'(IPCA + % a.a.)':'(% do índice)'}
            </label>
            <input style={st.inp} type="number" step="0.01" placeholder={form.indexador==='CDI'?'110':form.indexador==='IPCA'?'6.12':'14.5'} value={form.taxa} onChange={e=>set('taxa',e.target.value)}/>
          </div>
          <div>
            <label style={st.lbl}>Valor investido (R$) *</label>
            <input style={st.inp} type="number" step="0.01" placeholder="10000.00" value={form.valor_investido} onChange={e=>set('valor_investido',e.target.value)}/>
          </div>
        </div>

        <div style={st.g2}>
          <div>
            <label style={st.lbl}>Data de início *</label>
            <input style={st.inp} type="date" value={form.data_inicio} onChange={e=>set('data_inicio',e.target.value)}/>
          </div>
          <div>
            <label style={st.lbl}>Data de vencimento *</label>
            <input style={st.inp} type="date" value={form.data_vencimento} onChange={e=>set('data_vencimento',e.target.value)}/>
          </div>
        </div>

        <div style={st.g2}>
          <div>
            <label style={st.lbl}>Emissor / Banco</label>
            <input style={st.inp} placeholder="Ex: Banco Inter" value={form.emissor} onChange={e=>set('emissor',e.target.value)}/>
          </div>
          <div>
            <label style={st.lbl}>Liquidez</label>
            <select style={st.inp} value={form.liquidez} onChange={e=>set('liquidez',e.target.value)}>
              {LIQUIDEZ.map(l=><option key={l} value={l}>{l}</option>)}
            </select>
          </div>
        </div>

        <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:14,background:'#F8F9FA',padding:'10px 14px',borderRadius:8}}>
          <input type="checkbox" id="isento_ir" checked={form.isento_ir} onChange={e=>set('isento_ir',e.target.checked)} style={{accentColor:'#2563EB',width:15,height:15}}/>
          <label htmlFor="isento_ir" style={{fontSize:13,color:'#1A1A2E',cursor:'pointer'}}>
            Isento de IR <span style={{fontSize:11,color:'#8896A8'}}>(LCI, LCA são automaticamente isentos)</span>
          </label>
        </div>

        <div style={{marginBottom:18}}>
          <label style={st.lbl}>Observações</label>
          <textarea style={{...st.inp,height:70,resize:'vertical'}} value={form.observacoes} onChange={e=>set('observacoes',e.target.value)}/>
        </div>

        {erro && <p style={{fontSize:13,color:'#DC2626',marginBottom:12}}>{erro}</p>}

        <div style={{display:'flex',gap:10,justifyContent:'flex-end'}}>
          <button onClick={onFechar} style={{padding:'9px 20px',borderRadius:7,fontSize:13,fontWeight:600,border:'none',cursor:'pointer',background:'#EDF2F7',color:'#8896A8'}}>Cancelar</button>
          <button onClick={salvar} disabled={salvando} style={{padding:'9px 20px',borderRadius:7,fontSize:13,fontWeight:600,border:'none',cursor:'pointer',background:'#2563EB',color:'#fff'}}>
            {salvando ? 'Salvando...' : item ? 'Salvar alterações' : 'Adicionar'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── CARD DO TÍTULO ────────────────────────────────────────────────────────
function RendaFixaCard({ item, taxas, onEditar, onRemover }) {
  const alerta = corAlerta(item.alertaVencimento);
  const C = {
    lbl: { fontSize:10,color:'#8896A8',margin:0,textTransform:'uppercase',letterSpacing:'.04em' },
    val: { fontSize:14,fontWeight:600,color:'#1A1A2E',margin:0 },
  };

  return (
    <div style={{background:'#FFFFFF',border:'1px solid #E8ECF0',borderRadius:14,overflow:'hidden'}}>
      <div style={{padding:'14px 16px 10px',display:'flex',alignItems:'flex-start',justifyContent:'space-between'}}>
        <div>
          <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:4}}>
            <span style={{fontSize:16,fontWeight:700,color:'#2563EB'}}>{item.nome}</span>
            <span style={{fontSize:10,fontWeight:600,padding:'2px 8px',borderRadius:20,background:'#DBEAFE',color:'#1E40AF'}}>{item.tipo}</span>
            <span style={{fontSize:10,fontWeight:600,padding:'2px 8px',borderRadius:20,background:'#EDE9FE',color:'#5B21B6'}}>{item.indexador}</span>
            {item.liquidez && item.liquidez !== 'Vencimento' && (
              <span style={{fontSize:10,fontWeight:600,padding:'2px 8px',borderRadius:20,background:'#FEE2E2',color:'#991B1B'}}>{item.liquidez}</span>
            )}
            {item.isento_ir && (
              <span style={{fontSize:10,fontWeight:600,padding:'2px 8px',borderRadius:20,background:'#D1FAE5',color:'#065F46'}}>Isento IR</span>
            )}
          </div>
          <p style={{fontSize:12,color:'#8896A8',margin:0}}>
            {item.emissor && `${item.emissor} · `}Vence em {new Date(item.data_vencimento).toLocaleDateString('pt-BR')}
          </p>
        </div>
        {alerta && (
          <span style={{fontSize:11,fontWeight:600,padding:'3px 9px',borderRadius:4,background:alerta.bg,color:alerta.cor,whiteSpace:'nowrap'}}>{alerta.texto}</span>
        )}
      </div>

      <div style={{padding:'10px 16px',borderTop:'1px solid #E8ECF0'}}>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:12}}>
          <div><p style={C.lbl}>Valor investido</p><p style={C.val}>{fmt.brl(item.valor_investido)}</p></div>
          <div><p style={C.lbl}>Taxa contratada</p><p style={C.val}>{labelIndexador(item.indexador, item.taxa, taxas)}</p></div>
          <div>
            <p style={C.lbl}>vs CDI atual</p>
            <p style={{...C.val, color: item.taxaAnual >= taxas.cdi ? '#16A34A' : '#DC2626'}}>
              {((item.taxaAnual / taxas.cdi) * 100).toFixed(1)}% do CDI
            </p>
          </div>
        </div>
      </div>

      <div style={{padding:'10px 16px',borderTop:'1px solid #E8ECF0'}}>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:12}}>
          <div>
            <p style={C.lbl}>Valor atual (bruto)</p>
            <p style={{fontSize:16,fontWeight:700,color:'#2563EB',margin:0}}>{fmt.brl(item.valorBruto)}</p>
            <p style={{fontSize:11,color:'#16A34A',margin:'3px 0 0'}}>+{fmt.brl(item.rendBruto)} (+{fmt.pct(item.rendBrutoPct)})</p>
          </div>
          <div>
            <p style={C.lbl}>IR estimado ({item.aliquotaIR}%)</p>
            {item.isento_ir
              ? <><p style={{fontSize:16,fontWeight:700,color:'#16A34A',margin:0}}>R$ 0,00</p><p style={{fontSize:11,color:'#16A34A',margin:'3px 0 0'}}>✓ Isento</p></>
              : <><p style={{fontSize:16,fontWeight:700,color:'#DC2626',margin:0}}>-{fmt.brl(item.ir)}</p><p style={{fontSize:11,color:'#8896A8',margin:'3px 0 0'}}>Alíquota regressiva</p></>
            }
          </div>
          <div>
            <p style={C.lbl}>Valor líquido (após IR)</p>
            <p style={{fontSize:16,fontWeight:700,color:'#16A34A',margin:0}}>{fmt.brl(item.valorLiquido)}</p>
            <p style={{fontSize:11,color:'#16A34A',margin:'3px 0 0'}}>+{fmt.brl(item.rendLiquido)} (+{fmt.pct(item.rendLiquidoPct)})</p>
          </div>
        </div>
      </div>

      <div style={{padding:'10px 16px',borderTop:'1px solid #E8ECF0'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:6}}>
          <p style={{fontSize:11,color:'#8896A8',margin:0}}>Progresso até o vencimento</p>
          <p style={{fontSize:11,color:'#8896A8',margin:0}}>
            {new Date(item.data_inicio).toLocaleDateString('pt-BR')} → {new Date(item.data_vencimento).toLocaleDateString('pt-BR')} · <strong>{item.progressoPct}% concluído</strong>
            {item.diasParaVencer > 0 && ` · faltam ${item.diasParaVencer} dias`}
          </p>
        </div>
        <div style={{height:6,background:'#E8ECF0',borderRadius:3,overflow:'hidden'}}>
          <div style={{width:`${item.progressoPct}%`,height:'100%',background:corProgresso(item.progressoPct),borderRadius:3}}/>
        </div>
      </div>

      <div style={{padding:'10px 16px',borderTop:'1px solid #E8ECF0',display:'flex',justifyContent:'flex-end',gap:8}}>
        <button onClick={()=>onEditar(item)} className="btn-icon">✏️</button>
        <button onClick={()=>onRemover(item.id)} className="btn-icon">🗑️</button>
      </div>
    </div>
  );
}

// ─── PÁGINA ────────────────────────────────────────────────────────────────
export default function RendaFixaPage() {
  const [itens, setItens]     = useState([]);
  const [taxas, setTaxas]     = useState({ cdi: 0, selic: 0, ipca: 0 });
  const [loading, setLoading] = useState(true);
  const [modal, setModal]     = useState(null);

  const carregar = async () => {
    try {
      const r = await api.get('/renda-fixa');
      setItens(r.data.itens || []);
      setTaxas(r.data.taxas || { cdi: 0, selic: 0, ipca: 0 });
    } finally { setLoading(false); }
  };

  useEffect(() => { carregar(); }, []);

  const salvar = async (form) => {
    if (form.id) await api.put(`/renda-fixa/${form.id}`, form);
    else         await api.post('/renda-fixa', form);
    await carregar();
  };

  const remover = async (id) => {
    if (!confirm('Remover este investimento?')) return;
    await api.delete(`/renda-fixa/${id}`);
    await carregar();
  };

  const patrimonio   = itens.reduce((s,i) => s + (i.valorLiquido || 0), 0);
  const totalInvest  = itens.reduce((s,i) => s + parseFloat(i.valor_investido || 0), 0);
  const rendBruto    = itens.reduce((s,i) => s + (i.rendBruto || 0), 0);
  const rendLiquido  = itens.reduce((s,i) => s + (i.rendLiquido || 0), 0);
  const rendBrutoPct = totalInvest > 0 ? (rendBruto / totalInvest) * 100 : 0;
  const rendLiqPct   = totalInvest > 0 ? (rendLiquido / totalInvest) * 100 : 0;

  if (loading) return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:256}}>
      <div style={{width:32,height:32,border:'2px solid #2563EB',borderTopColor:'transparent',borderRadius:'50%',animation:'spin 0.7s linear infinite'}}/>
    </div>
  );

  return (
    <div>
      <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:20,flexWrap:'wrap',gap:8}}>
        <div>
          <h2 style={{fontSize:22,fontWeight:600,color:'#1A1A2E',marginBottom:4}}>Carteira Renda Fixa</h2>
          <p style={{fontSize:13,color:'#8896A8'}}>Rendimento calculado automaticamente com juros compostos diários</p>
        </div>
        <button onClick={()=>setModal('novo')} style={{display:'flex',alignItems:'center',gap:6,padding:'8px 16px',borderRadius:7,fontSize:13,fontWeight:600,border:'none',cursor:'pointer',background:'#2563EB',color:'#fff'}}>
          <Plus size={15}/> Novo investimento
        </button>
      </div>

      <div style={{background:'linear-gradient(135deg,#1E3A5F,#2563EB)',borderRadius:12,padding:'16px 20px',display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:12,marginBottom:16}}>
        <div>
          <p style={{fontSize:11,color:'rgba(255,255,255,.7)',textTransform:'uppercase',letterSpacing:'.05em',margin:'0 0 2px'}}>Taxas de referência — atualizadas automaticamente</p>
          <p style={{fontSize:10,color:'rgba(255,255,255,.5)',margin:0}}>Fonte: Banco Central do Brasil</p>
        </div>
        <div style={{display:'flex',gap:28}}>
          {[
            { label: 'CDI',   val: `${taxas.cdi?.toFixed(2) || '—'}%` },
            { label: 'Selic', val: `${taxas.selic?.toFixed(2) || '—'}%` },
            { label: 'IPCA',  val: `${taxas.ipca?.toFixed(2) || '—'}%` },
          ].map((t,i) => (
            <div key={t.label} style={{textAlign:'center',paddingLeft:i>0?28:0,borderLeft:i>0?'1px solid rgba(255,255,255,.2)':undefined}}>
              <p style={{fontSize:11,color:'rgba(255,255,255,.7)',margin:'0 0 2px'}}>{t.label}</p>
              <p style={{fontSize:24,fontWeight:700,color:'#fff',margin:0}}>{t.val}</p>
              <p style={{fontSize:10,color:'rgba(255,255,255,.5)',margin:0}}>a.a.</p>
            </div>
          ))}
        </div>
      </div>

      {itens.length > 0 && (
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:16}}>
          <div style={{background:'#FFFFFF',border:'1px solid #E8ECF0',borderRadius:12,padding:'18px 20px'}}>
            <p style={{fontSize:11,color:'#8896A8',textTransform:'uppercase',letterSpacing:'.05em',marginBottom:8}}>Patrimônio renda fixa</p>
            <p style={{fontSize:26,fontWeight:800,color:'#2563EB',margin:0}}>{fmt.brl(patrimonio)}</p>
            <p style={{fontSize:12,color:'#8896A8',marginTop:4}}>{itens.length} investimento{itens.length>1?'s':''} ativo{itens.length>1?'s':''}</p>
          </div>
          <div style={{background:'#FFFFFF',border:'1px solid #E8ECF0',borderRadius:12,padding:'18px 20px'}}>
            <p style={{fontSize:11,color:'#8896A8',textTransform:'uppercase',letterSpacing:'.05em',marginBottom:8}}>Rendimento acumulado</p>
            <p style={{fontSize:26,fontWeight:800,color:'#16A34A',margin:0}}>+{fmt.brl(rendLiquido)}</p>
            <p style={{fontSize:12,color:'#8896A8',marginTop:4}}>
              +{fmt.pct(rendLiqPct)} líquido · +{fmt.pct(rendBrutoPct)} bruto
            </p>
          </div>
        </div>
      )}

      {itens.length > 0 ? (
        <div style={{display:'flex',flexDirection:'column',gap:12}}>
          {itens.map(item => (
            <RendaFixaCard key={item.id} item={item} taxas={taxas}
              onEditar={setModal} onRemover={remover}/>
          ))}
        </div>
      ) : (
        <div style={{background:'#FFF',border:'1px solid #E8ECF0',borderRadius:14,padding:48,textAlign:'center'}}>
          <p style={{fontSize:40,marginBottom:12}}>💰</p>
          <p style={{color:'#4A5568',fontWeight:500,marginBottom:8}}>Nenhum investimento cadastrado</p>
          <p style={{color:'#8896A8',fontSize:13,marginBottom:20}}>Adicione seus CDBs, LCIs, Tesouro Direto e outros títulos de renda fixa.</p>
          <button onClick={()=>setModal('novo')} style={{padding:'10px 20px',borderRadius:8,fontSize:13,fontWeight:600,border:'none',cursor:'pointer',background:'#2563EB',color:'#fff'}}>
            + Adicionar primeiro investimento
          </button>
        </div>
      )}

      {modal && (
        <ModalForm
          item={modal === 'novo' ? null : modal}
          onFechar={() => setModal(null)}
          onSalvar={salvar}
        />
      )}
    </div>
  );
}
