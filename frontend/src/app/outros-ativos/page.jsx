'use client';
import { useState, useEffect } from 'react';
import { RefreshCw, X, Plus } from 'lucide-react';
import api from '@/lib/api';
import { fmt } from '@/lib/utils';

const TIPOS = ['Cripto', 'ETF', 'Câmbio', 'Commodity', 'Outro'];

const SUGESTOES = [
  { ticker:'BTC',    nome:'Bitcoin',           tipo:'Cripto',  placeholder:'0.001' },
  { ticker:'ETH',    nome:'Ethereum',          tipo:'Cripto',  placeholder:'0.01' },
  { ticker:'SOL',    nome:'Solana',            tipo:'Cripto',  placeholder:'1' },
  { ticker:'GOLD11', nome:'Ouro (GOLD11)',     tipo:'ETF',     placeholder:'100' },
  { ticker:'IVVB11', nome:'S&P 500 (IVVB11)', tipo:'ETF',     placeholder:'10' },
  { ticker:'BOVA11', nome:'IBOVESPA (BOVA11)', tipo:'ETF',     placeholder:'10' },
  { ticker:'USD',    nome:'Dólar (USD/BRL)',   tipo:'Câmbio',  placeholder:'1000' },
  { ticker:'EUR',    nome:'Euro (EUR/BRL)',    tipo:'Câmbio',  placeholder:'1000' },
];

