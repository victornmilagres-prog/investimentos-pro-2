'use client';
import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { RefreshCw, TrendingUp, X } from 'lucide-react';
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

// DY >= 6 (alterado de > 6)
const criteriosAcao = [
  { label: 'P/L',      key: 'pl',             ok: v => v > 0 && v < 15,  fmt: v => fmt.num(v) },
  { label: 'P/VP',     key: 'pvp',            ok: v => v > 0 && v < 1.5, fmt: v => fmt.num(v) },
  { label: 'DY %',     key: 'dy',             ok: v => v >= 6,            fmt: v => fmt.pct(v) },
  { label: 'Margem',   key: 'margem_liquida', ok: v => v > 10,            fmt: v => fmt.pct(v) },
  { label: 'ROE',      key: 'roe',            ok: v => v > 10,            fmt: v => fmt.pct(v) },
  { label: 'Dív/EBIT', key: 'divida_ebit',   ok: v => v > 0 && v < 2,   fmt: v => fmt.num(v) },
];

// ─── MODAL COMPRAR / VENDER ────────────────────────────────────────────────
function ModalCompraVenda({ acoes, tipo, onFechar, onSalvar }) {
  const [ticker, setTicker] = useState(acoes[0]?.ticker || '');
  const [qtd, setQtd]       = useState('');
  const [preco, setPreco]   = useState('');
  const [data, setData]     = useState(new Date().toISOString().split('T')[0]);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro]     = useState('');

  const acao    = acoes.find(a => a.ticker === ticker);
  const qtdAtual = acao?.quantidade || 0;
  const pmAtual  = acao?.preco_compra || 0;
  const novoQtd  = tipo === 'comprar'
    ? qtdAtual + Number(qtd || 0)
    : Math.max(0, qtdAtual - Number(qtd || 0));
  const novoPM = tipo === 'comprar' && qtdAtual > 0 && Number(qtd) > 0 && Number(preco) > 0
    ? ((qtdAtual * pmAtual) + (Number(qtd) * Number(preco))) / novoQtd
    : tipo === 'comprar' && Number(qtd) > 0 ? Number(preco) : pmAtual;

  const confirmar = async () => {
    if (!qtd || !preco) return setErro('Preencha quantidade e preço.');
    setSalvando(true); setErro('');
    try {
      await onSalvar({ ticker, tipo, quantidade: Number(qtd), preco: Number(preco), data });
      onFechar();
    } catch (e) {
      setErro(e.response?.data?.error || 'Erro ao salvar.');
    } finally { setSalvando(false); }
  };

  const st = {
    overlay: { position:'fixed',inset:0,background:'rgba(0,0,0,0.45)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:200 },
    modal:   { background:'#fff',borderRadius:14,padding:28,width:460,boxShadow:'0 20px 60px rgba(0,0,0,0.2)',maxHeight:'90vh',overflowY:'auto' },
    label:   { fontSize:12,color:'#8896A8',fontWeight:500,display:'block',marginBottom:5 },
    input:   { width:'100%',padding:'9px 12px',border:'1px solid #E8ECF0',borderRadius:7,fontSize:13,outline:'none',color:'#1A1A2E' },
    row:     { display:'flex',gap:12,marginBottom:14 },
    prev:    { background:'#F8F9FA',borderRadius:8,padding:'12px 14px',display:'flex',gap:16,marginBottom:18 },
    footer:  { display:'flex',gap:10,justifyContent:'flex-end' },
    btnCancel:  { padding:'9px 20px',borderRadius:7,fontSize:13,fontWeight:600,border:'none',cursor:'pointer',background:'#EDF2F7',color:'#8896A8' },
    btnConfirm: { padding:'9px 20px',borderRadius:7,fontSize:13,fontWeight:600,border:'none',cursor:'pointer',background: tipo==='comprar'?'#16A34A':'#DC2626',color:'#fff' },
  };

  return (
    <div style={st.overlay} onClick={e => e.target===e.currentTarget && onFechar()}>
      <div style={st.modal}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:4}}>
          <h3 style={{fontSize:17,fontWeight:700}}>{tipo==='comprar'?'▲ Registrar Compra':'▼ Registrar Venda'}</h3>
          <button onClick={onFechar} style={{background:'none',border:'none',cursor:'pointer',color:'#8896A8'}}><X size={18}/></button>
        </div>
        <p style={{fontSize:13,color:'#8896A8',marginBottom:20}}>
          {tipo==='comprar'?'Atualiza a quantidade e recalcula o preço médio automaticamente':'Atualiza a quantidade na sua carteira'}
        </p>

        <div style={{marginBottom:14}}>
          <label style={st.label}>Ativo</label>
          <select style={st.input} value={ticker} onChange={e=>setTicker(e.target.value)}>
            {acoes.map(a=><option key={a.ticker} value={a.ticker}>{a.ticker}</option>)}
          </select>
        </div>

        <div style={st.row}>
          <div style={{flex:1}}>
            <label style={st.label}>Quantidade {tipo==='comprar'?'comprada':'vendida'}</label>
            <input style={st.input} type="number" min="0" step="1" placeholder="0" value={qtd} onChange={e=>setQtd(e.target.value)}/>
          </div>
          <div style={{flex:1}}>
            <label style={st.label}>Preço {tipo==='comprar'?'pago':'recebido'} (R$)</label>
            <input style={st.input} type="number" min="0" step="0.01" placeholder="0,00" value={preco} onChange={e=>setPreco(e.target.value)}/>
          </div>
        </div>

        <div style={{marginBottom:18}}>
          <label style={st.label}>Data da operação</label>
          <input style={st.input} type="date" value={data} onChange={e=>setData(e.target.value)}/>
        </div>

        <div style={st.prev}>
          <div><p style={{fontSize:11,color:'#8896A8',marginBottom:3}}>Qtd anterior</p><p style={{fontSize:15,fontWeight:700}}>{qtdAtual}</p></div>
          {tipo==='comprar'&&<div><p style={{fontSize:11,color:'#8896A8',marginBottom:3}}>PM anterior</p><p style={{fontSize:15,fontWeight:700}}>{fmt.brl(pmAtual)}</p></div>}
          <div><p style={{fontSize:11,color:'#8896A8',marginBottom:3}}>→ Nova qtd</p><p style={{fontSize:15,fontWeight:700,color:'#16A34A'}}>{novoQtd}</p></div>
          {tipo==='comprar'&&<div><p style={{fontSize:11,color:'#8896A8',marginBottom:3}}>→ Novo PM</p><p style={{fontSize:15,fontWeight:700,color:'#16A34A'}}>{fmt.brl(novoPM)}</p></div>}
        </div>

        {erro && <p style={{fontSize:13,color:'#DC2626',marginBottom:12}}>{erro}</p>}

        <div style={st.footer}>
          <button onClick={onFechar} style={st.btnCancel}>Cancelar</button>
          <button onClick={confirmar} disabled={salvando} style={st.btnConfirm}>
            {salvando?'Salvando...': tipo==='comprar'?'Confirmar compra':'Confirmar venda'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── MODAL DIVIDENDOS ──────────────────────────────────────────────────────
function ModalDividendos({ acoes, onFechar, onSalvar }) {
  const meses = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
  const hoje  = new Date();
  const [mes, setMes]           = useState(hoje.getMonth());
  const [ano, setAno]           = useState(hoje.getFullYear());
  const [valores, setValores]   = useState({});
  const [selecionados, setSel]  = useState({});
  const [salvando, setSalvando] = useState(false);
  const [arquivo, setArquivo]   = useState(null);

  const toggle = (ticker) => setSel(s => ({ ...s, [ticker]: !s[ticker] }));

  const total = acoes.reduce((acc, a) => {
    if (selecionados[a.ticker] && valores[a.ticker])
      return acc + (Number(valores[a.ticker]) * (a.quantidade || 0));
    return acc;
  }, 0);

  const qtdSel = Object.values(selecionados).filter(Boolean).length;

  const confirmar = async () => {
    const lancamentos = acoes
      .filter(a => selecionados[a.ticker] && valores[a.ticker])
      .map(a => ({ ticker: a.ticker, valor_por_acao: Number(valores[a.ticker]), quantidade: a.quantidade || 0, mes: mes+1, ano }));
    if (!lancamentos.length) return;
    setSalvando(true);
    try { await onSalvar(lancamentos); onFechar(); }
    finally { setSalvando(false); }
  };

  const st = {
    overlay: { position:'fixed',inset:0,background:'rgba(0,0,0,0.45)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:200 },
    modal:   { background:'#fff',borderRadius:14,padding:28,width:480,boxShadow:'0 20px 60px rgba(0,0,0,0.2)',maxHeight:'90vh',overflowY:'auto' },
    label:   { fontSize:12,color:'#8896A8',fontWeight:500,display:'block',marginBottom:5 },
    input:   { width:'100%',padding:'9px 12px',border:'1px solid #E8ECF0',borderRadius:7,fontSize:13,outline:'none',color:'#1A1A2E' },
    footer:  { display:'flex',gap:10,justifyContent:'flex-end' },
    btnCancel: { padding:'9px 20px',borderRadius:7,fontSize:13,fontWeight:600,border:'none',cursor:'pointer',background:'#EDF2F7',color:'#8896A8' },
  };

  return (
    <div style={st.overlay} onClick={e => e.target===e.currentTarget && onFechar()}>
      <div style={st.modal}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:4}}>
          <h3 style={{fontSize:17,fontWeight:700}}>💰 Lançar Dividendos</h3>
          <button onClick={onFechar} style={{background:'none',border:'none',cursor:'pointer',color:'#8896A8'}}><X size={18}/></button>
        </div>
        <p style={{fontSize:13,color:'#8896A8',marginBottom:20}}>Registre os dividendos recebidos por ativo no mês</p>

        <div style={{display:'flex',gap:12,marginBottom:16}}>
          <div style={{flex:2}}>
            <label style={st.label}>Mês de referência</label>
            <select style={st.input} value={mes} onChange={e=>setMes(Number(e.target.value))}>
              {meses.map((m,i)=><option key={i} value={i}>{m}</option>)}
            </select>
          </div>
          <div style={{flex:1}}>
            <label style={st.label}>Ano</label>
            <select style={st.input} value={ano} onChange={e=>setAno(Number(e.target.value))}>
              {[2024,2025,2026].map(y=><option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        </div>

        {/* Importar B3 */}
        <div style={{background:'#EFF6FF',border:'1px dashed #93C5FD',borderRadius:8,padding:'14px 16px',marginBottom:16,display:'flex',alignItems:'center',gap:12}}>
          <span style={{fontSize:22}}>📂</span>
          <div style={{flex:1}}>
            <p style={{fontSize:13,fontWeight:600,color:'#2563EB',marginBottom:2}}>Importar relatório da B3</p>
            <p style={{fontSize:12,color:'#4A90D9'}}>Sobe o arquivo e preenche todos os ativos automaticamente</p>
          </div>
          <label style={{background:'#EFF6FF',color:'#2563EB',border:'1px solid #93C5FD',padding:'7px 14px',borderRadius:6,fontSize:12,fontWeight:600,cursor:'pointer',whiteSpace:'nowrap'}}>
            Selecionar arquivo
            <input type="file" accept=".csv,.xlsx,.xls" style={{display:'none'}} onChange={e=>setArquivo(e.target.files[0])}/>
          </label>
        </div>
        {arquivo && <p style={{fontSize:12,color:'#16A34A',marginBottom:12}}>✓ {arquivo.name} selecionado</p>}

        {/* Separador */}
        <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:12}}>
          <div style={{flex:1,height:1,background:'#E8ECF0'}}/>
          <span style={{fontSize:11,fontWeight:700,color:'#8896A8',textTransform:'uppercase',letterSpacing:'0.05em'}}>ou informe manualmente</span>
          <div style={{flex:1,height:1,background:'#E8ECF0'}}/>
        </div>

        {/* Lista */}
        <div style={{display:'flex',flexDirection:'column',gap:8,marginBottom:16}}>
          {acoes.map(a=>(
            <div key={a.ticker} style={{display:'flex',alignItems:'center',justifyContent:'space-between',background:'#FFFDF0',border:'1px solid #F6E05E',borderRadius:8,padding:'10px 12px'}}>
              <div style={{display:'flex',alignItems:'center',gap:10}}>
                <input type="checkbox" checked={!!selecionados[a.ticker]} onChange={()=>toggle(a.ticker)} style={{accentColor:'#D4A017',width:15,height:15}}/>
                <div>
                  <p style={{fontWeight:700,fontSize:13}}>{a.ticker}</p>
                  <p style={{fontSize:11,color:'#8896A8'}}>{a.quantidade||0} ações</p>
                </div>
              </div>
              <div style={{display:'flex',alignItems:'center',gap:6}}>
                <span style={{fontSize:11,color:'#8896A8'}}>R$/ação</span>
                <input type="number" min="0" step="0.01" placeholder="0,00"
                  disabled={!selecionados[a.ticker]}
                  value={valores[a.ticker]||''}
                  onChange={e=>setValores(v=>({...v,[a.ticker]:e.target.value}))}
                  style={{width:110,padding:'6px 10px',borderRadius:6,background:'#fff',border:'1px solid #F6E05E',color:'#1A1A2E',fontSize:13,textAlign:'right',outline:'none',opacity:selecionados[a.ticker]?1:0.4}}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Totalizador */}
        <div style={{background:'#FFFDF0',border:'1px solid #F6E05E',borderRadius:8,padding:'12px 16px',display:'flex',gap:24,marginBottom:18}}>
          <div><p style={{fontSize:11,color:'#8896A8',marginBottom:3}}>Total a lançar</p><p style={{fontSize:15,fontWeight:700,color:'#744210'}}>{fmt.brl(total)}</p></div>
          <div><p style={{fontSize:11,color:'#8896A8',marginBottom:3}}>Ativos selecionados</p><p style={{fontSize:15,fontWeight:700}}>{qtdSel} de {acoes.length}</p></div>
        </div>

        <div style={st.footer}>
          <button onClick={onFechar} style={st.btnCancel}>Cancelar</button>
          <button onClick={confirmar} disabled={salvando||qtdSel===0}
            style={{padding:'9px 20px',borderRadius:7,fontSize:13,fontWeight:600,border:'none',cursor:'pointer',background:'#D4A017',color:'#fff',opacity:qtdSel===0?0.5:1}}>
            {salvando?'Salvando...':'Lançar dividendos'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── CARD ──────────────────────────────────────────────────────────────────
function AcaoCard({ a, onRemover, onSalvar, onAbrirDividendo }) {
  const [editando, setEditando] = useState(false);
  const [qtd, setQtd]     = useState(String(a.quantidade ?? ''));
  const [preco, setPreco] = useState(String(a.preco_compra ?? ''));

  const perf     = calcPerformance(a.preco_atual, a.preco_compra, a.quantidade);
  const maxScore = a.max_score || 6;
  const scoreNum = typeof a.score === 'string' ? parseInt(a.score) : (a.score ?? 0);
  const fillPct  = (scoreNum / maxScore) * 100;

  const totalDiv = a.dividendos_ano || 0;
  const yieldPM  = (a.preco_compra && totalDiv && a.quantidade)
    ? (totalDiv / (a.preco_compra * a.quantidade)) * 100 : 0;
  const numLanc  = a.dividendos_lancamentos || 0;

  const salvar = async () => { await onSalvar(a.ticker, qtd, preco); setEditando(false); };

  const C = {
    card:  { background:'#FFFFFF',border:'1px solid #E8ECF0',borderRadius:14,padding:'18px 20px',display:'flex',flexDirection:'column',gap:12 },
    lbl:   { fontSize:11,color:'#8896A8',marginBottom:2 },
    val:   { fontSize:13,fontWeight:600,color:'#1A1A2E' },
    grpLbl:{ fontSize:11,color:'#8896A8',fontWeight:600,textTransform:'uppercase',letterSpacing:'0.05em',marginBottom:8 },
  };

  return (
    <div style={C.card}>
      {/* Header */}
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
        <span style={{fontSize:18,fontWeight:700,color:'#2563EB'}}>{a.ticker}</span>
        <span className={badgeDecisao(a.decisao)}>{a.decisao}</span>
      </div>

      {/* Score bar */}
      <div style={{display:'flex',alignItems:'center',gap:10}}>
        <div style={{flex:1,height:5,background:'#E8ECF0',borderRadius:4,overflow:'hidden'}}>
          <div style={{width:`${fillPct}%`,height:'100%',background:scoreBarColor(a.classificacao),borderRadius:4}}/>
        </div>
        <span style={{fontSize:13,fontWeight:600,color:'#1A1A2E',whiteSpace:'nowrap'}}>{scoreNum}/{maxScore}</span>
        <span style={{fontSize:12,color:'#8896A8'}}>{a.classificacao}</span>
      </div>

      {/* Fundamentos */}
      <div>
        <p style={C.grpLbl}>Fundamentos</p>
        <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8}}>
          {criteriosAcao.map(({label,key,ok,fmt:fmtFn})=>{
            const v = a[key];
            const isDivida = key === 'divida_ebit';
            // Div/EBIT: 0 ou null = sem dado → laranja
            const semDadoDivida = isDivida && (v == null || v === 0);
            const semDadoOutro  = !isDivida && (v == null || v === 0);
            const dotColor = semDadoDivida ? '#D97706' : semDadoOutro ? '#D0D8E0' : ok(v) ? '#16A34A' : '#DC2626';
            const texto    = semDadoDivida ? 'S/D' : (v != null && v !== 0 ? fmtFn(v) : '-');
            const cor      = semDadoDivida ? '#D97706' : '#1A1A2E';
            return (
              <div key={label}>
                <p style={C.lbl}>{label}</p>
                <div style={{display:'flex',alignItems:'center',gap:5}}>
                  <div style={{width:7,height:7,borderRadius:'50%',flexShrink:0,background:dotColor}}/>
                  <p style={{...C.val,color:cor}}>{texto}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Graham */}
      {a.preco_graham != null && (
        <div style={{background:'#EFF6FF',border:'1px solid #BFDBFE',borderRadius:10,padding:'10px 14px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <div>
            <p style={{fontSize:11,color:'#3B82F6',marginBottom:3}}>Preço Graham</p>
            <p style={{fontSize:15,fontWeight:700,color:'#2563EB'}}>{fmt.brl(a.preco_graham)}</p>
          </div>
          <div style={{textAlign:'right'}}>
            <p style={{fontSize:11,color:'#3B82F6',marginBottom:3}}>Situação vs Graham</p>
            <span className={grahamTag(a.status_graham)}>{a.status_graham}</span>
          </div>
        </div>
      )}

      {/* Posição */}
      <div>
        <p style={C.grpLbl}>Sua posição</p>
        {editando ? (
          <div style={{background:'#EFF6FF',border:'1px solid #BFDBFE',borderRadius:10,padding:14}}>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:10}}>
              <div>
                <label style={{...C.lbl,display:'block',marginBottom:4}}>Quantidade</label>
                <input className="input" type="number" min="0" step="0.000001" value={qtd} onChange={e=>setQtd(e.target.value)}/>
              </div>
              <div>
                <label style={{...C.lbl,display:'block',marginBottom:4}}>Preço médio (R$)</label>
                <input className="input" type="number" min="0" step="0.01" value={preco} onChange={e=>setPreco(e.target.value)}/>
              </div>
            </div>
            <div style={{display:'flex',gap:8}}>
              <button className="btn-primary" style={{flex:1,justifyContent:'center'}} onClick={salvar}>Salvar</button>
              <button className="btn-secondary" style={{flex:1,justifyContent:'center'}} onClick={()=>setEditando(false)}>Cancelar</button>
            </div>
          </div>
        ) : (
          <div style={{background:'#F8F9FA',border:'1px solid #E8ECF0',borderRadius:10,padding:'12px 14px'}}>
            <div style={{display:'flex',justifyContent:'space-between',marginBottom:8}}>
              <div><p style={C.lbl}>Qtd. ações</p><p style={C.val}>{a.quantidade?fmt.num(a.quantidade,0):'-'}</p></div>
              <div style={{textAlign:'center'}}><p style={C.lbl}>Seu preço médio</p><p style={C.val}>{a.preco_compra?fmt.brl(a.preco_compra):'-'}</p></div>
              <div style={{textAlign:'right'}}><p style={C.lbl}>Val. investido</p><p style={C.val}>{perf.custo>0?fmt.brl(perf.custo):'-'}</p></div>
            </div>
            <hr style={{border:'none',borderTop:'1px solid #E8ECF0',margin:'8px 0'}}/>
            <div style={{display:'flex',justifyContent:'space-between'}}>
              <div><p style={C.lbl}>Val. atual</p><p style={C.val}>{perf.valorAtual>0?fmt.brl(perf.valorAtual):'-'}</p></div>
              <div style={{textAlign:'right'}}>
                <p style={C.lbl}>Retorno</p>
                {perf.custo>0?(
                  <p style={{fontSize:13,fontWeight:600,color:perf.ganho>=0?'#16A34A':'#DC2626'}}>
                    {perf.ganho>=0?'+':''}{fmt.brl(perf.ganho)} ({perf.ganho>=0?'+':''}{fmt.pct(perf.pct)})
                  </p>
                ):<p style={C.val}>-</p>}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Dividendos */}
      <div style={{background:'#FFFDF0',border:'1px solid #F6E05E',borderRadius:10,padding:'10px 14px'}}>
        <p style={{fontSize:11,fontWeight:700,color:'#B7791F',textTransform:'uppercase',letterSpacing:'0.05em',marginBottom:8}}>💰 Dividendos recebidos no ano</p>
        <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8}}>
          <div><p style={{fontSize:10,color:'#B7791F',marginBottom:2}}>Total recebido</p><p style={{fontSize:13,fontWeight:700,color:'#744210'}}>{fmt.brl(totalDiv)}</p></div>
          <div><p style={{fontSize:10,color:'#B7791F',marginBottom:2}}>Yield s/ PM</p><p style={{fontSize:13,fontWeight:700,color:'#744210'}}>{yieldPM>0?fmt.pct(yieldPM):'—'}</p></div>
          <div><p style={{fontSize:10,color:'#B7791F',marginBottom:2}}>Lançamentos</p><p style={{fontSize:13,fontWeight:700,color:'#744210'}}>{numLanc}</p></div>
        </div>
      </div>

      {/* Footer */}
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',paddingTop:4,borderTop:'1px solid #E8ECF0'}}>
        <div>
          <div style={{display:'flex',alignItems:'baseline',gap:8}}>
            <span style={{fontSize:16,fontWeight:700,color:'#1A1A2E'}}>{fmt.brl(a.preco_atual)}</span>
            {a.variacao_dia!=null&&(
              <span style={{fontSize:12,fontWeight:600,color:a.variacao_dia>=0?'#16A34A':'#DC2626',background:a.variacao_dia>=0?'#F0FDF4':'#FEF2F2',padding:'2px 8px',borderRadius:20}}>
                {a.variacao_dia>=0?'▲':'▼'} {a.variacao_dia>=0?'+':''}{fmt.pct(a.variacao_dia)} hoje
              </span>
            )}
          </div>
          {a.peso_sugerido!=null&&<p style={{fontSize:12,color:'#8896A8',marginTop:2}}>Peso: {fmt.pct(a.peso_sugerido*100)}</p>}
        </div>
        <div style={{display:'flex',gap:6}}>
          <button onClick={()=>onAbrirDividendo(a.ticker)}
            style={{padding:'4px 10px',borderRadius:5,fontSize:11,fontWeight:600,border:'none',cursor:'pointer',background:'#FEFCBF',color:'#7B6213'}}>
            💰 Dividendo
          </button>
          {!editando&&<button className="btn-icon" onClick={()=>setEditando(true)}>✏️</button>}
          <button className="btn-icon" onClick={()=>onRemover(a.ticker)}>🗑️</button>
        </div>
      </div>
    </div>
  );
}

// ─── FORM ADICIONAR ────────────────────────────────────────────────────────
function AcoesForm({ onAdicionado }) {
  const searchParams = useSearchParams();
  const [ticker, setTicker]         = useState(searchParams.get('ticker')||'');
  const [quantidade, setQuantidade] = useState('');
  const [precoCompra, setPrecoCompra] = useState('');
  const [buscando, setBuscando]     = useState(false);
  const [erro, setErro]             = useState('');

  const adicionar = async (e) => {
    e.preventDefault();
    if (!ticker.trim()) return;
    setBuscando(true); setErro('');
    try {
      await api.post('/acoes', { ticker: ticker.trim().toUpperCase(), quantidade: Number(quantidade)||0, preco_compra: Number(precoCompra)||0 });
      setTicker(''); setQuantidade(''); setPrecoCompra('');
      onAdicionado();
    } catch (err) {
      setErro(err.response?.data?.error||'Erro ao adicionar ação.');
    } finally { setBuscando(false); }
  };

  return (
    <div style={{background:'#FFFFFF',border:'1px solid #E8ECF0',borderRadius:14,padding:20,marginBottom:24}}>
      <p style={{fontSize:14,fontWeight:700,color:'#1A1A2E',marginBottom:14}}>Adicionar ação</p>
      <form onSubmit={adicionar} className="form-row" style={{display:'flex',gap:12,alignItems:'flex-end',flexWrap:'wrap'}}>
        <div style={{flex:1,minWidth:100}}>
          <label style={{fontSize:11,color:'#8896A8',fontWeight:600,display:'block',marginBottom:4}}>Ticker *</label>
          <input className="input" placeholder="Ex: PETR4" style={{textTransform:'uppercase'}} value={ticker} onChange={e=>setTicker(e.target.value.toUpperCase())} required/>
        </div>
        <div style={{flex:1,minWidth:100}}>
          <label style={{fontSize:11,color:'#8896A8',fontWeight:600,display:'block',marginBottom:4}}>Qtd. que você tem</label>
          <input className="input" type="number" min="0" step="0.000001" placeholder="0" value={quantidade} onChange={e=>setQuantidade(e.target.value)}/>
        </div>
        <div style={{flex:1,minWidth:120}}>
          <label style={{fontSize:11,color:'#8896A8',fontWeight:600,display:'block',marginBottom:4}}>Preço médio de compra</label>
          <input className="input" type="number" min="0" step="0.01" placeholder="R$ 0,00" value={precoCompra} onChange={e=>setPrecoCompra(e.target.value)}/>
        </div>
        <button type="submit" disabled={buscando} className="btn-primary">
          {buscando?<RefreshCw size={14} style={{animation:'spin 0.7s linear infinite'}}/>:'🔍'}
          {buscando?'Buscando...':'Buscar e Avaliar'}
        </button>
      </form>
      {erro&&<p style={{marginTop:8,fontSize:13,color:'#DC2626'}}>{erro}</p>}
    </div>
  );
}

// ─── DASHBOARD ────────────────────────────────────────────────────────────
function Dashboard({ acoes }) {
  if (!acoes.length) return null;

  const patrimonio  = acoes.reduce((s,a)=>s+(a.preco_atual*(a.quantidade||0)),0);
  const custo       = acoes.reduce((s,a)=>{ const p=calcPerformance(a.preco_atual,a.preco_compra,a.quantidade); return s+p.custo; },0);
  const resultado   = patrimonio - custo;
  const pctTotal    = custo > 0 ? (resultado/custo)*100 : 0;
  const dividendosAno = acoes.reduce((s,a)=>s+(a.dividendos_ano||0),0);
  const scores      = acoes.map(a=>typeof a.score==='string'?parseInt(a.score):(a.score||0));
  const scoreMedio  = scores.length?(scores.reduce((s,v)=>s+v,0)/scores.length).toFixed(1):0;

  const sorted = [...acoes].map(a=>({ ...a, pct: calcPerformance(a.preco_atual,a.preco_compra,a.quantidade).pct }));
  const melhor = [...sorted].sort((a,b)=>b.pct-a.pct)[0];
  const pior   = [...sorted].sort((a,b)=>a.pct-b.pct)[0];

  const totalPort = patrimonio;
  const CORES = ['#2563EB','#16A34A','#D4A017','#7C3AED','#D97706','#DC2626','#718096','#0891B2','#BE185D'];

  return (
    <div style={{marginBottom:20}}>
      {/* 4 cards */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:14,marginBottom:14}}>
        {[
          { label:'Patrimônio Total',   val: fmt.brl(patrimonio),  sub:`${acoes.length} ativos`,  cor:'#2563EB' },
          { label:'Resultado Total',    val:`${resultado>=0?'+':''}${fmt.brl(resultado)}`, sub:`${resultado>=0?'+':''}${fmt.pct(pctTotal)} desde aporte`, cor: resultado>=0?'#16A34A':'#DC2626' },
          { label:'Melhor / Pior ativo',val: melhor?`${melhor.ticker} ${melhor.pct>=0?'+':''}${fmt.pct(melhor.pct)}`:'—', sub: pior&&pior.ticker!==melhor?.ticker?`Pior: ${pior.ticker} ${fmt.pct(pior.pct)}`:'', cor:'#1A1A2E' },
          { label:'Score médio',        val:`${scoreMedio} / ${acoes[0]?.max_score||6}`, sub:`${acoes.filter(a=>(typeof a.score==='string'?parseInt(a.score):a.score)>=4).length} MANTER · ${acoes.filter(a=>(typeof a.score==='string'?parseInt(a.score):a.score)===3).length} ATENÇÃO`, cor:'#2563EB' },
        ].map((c,i)=>(
          <div key={i} style={{background:'#FFFFFF',border:'1px solid #E8ECF0',borderRadius:10,padding:16}}>
            <p style={{fontSize:11,color:'#8896A8',textTransform:'uppercase',letterSpacing:'0.05em',marginBottom:6}}>{c.label}</p>
            <p style={{fontSize:19,fontWeight:800,color:c.cor}}>{c.val}</p>
            {c.sub&&<p style={{fontSize:11,color:'#8896A8',marginTop:3}}>{c.sub}</p>}
          </div>
        ))}
      </div>

      {/* Distribuição */}
      <div style={{background:'#FFFFFF',border:'1px solid #E8ECF0',borderRadius:10,padding:16,marginBottom:14}}>
        <p style={{fontSize:11,fontWeight:700,color:'#8896A8',textTransform:'uppercase',letterSpacing:'0.05em',marginBottom:12}}>Distribuição da carteira</p>
        <div style={{display:'flex',height:26,borderRadius:6,overflow:'hidden',marginBottom:10}}>
          {acoes.map((a,i)=>{
            const val = a.preco_atual*(a.quantidade||0);
            const pct = totalPort>0?(val/totalPort)*100:0;
            return <div key={a.ticker} style={{flex:pct,background:CORES[i%CORES.length],display:'flex',alignItems:'center',justifyContent:'center',fontSize:10,fontWeight:700,color:'#fff',overflow:'hidden'}}>
              {pct>7?a.ticker:''}
            </div>;
          })}
        </div>
        <div style={{display:'flex',gap:14,flexWrap:'wrap'}}>
          {acoes.map((a,i)=>{
            const val=a.preco_atual*(a.quantidade||0);
            const pct=totalPort>0?(val/totalPort)*100:0;
            return <div key={a.ticker} style={{display:'flex',alignItems:'center',gap:5,fontSize:11,color:'#8896A8'}}>
              <div style={{width:8,height:8,borderRadius:'50%',background:CORES[i%CORES.length]}}/>
              {a.ticker} {fmt.pct(pct)}
            </div>;
          })}
        </div>
      </div>

      {/* Faixa dividendos */}
      <div style={{background:'linear-gradient(135deg,#FFFDF0,#FEFCE8)',border:'1px solid #F6E05E',borderRadius:10,padding:16,display:'flex',marginBottom:4}}>
        {[
          { label:'💰 Dividendos no Ano', val:fmt.brl(dividendosAno), sub:'Todos os ativos' },
          { label:'Yield médio s/ PM', val:()=>{ const c=acoes.reduce((s,a)=>s+((a.preco_compra||0)*(a.quantidade||0)),0); return c>0?fmt.pct((dividendosAno/c)*100):'—'; }, sub:'Sobre preço médio pago' },
          { label:'Maior pagador', val:()=>{ const m=[...acoes].sort((a,b)=>(b.dividendos_ano||0)-(a.dividendos_ano||0))[0]; return m&&m.dividendos_ano>0?m.ticker:'—'; }, sub:()=>{ const m=[...acoes].sort((a,b)=>(b.dividendos_ano||0)-(a.dividendos_ano||0))[0]; return m&&m.dividendos_ano>0?`${fmt.brl(m.dividendos_ano)} no ano`:''; } },
          { label:'Lançamentos totais', val:acoes.reduce((s,a)=>s+(a.dividendos_lancamentos||0),0), sub:'Todos os ativos no ano' },
        ].map((item,i,arr)=>(
          <div key={i} style={{flex:1,padding:'0 16px',borderRight:i<arr.length-1?'1px solid #F6E05E':'none',paddingLeft:i===0?0:16}}>
            <p style={{fontSize:11,color:'#B7791F',textTransform:'uppercase',letterSpacing:'0.05em',marginBottom:5}}>{item.label}</p>
            <p style={{fontSize:17,fontWeight:800,color:'#744210'}}>{typeof item.val==='function'?item.val():item.val}</p>
            {item.sub&&<p style={{fontSize:11,color:'#B7791F',marginTop:2}}>{typeof item.sub==='function'?item.sub():item.sub}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── PÁGINA ────────────────────────────────────────────────────────────────
export default function AcoesPage() {
  const [acoes, setAcoes]             = useState([]);
  const [loading, setLoading]         = useState(true);
  const [atualizando, setAtualizando] = useState(false);
  const [modalCompra, setModalCompra] = useState(null);
  const [modalDiv, setModalDiv]       = useState(false);

  const carregar = async () => {
    try { const r = await api.get('/acoes'); setAcoes(r.data); }
    finally { setLoading(false); }
  };

  useEffect(() => { carregar(); }, []);

  const remover = async (t) => {
    if (!confirm(`Remover ${t}?`)) return;
    await api.delete(`/acoes/${t}`); await carregar();
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

  const salvarOperacao = async ({ ticker, tipo, quantidade, preco }) => {
    const acao = acoes.find(a => a.ticker === ticker);
    if (tipo === 'comprar') {
      const qtdAtual = acao?.quantidade || 0;
      const pmAtual  = acao?.preco_compra || 0;
      const novaQtd  = qtdAtual + quantidade;
      const novoPM   = qtdAtual > 0 ? ((qtdAtual*pmAtual)+(quantidade*preco))/novaQtd : preco;
      await api.put(`/acoes/${ticker}`, { quantidade: novaQtd, preco_compra: parseFloat(novoPM.toFixed(4)) });
    } else {
      const novaQtd = Math.max(0, (acao?.quantidade||0) - quantidade);
      await api.put(`/acoes/${ticker}`, { quantidade: novaQtd });
    }
    await carregar();
  };

  const salvarDividendos = async (lancamentos) => {
    await api.post('/acoes/dividendos', { lancamentos });
    await carregar();
  };

  if (loading) return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:256}}>
      <div style={{width:32,height:32,border:'2px solid #C9A84C',borderTopColor:'transparent',borderRadius:'50%',animation:'spin 0.7s linear infinite'}}/>
    </div>
  );

  return (
    <div>
      {/* Cabeçalho */}
      <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:4,flexWrap:'wrap',gap:8}}>
        <div>
          <h2 style={{fontSize:22,fontWeight:600,color:'#1A1A2E',marginBottom:4}}>Carteira Ações</h2>
          <p style={{fontSize:13,color:'#8896A8',marginBottom:24}}>Busca dados em tempo real via Brapi e avalia por critérios fundamentalistas</p>
        </div>
        <div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap'}}>
          <button onClick={atualizar} disabled={atualizando} className="btn-secondary">
            <RefreshCw size={15} style={atualizando?{animation:'spin 0.7s linear infinite'}:{}}/>
            {atualizando?'Atualizando...':'Atualizar todos'}
          </button>
          {acoes.length > 0 && <>
            <button onClick={()=>setModalCompra('comprar')}
              style={{padding:'8px 14px',borderRadius:7,fontSize:12,fontWeight:600,border:'1px solid #9AE6B4',background:'#C6F6D5',color:'#276749',cursor:'pointer'}}>
              ▲ Comprar ação
            </button>
            <button onClick={()=>setModalCompra('vender')}
              style={{padding:'8px 14px',borderRadius:7,fontSize:12,fontWeight:600,border:'1px solid #FC8181',background:'#FED7D7',color:'#9B2C2C',cursor:'pointer'}}>
              ▼ Vender ação
            </button>
            <button onClick={()=>setModalDiv(true)}
              style={{padding:'8px 14px',borderRadius:7,fontSize:12,fontWeight:600,border:'1px solid #F6E05E',background:'#FEFCBF',color:'#7B6213',cursor:'pointer'}}>
              💰 Lançar dividendos
            </button>
            <button onClick={()=>setModalDiv(true)}
              style={{padding:'8px 14px',borderRadius:7,fontSize:12,fontWeight:600,border:'1px solid #90CDF4',background:'#EBF8FF',color:'#2B6CB0',cursor:'pointer'}}>
              ⬆ Importar B3
            </button>
          </>}
        </div>
      </div>

      {/* Dashboard */}
      {acoes.length > 0 && <Dashboard acoes={acoes}/>}

      {/* Form */}
      <Suspense fallback={<div style={{background:'#FFF',border:'1px solid #E8ECF0',borderRadius:14,padding:20,marginBottom:24,height:90}}/>}>
        <AcoesForm onAdicionado={carregar}/>
      </Suspense>

      {/* Critérios */}
      <div style={{background:'#FFFFFF',border:'1px solid #E8ECF0',borderRadius:12,padding:'12px 20px',marginBottom:8,display:'flex',alignItems:'center',gap:8,flexWrap:'wrap'}}>
        <span style={{fontSize:11,fontWeight:700,color:'#8896A8',textTransform:'uppercase',letterSpacing:'0.05em',marginRight:4}}>Critérios de avaliação (Score /6)</span>
        {['P/L < 15','P/VP < 1,5','Margem Liq. > 10%','ROE > 10%','Dívida/EBIT < 2x','DY ≥ 6%'].map(c=>(
          <span key={c} style={{fontSize:12,fontWeight:500,padding:'3px 10px',borderRadius:20,background:'#F0F2F5',color:'#4A5568',border:'1px solid #E8ECF0'}}>{c}</span>
        ))}
      </div>

      {/* Legenda */}
      <div style={{display:'flex',alignItems:'center',gap:16,fontSize:11,color:'#8896A8',marginBottom:16}}>
        {[{c:'#16A34A',l:'Aprovado'},{c:'#DC2626',l:'Reprovado'},{c:'#D97706',l:'Sem dado'}].map(({c,l})=>(
          <span key={l}><span style={{display:'inline-block',width:7,height:7,borderRadius:'50%',background:c,marginRight:4}}/>{l}</span>
        ))}
      </div>

      {/* Cards */}
      {acoes.length > 0 ? (
        <div className="grid-cards">
          {acoes.map(a=>(
            <AcaoCard key={a.ticker} a={a}
              onRemover={remover}
              onSalvar={salvarEdicao}
              onAbrirDividendo={()=>setModalDiv(true)}
            />
          ))}
        </div>
      ) : (
        <div style={{background:'#FFF',border:'1px solid #E8ECF0',borderRadius:14,padding:40,textAlign:'center'}}>
          <TrendingUp size={40} style={{color:'#D0D8E0',margin:'0 auto 12px'}}/>
          <p style={{color:'#4A5568',fontWeight:500,marginBottom:4}}>Nenhuma ação adicionada</p>
          <p style={{color:'#8896A8',fontSize:13}}>Digite um ticker acima para buscar e avaliar uma ação.</p>
        </div>
      )}

      {/* Modais */}
      {modalCompra && (
        <ModalCompraVenda acoes={acoes} tipo={modalCompra}
          onFechar={()=>setModalCompra(null)} onSalvar={salvarOperacao}/>
      )}
      {modalDiv && (
        <ModalDividendos acoes={acoes}
          onFechar={()=>setModalDiv(false)} onSalvar={salvarDividendos}/>
      )}
    </div>
  );
}
