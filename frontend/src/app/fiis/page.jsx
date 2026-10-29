'use client';
import { useState, useEffect, useMemo, Suspense } from 'react';
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
  const colTipo     = col('movimentacao', 'tipo de evento', 'tipo evento', 'tipo');
  const colData     = col('data', 'pagamento', 'data pagamento', 'data de pagamento', 'data com');
  const colQtd      = col('quantidade', 'qtd');
  const colPreco    = col('preco unitario', 'preco', 'valor unitario', 'valor por cota');
  const colValorLiq = col('valor da operacao', 'valor liquido', 'valor bruto', 'valor');
  const colEntradaSaida = col('entrada/saida', 'entrada saida', 'entrada');

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
    if (!val) return { mes: null, ano: null, data: null };
    if (val instanceof Date) {
      const dia = val.getDate(), mes = val.getMonth()+1, ano = val.getFullYear();
      return { mes, ano, data: `${ano}-${String(mes).padStart(2,'0')}-${String(dia).padStart(2,'0')}` };
    }
    const m = String(val).match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
    if (m) {
      const dia = Number(m[1]), mes = Number(m[2]), ano = Number(m[3]);
      return { mes, ano, data: `${ano}-${String(mes).padStart(2,'0')}-${String(dia).padStart(2,'0')}` };
    }
    return { mes: null, ano: null, data: null };
  };

  const resultado = [];
  for (const row of rows) {
    const produtoRaw = row[colProduto];
    if (!produtoRaw || String(produtoRaw).trim() === '') continue;
    if (String(produtoRaw).toUpperCase().includes('TOTAL')) continue;

    const match = String(produtoRaw).toUpperCase().match(TICKER_REGEX);
    if (!match) continue;
    const ticker = match[1];

    const { mes, ano, data } = parseDataBR(row[colData]);
    if (!mes || !ano) continue;

    // Filtra apenas créditos, ignora débitos/taxas (B3 usa "Credito"/"Debito")
    const entSaida = String(row[colEntradaSaida] || '').toLowerCase();
    if (entSaida && entSaida.includes('debito')) continue;

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
      data_pagamento: data,   // data exata DD/MM/YYYY → YYYY-MM-DD
    });
  }

  const agrupados = {};
  for (const l of resultado) {
    const chave = `${l.ticker}|${l.tipo_dividendo}|${l.data_pagamento || l.mes+'|'+l.ano}`;
    if (!agrupados[chave]) agrupados[chave] = { ...l };
    else {
      agrupados[chave].valor_total += l.valor_total;
      agrupados[chave].quantidade  += l.quantidade;
    }
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

// ─── hook cotações ao vivo ─────────────────────────────────────────────────
function useCotacoesLive(fiis) {
  const [cotacoes, setCotacoes] = useState({});

  const buscar = async () => {
    if (!fiis.length) return;
    try {
      const r = await api.get('/fiis/cotacoes-live');
      setCotacoes(r.data || {});
    } catch {}
  };

  useEffect(() => {
    buscar();
    const id = setInterval(buscar, 60000); // atualiza a cada 60s
    return () => clearInterval(id);
  }, [fiis.length]);

  return cotacoes;
}

// ─── mini gráfico de dividendos (12 meses) ────────────────────────────────
function MiniGraficoDividendos({ ticker }) {
  const [dados, setDados] = useState(null);

  useEffect(() => {
    const buscar = async () => {
      try {
        const anoAtual = new Date().getFullYear();
        const anos = [anoAtual - 1, anoAtual];
        const resultados = await Promise.all(
          anos.map(a => api.get(`/fiis/dividendos/resumo?ano=${a}`).then(r => ({ ano: a, data: r.data })).catch(() => ({ ano: a, data: {} })))
        );
        // Montar array de 12 meses: últimos 12 meses
        const hoje = new Date();
        const meses = [];
        for (let i = 11; i >= 0; i--) {
          const d = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
          meses.push({ mes: d.getMonth() + 1, ano: d.getFullYear(), label: d.toLocaleString('pt-BR', { month: 'short' }) });
        }
        // Buscar dividendos mensais por ticker
        const porMes = {};
        for (const { ano, data } of resultados) {
          const tickerData = data[ticker];
          if (tickerData?.porMes) {
            for (const [mes, val] of Object.entries(tickerData.porMes)) {
              porMes[`${ano}-${mes}`] = val;
            }
          }
        }
        const valores = meses.map(m => ({ ...m, valor: porMes[`${m.ano}-${m.mes}`] || 0 }));
        setDados(valores);
      } catch {}
    };
    buscar();
  }, [ticker]);

  if (!dados || dados.every(d => d.valor === 0)) return null;

  const maxVal = Math.max(...dados.map(d => d.valor), 0.001);
  const totalAno = dados.slice(-12).reduce((s, d) => s + d.valor, 0);

  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
        <span style={{ fontSize: 10, color: '#8896A8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Dividendos 12 meses
        </span>
        {totalAno > 0 && (
          <span style={{ fontSize: 11, color: '#16A34A', fontWeight: 600 }}>
            Total: {fmt.brl(totalAno)}
          </span>
        )}
      </div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 40 }}>
        {dados.map((d, i) => {
          const h = Math.max((d.valor / maxVal) * 34, d.valor > 0 ? 3 : 0);
          const isLast = i === dados.length - 1;
          return (
            <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
              <div
                title={`${d.label}: ${fmt.brl(d.valor)}`}
                style={{
                  width: '100%', height: h, borderRadius: '2px 2px 0 0',
                  background: isLast ? '#2563EB' : d.valor > 0 ? '#BFDBFE' : 'transparent',
                  transition: 'height 0.3s'
                }}
              />
              {(i === 0 || i === 5 || i === 11) && (
                <span style={{ fontSize: 8, color: '#8896A8' }}>{d.label}</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
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
  const qtdAtual = parseFloat(fii?.quantidade || 0);
  const pmAtual  = parseFloat(fii?.preco_compra || 0);
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
            <p style={{fontSize:12,color:'#4A90D9'}}>Suporte a XLSX — importa todos os meses automaticamente</p>
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

// ─── MODAL IMPORTAR B3 ────────────────────────────────────────────────────
function ModalImportarB3({ fiis, onFechar, onSalvar }) {
  const [parsendo, setParsendo]     = useState(false);
  const [salvando, setSalvando]     = useState(false);
  const [arquivo, setArquivo]       = useState(null);
  const [linhas, setLinhas]         = useState([]);   // todas as linhas parseadas
  const [anosAtivos, setAnosAtivos] = useState({});   // { 2024: true, 2025: true }
  const [avisoFora, setAvisoFora]   = useState([]);
  const [feedback, setFeedback]     = useState('');
  const [importado, setImportado]   = useState(false);

  // Agrupa linhas por ano
  const porAno = useMemo(() => {
    const map = {};
    for (const l of linhas) {
      if (!map[l.ano]) map[l.ano] = [];
      map[l.ano].push(l);
    }
    return map;
  }, [linhas]);

  const anos = Object.keys(porAno).map(Number).sort((a,b)=>b-a);

  const linhasSelecionadas = linhas.filter(l => anosAtivos[l.ano]);

  const totalSel = linhasSelecionadas.reduce((s,l) => s + (l.valor_total || 0), 0);

  const handleArquivo = async (f) => {
    if (!f) return;
    setArquivo(f); setParsendo(true); setFeedback(''); setAvisoFora([]);
    setLinhas([]); setAnosAtivos({}); setImportado(false);
    try {
      const resultado = await parsearArquivoB3FII(f);
      const tickersFII = new Set(fiis.map(x => x.ticker));
      const fora = [];
      const novas = [];
      let idSeq = Date.now();
      for (const l of resultado) {
        if (!tickersFII.has(l.ticker)) { fora.push(l.ticker); continue; }
        novas.push({
          id: idSeq++, ticker: l.ticker, tipo: l.tipo_dividendo,
          valor: l.valor_por_cota, valor_total: l.valor_total,
          quantidade: l.quantidade || null, mes: l.mes, ano: l.ano,
          data_pagamento: l.data_pagamento || null,
        });
      }
      // Ativa todos os anos por padrão
      const anos = {};
      for (const n of novas) anos[n.ano] = true;
      setLinhas(novas);
      setAnosAtivos(anos);
      setAvisoFora([...new Set(fora)]);
      const anosUnicos = Object.keys(anos).length;
      setFeedback(`✓ ${novas.length} lançamento(s) em ${anosUnicos} ano(s) encontrado(s)`);
    } catch (err) {
      console.error(err);
      setFeedback('⚠ Erro ao ler o arquivo. Verifique se é o extrato de proventos da B3.');
    } finally { setParsendo(false); }
  };

  const toggleAno = (ano) => {
    setAnosAtivos(prev => ({ ...prev, [ano]: !prev[ano] }));
  };

  const confirmar = async () => {
    if (!linhasSelecionadas.length) return;
    setSalvando(true);
    try {
      const lancamentos = linhasSelecionadas.map(l => ({
        ticker: l.ticker, tipo_dividendo: l.tipo,
        valor_por_cota: l.valor, quantidade: l.quantidade,
        valor_total_override: l.valor_total ?? null,
        mes: l.mes, ano: l.ano,
        data_pagamento: l.data_pagamento || null,
      }));
      await onSalvar(lancamentos);
      setImportado(true);
      setFeedback(`✅ ${lancamentos.length} lançamento(s) importado(s) com sucesso!`);
    } catch (err) {
      setFeedback('⚠ Erro ao salvar. Tente novamente.');
    } finally { setSalvando(false); }
  };

  const meses = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',zIndex:300,display:'flex',alignItems:'center',justifyContent:'center',padding:16}}
      onClick={e=>e.target===e.currentTarget&&onFechar()}>
      <div style={{background:'#fff',borderRadius:16,width:'100%',maxWidth:680,maxHeight:'92vh',display:'flex',flexDirection:'column',overflow:'hidden',boxShadow:'0 24px 64px rgba(0,0,0,0.25)'}}>

        {/* Header */}
        <div style={{padding:'18px 22px',borderBottom:'1px solid #E8ECF0',display:'flex',alignItems:'center',justifyContent:'space-between',flexShrink:0}}>
          <div>
            <div style={{display:'flex',alignItems:'center',gap:8}}>
              <span style={{fontSize:20}}>⬆</span>
              <span style={{fontSize:17,fontWeight:700,color:'#1A1A2E'}}>Importar Extrato B3</span>
            </div>
            <p style={{fontSize:12,color:'#8896A8',marginTop:2}}>Importe o extrato de proventos da B3 — todos os anos de uma vez</p>
          </div>
          <button onClick={onFechar} style={{background:'none',border:'none',cursor:'pointer',color:'#8896A8',padding:4}}><X size={20}/></button>
        </div>

        {/* Body */}
        <div style={{flex:1,overflowY:'auto',padding:'18px 22px'}}>

          {/* Upload */}
          <label style={{display:'block',cursor:'pointer'}}>
            <div style={{border:'2px dashed #93C5FD',borderRadius:12,padding:'22px 20px',textAlign:'center',background:'#EFF6FF',transition:'background 0.15s'}}
              onDragOver={e=>{e.preventDefault();e.currentTarget.style.background='#DBEAFE'}}
              onDragLeave={e=>{e.currentTarget.style.background='#EFF6FF'}}
              onDrop={e=>{e.preventDefault();const f=e.dataTransfer.files[0];if(f)handleArquivo(f);}}>
              <p style={{fontSize:28,marginBottom:4}}>📂</p>
              <p style={{fontSize:14,fontWeight:700,color:'#2563EB',marginBottom:2}}>
                {parsendo ? 'Lendo arquivo...' : arquivo ? arquivo.name : 'Selecionar ou arrastar arquivo'}
              </p>
              <p style={{fontSize:12,color:'#60A5FA'}}>Extrato de Movimentação (.xlsx, .xls, .csv) — exportado do site da B3</p>
            </div>
            <input type="file" accept=".csv,.xlsx,.xls" style={{display:'none'}} disabled={parsendo||salvando}
              onChange={e=>{const f=e.target.files[0];if(f)handleArquivo(f);}}/>
          </label>

          {/* Feedback */}
          {feedback && (
            <div style={{marginTop:10,padding:'10px 14px',borderRadius:8,
              background:feedback.startsWith('✅')?'#F0FDF4':feedback.startsWith('✓')?'#EFF6FF':'#FFFBEB',
              border:`1px solid ${feedback.startsWith('✅')?'#86EFAC':feedback.startsWith('✓')?'#93C5FD':'#FCD34D'}`}}>
              <p style={{fontSize:13,fontWeight:600,color:feedback.startsWith('✅')?'#16A34A':feedback.startsWith('✓')?'#2563EB':'#92400E'}}>{feedback}</p>
            </div>
          )}

          {/* Aviso tickers fora da carteira */}
          {avisoFora.length > 0 && (
            <div style={{marginTop:8,padding:'10px 14px',borderRadius:8,background:'#FFFBEB',border:'1px solid #FCD34D'}}>
              <p style={{fontSize:12,fontWeight:600,color:'#92400E',marginBottom:2}}>⚠ Ativos ignorados (não estão na sua carteira):</p>
              <p style={{fontSize:12,color:'#92400E'}}>{avisoFora.join(', ')}</p>
            </div>
          )}

          {/* Preview por ano */}
          {anos.length > 0 && !importado && (
            <div style={{marginTop:18}}>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12}}>
                <p style={{fontSize:12,fontWeight:700,color:'#8896A8',textTransform:'uppercase',letterSpacing:'0.05em'}}>
                  Selecione os anos para importar
                </p>
                <div style={{display:'flex',gap:6}}>
                  <button onClick={()=>setAnosAtivos(Object.fromEntries(anos.map(a=>[a,true])))}
                    style={{fontSize:11,padding:'3px 10px',borderRadius:6,border:'1px solid #93C5FD',background:'#EFF6FF',color:'#2563EB',cursor:'pointer',fontWeight:600}}>
                    Todos
                  </button>
                  <button onClick={()=>setAnosAtivos(Object.fromEntries(anos.map(a=>[a,false])))}
                    style={{fontSize:11,padding:'3px 10px',borderRadius:6,border:'1px solid #E8ECF0',background:'#F8F9FA',color:'#8896A8',cursor:'pointer',fontWeight:600}}>
                    Nenhum
                  </button>
                </div>
              </div>

              <div style={{display:'flex',flexDirection:'column',gap:10}}>
                {anos.map(ano => {
                  const lsAno = porAno[ano];
                  const totalAno = lsAno.reduce((s,l)=>s+(l.valor_total||0),0);
                  const ativo = !!anosAtivos[ano];
                  // Agrupa por ticker para exibir resumo compacto
                  const porTicker = {};
                  for (const l of lsAno) {
                    if (!porTicker[l.ticker]) porTicker[l.ticker] = { total:0, meses:[] };
                    porTicker[l.ticker].total += l.valor_total || 0;
                    porTicker[l.ticker].meses.push(l.mes);
                  }
                  return (
                    <div key={ano} style={{border:`1px solid ${ativo?'#93C5FD':'#E8ECF0'}`,borderRadius:10,overflow:'hidden',
                      background:ativo?'#FAFCFF':'#FAFAFA',transition:'all 0.15s'}}>
                      {/* Cabeçalho do ano */}
                      <div style={{padding:'10px 14px',display:'flex',alignItems:'center',gap:10,cursor:'pointer',
                        background:ativo?'#EFF6FF':'#F1F5F9'}} onClick={()=>toggleAno(ano)}>
                        <input type="checkbox" checked={ativo} onChange={()=>toggleAno(ano)}
                          style={{accentColor:'#2563EB',width:16,height:16,cursor:'pointer'}}
                          onClick={e=>e.stopPropagation()}/>
                        <span style={{fontSize:15,fontWeight:700,color:ativo?'#2563EB':'#8896A8'}}>{ano}</span>
                        <span style={{fontSize:12,color:'#8896A8',marginLeft:2}}>{lsAno.length} lançamento(s)</span>
                        <span style={{flex:1}}/>
                        <span style={{fontSize:13,fontWeight:700,color:ativo?'#2563EB':'#8896A8'}}>{fmt.brl(totalAno)}</span>
                      </div>
                      {/* Tabela compacta dos tickers */}
                      {ativo && (
                        <div style={{padding:'8px 14px 12px'}}>
                          <div style={{display:'flex',flexDirection:'column',gap:4}}>
                            {Object.entries(porTicker).sort((a,b)=>b[1].total-a[1].total).map(([ticker,info])=>{
                              const mesesUnicos = [...new Set(info.meses)].sort((a,b)=>a-b);
                              return (
                                <div key={ticker} style={{display:'flex',alignItems:'center',gap:8,padding:'5px 8px',borderRadius:6,background:'#fff',border:'1px solid #E8ECF0'}}>
                                  <span style={{fontWeight:700,fontSize:12,minWidth:60,color:'#1A1A2E'}}>{ticker}</span>
                                  <span style={{fontSize:11,color:'#8896A8',flex:1}}>
                                    {mesesUnicos.length} {mesesUnicos.length===1?'mês':'meses'}: {mesesUnicos.map(m=>meses[m-1]).join(', ')}
                                  </span>
                                  <span style={{fontSize:12,fontWeight:600,color:'#16A34A'}}>{fmt.brl(info.total)}</span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {importado && (
            <div style={{marginTop:20,textAlign:'center',padding:'24px 0'}}>
              <p style={{fontSize:32,marginBottom:8}}>🎉</p>
              <p style={{fontSize:15,fontWeight:700,color:'#16A34A',marginBottom:4}}>Dividendos importados com sucesso!</p>
              <p style={{fontSize:13,color:'#8896A8'}}>Os dados já aparecem na sua carteira.</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{padding:'14px 22px',borderTop:'1px solid #E8ECF0',display:'flex',alignItems:'center',justifyContent:'space-between',flexShrink:0,background:'#FAFBFC'}}>
          <div>
            {linhasSelecionadas.length > 0 && !importado && (
              <p style={{fontSize:12,color:'#8896A8'}}>
                <span style={{fontWeight:700,color:'#1A1A2E'}}>{linhasSelecionadas.length}</span> lançamento(s) · Total: <span style={{fontWeight:700,color:'#16A34A'}}>{fmt.brl(totalSel)}</span>
              </p>
            )}
          </div>
          <div style={{display:'flex',gap:10}}>
            <button onClick={onFechar} style={{padding:'9px 20px',borderRadius:7,fontSize:13,fontWeight:600,border:'none',cursor:'pointer',background:'#EDF2F7',color:'#8896A8'}}>
              {importado ? 'Fechar' : 'Cancelar'}
            </button>
            {!importado && linhasSelecionadas.length > 0 && (
              <button onClick={confirmar} disabled={salvando}
                style={{padding:'9px 22px',borderRadius:7,fontSize:13,fontWeight:700,border:'none',cursor:'pointer',
                  background:'#2563EB',color:'#fff',opacity:salvando?0.7:1,display:'flex',alignItems:'center',gap:6}}>
                {salvando ? '⏳ Importando...' : `⬆ Importar ${anos.filter(a=>anosAtivos[a]).length > 1 ? anos.filter(a=>anosAtivos[a]).length + ' anos' : 'dividendos'}`}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── MODAL PORTFÓLIO FII ──────────────────────────────────────────────────
function ModalPortfolio({ ticker, nomeFundo, onFechar }) {
  const [dados, setDados] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get(`/fiis/${ticker}/portfolio`);
        setDados(res.data);
      } catch (e) {
        setErro(e.response?.data?.error || 'Erro ao carregar portfólio.');
      } finally {
        setCarregando(false);
      }
    })();
  }, [ticker]);

  const fmtPct = v => v != null ? `${(v * 100).toFixed(2)}%` : '—';
  const fmtBrl = v => v != null && v > 0 ? v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }) : '—';
  const fmtArea = v => v != null && v > 0 ? `${v.toLocaleString('pt-BR')} m²` : '—';

  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.55)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',padding:'16px'}}>
      <div style={{background:'#fff',borderRadius:16,width:'100%',maxWidth:640,maxHeight:'88vh',display:'flex',flexDirection:'column',overflow:'hidden',boxShadow:'0 20px 60px rgba(0,0,0,0.25)'}}>
        {/* Header */}
        <div style={{padding:'18px 22px',borderBottom:'1px solid #E8ECF0',display:'flex',alignItems:'center',justifyContent:'space-between',flexShrink:0}}>
          <div>
            <div style={{display:'flex',alignItems:'center',gap:8}}>
              <Building2 size={18} color="#2563EB"/>
              <span style={{fontSize:17,fontWeight:700,color:'#1A1A2E'}}>Portfólio — {ticker}</span>
            </div>
            {nomeFundo && <p style={{fontSize:12,color:'#8896A8',marginTop:2}}>{nomeFundo}</p>}
          </div>
          <button onClick={onFechar} style={{background:'none',border:'none',cursor:'pointer',color:'#8896A8',padding:4}}><X size={20}/></button>
        </div>

        {/* Conteúdo */}
        <div style={{flex:1,overflowY:'auto',padding:'18px 22px'}}>
          {carregando && <p style={{textAlign:'center',color:'#8896A8',padding:'40px 0'}}>Carregando portfólio...</p>}
          {erro && <p style={{textAlign:'center',color:'#DC2626',padding:'40px 0'}}>{erro}</p>}
          {dados && !carregando && (
            <div style={{display:'flex',flexDirection:'column',gap:18}}>
              {/* Data de referência + summary */}
              {dados.referenceDate && (
                <p style={{fontSize:11,color:'#8896A8'}}>Referência: {dados.referenceDate} · Dados do último informe trimestral</p>
              )}

              {/* Alocações */}
              {dados.allocations?.length > 0 && (
                <div>
                  <p style={{fontSize:12,fontWeight:700,color:'#1A1A2E',textTransform:'uppercase',letterSpacing:'0.05em',marginBottom:10}}>Alocação</p>
                  <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
                    {dados.allocations.map((a, i) => {
                      const labels = { fii: 'FII', real_estate: 'Imóveis', fund_share: 'Cotas de Fundo', cash: 'Caixa', cri: 'CRI', lci: 'LCI' };
                      const colors = { fii: { bg:'#EFF6FF', color:'#2563EB' }, real_estate: { bg:'#FEF3C7', color:'#92400E' }, fund_share: { bg:'#F3E8FF', color:'#7E22CE' }, cash: { bg:'#F0FDF4', color:'#16A34A' }, cri: { bg:'#FFF7ED', color:'#C2410C' }, lci: { bg:'#E0F2FE', color:'#0369A1' } };
                      const c = colors[a.assetClass] || { bg:'#F1F5F9', color:'#475569' };
                      return (
                        <div key={i} style={{background:c.bg,borderRadius:10,padding:'8px 14px',textAlign:'center'}}>
                          <p style={{fontSize:10,color:c.color,fontWeight:600,marginBottom:3}}>{labels[a.assetClass] || a.assetClass}</p>
                          <p style={{fontSize:13,fontWeight:700,color:c.color}}>{a.count} {a.count === 1 ? 'ativo' : 'ativos'}</p>
                          {a.value > 0 && <p style={{fontSize:10,color:c.color,opacity:0.8}}>{fmtBrl(a.value)}</p>}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Imóveis */}
              {dados.properties?.length > 0 && (() => {
                // helpers
                const extractUF = addr => {
                  if (!addr) return null;
                  const m = addr.match(/\b([A-Z]{2})\b(?:\s*[-–]\s*\d{5})?$/);
                  if (m) return m[1];
                  const estados = {AC:'AC',AL:'AL',AM:'AM',AP:'AP',BA:'BA',CE:'CE',DF:'DF',ES:'ES',GO:'GO',MA:'MA',MG:'MG',MS:'MS',MT:'MT',PA:'PA',PB:'PB',PE:'PE',PI:'PI',PR:'PR',RJ:'RJ',RN:'RN',RO:'RO',RR:'RR',RS:'RS',SC:'SC',SE:'SE',SP:'SP',TO:'TO'};
                  const parts = addr.toUpperCase().split(/[\s,\-\/]+/);
                  for (let i = parts.length - 1; i >= 0; i--) { if (estados[parts[i]]) return parts[i]; }
                  return null;
                };

                // totalizadores
                const vacGeral = dados.propertiesSummary?.vacancyRate != null
                  ? dados.propertiesSummary.vacancyRate
                  : dados.properties.filter(p => p.vacancyRate != null).length > 0
                    ? dados.properties.filter(p => p.vacancyRate != null).reduce((acc, p) => acc + (p.vacancyRate || 0), 0) / dados.properties.filter(p => p.vacancyRate != null).length
                    : null;
                const ocupacaoGeral = vacGeral != null ? 100 - vacGeral * 100 : null;
                const corOcup = v => v == null ? '#8896A8' : v >= 90 ? '#16A34A' : v >= 70 ? '#D97706' : '#DC2626';

                const inadProp = dados.properties.filter(p => p.delinquencyRate != null);
                const inadMedia = inadProp.length > 0 ? inadProp.reduce((a, p) => a + p.delinquencyRate, 0) / inadProp.length : null;

                const totalUnidades = dados.properties.reduce((a, p) => a + (p.unitCount || 0), 0);
                const areaTotal = dados.properties.reduce((a, p) => a + (p.area || 0), 0);

                const ufsSet = new Set(dados.properties.map(p => extractUF(p.address)).filter(Boolean));
                const ufs = [...ufsSet].sort();

                return (
                <div>
                  <p style={{fontSize:12,fontWeight:700,color:'#1A1A2E',textTransform:'uppercase',letterSpacing:'0.05em',marginBottom:10}}>
                    🏢 Imóveis ({dados.properties.length})
                  </p>

                  {/* Painel totalizador */}
                  <div style={{background:'#F1F5F9',borderRadius:12,padding:'12px 16px',marginBottom:12,display:'flex',flexDirection:'column',gap:10}}>
                    {/* Ocupação */}
                    {ocupacaoGeral != null && (
                      <div>
                        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:4}}>
                          <span style={{fontSize:11,color:'#64748B',fontWeight:600}}>Ocupação geral</span>
                          <span style={{fontSize:13,fontWeight:700,color:corOcup(ocupacaoGeral)}}>{ocupacaoGeral.toFixed(1)}% alugado</span>
                        </div>
                        <div style={{height:7,background:'#E8ECF0',borderRadius:4,overflow:'hidden'}}>
                          <div style={{width:`${Math.min(ocupacaoGeral,100)}%`,height:'100%',background:corOcup(ocupacaoGeral),borderRadius:4,transition:'width 0.5s'}}/>
                        </div>
                      </div>
                    )}
                    {/* Linha de métricas */}
                    <div style={{display:'flex',gap:16,flexWrap:'wrap'}}>
                      {inadMedia != null && (
                        <div style={{display:'flex',flexDirection:'column',gap:1}}>
                          <span style={{fontSize:10,color:'#8896A8',fontWeight:600,textTransform:'uppercase',letterSpacing:'0.04em'}}>Inadimplência</span>
                          <span style={{fontSize:13,fontWeight:700,color: inadMedia > 0.05 ? '#DC2626' : inadMedia > 0.02 ? '#D97706' : '#16A34A'}}>{(inadMedia*100).toFixed(1)}%</span>
                        </div>
                      )}
                      {totalUnidades > 0 && (
                        <div style={{display:'flex',flexDirection:'column',gap:1}}>
                          <span style={{fontSize:10,color:'#8896A8',fontWeight:600,textTransform:'uppercase',letterSpacing:'0.04em'}}>Unidades</span>
                          <span style={{fontSize:13,fontWeight:700,color:'#1A1A2E'}}>{totalUnidades.toLocaleString('pt-BR')}</span>
                        </div>
                      )}
                      {areaTotal > 0 && (
                        <div style={{display:'flex',flexDirection:'column',gap:1}}>
                          <span style={{fontSize:10,color:'#8896A8',fontWeight:600,textTransform:'uppercase',letterSpacing:'0.04em'}}>Área total</span>
                          <span style={{fontSize:13,fontWeight:700,color:'#1A1A2E'}}>{fmtArea(areaTotal)}</span>
                        </div>
                      )}
                      {ufs.length > 0 && (
                        <div style={{display:'flex',flexDirection:'column',gap:1}}>
                          <span style={{fontSize:10,color:'#8896A8',fontWeight:600,textTransform:'uppercase',letterSpacing:'0.04em'}}>Estados</span>
                          <div style={{display:'flex',gap:4,flexWrap:'wrap'}}>
                            {ufs.map(uf => (
                              <span key={uf} style={{fontSize:11,fontWeight:700,color:'#475569',background:'#E2E8F0',padding:'1px 7px',borderRadius:10}}>{uf}</span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Lista de imóveis */}
                  <div style={{display:'flex',flexDirection:'column',gap:8}}>
                    {dados.properties.map((p, i) => {
                      const ocup = p.vacancyRate != null ? 100 - p.vacancyRate * 100 : p.leasedRate != null ? p.leasedRate * 100 : null;
                      const uf = extractUF(p.address);
                      return (
                      <div key={i} style={{background:'#F8FAFC',border:'1px solid #E8ECF0',borderRadius:10,padding:'12px 14px'}}>
                        <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',gap:8,marginBottom:8}}>
                          <div style={{flex:1,minWidth:0}}>
                            <div style={{display:'flex',alignItems:'center',gap:6,flexWrap:'wrap',marginBottom:2}}>
                              <p style={{fontSize:13,fontWeight:600,color:'#1A1A2E',margin:0}}>{p.name}</p>
                              {uf && <span style={{fontSize:10,fontWeight:700,color:'#475569',background:'#E2E8F0',padding:'1px 6px',borderRadius:8,flexShrink:0}}>{uf}</span>}
                              {p.propertyClass && <span style={{fontSize:10,color:'#8896A8',background:'#F1F5F9',padding:'1px 6px',borderRadius:8,flexShrink:0}}>{p.propertyClass}</span>}
                            </div>
                            {p.address && <p style={{fontSize:11,color:'#8896A8',margin:0}}>{p.address}</p>}
                          </div>
                          <div style={{display:'flex',flexDirection:'column',alignItems:'flex-end',gap:4,flexShrink:0}}>
                            {p.revenueShare > 0 && (
                              <span style={{fontSize:12,fontWeight:700,color:'#2563EB',background:'#EFF6FF',padding:'3px 10px',borderRadius:20,whiteSpace:'nowrap'}}>
                                {fmtPct(p.revenueShare)} receita
                              </span>
                            )}
                            {ocup != null && (
                              <div style={{display:'flex',alignItems:'center',gap:5}}>
                                <div style={{width:52,height:5,background:'#E8ECF0',borderRadius:3,overflow:'hidden'}}>
                                  <div style={{width:`${Math.min(ocup,100)}%`,height:'100%',background:corOcup(ocup),borderRadius:3}}/>
                                </div>
                                <span style={{fontSize:11,fontWeight:700,color:corOcup(ocup),whiteSpace:'nowrap'}}>{ocup.toFixed(0)}% alugado</span>
                              </div>
                            )}
                          </div>
                        </div>
                        <div style={{display:'flex',gap:12,flexWrap:'wrap'}}>
                          {p.area > 0 && <span style={{fontSize:11,color:'#64748B'}}>📐 {fmtArea(p.area)}</span>}
                          {p.unitCount > 0 && <span style={{fontSize:11,color:'#64748B'}}>🏠 {p.unitCount} unid.</span>}
                          {p.delinquencyRate > 0 && <span style={{fontSize:11,color:'#D97706'}}>⚠️ Inadimp. {(p.delinquencyRate*100).toFixed(1)}%</span>}
                          {p.constructionProgressActual > 0 && p.constructionProgressActual < 1 && (
                            <span style={{fontSize:11,color:'#7E22CE'}}>🏗️ Em obra {(p.constructionProgressActual*100).toFixed(0)}%</span>
                          )}
                        </div>
                      </div>
                      );
                    })}
                  </div>
                </div>
                );
              })()}

              {/* Ativos financeiros */}
              {dados.financialAssets?.length > 0 && (
                <div>
                  <p style={{fontSize:12,fontWeight:700,color:'#1A1A2E',textTransform:'uppercase',letterSpacing:'0.05em',marginBottom:10}}>
                    📄 Ativos Financeiros ({dados.financialAssets.length})
                  </p>
                  <div style={{display:'flex',flexDirection:'column',gap:6}}>
                    {dados.financialAssets.slice(0,10).map((a, i) => (
                      <div key={i} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'8px 12px',background:'#F8FAFC',borderRadius:8,gap:8}}>
                        <div style={{flex:1,minWidth:0}}>
                          <p style={{fontSize:12,fontWeight:500,color:'#1A1A2E',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{a.name || a.issuer || '—'}</p>
                          {a.assetClass && <p style={{fontSize:10,color:'#8896A8',marginTop:1}}>{a.assetClass.toUpperCase()}</p>}
                        </div>
                        {a.value > 0 && <p style={{fontSize:12,fontWeight:600,color:'#2563EB',whiteSpace:'nowrap'}}>{fmtBrl(a.value)}</p>}
                      </div>
                    ))}
                    {dados.financialAssets.length > 10 && (
                      <p style={{fontSize:11,color:'#8896A8',textAlign:'center',padding:4}}>+ {dados.financialAssets.length - 10} ativos</p>
                    )}
                  </div>
                </div>
              )}

              {/* Cotas de fundos */}
              {dados.fundHoldings?.length > 0 && (
                <div>
                  <p style={{fontSize:12,fontWeight:700,color:'#1A1A2E',textTransform:'uppercase',letterSpacing:'0.05em',marginBottom:10}}>
                    🏛️ Cotas de Fundos ({dados.fundHoldings.length})
                  </p>
                  <div style={{display:'flex',flexDirection:'column',gap:6}}>
                    {dados.fundHoldings.map((h, i) => (
                      <div key={i} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'8px 12px',background:'#F8FAFC',borderRadius:8,gap:8}}>
                        <p style={{fontSize:12,fontWeight:500,color:'#1A1A2E'}}>{h.name || h.symbol || '—'}</p>
                        {h.value > 0 && <p style={{fontSize:12,fontWeight:600,color:'#7E22CE'}}>{fmtBrl(h.value)}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Sem dados */}
              {!dados.properties?.length && !dados.financialAssets?.length && !dados.fundHoldings?.length && (
                <p style={{textAlign:'center',color:'#8896A8',padding:'30px 0'}}>Sem dados de portfólio disponíveis para este FII.</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── CARD FII ─────────────────────────────────────────────────────────────
function FIICard({ f, onRemover, onSalvar, onAbrirDividendo, resumoAno, resumoGeral, cotacaoLive }) {
  const [editando, setEditando] = useState(false);
  const [qtd, setQtd]     = useState(String(f.quantidade ?? ''));
  const [preco, setPreco] = useState(String(f.preco_compra ?? ''));
  const [verPortfolio, setVerPortfolio] = useState(false);

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

      {/* Alerta P/VP */}
      {f.pvp > 0 && (() => {
        const pvp = f.pvp;
        const oport = pvp < 0.95;
        const ok    = pvp >= 0.95 && pvp < 1.05;
        const caro  = pvp >= 1.05;
        const bg    = oport ? '#F0FDF4' : ok ? '#F8FAFC' : '#FEF2F2';
        const border= oport ? '#BBF7D0' : ok ? '#E2E8F0' : '#FECACA';
        const cor   = oport ? '#15803D' : ok ? '#64748B' : '#DC2626';
        const ico   = oport ? '🟢' : ok ? '🔵' : '🔴';
        const txt   = oport
          ? `Oportunidade — cota ${Math.abs((1-pvp)*100).toFixed(0)}% abaixo do VPA`
          : ok
          ? `Preço justo — dentro da faixa ideal`
          : `Atenção — prêmio de ${((pvp-1)*100).toFixed(0)}% sobre o VPA`;
        return (
          <div style={{background:bg,border:`1px solid ${border}`,borderRadius:8,padding:'7px 10px',display:'flex',alignItems:'center',gap:8,fontSize:12}}>
            <span>{ico}</span>
            <span style={{color:cor,fontWeight:500}}>
              <strong>P/VP {fmt.num(pvp)}</strong> — {txt}
            </span>
          </div>
        );
      })()}

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

      {/* Mini gráfico dividendos 12M */}
      <MiniGraficoDividendos ticker={f.ticker} />

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
          <div style={{display:'flex',alignItems:'baseline',gap:8,flexWrap:'wrap'}}>
            <span style={{fontSize:16,fontWeight:700,color:'#1A1A2E'}}>
              {fmt.brl(cotacaoLive?.preco_atual ?? f.preco_atual)}
            </span>
            {(() => {
              const vd = cotacaoLive?.variacao_dia ?? f.variacao_dia;
              if (vd == null) return null;
              return (
                <span style={{fontSize:12,fontWeight:600,color:vd>=0?'#16A34A':'#DC2626',background:vd>=0?'#F0FDF4':'#FEF2F2',padding:'2px 8px',borderRadius:20,display:'flex',alignItems:'center',gap:2}}>
                  {vd>=0?'▲':'▼'} {vd>=0?'+':''}{fmt.pct(vd)} hoje
                  {cotacaoLive && <span style={{fontSize:9,opacity:0.7,marginLeft:2}}>●</span>}
                </span>
              );
            })()}
          </div>
        </div>
        <div style={{display:'flex',gap:6}}>
          <button onClick={()=>setVerPortfolio(true)}
            style={{padding:'4px 10px',borderRadius:5,fontSize:11,fontWeight:600,border:'none',cursor:'pointer',background:'#EFF6FF',color:'#2563EB'}}>
            🏢 Portfólio
          </button>
          <button onClick={onAbrirDividendo}
            style={{padding:'4px 10px',borderRadius:5,fontSize:11,fontWeight:600,border:'none',cursor:'pointer',background:'#FEFCBF',color:'#7B6213'}}>
            💰 Dividendo
          </button>
          {!editando&&<button className="btn-icon" onClick={()=>setEditando(true)}>✏️</button>}
          <button className="btn-icon" onClick={()=>onRemover(f.ticker)}>🗑️</button>
        </div>
      </div>

      {/* Modal Portfólio */}
      {verPortfolio && (
        <ModalPortfolio ticker={f.ticker} nomeFundo={f.nome_fundo} onFechar={()=>setVerPortfolio(false)}/>
      )}
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

function TabRanking({ fiis, cotacoes, resumoGeral }) {
  const [sortKey, setSortKey] = useState('score');
  const [sortDir, setSortDir] = useState('desc');

  const toggleSort = (key) => {
    if (sortKey === key) setSortDir(d => d === 'desc' ? 'asc' : 'desc');
    else { setSortKey(key); setSortDir('desc'); }
  };

  const dados = fiis.map(f => {
    const live = cotacoes[f.ticker] || {};
    const vd   = live.variacao_dia ?? f.variacao_dia;
    const preco = live.preco_atual ?? f.preco_atual;
    const dyM   = f.preco_atual > 0 && f.dividendo_mensal > 0 ? (f.dividendo_mensal / f.preco_atual) * 100 : null;
    const dyA   = resumoGeral?.[f.ticker]?.totalAno > 0 && f.preco_atual > 0
      ? (resumoGeral[f.ticker].totalAno / f.preco_atual) * 100 : null;
    return { ...f, vd, preco, dyM, dyA };
  });

  const sorted = [...dados].sort((a, b) => {
    const va = a[sortKey] ?? (sortDir==='desc' ? -Infinity : Infinity);
    const vb = b[sortKey] ?? (sortDir==='desc' ? -Infinity : Infinity);
    return sortDir === 'desc' ? vb - va : va - vb;
  });

  const Th = ({ k, label, right }) => (
    <th onClick={() => toggleSort(k)} style={{
      padding:'10px 12px',fontSize:11,fontWeight:700,color:'#8896A8',textTransform:'uppercase',
      letterSpacing:'0.05em',cursor:'pointer',whiteSpace:'nowrap',userSelect:'none',
      textAlign:right?'right':'left',background:'#F8FAFC',
      borderBottom:'2px solid #E8ECF0',
    }}>
      {label} {sortKey===k ? (sortDir==='desc'?'↓':'↑') : ''}
    </th>
  );

  return (
    <div style={{background:'#FFF',border:'1px solid #E8ECF0',borderRadius:14,overflow:'hidden'}}>
      <div style={{overflowX:'auto'}}>
        <table style={{width:'100%',borderCollapse:'collapse',fontSize:13}}>
          <thead>
            <tr>
              <th style={{padding:'10px 12px',fontSize:11,fontWeight:700,color:'#8896A8',textTransform:'uppercase',letterSpacing:'0.05em',background:'#F8FAFC',borderBottom:'2px solid #E8ECF0',textAlign:'left'}}>#</th>
              <Th k="ticker" label="Ticker" />
              <Th k="score" label="Score" right />
              <Th k="preco" label="Preço" right />
              <Th k="vd" label="Var. Dia" right />
              <Th k="dyM" label="DY Mensal" right />
              <Th k="dyA" label="DY Anual" right />
              <Th k="pvp" label="P/VP" right />
              <Th k="volume_diario" label="Volume" right />
              <Th k="patrimonio_liquido" label="Patrimônio" right />
            </tr>
          </thead>
          <tbody>
            {sorted.map((f, i) => {
              const isOdd = i % 2 === 0;
              const pvpColor = !f.pvp ? '#8896A8' : f.pvp < 0.95 ? '#15803D' : f.pvp < 1.05 ? '#1A1A2E' : '#DC2626';
              const vdColor  = f.vd == null ? '#8896A8' : f.vd >= 0 ? '#16A34A' : '#DC2626';
              return (
                <tr key={f.ticker} style={{background:isOdd?'#FFF':'#FAFBFC',borderBottom:'1px solid #F0F2F5',transition:'background 0.1s'}}
                  onMouseEnter={e=>e.currentTarget.style.background='#EFF6FF'}
                  onMouseLeave={e=>e.currentTarget.style.background=isOdd?'#FFF':'#FAFBFC'}>
                  <td style={{padding:'10px 12px',color:'#8896A8',fontWeight:600}}>{i+1}</td>
                  <td style={{padding:'10px 12px'}}>
                    <div style={{fontWeight:700,color:'#1A1A2E'}}>{f.ticker}</div>
                    {f.tipo_fundo && <div style={{fontSize:10,color:'#8896A8'}}>{f.tipo_fundo}</div>}
                  </td>
                  <td style={{padding:'10px 12px',textAlign:'right'}}>
                    <span style={{
                      display:'inline-block',padding:'2px 8px',borderRadius:20,fontSize:12,fontWeight:700,
                      background: f.score>=3?'#F0FDF4':f.score>=2?'#FFFBEB':'#FEF2F2',
                      color: f.score>=3?'#15803D':f.score>=2?'#92400E':'#991B1B',
                    }}>{f.score ?? 0}/4</span>
                  </td>
                  <td style={{padding:'10px 12px',textAlign:'right',fontWeight:600}}>{f.preco ? fmt.brl(f.preco) : '—'}</td>
                  <td style={{padding:'10px 12px',textAlign:'right',fontWeight:600,color:vdColor}}>
                    {f.vd != null ? `${f.vd >= 0 ? '+' : ''}${fmt.pct(f.vd)}` : '—'}
                    {cotacoes[f.ticker] && <span style={{fontSize:9,marginLeft:2,opacity:0.6}}>●</span>}
                  </td>
                  <td style={{padding:'10px 12px',textAlign:'right',color:f.dyM>=1?'#15803D':'#1A1A2E',fontWeight:f.dyM>=1?700:400}}>
                    {f.dyM != null ? `${fmt.pct(f.dyM)}` : '—'}
                  </td>
                  <td style={{padding:'10px 12px',textAlign:'right',color:f.dyA>=10?'#15803D':'#1A1A2E',fontWeight:f.dyA>=10?700:400}}>
                    {f.dyA != null ? `${fmt.pct(f.dyA)}` : '—'}
                  </td>
                  <td style={{padding:'10px 12px',textAlign:'right',color:pvpColor,fontWeight:600}}>
                    {f.pvp ? fmt.num(f.pvp) : '—'}
                  </td>
                  <td style={{padding:'10px 12px',textAlign:'right',color:'#4A5568'}}>
                    {f.volume_diario ? fmt.abrev(f.volume_diario) : '—'}
                  </td>
                  <td style={{padding:'10px 12px',textAlign:'right',color:'#4A5568'}}>
                    {f.patrimonio_liquido ? fmt.abrev(f.patrimonio_liquido) : '—'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div style={{padding:'10px 16px',fontSize:11,color:'#8896A8',borderTop:'1px solid #E8ECF0'}}>
        Clique nos cabeçalhos para ordenar. ● = cotação ao vivo.
      </div>
    </div>
  );
}

export default function FIIsPage() {
  const [fiis, setFiis]               = useState([]);
  const [loading, setLoading]         = useState(true);
  const [atualizando, setAtualizando] = useState(false);
  const [modalCompra, setModalCompra] = useState(null);
  const [modalDiv, setModalDiv]       = useState(false);
  const [modalB3, setModalB3]         = useState(false);
  const [busca, setBusca]             = useState('');

  const [activeTab, setActiveTab] = useState('carteira');
  const { anosDisponiveis, anoFiltro, setAnoFiltro, resumoAno, resumoGeral, carregarDados } = useDividendosFII(fiis);
  const cotacoes = useCotacoesLive(fiis);

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
    if (tipo === 'comprar') {
      await api.post('/fiis/comprar', { ticker, quantidade, preco });
    } else {
      await api.post('/fiis/vender', { ticker, quantidade });
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
            <button onClick={()=>setModalB3(true)}          style={{padding:'8px 14px',borderRadius:7,fontSize:12,fontWeight:600,border:'1px solid #90CDF4',background:'#EBF8FF',color:'#2B6CB0',cursor:'pointer'}}>⬆ Importar B3</button>
          </>}
        </div>
      </div>

      {/* Dashboard */}
      {fiis.length > 0 && <Dashboard fiis={fiis} anoFiltro={anoFiltro} setAnoFiltro={setAnoFiltro} anosDisponiveis={anosDisponiveis} resumoAno={resumoAno} resumoGeral={resumoGeral}/>}

      {/* Form adicionar */}
      <Suspense fallback={<div style={{background:'#FFF',border:'1px solid #E8ECF0',borderRadius:14,padding:20,marginBottom:24,height:90}}/>}>
        <FIIsForm onAdicionado={carregar}/>
      </Suspense>

      {/* Tabs: Carteira / Ranking */}
      {fiis.length > 0 && (
        <div style={{display:'flex',gap:4,marginBottom:20,borderBottom:'2px solid #E8ECF0',paddingBottom:0}}>
          {[{id:'carteira',label:'📋 Carteira'},{id:'ranking',label:'🏆 Ranking'}].map(tab=>(
            <button key={tab.id} onClick={()=>setActiveTab(tab.id)}
              style={{padding:'8px 18px',border:'none',borderBottom:`2px solid ${activeTab===tab.id?'#2563EB':'transparent'}`,
                background:'none',cursor:'pointer',fontSize:13,fontWeight:activeTab===tab.id?700:500,
                color:activeTab===tab.id?'#2563EB':'#8896A8',marginBottom:-2,transition:'all 0.15s'}}>
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {activeTab === 'carteira' && <>
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
                cotacaoLive={cotacoes[f.ticker]}
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
      </>}

      {activeTab === 'ranking' && fiis.length > 0 && (
        <TabRanking fiis={fiis} cotacoes={cotacoes} resumoGeral={resumoGeral} />
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
      {modalB3 && (
        <ModalImportarB3 fiis={fiis}
          onFechar={()=>setModalB3(false)} onSalvar={salvarDividendos}/>
      )}
    </div>
  );
}
