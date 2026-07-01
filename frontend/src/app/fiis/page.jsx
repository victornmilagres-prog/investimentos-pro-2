'use client';
import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { RefreshCw, Building2, X } from 'lucide-react';
import api from '@/lib/api';
import { fmt, calcPerformance } from '@/lib/utils';

const TIPOS_DIVIDENDO = ['Rendimento', 'Dividendo', 'JCP', 'Amortização', 'Outros'];

async function parsearArquivoB3FII(file) {
  const XLSX = await import('xlsx');
  const buffer = await file.arrayBuffer();
  const wb = XLSX.read(buffer, { type: 'array', cellDates: true });
  const sheet = wb.Sheets[wb.SheetNames[0]];

  // FIX: B3 xlsx não traz !ref confiável — recalcula varrendo células reais
  const cellAddresses = Object.keys(sheet).filter(k => k[0] !== '!');
  if (cellAddresses.length) {
    const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1:A1');
    let minR = range.s.r, maxR = range.e.r, minC = range.s.c, maxC = range.e.c;
    cellAddresses.forEach(addr => {
      const cell = XLSX.utils.decode_cell(addr);
      if (cell.r < minR) minR = cell.r;
      if (cell.r > maxR) maxR = cell.r;
      if (cell.c < minC) minC = cell.c;
      if (cell.c > maxC) maxC = cell.c;
    });
    sheet['!ref'] = XLSX.utils.encode_range({ s: { r: minR, c: minC }, e: { r: maxR, c: maxC } });
  }

  const rows = XLSX.utils.sheet_to_json(sheet, { defval: '', raw: true });
  if (!rows.length) return [];

  const norm = s => String(s).toLowerCase()
    .replace(/[àáâã]/g,'a').replace(/[èéê]/g,'e').replace(/[ìíîï]/g,'i')
    .replace(/[òóôõ]/g,'o').replace(/[ùúûü]/g,'u').replace(/[ç]/g,'c').trim();

  const colMap = {};
  Object.keys(rows[0]).forEach(k => { colMap[norm(k)] = k; });
  const col = (...names) => names.map(n => colMap[n]).find(Boolean);

  const colProduto  = col('produto', 'ativo', 'ticker');
  const colTipo     = col('tipo de evento', 'tipo evento', 'tipo');
  const colData     = col('pagamento', 'data pagamento', 'data de pagamento', 'data com', 'data');
  const colQtd      = col('quantidade', 'qtd');
  const colPreco    = col('preco unitario', 'preco', 'valor unitario', 'valor por cota');
  const colValorLiq = col('valor liquido', 'valor bruto', 'valor');

  if (!colProduto) return [];

  const mapTipo = (t = '') => {
    const v = t.toUpperCase();
    if (v.includes('REND')) return 'Rendimento';
    if (v.includes('DIV')) return 'Dividendo';
    if (v.includes('JCP') || v.includes('JUROS')) return 'JCP';
    if (v.includes('AMORT')) return 'Amortização';
    return 'Outros';
  };

  const parseNum = v => {
    if (typeof v === 'number') return v;
    if (!v) return 0;
    const n = Number(String(v).replace('R$','').replace(/\./g,'').replace(',','.').trim());
    return isNaN(n) ? 0 : n;
  };

  const TICKER_REGEX = /([A-Z]{4}11B?)/;

  const parseDataBR = (val) => {
    if (!val) return { mes: null, ano: null };
    if (val instanceof Date) return { mes: val.getMonth()+1, ano: val.getFullYear() };
    const m = String(val).match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (m) return { mes: Number(m[2]), ano: Number(m[3]) };
    return { mes: null, ano: null };
  };

  const resultado = [];
  for (const row of rows) {
    const produtoRaw = row[colProduto];
    if (!produtoRaw || String(produtoRaw).trim() === '') continue;
    if (String(produtoRaw).toUpperCase().includes('TOTAL')) continue;

    const match = String(produtoRaw).toUpperCase().match(TICKER_REGEX);
    if (!match) continue;
    const ticker = match[1];

    const { mes, ano } = parseDataBR(row[colData]);
    if (!mes || !ano) continue;

    const tipo = mapTipo(String(row[colTipo] || ''));
    const valorLiquido = parseNum(row[colValorLiq]);
    const precoUnitario = parseNum(row[colPreco]);
    const quantidade = parseNum(row[colQtd]);

    if (valorLiquido <= 0) continue;

    resultado.push({
      ticker,
      tipo_dividendo: tipo,
      valor_por_cota: precoUnitario || (quantidade > 0 ? valorLiquido / quantidade : 0),
      valor_total: valorLiquido,
      quantidade,
      mes,
      ano,
    });
  }

  const agrupados = {};
  for (const l of resultado) {
    const chave = `${l.ticker}|${l.tipo_dividendo}|${l.mes}|${l.ano}`;
    if (!agrupados[chave]) agrupados[chave] = { ...l };
    else agrupados[chave].valor_total += l.valor_total;
  }

  return Object.values(agrupados);
}

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

// ─── Critérios: DY Mensal >= 1 (era > 1) ──────────────────────────────────
const criteriosFII = [
  { label: 'DY Mensal', key: 'dy_mensal', ok: v => v >= 1,          temCriterio: true,  fmt: v => fmt.pct(v) },
  { label: 'DY Anual',  key: 'dy_anual',  ok: null,                  temCriterio: false, fmt: v => fmt.pct(v) },
  { label: 'P/VP',      key: 'pvp',       ok: v => v > 0 && v < 1.05, temCriterio: true, fmt: v => fmt.num(v) },
  { label: 'Volume Dia',key: 'volume_financeiro', ok: v => v > 1000000, temCriterio: true, fmt: v => fmt.abrev(v) },
  { label: 'Patrimônio',key: 'patrimonio_liquido', ok: v => v > 1e9,  temCriterio: true, fmt: v => fmt.abrev(v) },
  { label: 'Peso',      key: 'peso_sugerido', ok: null,               temCriterio: false, fmt: v => fmt.pct((v||0)*100) },
];

// ─── hook dividendos ───────────────────────────────────────────────────────
function useDividendosFII(fiis) {
  const [anosDisponiveis, setAnosDisponiveis] = useState([]);
  const [anoFiltro, setAnoFiltro] = useState(new Date().getFullYear());
  const [resumoAno, setResumoAno] = useState({});
  const [resumoGeral, setResumoGeral] = useState({});

  const carregarDados = async () => {
    try {
      const [rAnos, rAno, rGeral] = await Promise.all([
        api.get('/fiis/dividendos/anos'),
        api.get(`/fiis/dividendos/resumo?ano=${anoFiltro}`),
        api.get('/fiis/dividendos/resumo?ano=0'),
      ]);
      setAnosDisponiveis(rAnos.data.anos || []);
      setResumoAno(rAno.data || {});
      setResumoGeral(rGeral.data || {});
    } catch {}
  };

  useEffect(() => { if (fiis.length) carregarDados(); }, [fiis.length, anoFiltro]);

  return { anosDisponiveis, anoFiltro, setAnoFiltro, resumoAno, resumoGeral, carregarDados };
}