// ─── MODAL ADICIONAR / EDITAR ─────────────────────────────────────────────
function ModalForm({ item, onFechar, onSalvar }) {
  const [form, setForm] = useState({
    ticker:'', nome:'', tipo:'Cripto', quantidade:'', preco_compra:'', observacoes:'',
    ...item
  });
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState('');

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const aplicarSugestao = (s) => {
    setForm(f => ({ ...f, ticker: s.ticker, nome: s.nome, tipo: s.tipo }));
  };

  const salvar = async () => {
    if (!form.ticker || !form.tipo || !form.quantidade || !form.preco_compra)
      return setErro('Preencha todos os campos obrigatórios.');
    setSalvando(true); setErro('');
    try { await onSalvar(form); onFechar(); }
    catch (e) { setErro(e.response?.data?.error || 'Erro ao salvar.'); }
    finally { setSalvando(false); }
  };

  const st = {
    overlay: { position:'fixed',inset:0,background:'rgba(0,0,0,0.45)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:200 },
    modal:   { background:'#fff',borderRadius:14,padding:28,width:480,boxShadow:'0 20px 60px rgba(0,0,0,0.2)',maxHeight:'90vh',overflowY:'auto' },
    lbl:     { fontSize:12,color:'#8896A8',fontWeight:500,display:'block',marginBottom:5 },
    inp:     { width:'100%',padding:'9px 12px',border:'1px solid #E8ECF0',borderRadius:7,fontSize:13,outline:'none',color:'#1A1A2E' },
    g2:      { display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:14 },
  };

  return (
    <div style={st.overlay} onClick={e=>e.target===e.currentTarget&&onFechar()}>
      <div style={st.modal}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
          <h3 style={{fontSize:17,fontWeight:700}}>{item ? 'Editar ativo' : '+ Novo ativo'}</h3>
          <button onClick={onFechar} style={{background:'none',border:'none',cursor:'pointer',color:'#8896A8'}}><X size={18}/></button>
        </div>

        {!item && (
          <div style={{marginBottom:16}}>
            <p style={{fontSize:11,color:'#8896A8',marginBottom:8}}>Atalhos rápidos:</p>
            <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
              {SUGESTOES.map(s => (
                <button key={s.ticker} onClick={()=>aplicarSugestao(s)}
                  style={{fontSize:11,padding:'4px 10px',borderRadius:6,border:'1px solid #E8ECF0',background:form.ticker===s.ticker?'#EFF6FF':'#fff',color:form.ticker===s.ticker?'#2563EB':'#4A5568',cursor:'pointer'}}>
                  {s.ticker}
                </button>
              ))}
            </div>
          </div>
        )}

        <div style={st.g2}>
          <div>
            <label style={st.lbl}>Ticker / Código *</label>
            <input style={{...st.inp,textTransform:'uppercase'}} placeholder="BTC, USD, GOLD11..." value={form.ticker} onChange={e=>set('ticker',e.target.value.toUpperCase())}/>
          </div>
          <div>
            <label style={st.lbl}>Tipo *</label>
            <select style={st.inp} value={form.tipo} onChange={e=>set('tipo',e.target.value)}>
              {TIPOS.map(t=><option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>

        <div style={{marginBottom:14}}>
          <label style={st.lbl}>Nome</label>
          <input style={st.inp} placeholder="Ex: Bitcoin, Dólar americano..." value={form.nome} onChange={e=>set('nome',e.target.value)}/>
        </div>

        <div style={st.g2}>
          <div>
            <label style={st.lbl}>Quantidade *</label>
            <input style={st.inp} type="number" step="any" placeholder="0.001" value={form.quantidade} onChange={e=>set('quantidade',e.target.value)}/>
          </div>
          <div>
            <label style={st.lbl}>Preço médio de compra (R$) *</label>
            <input style={st.inp} type="number" step="any" placeholder="0.00" value={form.preco_compra} onChange={e=>set('preco_compra',e.target.value)}/>
          </div>
        </div>

        <div style={{marginBottom:18}}>
          <label style={st.lbl}>Observações</label>
          <input style={st.inp} placeholder="Opcional..." value={form.observacoes} onChange={e=>set('observacoes',e.target.value)}/>
        </div>

        {erro && <p style={{fontSize:13,color:'#DC2626',marginBottom:12}}>{erro}</p>}

        <div style={{display:'flex',gap:10,justifyContent:'flex-end'}}>
          <button onClick={onFechar} style={{padding:'9px 20px',borderRadius:7,fontSize:13,fontWeight:600,border:'none',cursor:'pointer',background:'#EDF2F7',color:'#8896A8'}}>Cancelar</button>
          <button onClick={salvar} disabled={salvando} style={{padding:'9px 20px',borderRadius:7,fontSize:13,fontWeight:600,border:'none',cursor:'pointer',background:'#2563EB',color:'#fff'}}>
            {salvando ? 'Salvando...' : item ? 'Salvar' : 'Adicionar'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── CARD DO ATIVO ─────────────────────────────────────────────────────────
function OutroAtivoCard({ item, onEditar, onRemover }) {
  const positivo = item.resultado >= 0;
  const C = {
    lbl: { fontSize:10,color:'#8896A8',margin:0,textTransform:'uppercase',letterSpacing:'.04em' },
  };

  const corTipo = {
    'Cripto':    { bg:'#FEF3C7', cor:'#92400E' },
    'ETF':       { bg:'#DBEAFE', cor:'#1E40AF' },
    'Câmbio':    { bg:'#D1FAE5', cor:'#065F46' },
    'Commodity': { bg:'#FEE2E2', cor:'#991B1B' },
  }[item.tipo] || { bg:'#F1F5F9', cor:'#475569' };

  return (
    <div style={{background:'#FFFFFF',border:'1px solid #E8ECF0',borderRadius:14,overflow:'hidden'}}>
      <div style={{padding:'14px 16px 10px',display:'flex',alignItems:'flex-start',justifyContent:'space-between'}}>
        <div>
          <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:4}}>
            <span style={{fontSize:16,fontWeight:700,color:'#2563EB'}}>{item.ticker}</span>
            <span style={{fontSize:10,fontWeight:600,padding:'2px 8px',borderRadius:20,background:corTipo.bg,color:corTipo.cor}}>{item.tipo}</span>
          </div>
          <p style={{fontSize:12,color:'#8896A8',margin:0}}>{item.nome}</p>
        </div>
        <div style={{textAlign:'right'}}>
          <p style={{fontSize:20,fontWeight:700,color:'#1A1A2E',margin:0}}>{fmt.brl(item.preco_atual)}</p>
          {item.variacao_dia !== 0 && (
            <p style={{fontSize:12,fontWeight:600,margin:'3px 0 0',color:item.variacao_dia>=0?'#16A34A':'#DC2626'}}>
              {item.variacao_dia>=0?'▲':'▼'} {item.variacao_dia>=0?'+':''}{fmt.pct(item.variacao_dia)} hoje
            </p>
          )}
        </div>
      </div>

      <div style={{padding:'10px 16px',borderTop:'1px solid #E8ECF0'}}>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:12,marginBottom:10}}>
          <div><p style={C.lbl}>Quantidade</p><p style={{fontSize:14,fontWeight:600,color:'#1A1A2E',margin:0}}>{Number(item.quantidade).toLocaleString('pt-BR', {maximumFractionDigits:8})}</p></div>
          <div><p style={C.lbl}>Preço médio</p><p style={{fontSize:14,fontWeight:600,color:'#1A1A2E',margin:0}}>{fmt.brl(item.preco_compra)}</p></div>
          <div><p style={C.lbl}>Valor investido</p><p style={{fontSize:14,fontWeight:600,color:'#1A1A2E',margin:0}}>{fmt.brl(item.valor_investido)}</p></div>
        </div>
        <div style={{borderTop:'1px solid #E8ECF0',paddingTop:10,display:'flex',justifyContent:'space-between'}}>
          <div>
            <p style={C.lbl}>Valor atual</p>
            <p style={{fontSize:16,fontWeight:700,color:'#2563EB',margin:0}}>{fmt.brl(item.valor_atual)}</p>
          </div>
          <div style={{textAlign:'right'}}>
            <p style={C.lbl}>Resultado</p>
            <p style={{fontSize:16,fontWeight:700,color:positivo?'#16A34A':'#DC2626',margin:0}}>
              {positivo?'+':''}{fmt.brl(item.resultado)} ({positivo?'+':''}{fmt.pct(item.resultado_pct)})
            </p>
          </div>
        </div>
      </div>

      <div style={{padding:'10px 16px',borderTop:'1px solid #E8ECF0',display:'flex',justifyContent:'flex-end',gap:8}}>
        <button onClick={()=>onEditar(item)} className="btn-icon">✏️</button>
        <button onClick={()=>onRemover(item.ticker)} className="btn-icon">🗑️</button>
      </div>
    </div>
  );
}

// ─── PÁGINA ────────────────────────────────────────────────────────────────
export default function OutrosAtivosPage() {
  const [itens, setItens]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [atualizando, setAtual] = useState(false);
  const [modal, setModal]       = useState(null);

  const carregar = async () => {
    try { const r = await api.get('/outros-ativos'); setItens(r.data); }
    finally { setLoading(false); }
  };

  useEffect(() => { carregar(); }, []);

  const atualizar = async () => {
    setAtual(true);
    try { await carregar(); }
    finally { setAtual(false); }
  };

  const salvar = async (form) => {
    if (form.id) await api.put(`/outros-ativos/${form.ticker}`, form);
    else         await api.post('/outros-ativos', form);
    await carregar();
  };

  const remover = async (ticker) => {
    if (!confirm(`Remover ${ticker}?`)) return;
    await api.delete(`/outros-ativos/${ticker}`);
    await carregar();
  };

  const patrimonio  = itens.reduce((s,i) => s + (i.valor_atual || 0), 0);
  const totalInvest = itens.reduce((s,i) => s + (i.valor_investido || 0), 0);
  const resultado   = patrimonio - totalInvest;
  const resultPct   = totalInvest > 0 ? (resultado / totalInvest) * 100 : 0;

  const grupos = TIPOS.filter(t => itens.some(i => i.tipo === t));

  if (loading) return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:256}}>
      <div style={{width:32,height:32,border:'2px solid #2563EB',borderTopColor:'transparent',borderRadius:'50%',animation:'spin 0.7s linear infinite'}}/>
    </div>
  );

  return (
    <div>
      <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:20,flexWrap:'wrap',gap:8}}>
        <div>
          <h2 style={{fontSize:22,fontWeight:600,color:'#1A1A2E',marginBottom:4}}>Outros Ativos</h2>
          <p style={{fontSize:13,color:'#8896A8'}}>Criptos, ETFs, câmbio e commodities — preços atualizados automaticamente</p>
        </div>
        <div style={{display:'flex',gap:8}}>
          <button onClick={atualizar} disabled={atualizando}
            style={{display:'flex',alignItems:'center',gap:6,padding:'8px 14px',borderRadius:7,fontSize:13,fontWeight:600,border:'1px solid #E8ECF0',cursor:'pointer',background:'#fff',color:'#4A5568'}}>
            <RefreshCw size={15} style={atualizando?{animation:'spin 0.7s linear infinite'}:{}}/>
            {atualizando ? 'Atualizando...' : 'Atualizar preços'}
          </button>
          <button onClick={()=>setModal('novo')} style={{display:'flex',alignItems:'center',gap:6,padding:'8px 16px',borderRadius:7,fontSize:13,fontWeight:600,border:'none',cursor:'pointer',background:'#2563EB',color:'#fff'}}>
            <Plus size={15}/> Adicionar ativo
          </button>
        </div>
      </div>

      {itens.length > 0 && (
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:16}}>
          <div style={{background:'#FFFFFF',border:'1px solid #E8ECF0',borderRadius:12,padding:'18px 20px'}}>
            <p style={{fontSize:11,color:'#8896A8',textTransform:'uppercase',letterSpacing:'.05em',marginBottom:8}}>Patrimônio outros ativos</p>
            <p style={{fontSize:26,fontWeight:800,color:'#2563EB',margin:0}}>{fmt.brl(patrimonio)}</p>
            <p style={{fontSize:12,color:'#8896A8',marginTop:4}}>{itens.length} ativo{itens.length>1?'s':''}</p>
          </div>
          <div style={{background:'#FFFFFF',border:'1px solid #E8ECF0',borderRadius:12,padding:'18px 20px'}}>
            <p style={{fontSize:11,color:'#8896A8',textTransform:'uppercase',letterSpacing:'.05em',marginBottom:8}}>Resultado total</p>
            <p style={{fontSize:26,fontWeight:800,color:resultado>=0?'#16A34A':'#DC2626',margin:0}}>
              {resultado>=0?'+':''}{fmt.brl(resultado)}
            </p>
            <p style={{fontSize:12,color:'#8896A8',marginTop:4}}>{resultado>=0?'+':''}{fmt.pct(resultPct)} desde aporte</p>
          </div>
        </div>
      )}

      {itens.length > 0 ? (
        <div style={{display:'flex',flexDirection:'column',gap:24}}>
          {grupos.map(tipo => (
            <div key={tipo}>
              <p style={{fontSize:12,fontWeight:700,color:'#8896A8',textTransform:'uppercase',letterSpacing:'.06em',marginBottom:10}}>{tipo}</p>
              <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(340px,1fr))',gap:12}}>
                {itens.filter(i=>i.tipo===tipo).map(item => (
                  <OutroAtivoCard key={item.ticker} item={item} onEditar={setModal} onRemover={remover}/>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div style={{background:'#FFF',border:'1px solid #E8ECF0',borderRadius:14,padding:48,textAlign:'center'}}>
          <p style={{fontSize:40,marginBottom:12}}>🌍</p>
          <p style={{color:'#4A5568',fontWeight:500,marginBottom:8}}>Nenhum ativo cadastrado</p>
          <p style={{color:'#8896A8',fontSize:13,marginBottom:20}}>Adicione Bitcoin, ouro, dólar, ETFs e outros investimentos alternativos.</p>
          <button onClick={()=>setModal('novo')} style={{padding:'10px 20px',borderRadius:8,fontSize:13,fontWeight:600,border:'none',cursor:'pointer',background:'#2563EB',color:'#fff'}}>
            + Adicionar primeiro ativo
          </button>
        </div>
      )}

      {modal && (
        <ModalForm item={modal==='novo'?null:modal} onFechar={()=>setModal(null)} onSalvar={salvar}/>
      )}
    </div>
  );
}