// ─── MODAL COMPRAR / VENDER ────────────────────────────────────────────────
function ModalCompraVenda({ fiis, tipo, onFechar, onSalvar }) {
  const [ticker, setTicker] = useState(fiis[0]?.ticker || '');
  const [qtd, setQtd]       = useState('');
  const [preco, setPreco]   = useState('');
  const [data, setData]     = useState(new Date().toISOString().split('T')[0]);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro]     = useState('');

  const fii     = fiis.find(f => f.ticker === ticker);
  const qtdAtual = fii?.quantidade || 0;
  const pmAtual  = fii?.preco_compra || 0;
  const novoQtd  = tipo === 'comprar' ? qtdAtual + Number(qtd||0) : Math.max(0, qtdAtual - Number(qtd||0));
  const novoPM   = tipo === 'comprar' && qtdAtual > 0 && Number(qtd) > 0 && Number(preco) > 0
    ? ((qtdAtual*pmAtual)+(Number(qtd)*Number(preco)))/novoQtd
    : tipo === 'comprar' && Number(qtd) > 0 ? Number(preco) : pmAtual;

  const confirmar = async () => {
    if (!qtd || !preco) return setErro('Preencha quantidade e preço.');
    setSalvando(true); setErro('');
    try { await onSalvar({ ticker, tipo, quantidade: Number(qtd), preco: Number(preco) }); onFechar(); }
    catch (e) { setErro(e.response?.data?.error || 'Erro ao salvar.'); }
    finally { setSalvando(false); }
  };

  const st = {
    overlay: { position:'fixed',inset:0,background:'rgba(0,0,0,0.45)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:200 },
    modal:   { background:'#fff',borderRadius:14,padding:28,width:460,boxShadow:'0 20px 60px rgba(0,0,0,0.2)',maxHeight:'90vh',overflowY:'auto' },
    lbl:     { fontSize:12,color:'#8896A8',fontWeight:500,display:'block',marginBottom:5 },
    inp:     { width:'100%',padding:'9px 12px',border:'1px solid #E8ECF0',borderRadius:7,fontSize:13,outline:'none',color:'#1A1A2E' },
  };

  return (
    <div style={st.overlay} onClick={e=>e.target===e.currentTarget&&onFechar()}>
      <div style={st.modal}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:4}}>
          <h3 style={{fontSize:17,fontWeight:700}}>{tipo==='comprar'?'▲ Registrar Compra':'▼ Registrar Venda'}</h3>
          <button onClick={onFechar} style={{background:'none',border:'none',cursor:'pointer',color:'#8896A8'}}><X size={18}/></button>
        </div>
        <p style={{fontSize:13,color:'#8896A8',marginBottom:20}}>
          {tipo==='comprar'?'Atualiza a quantidade e recalcula o preço médio automaticamente':'Atualiza a quantidade na sua carteira'}
        </p>
        <div style={{marginBottom:14}}>
          <label style={st.lbl}>FII</label>
          <select style={st.inp} value={ticker} onChange={e=>setTicker(e.target.value)}>
            {fiis.map(f=><option key={f.ticker} value={f.ticker}>{f.ticker}</option>)}
          </select>
        </div>
        <div style={{display:'flex',gap:12,marginBottom:14}}>
          <div style={{flex:1}}><label style={st.lbl}>Quantidade {tipo==='comprar'?'comprada':'vendida'}</label><input style={st.inp} type="number" min="0" placeholder="0" value={qtd} onChange={e=>setQtd(e.target.value)}/></div>
          <div style={{flex:1}}><label style={st.lbl}>Preço {tipo==='comprar'?'pago':'recebido'} (R$)</label><input style={st.inp} type="number" min="0" step="0.01" placeholder="0,00" value={preco} onChange={e=>setPreco(e.target.value)}/></div>
        </div>
        <div style={{marginBottom:18}}><label style={st.lbl}>Data da operação</label><input style={st.inp} type="date" value={data} onChange={e=>setData(e.target.value)}/></div>
        <div style={{background:'#F8F9FA',borderRadius:8,padding:'12px 14px',display:'flex',gap:16,marginBottom:18}}>
          <div><p style={{fontSize:11,color:'#8896A8',marginBottom:3}}>Qtd anterior</p><p style={{fontSize:15,fontWeight:700}}>{qtdAtual}</p></div>
          {tipo==='comprar'&&<div><p style={{fontSize:11,color:'#8896A8',marginBottom:3}}>PM anterior</p><p style={{fontSize:15,fontWeight:700}}>{fmt.brl(pmAtual)}</p></div>}
          <div><p style={{fontSize:11,color:'#8896A8',marginBottom:3}}>→ Nova qtd</p><p style={{fontSize:15,fontWeight:700,color:'#16A34A'}}>{novoQtd}</p></div>
          {tipo==='comprar'&&<div><p style={{fontSize:11,color:'#8896A8',marginBottom:3}}>→ Novo PM</p><p style={{fontSize:15,fontWeight:700,color:'#16A34A'}}>{fmt.brl(novoPM)}</p></div>}
        </div>
        {erro&&<p style={{fontSize:13,color:'#DC2626',marginBottom:12}}>{erro}</p>}
        <div style={{display:'flex',gap:10,justifyContent:'flex-end'}}>
          <button onClick={onFechar} style={{padding:'9px 20px',borderRadius:7,fontSize:13,fontWeight:600,border:'none',cursor:'pointer',background:'#EDF2F7',color:'#8896A8'}}>Cancelar</button>
          <button onClick={confirmar} disabled={salvando} style={{padding:'9px 20px',borderRadius:7,fontSize:13,fontWeight:600,border:'none',cursor:'pointer',background:tipo==='comprar'?'#16A34A':'#DC2626',color:'#fff'}}>
            {salvando?'Salvando...':tipo==='comprar'?'Confirmar compra':'Confirmar venda'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── MODAL DIVIDENDOS FII ─────────────────────────────────────────────────
function ModalDividendosFII({ fiis, onFechar, onSalvar }) {
  const meses = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
  const hoje  = new Date();
  const [mes, setMes]             = useState(hoje.getMonth());
  const [ano, setAno]             = useState(hoje.getFullYear());
  const [linhas, setLinhas]       = useState([]);
  const [salvando, setSalvando]   = useState(false);
  const [arquivo, setArquivo]     = useState(null);
  const [parsendo, setParsendo]   = useState(false);
  const [avisoFora, setAvisoFora] = useState([]);
  const [feedback, setFeedback]   = useState('');
  const [existentes, setExistentes] = useState([]);
  const [modoImport, setModoImport] = useState(false);

  // Inicializa linhas manuais
  useEffect(() => {
    setLinhas(fiis.map((f,i) => ({ id:i, ticker:f.ticker, tipo:'Rendimento', valor:'', valor_total:null, quantidade:null, mes:hoje.getMonth()+1, ano:hoje.getFullYear(), selecionado:false })));
  }, [fiis]);

  useEffect(() => {
    const carregar = async () => {
      try { const r = await api.get(`/fiis/dividendos?mes=${mes+1}&ano=${ano}`); setExistentes(r.data); } catch { setExistentes([]); }
    };
    carregar();
  }, [mes, ano]);

  const setLinha = (id, campo, valor) => setLinhas(ls => ls.map(l => l.id===id ? {...l,[campo]:valor} : l));

  const resolverQtd   = l => l.quantidade != null ? l.quantidade : (fiis.find(f=>f.ticker===l.ticker)?.quantidade||0);
  const resolverTotal = l => l.valor_total != null ? l.valor_total : (Number(l.valor) * resolverQtd(l));
  const linhasSel     = linhas.filter(l => l.selecionado && l.valor);
  const total         = linhasSel.reduce((acc,l) => acc + resolverTotal(l), 0);

  const confirmar = async () => {
    const lancamentos = linhasSel.map(l => ({
      ticker: l.ticker, tipo_dividendo: l.tipo,
      valor_por_cota: Number(l.valor), quantidade: resolverQtd(l),
      valor_total_override: l.valor_total ?? null, mes: l.mes, ano: l.ano,
    }));
    if (!lancamentos.length) return;
    setSalvando(true);
    try { await onSalvar(lancamentos); onFechar(); }
    finally { setSalvando(false); }
  };

  const excluir = async (item) => {
    try {
      await api.delete(`/fiis/dividendos/${item.ticker}/${item.tipo_dividendo}/${item.mes}/${item.ano}`);
      setExistentes(e => e.filter(x => !(x.ticker===item.ticker && x.tipo_dividendo===item.tipo_dividendo)));
    } catch {}
  };

  const st = {
    overlay: { position:'fixed',inset:0,background:'rgba(0,0,0,0.45)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:200 },
    modal:   { background:'#fff',borderRadius:14,padding:28,width:500,boxShadow:'0 20px 60px rgba(0,0,0,0.2)',maxHeight:'92vh',overflowY:'auto' },
    inp:     { width:'100%',padding:'9px 12px',border:'1px solid #E8ECF0',borderRadius:7,fontSize:13,outline:'none',color:'#1A1A2E' },
    lbl:     { fontSize:12,color:'#8896A8',fontWeight:500,display:'block',marginBottom:5 },
  };

  return (
    <div style={st.overlay} onClick={e=>e.target===e.currentTarget&&onFechar()}>
      <div style={st.modal}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:4}}>
          <h3 style={{fontSize:17,fontWeight:700}}>💰 Lançar Dividendos</h3>
          <button onClick={onFechar} style={{background:'none',border:'none',cursor:'pointer',color:'#8896A8'}}><X size={18}/></button>
        </div>
        <p style={{fontSize:13,color:'#8896A8',marginBottom:20}}>Registre os dividendos recebidos. Importe da B3 ou lance manualmente.</p>

        {/* Importar B3 */}
        <div style={{background:'#EFF6FF',border:'1px dashed #93C5FD',borderRadius:8,padding:'14px 16px',marginBottom:10,display:'flex',alignItems:'center',gap:12}}>
          <span style={{fontSize:22}}>📂</span>
          <div style={{flex:1}}>
            <p style={{fontSize:13,fontWeight:600,color:'#2563EB',marginBottom:2}}>Importar relatório da B3</p>
            <p style={{fontSize:12,color:'#4A90D9'}}>Importa todos os meses do arquivo automaticamente</p>
          </div>
          <label style={{background:'#EFF6FF',color:'#2563EB',border:'1px solid #93C5FD',padding:'7px 14px',borderRadius:6,fontSize:12,fontWeight:600,cursor:'pointer',whiteSpace:'nowrap'}}>
            {parsendo ? 'Lendo...' : 'Selecionar arquivo'}
            <input type="file" accept=".csv,.xlsx,.xls" style={{display:'none'}} disabled={parsendo} onChange={async e => {
              const f = e.target.files[0];
              if (!f) return;
              setArquivo(f); setAvisoFora([]); setFeedback(''); setParsendo(true);
              try {
                const resultado = await parsearArquivoB3FII(f);
                const tickersFII = new Set(fiis.map(x=>x.ticker));
                const fora = [];
                const novas = [];
                let idSeq = Date.now();
                for (const l of resultado) {
                  if (!tickersFII.has(l.ticker)) { fora.push(l.ticker); continue; }
                  novas.push({ id:idSeq++, ticker:l.ticker, tipo:l.tipo_dividendo,
                    valor: String(l.valor_por_cota.toFixed(6)),
                    valor_total: l.valor_total, quantidade: l.quantidade || null,
                    mes: l.mes, ano: l.ano, selecionado: true });
                }
                const tickersImportados = new Set(novas.map(l=>l.ticker));
                const manuais = fiis.filter(fii=>!tickersImportados.has(fii.ticker))
                  .map((fii,i)=>({ id:idSeq+i, ticker:fii.ticker, tipo:'Rendimento', valor:'', valor_total:null, quantidade:null, mes:hoje.getMonth()+1, ano:hoje.getFullYear(), selecionado:false }));
                setLinhas([...novas, ...manuais]);
                setAvisoFora([...new Set(fora)]);
                setModoImport(true);
                const mesesUnicos = [...new Set(novas.map(l=>`${l.mes}/${l.ano}`))];
                setFeedback(`✓ ${novas.length} lançamento(s) em ${mesesUnicos.length} mês(es) importado(s)`);
              } catch(err) {
                console.error(err); setFeedback('⚠ Erro ao ler o arquivo.');
              } finally { setParsendo(false); }
            }}/>
          </label>
        </div>
        {feedback && <p style={{fontSize:12,color:feedback.startsWith('✓')?'#16A34A':'#D97706',marginBottom:8}}>{feedback}{arquivo?` — ${arquivo.name}`:''}</p>}
        {avisoFora.length > 0 && (
          <div style={{background:'#FFFBEB',border:'1px solid #F6D860',borderRadius:8,padding:'10px 14px',marginBottom:10}}>
            <p style={{fontSize:12,fontWeight:600,color:'#92400E',marginBottom:3}}>⚠ Ativos ignorados (não estão na sua carteira):</p>
            <p style={{fontSize:12,color:'#92400E'}}>{avisoFora.join(', ')}</p>
          </div>
        )}

        {/* Filtro mês/ano para lançamentos existentes */}
        <div style={{display:'flex',gap:12,marginBottom:10,marginTop:6}}>
          <div style={{flex:2}}><label style={st.lbl}>Ver lançamentos do mês</label>
            <select style={st.inp} value={mes} onChange={e=>setMes(Number(e.target.value))}>
              {meses.map((m,i)=><option key={i} value={i}>{m}</option>)}
            </select>
          </div>
          <div style={{flex:1}}><label style={st.lbl}>Ano</label>
            <select style={st.inp} value={ano} onChange={e=>setAno(Number(e.target.value))}>
              {[2024,2025,2026].map(y=><option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        </div>

        {/* Lançamentos existentes */}
        {existentes.length > 0 && (
          <div style={{marginBottom:14}}>
            <p style={{fontSize:11,fontWeight:700,color:'#8896A8',textTransform:'uppercase',letterSpacing:'0.05em',marginBottom:8}}>Já lançados em {meses[mes]}/{ano}</p>
            <div style={{display:'flex',flexDirection:'column',gap:6}}>
              {existentes.map((item,i)=>(
                <div key={i} style={{display:'flex',alignItems:'center',justifyContent:'space-between',background:'#F8F9FA',border:'1px solid #E8ECF0',borderRadius:8,padding:'8px 12px'}}>
                  <div style={{display:'flex',gap:10,alignItems:'center'}}>
                    <span style={{fontWeight:700,fontSize:13}}>{item.ticker}</span>
                    <span style={{fontSize:11,background:'#FEF3C7',color:'#92400E',padding:'2px 8px',borderRadius:20}}>{item.tipo_dividendo}</span>
                    <span style={{fontSize:13}}>{fmt.brl(item.valor_total)}</span>
                    <span style={{fontSize:11,color:'#8896A8'}}>R$ {Number(item.valor_por_cota).toFixed(4)}/cota</span>
                  </div>
                  <button onClick={()=>excluir(item)} style={{background:'#fff5f5',color:'#fc8181',border:'1px solid #fed7d7',borderRadius:5,padding:'3px 8px',fontSize:11,cursor:'pointer'}}>🗑</button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:12}}>
          <div style={{flex:1,height:1,background:'#E8ECF0'}}/>
          <span style={{fontSize:11,fontWeight:700,color:'#8896A8',textTransform:'uppercase',letterSpacing:'0.05em'}}>
            {modoImport ? 'lançamentos importados — edite antes de confirmar' : 'lançar manualmente'}
          </span>
          <div style={{flex:1,height:1,background:'#E8ECF0'}}/>
        </div>

        <div style={{display:'flex',flexDirection:'column',gap:6,marginBottom:16}}>
          {linhas.map(l => (
            <div key={l.id} style={{background:'#FFFDF0',border:'1px solid #F6E05E',borderRadius:8,padding:'10px 12px'}}>
              <div style={{display:'grid',gridTemplateColumns:'18px 1fr 90px 80px 80px 70px',gap:6,alignItems:'center'}}>
                <input type="checkbox" checked={l.selecionado} onChange={()=>setLinha(l.id,'selecionado',!l.selecionado)} style={{accentColor:'#D4A017',width:15,height:15}}/>
                <div>
                  <span style={{fontWeight:700,fontSize:13}}>{l.ticker}</span>
                  <span style={{fontSize:11,color:'#8896A8',marginLeft:6}}>
                    {l.quantidade != null ? `${l.quantidade} cotas (planilha)` : `${fiis.find(f=>f.ticker===l.ticker)?.quantidade||0} cotas`}
                  </span>
                </div>
                <select value={l.tipo} onChange={e=>setLinha(l.id,'tipo',e.target.value)}
                  style={{padding:'5px 6px',border:'1px solid #F6E05E',borderRadius:6,fontSize:12,background:'#fff',outline:'none'}}>
                  {TIPOS_DIVIDENDO.map(t=><option key={t} value={t}>{t}</option>)}
                </select>
                <input type="number" min="0" step="1" placeholder="Qtd"
                  value={l.quantidade ?? ''} onChange={e=>setLinha(l.id,'quantidade',e.target.value===''?null:Number(e.target.value))}
                  style={{padding:'5px 6px',border:'1px solid #F6E05E',borderRadius:6,background:'#fff',fontSize:12,textAlign:'right',outline:'none'}}/>
                <input type="number" min="0" step="0.0001" placeholder="R$/cota"
                  value={l.valor} onChange={e=>setLinha(l.id,'valor',e.target.value)}
                  style={{padding:'5px 6px',border:'1px solid #F6E05E',borderRadius:6,background:'#fff',fontSize:12,textAlign:'right',outline:'none'}}/>
                <span style={{fontSize:11,color:'#B7791F',textAlign:'center'}}>{meses[l.mes-1]?.slice(0,3)}/{l.ano}</span>
              </div>
            </div>
          ))}
        </div>

        <div style={{background:'#FFFDF0',border:'1px solid #F6E05E',borderRadius:8,padding:'12px 16px',display:'flex',gap:24,marginBottom:18}}>
          <div><p style={{fontSize:11,color:'#8896A8',marginBottom:3}}>Total a lançar</p><p style={{fontSize:15,fontWeight:700,color:'#744210'}}>{fmt.brl(total)}</p></div>
          <div><p style={{fontSize:11,color:'#8896A8',marginBottom:3}}>Lançamentos selecionados</p><p style={{fontSize:15,fontWeight:700}}>{linhasSel.length}</p></div>
        </div>

        <div style={{display:'flex',gap:10,justifyContent:'flex-end'}}>
          <button onClick={onFechar} style={{padding:'9px 20px',borderRadius:7,fontSize:13,fontWeight:600,border:'none',cursor:'pointer',background:'#EDF2F7',color:'#8896A8'}}>Cancelar</button>
          <button onClick={confirmar} disabled={salvando||linhasSel.length===0}
            style={{padding:'9px 20px',borderRadius:7,fontSize:13,fontWeight:600,border:'none',cursor:'pointer',background:'#D4A017',color:'#fff',opacity:linhasSel.length===0?0.5:1}}>
            {salvando?'Salvando...':'Lançar dividendos'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── CARD FII ─────────────────────────────────────────────────────────────
function FIICard({ f, onRemover, onSalvar, onAbrirDividendo, resumoAno, resumoGeral }) {
  const [editando, setEditando] = useState(false);
  const [qtd, setQtd]     = useState(String(f.quantidade ?? ''));
  const [preco, setPreco] = useState(String(f.preco_compra ?? ''));

  const perf     = calcPerformance(f.preco_atual, f.preco_compra, f.quantidade);
  const maxScore = 4;
  const scoreNum = typeof f.score === 'string' ? parseInt(f.score) : (f.score ?? 0);
  const fillPct  = (scoreNum / maxScore) * 100;

  // Dividendos do ano
  const dadosAno      = resumoAno?.[f.ticker] || {};
  const totalAno      = dadosAno.total || 0;
  const lancAno       = dadosAno.lancamentos || 0;
  const breakdownAno  = dadosAno.breakdown || {};
  const yieldPMAno    = perf.custo > 0 && totalAno > 0 ? (totalAno / perf.custo) * 100 : 0;
  const ganhoAno      = perf.custo > 0 ? perf.ganho + totalAno : 0;
  const pctAno        = perf.custo > 0 ? (ganhoAno / perf.custo) * 100 : 0;

  // Dividendos gerais
  const dadosGeral    = resumoGeral?.[f.ticker] || {};
  const totalGeral    = dadosGeral.total || 0;
  const lancGeral     = dadosGeral.lancamentos || 0;
  const yieldPMGeral  = perf.custo > 0 && totalGeral > 0 ? (totalGeral / perf.custo) * 100 : 0;
  const ganhoGeral    = perf.custo > 0 ? perf.ganho + totalGeral : 0;
  const pctGeral      = perf.custo > 0 ? (ganhoGeral / perf.custo) * 100 : 0;

  const salvar = async () => { await onSalvar(f.ticker, qtd, preco); setEditando(false); };

  const C = {
    card:   { background:'#FFFFFF',border:'1px solid #E8ECF0',borderRadius:14,padding:'18px 20px',display:'flex',flexDirection:'column',gap:12 },
    lbl:    { fontSize:11,color:'#8896A8',marginBottom:2 },
    val:    { fontSize:13,fontWeight:600,color:'#1A1A2E' },
    grpLbl: { fontSize:11,color:'#8896A8',fontWeight:600,textTransform:'uppercase',letterSpacing:'0.05em',marginBottom:8 },
  };

  return (
    <div style={C.card}>
      {/* Header */}
      <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between'}}>
        <div>
          <div style={{display:'flex',alignItems:'center',gap:8,flexWrap:'wrap'}}>
            <span style={{fontSize:18,fontWeight:700,color:'#2563EB'}}>{f.ticker}</span>
            {(() => {
              const COR_SETOR = {
                'Fundo de Tijolo': { bg:'#FEF3C7', color:'#92400E' },
                'Fundo de Papel':  { bg:'#F3E8FF', color:'#7E22CE' },
                'Fundo de Agro':   { bg:'#DCFCE7', color:'#166534' },
                'Fundo Misto':     { bg:'#E0F9FF', color:'#0369A1' },
              };
              const setor = f.setor_fundo || 'Fundo Misto';
              const c = COR_SETOR[setor] || { bg:'#F1F5F9', color:'#475569' };
              return <span style={{fontSize:10,fontWeight:500,padding:'2px 8px',borderRadius:20,background:c.bg,color:c.color}}>{setor}</span>;
            })()}
            {f.tipo_fundo && (
              <span style={{fontSize:10,fontWeight:500,padding:'2px 8px',borderRadius:20,background:'#E0F2FE',color:'#0369A1'}}>{f.tipo_fundo}</span>
            )}
          </div>
          {f.nome_fundo && <p style={{fontSize:12,fontWeight:500,color:'#4A5568',margin:'3px 0 1px'}}>{f.nome_fundo}</p>}
          {f.administradora && <p style={{fontSize:10,color:'#8896A8',margin:0}}>Adm: {f.administradora}</p>}
        </div>
        <span className={badgeDecisao(f.decisao)}>{f.decisao}</span>
      </div>

      {/* Score bar */}
      <div style={{display:'flex',alignItems:'center',gap:10}}>
        <div style={{flex:1,height:5,background:'#E8ECF0',borderRadius:4,overflow:'hidden'}}>
          <div style={{width:`${fillPct}%`,height:'100%',background:scoreBarColor(f.classificacao),borderRadius:4}}/>
        </div>
        <span style={{fontSize:13,fontWeight:600,color:'#1A1A2E',whiteSpace:'nowrap'}}>{scoreNum}/{maxScore}</span>
        <span style={{fontSize:12,color:'#8896A8'}}>{f.classificacao}</span>
      </div>

      {/* Rendimento & Qualidade */}
      <div>
        <p style={C.grpLbl}>Rendimento & Qualidade</p>
        <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8}}>
          {criteriosFII.map(({label,key,ok,temCriterio,fmt:fmtFn})=>{
            const v = f[key];
            // DY Mensal: se 0, calcula dy_anual/12
            const valorExibido = key === 'dy_mensal' && (!v || v === 0) && f.dy_anual > 0
              ? f.dy_anual / 12
              : v;
            const passou = temCriterio && valorExibido != null && ok(valorExibido);
            return (
              <div key={label}>
                <p style={C.lbl}>{label}</p>
                <div style={{display:'flex',alignItems:'center',gap:5}}>
                  {temCriterio && (
                    <div style={{width:7,height:7,borderRadius:'50%',flexShrink:0,
                      background: valorExibido != null ? (passou ? '#16A34A' : '#DC2626') : '#D0D8E0'}}/>
                  )}
                  <p style={C.val}>{valorExibido != null ? fmtFn(valorExibido) : '-'}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Preço Justo */}
      {f.preco_justo > 0 && (
        <div style={{background:'#FDF4FF',border:'1px solid #E9D5FF',borderRadius:10,padding:'10px 14px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <div>
            <p style={{fontSize:11,color:'#6B21A8',marginBottom:3}}>Preço Justo (VPA)</p>
            <p style={{fontSize:15,fontWeight:700,color:'#4C1D95'}}>{fmt.brl(f.preco_justo)}</p>
            <p style={{fontSize:10,color:'#7C3AED',marginTop:2}}>VPA ÷ P/VP esperado (1,0)</p>
          </div>
          <div style={{textAlign:'right'}}>
            <p style={{fontSize:11,color:'#6B21A8',marginBottom:3}}>Situação vs Justo</p>
            <span style={{
              fontSize:11,fontWeight:500,padding:'2px 8px',borderRadius:4,
              background: f.status_justo === 'DESCONTADO' ? '#EDE9FE' : f.status_justo === 'JUSTO' ? '#FEF3C7' : '#FEE2E2',
              color: f.status_justo === 'DESCONTADO' ? '#5B21B6' : f.status_justo === 'JUSTO' ? '#92400E' : '#991B1B'
            }}>{f.status_justo}</span>
          </div>
        </div>
      )}

      {/* Posição */}
      <div>
        <p style={C.grpLbl}>Sua posição</p>
        {editando ? (
          <div style={{background:'#EFF6FF',border:'1px solid #BFDBFE',borderRadius:10,padding:14}}>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:10}}>
              <div><label style={{...C.lbl,display:'block',marginBottom:4}}>Quantidade</label><input className="input" type="number" min="0" step="1" value={qtd} onChange={e=>setQtd(e.target.value)}/></div>
              <div><label style={{...C.lbl,display:'block',marginBottom:4}}>Preço médio (R$)</label><input className="input" type="number" min="0" step="0.01" value={preco} onChange={e=>setPreco(e.target.value)}/></div>
            </div>
            <div style={{display:'flex',gap:8}}>
              <button className="btn-primary" style={{flex:1,justifyContent:'center'}} onClick={salvar}>Salvar</button>
              <button className="btn-secondary" style={{flex:1,justifyContent:'center'}} onClick={()=>setEditando(false)}>Cancelar</button>
            </div>
          </div>
        ) : (
          <div style={{background:'#F8F9FA',border:'1px solid #E8ECF0',borderRadius:10,padding:'12px 14px'}}>
            <div style={{display:'flex',justifyContent:'space-between',marginBottom:8}}>
              <div><p style={C.lbl}>Qtd. cotas</p><p style={C.val}>{f.quantidade?fmt.num(f.quantidade,0):'-'}</p></div>
              <div style={{textAlign:'center'}}><p style={C.lbl}>Seu preço médio</p><p style={C.val}>{f.preco_compra?fmt.brl(f.preco_compra):'-'}</p></div>
              <div style={{textAlign:'right'}}><p style={C.lbl}>Val. investido</p><p style={C.val}>{perf.custo>0?fmt.brl(perf.custo):'-'}</p></div>
            </div>
            <hr style={{border:'none',borderTop:'1px solid #E8ECF0',margin:'8px 0'}}/>
            <div style={{display:'flex',justifyContent:'space-between'}}>
              <div><p style={C.lbl}>Val. atual</p><p style={C.val}>{perf.valorAtual>0?fmt.brl(perf.valorAtual):'-'}</p></div>
              <div style={{textAlign:'right'}}>
                <p style={C.lbl}>Retorno sobre a compra</p>
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

      {/* Dividendos do ano */}
      <div style={{background:'#FFFDF0',border:'1px solid #F6E05E',borderRadius:10,padding:'10px 14px'}}>
        <p style={{fontSize:11,fontWeight:700,color:'#B7791F',textTransform:'uppercase',letterSpacing:'0.05em',marginBottom:8}}>
          💰 Dividendos recebidos no ano
        </p>
        <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8,marginBottom:Object.keys(breakdownAno).length>0?8:0}}>
          <div><p style={{fontSize:10,color:'#B7791F',marginBottom:2}}>Total recebido</p><p style={{fontSize:13,fontWeight:700,color:'#744210'}}>{fmt.brl(totalAno)}</p></div>
          <div><p style={{fontSize:10,color:'#B7791F',marginBottom:2}}>Yield s/ PM</p><p style={{fontSize:13,fontWeight:700,color:'#744210'}}>{yieldPMAno>0?fmt.pct(yieldPMAno):'—'}</p></div>
          <div><p style={{fontSize:10,color:'#B7791F',marginBottom:2}}>Lançamentos</p><p style={{fontSize:13,fontWeight:700,color:'#744210'}}>{lancAno}</p></div>
        </div>
        {Object.keys(breakdownAno).length>0&&(
          <div style={{borderTop:'1px solid #F6E05E',paddingTop:8,display:'flex',gap:6,flexWrap:'wrap'}}>
            {Object.entries(breakdownAno).map(([tipo,valor])=>(
              <span key={tipo} style={{fontSize:11,background:'#FEF3C7',color:'#92400E',padding:'2px 8px',borderRadius:20}}>
                {tipo} {fmt.brl(Number(valor))}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Retorno após dividendos do ano */}
      {perf.custo>0&&totalAno>0&&(
        <div style={{background:'#EFF6FF',border:'1px solid #BFDBFE',borderRadius:10,padding:'10px 14px'}}>
          <p style={{fontSize:11,fontWeight:600,color:'#3B82F6',marginBottom:6}}>Retorno após dividendos do ano</p>
          <div style={{display:'flex',alignItems:'baseline',gap:8}}>
            <span style={{fontSize:15,fontWeight:700,color:ganhoAno>=0?'#16A34A':'#DC2626'}}>{ganhoAno>=0?'+':''}{fmt.brl(ganhoAno)}</span>
            <span style={{fontSize:12,fontWeight:600,color:pctAno>=0?'#16A34A':'#DC2626'}}>({pctAno>=0?'+':''}{fmt.pct(pctAno)})</span>
          </div>
          <p style={{fontSize:11,color:'#93C5FD',marginTop:3}}>compra {perf.ganho>=0?'+':''}{fmt.brl(perf.ganho)} + dividendos ano {fmt.brl(totalAno)}</p>
        </div>
      )}

      {/* Dividendos gerais */}
      {totalGeral>0&&(
        <div style={{background:'#F0FDF4',border:'1px solid #BBF7D0',borderRadius:10,padding:'10px 14px'}}>
          <p style={{fontSize:11,fontWeight:700,color:'#276749',textTransform:'uppercase',letterSpacing:'0.05em',marginBottom:8}}>Dividendos recebidos geral</p>
          <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8}}>
            <div><p style={{fontSize:10,color:'#276749',marginBottom:2}}>Total histórico</p><p style={{fontSize:13,fontWeight:700,color:'#14532D'}}>{fmt.brl(totalGeral)}</p></div>
            <div><p style={{fontSize:10,color:'#276749',marginBottom:2}}>Yield s/ PM</p><p style={{fontSize:13,fontWeight:700,color:'#14532D'}}>{yieldPMGeral>0?fmt.pct(yieldPMGeral):'—'}</p></div>
            <div><p style={{fontSize:10,color:'#276749',marginBottom:2}}>Lançamentos</p><p style={{fontSize:13,fontWeight:700,color:'#14532D'}}>{lancGeral}</p></div>
          </div>
        </div>
      )}

      {/* Retorno após dividendos gerais */}
      {perf.custo>0&&totalGeral>0&&(
        <div style={{background:'#F0FDF4',border:'1px solid #BBF7D0',borderRadius:10,padding:'10px 14px'}}>
          <p style={{fontSize:11,fontWeight:600,color:'#276749',marginBottom:6}}>Retorno após dividendos gerais</p>
          <div style={{display:'flex',alignItems:'baseline',gap:8}}>
            <span style={{fontSize:15,fontWeight:700,color:ganhoGeral>=0?'#16A34A':'#DC2626'}}>{ganhoGeral>=0?'+':''}{fmt.brl(ganhoGeral)}</span>
            <span style={{fontSize:12,fontWeight:600,color:pctGeral>=0?'#16A34A':'#DC2626'}}>({pctGeral>=0?'+':''}{fmt.pct(pctGeral)})</span>
          </div>
          <p style={{fontSize:11,color:'#276749',marginTop:3,opacity:0.8}}>compra {perf.ganho>=0?'+':''}{fmt.brl(perf.ganho)} + dividendos geral {fmt.brl(totalGeral)}</p>
        </div>
      )}

      {/* Footer */}
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',paddingTop:4,borderTop:'1px solid #E8ECF0'}}>
        <div>
          <div style={{display:'flex',alignItems:'baseline',gap:8}}>
            <span style={{fontSize:16,fontWeight:700,color:'#1A1A2E'}}>{fmt.brl(f.preco_atual)}</span>
            {f.variacao_dia!=null&&(
              <span style={{fontSize:12,fontWeight:600,color:f.variacao_dia>=0?'#16A34A':'#DC2626',background:f.variacao_dia>=0?'#F0FDF4':'#FEF2F2',padding:'2px 8px',borderRadius:20}}>
                {f.variacao_dia>=0?'▲':'▼'} {f.variacao_dia>=0?'+':''}{fmt.pct(f.variacao_dia)} hoje
              </span>
            )}
          </div>
        </div>
        <div style={{display:'flex',gap:6}}>
          <button onClick={onAbrirDividendo}
            style={{padding:'4px 10px',borderRadius:5,fontSize:11,fontWeight:600,border:'none',cursor:'pointer',background:'#FEFCBF',color:'#7B6213'}}>
            💰 Dividendo
          </button>
          {!editando&&<button className="btn-icon" onClick={()=>setEditando(true)}>✏️</button>}
          <button className="btn-icon" onClick={()=>onRemover(f.ticker)}>🗑️</button>
        </div>
      </div>
    </div>
  );
}

// ─── FORM ADICIONAR ───────────────────────────────────────────────────────
function FIIsForm({ onAdicionado }) {
  const searchParams = useSearchParams();
  const [ticker, setTicker]           = useState(searchParams.get('ticker')||'');
  const [quantidade, setQuantidade]   = useState('');
  const [precoCompra, setPrecoCompra] = useState('');
  const [buscando, setBuscando]       = useState(false);
  const [erro, setErro]               = useState('');

  const adicionar = async (e) => {
    e.preventDefault();
    if (!ticker.trim()) return;
    setBuscando(true); setErro('');
    try {
      await api.post('/fiis', { ticker: ticker.trim().toUpperCase(), quantidade: Number(quantidade)||0, preco_compra: Number(precoCompra)||0 });
      setTicker(''); setQuantidade(''); setPrecoCompra('');
      onAdicionado();
    } catch (err) { setErro(err.response?.data?.error||'Erro ao adicionar FII.'); }
    finally { setBuscando(false); }
  };

  return (
    <div style={{background:'#FFFFFF',border:'1px solid #E8ECF0',borderRadius:14,padding:20,marginBottom:24}}>
      <p style={{fontSize:14,fontWeight:700,color:'#1A1A2E',marginBottom:14}}>Adicionar FII</p>
      <form onSubmit={adicionar} className="form-row" style={{display:'flex',gap:12,alignItems:'flex-end',flexWrap:'wrap'}}>
        <div style={{flex:1,minWidth:100}}>
          <label style={{fontSize:11,color:'#8896A8',fontWeight:600,display:'block',marginBottom:4}}>Ticker *</label>
          <input className="input" placeholder="Ex: CPTS11" style={{textTransform:'uppercase'}} value={ticker} onChange={e=>setTicker(e.target.value.toUpperCase())} required/>
        </div>
        <div style={{flex:1,minWidth:100}}>
          <label style={{fontSize:11,color:'#8896A8',fontWeight:600,display:'block',marginBottom:4}}>Qtd. que você tem</label>
          <input className="input" type="number" min="0" step="1" placeholder="0" value={quantidade} onChange={e=>setQuantidade(e.target.value)}/>
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
function Dashboard({ fiis, anoFiltro, setAnoFiltro, anosDisponiveis, resumoAno, resumoGeral }) {
  if (!fiis.length) return null;
  const patrimonio   = fiis.reduce((s,f)=>s+(f.preco_atual*(f.quantidade||0)),0);
  const custo        = fiis.reduce((s,f)=>{ const p=calcPerformance(f.preco_atual,f.preco_compra,f.quantidade); return s+p.custo; },0);
  const resultado    = patrimonio - custo;
  const pctTotal     = custo > 0 ? (resultado/custo)*100 : 0;
  const ganhoCompra  = resultado;
  const pctCompra    = pctTotal;
  const totalDiv     = Object.values(resumoGeral||{}).reduce((s,v)=>s+(v.total||0),0);
  const ganhoTotal   = resultado + totalDiv;
  const pctGanhoTotal = custo > 0 ? (ganhoTotal/custo)*100 : 0;
  const divAno       = Object.values(resumoAno).reduce((s,v)=>s+(v.total||0),0);
  const custTotal    = fiis.reduce((s,f)=>s+((f.preco_compra||0)*(f.quantidade||0)),0);
  const yieldAno     = custTotal > 0 ? (divAno/custTotal)*100 : 0;
  const lancAno      = Object.values(resumoAno).reduce((s,v)=>s+(v.lancamentos||0),0);
  const maiorTicker  = Object.entries(resumoAno).sort((a,b)=>(b[1].total||0)-(a[1].total||0))[0];
  const scores       = fiis.map(f=>typeof f.score==='string'?parseInt(f.score):(f.score||0));
  const scoreMedio   = scores.length?(scores.reduce((s,v)=>s+v,0)/scores.length).toFixed(1):0;
  const sorted       = [...fiis].map(f=>({...f,pct:calcPerformance(f.preco_atual,f.preco_compra,f.quantidade).pct}));
  const melhor       = [...sorted].sort((a,b)=>b.pct-a.pct)[0];
  const pior         = [...sorted].sort((a,b)=>a.pct-b.pct)[0];
  const CORES        = ['#2563EB','#16A34A','#D4A017','#7C3AED','#D97706','#DC2626','#718096','#0891B2','#BE185D'];

  return (
    <div style={{marginBottom:20}}>
      <div style={{display:'flex',flexDirection:'column',gap:12,marginBottom:14}}>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
          <div style={{background:'#FFFFFF',border:'1px solid #E8ECF0',borderRadius:12,padding:'18px 20px'}}>
            <p style={{fontSize:11,color:'#8896A8',textTransform:'uppercase',letterSpacing:'0.05em',marginBottom:8}}>Patrimônio FIIs</p>
            <p style={{fontSize:26,fontWeight:800,color:'#2563EB',margin:0}}>{fmt.brl(patrimonio)}</p>
            <p style={{fontSize:12,color:'#8896A8',marginTop:4}}>{fiis.length} FIIs na carteira</p>
          </div>
          <div style={{background:'#FFFFFF',border:'1px solid #E8ECF0',borderRadius:12,padding:'18px 20px'}}>
            <p style={{fontSize:11,color:'#8896A8',textTransform:'uppercase',letterSpacing:'0.05em',marginBottom:8}}>Resultado após a compra</p>
            <p style={{fontSize:26,fontWeight:800,color:ganhoCompra>=0?'#16A34A':'#DC2626',margin:0}}>{ganhoCompra>=0?'+':''}{fmt.brl(ganhoCompra)}</p>
            <p style={{fontSize:12,color:'#8896A8',marginTop:4}}>{ganhoCompra>=0?'+':''}{fmt.pct(pctCompra)} desde aporte</p>
          </div>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:12}}>
          <div style={{background:'#FFFFFF',border:'1px solid #E8ECF0',borderRadius:12,padding:'16px 18px'}}>
            <p style={{fontSize:11,color:'#8896A8',textTransform:'uppercase',letterSpacing:'0.05em',marginBottom:6}}>Resultado após dividendos</p>
            <p style={{fontSize:20,fontWeight:800,color:ganhoTotal>=0?'#16A34A':'#DC2626',margin:0}}>{ganhoTotal>=0?'+':''}{fmt.brl(ganhoTotal)}</p>
            <p style={{fontSize:11,color:'#8896A8',marginTop:3}}>{ganhoTotal>=0?'+':''}{fmt.pct(pctGanhoTotal)} com dividendos</p>
          </div>
          <div style={{background:'#FFFFFF',border:'1px solid #E8ECF0',borderRadius:12,padding:'16px 18px'}}>
            <p style={{fontSize:11,color:'#8896A8',textTransform:'uppercase',letterSpacing:'0.05em',marginBottom:6}}>Melhor / Pior FII</p>
            <p style={{fontSize:16,fontWeight:800,color:'#1A1A2E',margin:0}}>{melhor?`${melhor.ticker} ${melhor.pct>=0?'+':''}${fmt.pct(melhor.pct)}`:'—'}</p>
            <p style={{fontSize:11,color:'#8896A8',marginTop:3}}>{pior&&pior.ticker!==melhor?.ticker?`Pior: ${pior.ticker} ${fmt.pct(pior.pct)}`:''}</p>
          </div>
          <div style={{background:'#FFFFFF',border:'1px solid #E8ECF0',borderRadius:12,padding:'16px 18px'}}>
            <p style={{fontSize:11,color:'#8896A8',textTransform:'uppercase',letterSpacing:'0.05em',marginBottom:6}}>Score médio</p>
            <p style={{fontSize:20,fontWeight:800,color:'#2563EB',margin:0}}>{scoreMedio} / 4</p>
            <p style={{fontSize:11,color:'#8896A8',marginTop:3}}>{fiis.filter(f=>(typeof f.score==='string'?parseInt(f.score):f.score)>=3).length} MANTER · {fiis.filter(f=>(typeof f.score==='string'?parseInt(f.score):f.score)===2).length} ATENÇÃO</p>
          </div>
        </div>
      </div>

      {/* Distribuição */}
      <div style={{background:'#FFFFFF',border:'1px solid #E8ECF0',borderRadius:10,padding:16,marginBottom:14}}>
        <p style={{fontSize:11,fontWeight:700,color:'#8896A8',textTransform:'uppercase',letterSpacing:'0.05em',marginBottom:12}}>Distribuição da carteira</p>
        <div style={{display:'flex',height:26,borderRadius:6,overflow:'hidden',marginBottom:10}}>
          {fiis.map((f,i)=>{ const val=f.preco_atual*(f.quantidade||0); const pct=patrimonio>0?(val/patrimonio)*100:0; return <div key={f.ticker} style={{flex:pct,background:CORES[i%CORES.length],display:'flex',alignItems:'center',justifyContent:'center',fontSize:10,fontWeight:700,color:'#fff',overflow:'hidden'}}>{pct>7?f.ticker:''}</div>; })}
        </div>
        <div style={{display:'flex',gap:14,flexWrap:'wrap'}}>
          {fiis.map((f,i)=>{ const val=f.preco_atual*(f.quantidade||0); const pct=patrimonio>0?(val/patrimonio)*100:0; return <div key={f.ticker} style={{display:'flex',alignItems:'center',gap:5,fontSize:11,color:'#8896A8'}}><div style={{width:8,height:8,borderRadius:'50%',background:CORES[i%CORES.length]}}/>{f.ticker} {fmt.pct(pct)}</div>; })}
        </div>
      </div>

      {/* Filtro anos + faixa dividendos */}
      <div style={{marginBottom:4}}>
        <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:10,flexWrap:'wrap'}}>
          <span style={{fontSize:11,fontWeight:500,color:'#8896A8',textTransform:'uppercase',letterSpacing:'0.05em'}}>Dividendos</span>
          {anosDisponiveis.map(ano=>(
            <button key={ano} onClick={()=>setAnoFiltro(ano)}
              style={{fontSize:12,padding:'3px 12px',borderRadius:20,border:'none',cursor:'pointer',background:anoFiltro===ano?'#EBF8FF':'#F0F2F5',color:anoFiltro===ano?'#2B6CB0':'#718096',fontWeight:anoFiltro===ano?600:400}}>
              {ano}
            </button>
          ))}
          <button onClick={()=>setAnoFiltro(0)}
            style={{fontSize:12,padding:'3px 12px',borderRadius:20,border:'none',cursor:'pointer',background:anoFiltro===0?'#EBF8FF':'#F0F2F5',color:anoFiltro===0?'#2B6CB0':'#718096',fontWeight:anoFiltro===0?600:400}}>
            Geral
          </button>
        </div>
        <div style={{background:'linear-gradient(135deg,#FFFDF0,#FEFCE8)',border:'1px solid #F6E05E',borderRadius:10,padding:16,display:'flex'}}>
          {[
            { label:anoFiltro===0?'Dividendos geral':`Dividendos ${anoFiltro}`, val:fmt.brl(divAno), sub:'Todos os FIIs' },
            { label:'Yield médio s/ PM', val:custTotal>0?fmt.pct(yieldAno):'—', sub:'Sobre preço médio pago' },
            { label:'Maior pagador', val:maiorTicker?maiorTicker[0]:'—', sub:maiorTicker?`${fmt.brl(maiorTicker[1].total)} ${anoFiltro===0?'no geral':`em ${anoFiltro}`}`:''},
            { label:'Lançamentos', val:lancAno, sub:anoFiltro===0?'Total histórico':`Em ${anoFiltro}` },
          ].map((item,i,arr)=>(
            <div key={i} style={{flex:1,padding:'0 16px',borderRight:i<arr.length-1?'1px solid #F6E05E':'none',paddingLeft:i===0?0:16}}>
              <p style={{fontSize:11,color:'#B7791F',textTransform:'uppercase',letterSpacing:'0.05em',marginBottom:5}}>{item.label}</p>
              <p style={{fontSize:17,fontWeight:800,color:'#744210'}}>{item.val}</p>
              {item.sub&&<p style={{fontSize:11,color:'#B7791F',marginTop:2}}>{item.sub}</p>}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── PÁGINA ───────────────────────────────────────────────────────────────
const BuscaFIIs = ({ valor, onChange }) => (
  <div style={{background:'#FFFFFF',border:'1px solid #E8ECF0',borderRadius:10,padding:'10px 14px',display:'flex',alignItems:'center',gap:8,marginBottom:16}}>
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8896A8" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
    <input
      value={valor}
      onChange={e => onChange(e.target.value)}
      placeholder="Buscar FII... ex: CPTS11, Capitânia, Papel"
      style={{border:'none',outline:'none',fontSize:13,color:'#1A1A2E',background:'transparent',flex:1}}
    />
    {valor && <button onClick={() => onChange('')} style={{background:'none',border:'none',cursor:'pointer',color:'#8896A8',fontSize:16}}>×</button>}
  </div>
);

export default function FIIsPage() {
  const [fiis, setFiis]               = useState([]);
  const [loading, setLoading]         = useState(true);
  const [atualizando, setAtualizando] = useState(false);
  const [modalCompra, setModalCompra] = useState(null);
  const [modalDiv, setModalDiv]       = useState(false);
  const [busca, setBusca]             = useState('');

  const { anosDisponiveis, anoFiltro, setAnoFiltro, resumoAno, resumoGeral, carregarDados } = useDividendosFII(fiis);

  const carregar = async () => {
    try { const r = await api.get('/fiis'); setFiis(r.data); }
    finally { setLoading(false); }
  };

  useEffect(() => { carregar(); }, []);

  const remover = async (t) => {
    if (!confirm(`Remover ${t}?`)) return;
    await api.delete(`/fiis/${t}`); await carregar();
  };

  const salvarEdicao = async (ticker, qtd, preco) => {
    await api.put(`/fiis/${ticker}`, { quantidade: Number(qtd), preco_compra: Number(preco) });
    await carregar();
  };

  const atualizar = async () => {
    setAtualizando(true);
    try { await api.post('/fiis/atualizar-todos'); await carregar(); }
    finally { setAtualizando(false); }
  };

  const salvarOperacao = async ({ ticker, tipo, quantidade, preco }) => {
    const fii = fiis.find(f => f.ticker === ticker);
    if (tipo === 'comprar') {
      const qtdAtual = fii?.quantidade || 0;
      const pmAtual  = fii?.preco_compra || 0;
      const novaQtd  = qtdAtual + quantidade;
      const novoPM   = qtdAtual > 0 ? ((qtdAtual*pmAtual)+(quantidade*preco))/novaQtd : preco;
      await api.put(`/fiis/${ticker}`, { quantidade: novaQtd, preco_compra: parseFloat(novoPM.toFixed(4)) });
    } else {
      const novaQtd = Math.max(0, (fii?.quantidade||0) - quantidade);
      await api.put(`/fiis/${ticker}`, { quantidade: novaQtd });
    }
    await carregar();
  };

  const salvarDividendos = async (lancamentos) => {
    await api.post('/fiis/dividendos', { lancamentos });
    await carregarDados();
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
          <h2 style={{fontSize:22,fontWeight:600,color:'#1A1A2E',marginBottom:4}}>Carteira FII</h2>
          <p style={{fontSize:13,color:'#8896A8',marginBottom:24}}>Fundos Imobiliários avaliados por critérios de renda e qualidade</p>
        </div>
        <div style={{display:'flex',gap:8,alignItems:'center',flexWrap:'wrap'}}>
          <button onClick={atualizar} disabled={atualizando} className="btn-secondary">
            <RefreshCw size={15} style={atualizando?{animation:'spin 0.7s linear infinite'}:{}}/>
            {atualizando?'Atualizando...':'Atualizar todos'}
          </button>
          {fiis.length > 0 && <>
            <button onClick={()=>setModalCompra('comprar')} style={{padding:'8px 14px',borderRadius:7,fontSize:12,fontWeight:600,border:'1px solid #9AE6B4',background:'#C6F6D5',color:'#276749',cursor:'pointer'}}>▲ Comprar cota</button>
            <button onClick={()=>setModalCompra('vender')}  style={{padding:'8px 14px',borderRadius:7,fontSize:12,fontWeight:600,border:'1px solid #FC8181',background:'#FED7D7',color:'#9B2C2C',cursor:'pointer'}}>▼ Vender cota</button>
            <button onClick={()=>setModalDiv(true)}         style={{padding:'8px 14px',borderRadius:7,fontSize:12,fontWeight:600,border:'1px solid #F6E05E',background:'#FEFCBF',color:'#7B6213',cursor:'pointer'}}>💰 Lançar dividendos</button>
            <button onClick={()=>setModalDiv(true)}         style={{padding:'8px 14px',borderRadius:7,fontSize:12,fontWeight:600,border:'1px solid #90CDF4',background:'#EBF8FF',color:'#2B6CB0',cursor:'pointer'}}>⬆ Importar B3</button>
          </>}
        </div>
      </div>

      {/* Dashboard */}
      {fiis.length > 0 && <Dashboard fiis={fiis} anoFiltro={anoFiltro} setAnoFiltro={setAnoFiltro} anosDisponiveis={anosDisponiveis} resumoAno={resumoAno} resumoGeral={resumoGeral}/>}

      {/* Form adicionar */}
      <Suspense fallback={<div style={{background:'#FFF',border:'1px solid #E8ECF0',borderRadius:14,padding:20,marginBottom:24,height:90}}/>}>
        <FIIsForm onAdicionado={carregar}/>
      </Suspense>

      {/* Critérios — DY Mensal ≥ 1% */}
      <div style={{background:'#FFFFFF',border:'1px solid #E8ECF0',borderRadius:12,padding:'12px 20px',marginBottom:20,display:'flex',alignItems:'center',gap:8,flexWrap:'wrap'}}>
        <span style={{fontSize:11,fontWeight:700,color:'#8896A8',textTransform:'uppercase',letterSpacing:'0.05em',marginRight:4}}>Critérios de avaliação (Score /4)</span>
        {['DY Mensal ≥ 1%','P/VP < 1,05','Volume Diário > R$ 1M','Patrimônio > R$ 1B'].map(c=>(
          <span key={c} style={{fontSize:12,fontWeight:500,padding:'3px 10px',borderRadius:20,background:'#F0F2F5',color:'#4A5568',border:'1px solid #E8ECF0'}}>{c}</span>
        ))}
      </div>

      {fiis.length > 0 && <BuscaFIIs valor={busca} onChange={setBusca} />}

      {/* Cards */}
      {fiis.length > 0 ? (
        <div className="grid-cards">
          {fiis.filter(f => {
            const q = busca.toLowerCase();
            return !q || f.ticker.toLowerCase().includes(q)
              || (f.nome_fundo || '').toLowerCase().includes(q)
              || (f.tipo_fundo || '').toLowerCase().includes(q);
          }).map(f=>(
            <FIICard key={f.ticker} f={f}
              onRemover={remover}
              onSalvar={salvarEdicao}
              onAbrirDividendo={()=>setModalDiv(true)}
              resumoAno={resumoAno}
              resumoGeral={resumoGeral}
            />
          ))}
        </div>
      ) : (
        <div style={{background:'#FFF',border:'1px solid #E8ECF0',borderRadius:14,padding:40,textAlign:'center'}}>
          <Building2 size={40} style={{color:'#D0D8E0',margin:'0 auto 12px'}}/>
          <p style={{color:'#4A5568',fontWeight:500,marginBottom:4}}>Nenhum FII adicionado</p>
          <p style={{color:'#8896A8',fontSize:13}}>Digite um ticker acima para buscar e avaliar um fundo imobiliário.</p>
        </div>
      )}

      {/* Modais */}
      {modalCompra && (
        <ModalCompraVenda fiis={fiis} tipo={modalCompra}
          onFechar={()=>setModalCompra(null)} onSalvar={salvarOperacao}/>
      )}
      {modalDiv && (
        <ModalDividendosFII fiis={fiis}
          onFechar={()=>setModalDiv(false)} onSalvar={salvarDividendos}/>
      )}
    </div>
  );
}
