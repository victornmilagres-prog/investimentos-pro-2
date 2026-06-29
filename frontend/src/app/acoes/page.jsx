'use client';
import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { RefreshCw, TrendingUp, X } from 'lucide-react';
import api from '@/lib/api';
import { fmt, calcPerformance } from '@/lib/utils';

const TIPOS_PROVENTO = ['Dividendo', 'JCP', 'Rendimento', 'Outros'];

// ─── PARSE ARQUIVO B3 ─────────────────────────────────────────────────────
// Colunas B3: Produto | Pagamento | Tipo de Evento | Instituição | Quantidade | Preço unitário | Valor líquido
async function parsearArquivoB3(file) {
  const XLSX = await import('xlsx');
  const buffer = await file.arrayBuffer();
  const wb = XLSX.read(buffer, { type: 'array', cellDates: true });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });
  if (!rows.length) return [];

  // Normaliza nomes de colunas (lower, sem acentos) para busca flexível
  const norm = s => String(s).toLowerCase().replace(/[àáâãä]/g,'a').replace(/[èéêë]/g,'e').replace(/[ìíîï]/g,'i').replace(/[òóôõö]/g,'o').replace(/[ùúûü]/g,'u').replace(/[ç]/g,'c').trim();
  const colMap = {};
  Object.keys(rows[0]).forEach(k => { colMap[norm(k)] = k; });

  const col = (...nomes) => nomes.map(n => colMap[n]).find(Boolean);
  const colProduto  = col('produto','ativo','ticker');
  const colTipo     = col('tipo de evento','tipo evento','tipo');
  const colData     = col('pagamento','data pagamento','data de pagamento','data com','data');
  const colQtd      = col('quantidade','qtd');
  const colPreco    = col('preco unitario','preco','valor unitario','valor por cota');
  const colValorLiq = col('valor liquido','valor bruto','valor');
  if (!colProduto) return [];

  const maparTipo = (t = '') => {
    const v = t.toUpperCase();
    if (v.includes('JCP') || v.includes('JUROS')) return 'JCP';
    if (v.includes('REND')) return 'Rendimento';
    if (v.includes('DIV')) return 'Dividendo';
    return 'Outros';
  };

  const parseNum = s => {
    // xlsx já retorna números como JS number — retorna direto sem manipular string
    if (typeof s === 'number') return s;
    // strings no formato BR: "1.234,56" → remove ponto de milhar, troca vírgula por ponto
    const n = Number(String(s).replace('R$','').replace(/\./g,'').replace(',','.').trim());
    return isNaN(n) ? 0 : n;
  };

  const parsarData = val => {
    if (!val) return { mes: null, ano: null };
    if (val instanceof Date) return { mes: val.getMonth()+1, ano: val.getFullYear() };
    const m = String(val).match(/(\d{2})[\/\-](\d{2})[\/\-](\d{4})/);
    // formato DD/MM/YYYY
    if (m) return { mes: Number(m[2]), ano: Number(m[3]) };
    return { mes: null, ano: null };
  };

  const tickerRe = /^[A-Z][A-Z0-9]{2,5}\d{1,2}$/; // aceita B3SA3, PETR4, BBAS3 etc

  // Agrupa por ticker + tipo + mes + ano (mesmo ticker pode vir em várias corretoras)
  const mapa = new Map();
  for (const row of rows) {
    const produtoRaw = String(row[colProduto] || '').trim();
    const ticker = produtoRaw.split(/[\s\-–]/)[0].toUpperCase().replace(/[^A-Z0-9]/g,'');
    if (!tickerRe.test(ticker)) continue;

    const tipo           = maparTipo(String(row[colTipo] || ''));
    const { mes, ano }   = parsarData(row[colData]);
    const qtd            = colQtd ? parseNum(row[colQtd]) : 0;
    const precoUnit      = colPreco ? parseNum(row[colPreco]) : 0;
    const valorLiq       = colValorLiq ? parseNum(row[colValorLiq]) : 0;
    if (precoUnit <= 0 && valorLiq <= 0) continue;

    const chave = `${ticker}|${tipo}|${mes}|${ano}`;
    if (mapa.has(chave)) {
      const ex = mapa.get(chave);
      ex.quantidade    += qtd;
      ex.valor_liquido += valorLiq;
      // preço unitário é o mesmo para todas as corretoras — mantém o primeiro
    } else {
      mapa.set(chave, { ticker, tipo_provento: tipo, mes, ano, quantidade: qtd, preco_unitario: precoUnit, valor_liquido: valorLiq });
    }
  }

  // Usa Valor líquido como total (já desconta IR na fonte do JCP)
  // valor_por_acao = valor_liquido_total / quantidade_total
  return Array.from(mapa.values()).map(r => ({
    ticker:         r.ticker,
    tipo_provento:  r.tipo_provento,
    mes:            r.mes,
    ano:            r.ano,
    quantidade:     r.quantidade,
    valor_por_acao: r.quantidade > 0 ? r.valor_liquido / r.quantidade : 0,
    valor_total:    r.valor_liquido,
  }));
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

function grahamTag(s = '') {
  const v = (s || '').toUpperCase();
  if (v.includes('DESCONT')) return 'graham-descontado';
  if (v.includes('JUSTO'))   return 'graham-justo';
  return 'graham-caro';
}

const criteriosAcao = [
  { label: 'P/L',      key: 'pl',             ok: v => v > 0 && v < 15,  fmt: v => fmt.num(v) },
  { label: 'P/VP',     key: 'pvp',            ok: v => v > 0 && v < 1.5, fmt: v => fmt.num(v) },
  { label: 'DY %',     key: 'dy',             ok: v => v >= 6,            fmt: v => fmt.pct(v) },
  { label: 'Margem',   key: 'margem_liquida', ok: v => v > 10,            fmt: v => fmt.pct(v) },
  { label: 'ROE',      key: 'roe',            ok: v => v > 10,            fmt: v => fmt.pct(v) },
  { label: 'Dív/EBIT', key: 'divida_ebit',   ok: v => v > 0 && v < 2,   fmt: v => fmt.num(v) },
];

// ─── MODAL COMPRAR / VENDER ───────────────────────────────────────────────
function ModalCompraVenda({ acoes, tipo, onFechar, onSalvar }) {
  const [ticker, setTicker] = useState(acoes[0]?.ticker || '');
  const [qtd, setQtd]       = useState('');
  const [preco, setPreco]   = useState('');
  const [data, setData]     = useState(new Date().toISOString().split('T')[0]);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro]     = useState('');

  const acao     = acoes.find(a => a.ticker === ticker);
  const qtdAtual = acao?.quantidade || 0;
  const pmAtual  = acao?.preco_compra || 0;
  const novoQtd  = tipo === 'comprar' ? qtdAtual + Number(qtd||0) : Math.max(0, qtdAtual - Number(qtd||0));
  const novoPM   = tipo === 'comprar' && qtdAtual > 0 && Number(qtd) > 0 && Number(preco) > 0
    ? ((qtdAtual*pmAtual)+(Number(qtd)*Number(preco)))/novoQtd
    : tipo === 'comprar' && Number(qtd) > 0 ? Number(preco) : pmAtual;

  const confirmar = async () => {
    if (!qtd || !preco) return setErro('Preencha quantidade e preço.');
    setSalvando(true); setErro('');
    try { await onSalvar({ ticker, tipo, quantidade: Number(qtd), preco: Number(preco), data }); onFechar(); }
    catch (e) { setErro(e.response?.data?.error || 'Erro ao salvar.'); }
    finally { setSalvando(false); }
  };

  const st = {
    overlay: { position:'fixed',inset:0,background:'rgba(0,0,0,0.45)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:200 },
    modal:   { background:'#fff',borderRadius:14,padding:28,width:460,boxShadow:'0 20px 60px rgba(0,0,0,0.2)',maxHeight:'90vh',overflowY:'auto' },
    lbl:     { fontSize:12,color:'#8896A8',fontWeight:500,display:'block',marginBottom:5 },
    inp:     { width:'100%',padding:'9px 12px',border:'1px solid #E8ECF0',borderRadius:7,fontSize:13,outline:'none',color:'#1A1A2E' },
    footer:  { display:'flex',gap:10,justifyContent:'flex-end' },
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
          <label style={st.lbl}>Ativo</label>
          <select style={st.inp} value={ticker} onChange={e=>setTicker(e.target.value)}>
            {acoes.map(a=><option key={a.ticker} value={a.ticker}>{a.ticker}</option>)}
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
        <div style={st.footer}>
          <button onClick={onFechar} style={{padding:'9px 20px',borderRadius:7,fontSize:13,fontWeight:600,border:'none',cursor:'pointer',background:'#EDF2F7',color:'#8896A8'}}>Cancelar</button>
          <button onClick={confirmar} disabled={salvando} style={{padding:'9px 20px',borderRadius:7,fontSize:13,fontWeight:600,border:'none',cursor:'pointer',background:tipo==='comprar'?'#16A34A':'#DC2626',color:'#fff'}}>
            {salvando?'Salvando...':tipo==='comprar'?'Confirmar compra':'Confirmar venda'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── MODAL PROVENTOS ──────────────────────────────────────────────────────
function ModalProventos({ acoes, onFechar, onSalvar }) {
  const meses = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
  const hoje  = new Date();
  const [mesFiltro, setMesFiltro] = useState(hoje.getMonth());
  const [anoFiltro, setAnoFiltro] = useState(hoje.getFullYear());

  // Array de linhas: [{ id, ticker, tipo, valor, mes, ano, selecionado }]
  // Cada linha é independente — o mesmo ticker pode ter várias linhas (JCP + Rendimento, etc.)
  const [linhas, setLinhas]           = useState(() =>
    acoes.map((a, i) => ({ id: i, ticker: a.ticker, tipo: 'Dividendo', valor: '', mes: hoje.getMonth()+1, ano: hoje.getFullYear(), selecionado: false }))
  );
  const [salvando, setSalvando]       = useState(false);
  const [arquivo, setArquivo]         = useState(null);
  const [parsendo, setParsendo]       = useState(false);
  const [avisoFora, setAvisoFora]     = useState([]);
  const [feedbackImport, setFeedback] = useState('');
  const [existentes, setExistentes]   = useState([]);
  const [modoImport, setModoImport]   = useState(false); // true = veio do arquivo

  // Carrega lançamentos existentes ao mudar filtro mês/ano
  useEffect(() => {
    const carregar = async () => {
      try {
        const r = await api.get(`/acoes/proventos?mes=${mesFiltro+1}&ano=${anoFiltro}`);
        setExistentes(r.data);
      } catch { setExistentes([]); }
    };
    carregar();
  }, [mesFiltro, anoFiltro]);

  const setLinha = (id, campo, valor) =>
    setLinhas(ls => ls.map(l => l.id === id ? { ...l, [campo]: valor } : l));

  const removerLinha = (id) => setLinhas(ls => ls.filter(l => l.id !== id));

  const adicionarLinha = (ticker) => {
    const qtdExistente = linhas.filter(l => l.ticker === ticker).length;
    setLinhas(ls => [...ls, {
      id: Date.now() + qtdExistente,
      ticker, tipo: 'Dividendo', valor: '',
      mes: mesFiltro+1, ano: anoFiltro, selecionado: false,
    }]);
  };

  const linhasSelecionadas = linhas.filter(l => l.selecionado && l.valor);
  const resolverQtd = (l) => l.quantidade != null ? l.quantidade : (acoes.find(a => a.ticker === l.ticker)?.quantidade || 0);
  const resolverTotal = (l) => l.valor_total != null ? l.valor_total : (Number(l.valor) * resolverQtd(l));
  const total = linhasSelecionadas.reduce((acc, l) => acc + resolverTotal(l), 0);

  const confirmar = async () => {
    const lancamentos = linhasSelecionadas.map(l => ({
      ticker: l.ticker,
      tipo_provento: l.tipo,
      valor_por_acao: Number(l.valor),
      quantidade: resolverQtd(l),
      valor_total_override: l.valor_total ?? null,  // total exato do arquivo, sem recomputing
      mes: l.mes, ano: l.ano,
    }));
    if (!lancamentos.length) return;
    setSalvando(true);
    try { await onSalvar(lancamentos); onFechar(); }
    finally { setSalvando(false); }
  };

  const excluirExistente = async (item) => {
    try {
      await api.delete(`/acoes/proventos/${item.ticker}/${item.tipo_provento}/${item.mes}/${item.ano}`);
      setExistentes(e => e.filter(x => !(x.ticker===item.ticker && x.tipo_provento===item.tipo_provento && x.mes===item.mes && x.ano===item.ano)));
    } catch {}
  };

  const st = {
    overlay: { position:'fixed',inset:0,background:'rgba(0,0,0,0.45)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:200 },
    modal:   { background:'#fff',borderRadius:14,padding:28,width:540,boxShadow:'0 20px 60px rgba(0,0,0,0.2)',maxHeight:'92vh',overflowY:'auto' },
    lbl:     { fontSize:12,color:'#8896A8',fontWeight:500,display:'block',marginBottom:5 },
    inp:     { width:'100%',padding:'9px 12px',border:'1px solid #E8ECF0',borderRadius:7,fontSize:13,outline:'none',color:'#1A1A2E' },
  };

  // Agrupa linhas por ticker para exibição
  const tickersUnicos = [...new Set(acoes.map(a => a.ticker))];

  return (
    <div style={st.overlay} onClick={e=>e.target===e.currentTarget&&onFechar()}>
      <div style={st.modal}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:4}}>
          <h3 style={{fontSize:17,fontWeight:700}}>Lançar proventos</h3>
          <button onClick={onFechar} style={{background:'none',border:'none',cursor:'pointer',color:'#8896A8'}}><X size={18}/></button>
        </div>
        <p style={{fontSize:13,color:'#8896A8',marginBottom:20}}>Registre os proventos recebidos por ativo. Importe da B3 ou lance manualmente.</p>

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
                const resultado = await parsearArquivoB3(f);
                const tickersCarteira = new Set(acoes.map(a => a.ticker));
                const fora = [];
                // Constrói novas linhas a partir do arquivo (substituindo as manuais)
                const novasLinhas = [];
                let idSeq = Date.now();
                for (const linha of resultado) {
                  const { ticker, tipo_provento, valor_por_acao, quantidade: qtdArq, mes: mesArq, ano: anoArq } = linha;
                  if (!tickersCarteira.has(ticker)) { fora.push(ticker); continue; }
                  novasLinhas.push({
                    id: idSeq++,
                    ticker, tipo: tipo_provento,
                    valor: String(valor_por_acao.toFixed(6)),
                    valor_total: linha.valor_total,   // total exato da planilha (sem recomputing)
                    quantidade: qtdArq || null,
                    mes: mesArq || mesFiltro+1,
                    ano: anoArq || anoFiltro,
                    selecionado: true,
                  });
                }
                // Mantém linhas manuais dos tickers que não vieram no arquivo
                const tickersNoArquivo = new Set(novasLinhas.map(l => l.ticker));
                const linhasManuais = acoes
                  .filter(a => !tickersNoArquivo.has(a.ticker))
                  .map((a, i) => ({ id: idSeq + i, ticker: a.ticker, tipo: 'Dividendo', valor: '', mes: mesFiltro+1, ano: anoFiltro, selecionado: false }));
                setLinhas([...novasLinhas, ...linhasManuais]);
                setAvisoFora([...new Set(fora)]);
                setModoImport(true);
                const mesesUnicos = [...new Set(novasLinhas.map(l => `${l.mes}/${l.ano}`))];
                setFeedback(`✓ ${novasLinhas.length} lançamento(s) em ${mesesUnicos.length} mês(es) importado(s)`);
              } catch (err) {
                console.error(err);
                setFeedback('⚠ Erro ao ler o arquivo. Verifique o formato.');
              } finally {
                setParsendo(false);
              }
            }}/>
          </label>
        </div>

        {feedbackImport && (
          <p style={{fontSize:12,color:feedbackImport.startsWith('✓')?'#16A34A':'#D97706',marginBottom:8}}>{feedbackImport}{arquivo ? ` — ${arquivo.name}` : ''}</p>
        )}
        {avisoFora.length > 0 && (
          <div style={{background:'#FFFBEB',border:'1px solid #F6D860',borderRadius:8,padding:'10px 14px',marginBottom:10}}>
            <p style={{fontSize:12,fontWeight:600,color:'#92400E',marginBottom:3}}>⚠ Ativos ignorados (não estão na sua carteira):</p>
            <p style={{fontSize:12,color:'#92400E'}}>{avisoFora.join(', ')}</p>
          </div>
        )}

        {/* Filtro mês/ano para ver lançamentos existentes */}
        <div style={{display:'flex',gap:12,marginBottom:10,marginTop:6}}>
          <div style={{flex:2}}><label style={st.lbl}>Ver lançamentos do mês</label>
            <select style={st.inp} value={mesFiltro} onChange={e=>setMesFiltro(Number(e.target.value))}>
              {meses.map((m,i)=><option key={i} value={i}>{m}</option>)}
            </select>
          </div>
          <div style={{flex:1}}><label style={st.lbl}>Ano</label>
            <select style={st.inp} value={anoFiltro} onChange={e=>setAnoFiltro(Number(e.target.value))}>
              {[2024,2025,2026].map(y=><option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        </div>

        {/* Lançamentos existentes no mês selecionado */}
        {existentes.length > 0 && (
          <div style={{marginBottom:14}}>
            <p style={{fontSize:11,fontWeight:700,color:'#8896A8',textTransform:'uppercase',letterSpacing:'0.05em',marginBottom:8}}>
              Já lançados em {meses[mesFiltro]}/{anoFiltro}
            </p>
            <div style={{display:'flex',flexDirection:'column',gap:6}}>
              {existentes.map((item,i)=>(
                <div key={i} style={{display:'flex',alignItems:'center',justifyContent:'space-between',background:'#F8F9FA',border:'1px solid #E8ECF0',borderRadius:8,padding:'8px 12px'}}>
                  <div style={{display:'flex',gap:10,alignItems:'center'}}>
                    <span style={{fontWeight:700,fontSize:13}}>{item.ticker}</span>
                    <span style={{fontSize:11,background:'#FEF3C7',color:'#92400E',padding:'2px 8px',borderRadius:20}}>{item.tipo_provento}</span>
                    <span style={{fontSize:13,color:'#1A1A2E'}}>{fmt.brl(Number(item.valor_total))}</span>
                    <span style={{fontSize:11,color:'#8896A8'}}>R$ {Number(item.valor_por_acao).toFixed(4)}/ação</span>
                  </div>
                  <button onClick={()=>excluirExistente(item)} style={{background:'#fff5f5',color:'#fc8181',border:'1px solid #fed7d7',borderRadius:5,padding:'3px 8px',fontSize:11,cursor:'pointer'}}>🗑</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Separador */}
        <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:12}}>
          <div style={{flex:1,height:1,background:'#E8ECF0'}}/>
          <span style={{fontSize:11,fontWeight:700,color:'#8896A8',textTransform:'uppercase',letterSpacing:'0.05em'}}>
            {modoImport ? 'lançamentos importados — edite antes de confirmar' : 'lançar manualmente'}
          </span>
          <div style={{flex:1,height:1,background:'#E8ECF0'}}/>
        </div>

        {/* Lista de linhas agrupadas por ticker */}
        <div style={{display:'flex',flexDirection:'column',gap:8,marginBottom:16}}>
          {tickersUnicos.map(ticker => {
            const acao = acoes.find(a => a.ticker === ticker);
            const linhasTicker = linhas.filter(l => l.ticker === ticker);
            return (
              <div key={ticker} style={{background:'#FFFDF0',border:'1px solid #F6E05E',borderRadius:8,padding:'10px 12px'}}>
                {/* Cabeçalho do ativo */}
                <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:8}}>
                  <div>
                    <span style={{fontWeight:700,fontSize:13}}>{ticker}</span>
                    <span style={{fontSize:11,color:'#8896A8',marginLeft:8}}>
                      {linhasTicker.some(l=>l.quantidade!=null)
                        ? `${linhasTicker.reduce((s,l)=>s+(l.quantidade||0),0)} ações (planilha)`
                        : `${acao?.quantidade||0} ações`}
                    </span>
                  </div>
                  <button onClick={()=>adicionarLinha(ticker)}
                    style={{fontSize:11,color:'#B7791F',background:'#FEF3C7',border:'1px solid #F6E05E',borderRadius:5,padding:'2px 8px',cursor:'pointer'}}>
                    + tipo
                  </button>
                </div>
                {/* Linhas do ticker */}
                <div style={{display:'flex',flexDirection:'column',gap:6}}>
                  {linhasTicker.map(l => (
                    <div key={l.id} style={{display:'grid',gridTemplateColumns:'18px 1fr 80px 80px 70px auto',gap:6,alignItems:'center'}}>
                      <input type="checkbox" checked={l.selecionado} onChange={()=>setLinha(l.id,'selecionado',!l.selecionado)}
                        style={{accentColor:'#D4A017',width:15,height:15}}/>
                      <select value={l.tipo} onChange={e=>setLinha(l.id,'tipo',e.target.value)}
                        style={{padding:'5px 6px',border:'1px solid #F6E05E',borderRadius:6,fontSize:12,background:'#fff',outline:'none'}}>
                        {TIPOS_PROVENTO.map(t=><option key={t} value={t}>{t}</option>)}
                      </select>
                      {/* Quantidade da linha (editável) */}
                      <input type="number" min="0" step="1" placeholder="Qtd"
                        value={l.quantidade ?? ''} onChange={e=>setLinha(l.id,'quantidade', e.target.value === '' ? null : Number(e.target.value))}
                        style={{padding:'5px 6px',border:'1px solid #F6E05E',borderRadius:6,background:'#fff',fontSize:12,textAlign:'right',outline:'none'}}/>
                      <input type="number" min="0" step="0.0001" placeholder="R$/ação"
                        value={l.valor} onChange={e=>setLinha(l.id,'valor',e.target.value)}
                        style={{padding:'5px 6px',border:'1px solid #F6E05E',borderRadius:6,background:'#fff',fontSize:12,textAlign:'right',outline:'none'}}/>
                      <span style={{fontSize:11,color:'#B7791F',textAlign:'center'}}>
                        {meses[l.mes-1]?.slice(0,3)}/{l.ano}
                      </span>
                      {linhasTicker.length > 1 && (
                        <button onClick={()=>removerLinha(l.id)}
                          style={{background:'none',border:'none',cursor:'pointer',color:'#FC8181',fontSize:14,padding:0}}>✕</button>
                      )}
                      {linhasTicker.length === 1 && <span/>}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Totalizador */}
        <div style={{background:'#FFFDF0',border:'1px solid #F6E05E',borderRadius:8,padding:'12px 16px',display:'flex',gap:24,marginBottom:18}}>
          <div><p style={{fontSize:11,color:'#8896A8',marginBottom:3}}>Total a lançar</p><p style={{fontSize:15,fontWeight:700,color:'#744210'}}>{fmt.brl(total)}</p></div>
          <div><p style={{fontSize:11,color:'#8896A8',marginBottom:3}}>Lançamentos selecionados</p><p style={{fontSize:15,fontWeight:700}}>{linhasSelecionadas.length}</p></div>
        </div>

        <div style={{display:'flex',gap:10,justifyContent:'flex-end'}}>
          <button onClick={onFechar} style={{padding:'9px 20px',borderRadius:7,fontSize:13,fontWeight:600,border:'none',cursor:'pointer',background:'#EDF2F7',color:'#8896A8'}}>Cancelar</button>
          <button onClick={confirmar} disabled={salvando||linhasSelecionadas.length===0}
            style={{padding:'9px 20px',borderRadius:7,fontSize:13,fontWeight:600,border:'none',cursor:'pointer',background:'#D4A017',color:'#fff',opacity:linhasSelecionadas.length===0?0.5:1}}>
            {salvando?'Salvando...':'Lançar proventos'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── CARD ─────────────────────────────────────────────────────────────────
function AcaoCard({ a, onRemover, onSalvar, onAbrirProvento }) {
  const [editando, setEditando] = useState(false);
  const [qtd, setQtd]     = useState(String(a.quantidade ?? ''));
  const [preco, setPreco] = useState(String(a.preco_compra ?? ''));

  const perf     = calcPerformance(a.preco_atual, a.preco_compra, a.quantidade);
  const maxScore = a.max_score || 6;
  const scoreNum = typeof a.score === 'string' ? parseInt(a.score) : (a.score ?? 0);
  const fillPct  = (scoreNum / maxScore) * 100;

  const totalProv  = Number(a.dividendos_ano) || 0;
  const numLanc    = Number(a.dividendos_lancamentos) || 0;
  const breakdown  = a.proventos_breakdown || {};
  const yieldPM    = (perf.custo > 0 && totalProv > 0) ? (totalProv / perf.custo) * 100 : 0;
  const ganhoTotal = perf.custo > 0 ? perf.ganho + totalProv : 0;
  const pctAposP   = perf.custo > 0 ? (ganhoTotal / perf.custo) * 100 : 0;
  const temRetorno = perf.custo > 0 && totalProv > 0;

  const salvar = async () => { await onSalvar(a.ticker, qtd, preco); setEditando(false); };

  const C = {
    card:   { background:'#FFFFFF',border:'1px solid #E8ECF0',borderRadius:14,padding:'18px 20px',display:'flex',flexDirection:'column',gap:12 },
    lbl:    { fontSize:11,color:'#8896A8',marginBottom:2 },
    val:    { fontSize:13,fontWeight:600,color:'#1A1A2E' },
    grpLbl: { fontSize:11,color:'#8896A8',fontWeight:600,textTransform:'uppercase',letterSpacing:'0.05em',marginBottom:8 },
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
            const semDadoDivida = isDivida && (v == null || Number(v) === 0);
            const semDadoOutro  = !isDivida && (v == null || Number(v) === 0);
            const dotColor = semDadoDivida ? '#D97706' : semDadoOutro ? '#D0D8E0' : ok(v) ? '#16A34A' : '#DC2626';
            const texto    = semDadoDivida ? 'S/D' : (v != null && Number(v) !== 0 ? fmtFn(v) : '-');
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
              <div><label style={{...C.lbl,display:'block',marginBottom:4}}>Quantidade</label><input className="input" type="number" min="0" step="0.000001" value={qtd} onChange={e=>setQtd(e.target.value)}/></div>
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
              <div><p style={C.lbl}>Qtd. ações</p><p style={C.val}>{a.quantidade?fmt.num(a.quantidade,0):'-'}</p></div>
              <div style={{textAlign:'center'}}><p style={C.lbl}>Seu preço médio</p><p style={C.val}>{a.preco_compra?fmt.brl(a.preco_compra):'-'}</p></div>
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

      {/* ── Proventos recebidos no ano ── */}
      <div style={{background:'#FFFDF0',border:'1px solid #F6E05E',borderRadius:10,padding:'10px 14px'}}>
        <p style={{fontSize:11,fontWeight:700,color:'#B7791F',textTransform:'uppercase',letterSpacing:'0.05em',marginBottom:8}}>
          Proventos recebidos no ano
        </p>
        <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8,marginBottom: Object.keys(breakdown).length > 0 ? 8 : 0}}>
          <div><p style={{fontSize:10,color:'#B7791F',marginBottom:2}}>Total recebido</p><p style={{fontSize:13,fontWeight:700,color:'#744210'}}>{fmt.brl(totalProv)}</p></div>
          <div><p style={{fontSize:10,color:'#B7791F',marginBottom:2}}>Yield s/ PM</p><p style={{fontSize:13,fontWeight:700,color:'#744210'}}>{yieldPM>0?fmt.pct(yieldPM):'—'}</p></div>
          <div><p style={{fontSize:10,color:'#B7791F',marginBottom:2}}>Lançamentos</p><p style={{fontSize:13,fontWeight:700,color:'#744210'}}>{numLanc}</p></div>
        </div>
        {/* Breakdown por tipo */}
        {Object.keys(breakdown).length > 0 && (
          <div style={{borderTop:'1px solid #F6E05E',paddingTop:8,display:'flex',gap:6,flexWrap:'wrap'}}>
            {Object.entries(breakdown).map(([tipo,valor])=>(
              <span key={tipo} style={{fontSize:11,background:'#FEF3C7',color:'#92400E',padding:'2px 8px',borderRadius:20}}>
                {tipo} {fmt.brl(Number(valor))}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* ── Retorno após proventos ── */}
      {temRetorno && (
        <div style={{background:'#EFF6FF',border:'1px solid #BFDBFE',borderRadius:10,padding:'10px 14px'}}>
          <p style={{fontSize:11,fontWeight:600,color:'#3B82F6',marginBottom:6}}>Retorno após proventos</p>
          <div style={{display:'flex',alignItems:'baseline',gap:8}}>
            <span style={{fontSize:15,fontWeight:700,color:ganhoTotal>=0?'#16A34A':'#DC2626'}}>
              {ganhoTotal>=0?'+':''}{fmt.brl(ganhoTotal)}
            </span>
            <span style={{fontSize:12,fontWeight:600,color:pctAposP>=0?'#16A34A':'#DC2626'}}>
              ({pctAposP>=0?'+':''}{fmt.pct(pctAposP)})
            </span>
          </div>
          <p style={{fontSize:11,color:'#93C5FD',marginTop:3}}>
            compra {perf.ganho>=0?'+':''}{fmt.brl(perf.ganho)} + proventos {fmt.brl(totalProv)}
          </p>
        </div>
      )}

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
          <button onClick={onAbrirProvento}
            style={{padding:'4px 10px',borderRadius:5,fontSize:11,fontWeight:600,border:'none',cursor:'pointer',background:'#FEFCBF',color:'#7B6213'}}>
            Provento
          </button>
          {!editando&&<button className="btn-icon" onClick={()=>setEditando(true)}>✏️</button>}
          <button className="btn-icon" onClick={()=>onRemover(a.ticker)}>🗑️</button>
        </div>
      </div>
    </div>
  );
}

// ─── FORM ADICIONAR ───────────────────────────────────────────────────────
function AcoesForm({ onAdicionado }) {
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
      await api.post('/acoes', { ticker: ticker.trim().toUpperCase(), quantidade: Number(quantidade)||0, preco_compra: Number(precoCompra)||0 });
      setTicker(''); setQuantidade(''); setPrecoCompra('');
      onAdicionado();
    } catch (err) { setErro(err.response?.data?.error||'Erro ao adicionar ação.'); }
    finally { setBuscando(false); }
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
  const patrimonio    = acoes.reduce((s,a)=>s+(a.preco_atual*(a.quantidade||0)),0);
  const custo         = acoes.reduce((s,a)=>{ const p=calcPerformance(a.preco_atual,a.preco_compra,a.quantidade); return s+p.custo; },0);
  const resultado     = patrimonio - custo;
  const pctTotal      = custo > 0 ? (resultado/custo)*100 : 0;
  const proventosAno  = acoes.reduce((s,a)=>s+Number(a.dividendos_ano||0),0);
  const scores        = acoes.map(a=>typeof a.score==='string'?parseInt(a.score):(a.score||0));
  const scoreMedio    = scores.length?(scores.reduce((s,v)=>s+v,0)/scores.length).toFixed(1):0;
  const sorted        = [...acoes].map(a=>({ ...a, pct: calcPerformance(a.preco_atual,a.preco_compra,a.quantidade).pct }));
  const melhor        = [...sorted].sort((a,b)=>b.pct-a.pct)[0];
  const pior          = [...sorted].sort((a,b)=>a.pct-b.pct)[0];
  const CORES = ['#2563EB','#16A34A','#D4A017','#7C3AED','#D97706','#DC2626','#718096','#0891B2','#BE185D'];

  return (
    <div style={{marginBottom:20}}>
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:14,marginBottom:14}}>
        {[
          { label:'Patrimônio Total',    val:fmt.brl(patrimonio),  sub:`${acoes.length} ativos`, cor:'#2563EB' },
          { label:'Resultado Total',     val:`${resultado>=0?'+':''}${fmt.brl(resultado)}`, sub:`${resultado>=0?'+':''}${fmt.pct(pctTotal)} desde aporte`, cor:resultado>=0?'#16A34A':'#DC2626' },
          { label:'Melhor / Pior ativo', val:melhor?`${melhor.ticker} ${melhor.pct>=0?'+':''}${fmt.pct(melhor.pct)}`:'—', sub:pior&&pior.ticker!==melhor?.ticker?`Pior: ${pior.ticker} ${fmt.pct(pior.pct)}`:'', cor:'#1A1A2E' },
          { label:'Score médio',         val:`${scoreMedio} / ${acoes[0]?.max_score||6}`, sub:`${acoes.filter(a=>(typeof a.score==='string'?parseInt(a.score):a.score)>=4).length} MANTER · ${acoes.filter(a=>(typeof a.score==='string'?parseInt(a.score):a.score)===3).length} ATENÇÃO`, cor:'#2563EB' },
        ].map((c,i)=>(
          <div key={i} style={{background:'#FFFFFF',border:'1px solid #E8ECF0',borderRadius:10,padding:16}}>
            <p style={{fontSize:11,color:'#8896A8',textTransform:'uppercase',letterSpacing:'0.05em',marginBottom:6}}>{c.label}</p>
            <p style={{fontSize:19,fontWeight:800,color:c.cor}}>{c.val}</p>
            {c.sub&&<p style={{fontSize:11,color:'#8896A8',marginTop:3}}>{c.sub}</p>}
          </div>
        ))}
      </div>
      <div style={{background:'#FFFFFF',border:'1px solid #E8ECF0',borderRadius:10,padding:16,marginBottom:14}}>
        <p style={{fontSize:11,fontWeight:700,color:'#8896A8',textTransform:'uppercase',letterSpacing:'0.05em',marginBottom:12}}>Distribuição da carteira</p>
        <div style={{display:'flex',height:26,borderRadius:6,overflow:'hidden',marginBottom:10}}>
          {acoes.map((a,i)=>{ const val=a.preco_atual*(a.quantidade||0); const pct=patrimonio>0?(val/patrimonio)*100:0; return <div key={a.ticker} style={{flex:pct,background:CORES[i%CORES.length],display:'flex',alignItems:'center',justifyContent:'center',fontSize:10,fontWeight:700,color:'#fff',overflow:'hidden'}}>{pct>7?a.ticker:''}</div>; })}
        </div>
        <div style={{display:'flex',gap:14,flexWrap:'wrap'}}>
          {acoes.map((a,i)=>{ const val=a.preco_atual*(a.quantidade||0); const pct=patrimonio>0?(val/patrimonio)*100:0; return <div key={a.ticker} style={{display:'flex',alignItems:'center',gap:5,fontSize:11,color:'#8896A8'}}><div style={{width:8,height:8,borderRadius:'50%',background:CORES[i%CORES.length]}}/>{a.ticker} {fmt.pct(pct)}</div>; })}
        </div>
      </div>
      {/* Faixa proventos */}
      <div style={{background:'linear-gradient(135deg,#FFFDF0,#FEFCE8)',border:'1px solid #F6E05E',borderRadius:10,padding:16,display:'flex',marginBottom:4}}>
        {[
          { label:'Proventos no Ano', val:fmt.brl(proventosAno), sub:'Todos os ativos' },
          { label:'Yield médio s/ PM', val:()=>{ const c=acoes.reduce((s,a)=>s+((a.preco_compra||0)*(a.quantidade||0)),0); return c>0?fmt.pct((proventosAno/c)*100):'—'; }, sub:'Sobre preço médio pago' },
          { label:'Maior pagador', val:()=>{ const m=[...acoes].sort((a,b)=>Number(b.dividendos_ano||0)-Number(a.dividendos_ano||0))[0]; return m&&Number(m.dividendos_ano)>0?m.ticker:'—'; }, sub:()=>{ const m=[...acoes].sort((a,b)=>Number(b.dividendos_ano||0)-Number(a.dividendos_ano||0))[0]; return m&&Number(m.dividendos_ano)>0?`${fmt.brl(Number(m.dividendos_ano))} no ano`:''; } },
          { label:'Lançamentos totais', val:acoes.reduce((s,a)=>s+Number(a.dividendos_lancamentos||0),0), sub:'Todos os ativos no ano' },
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

// ─── PÁGINA ───────────────────────────────────────────────────────────────
export default function AcoesPage() {
  const [acoes, setAcoes]             = useState([]);
  const [loading, setLoading]         = useState(true);
  const [atualizando, setAtualizando] = useState(false);
  const [modalCompra, setModalCompra] = useState(null);
  const [modalProv, setModalProv]     = useState(false);

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

  const salvarProventos = async (lancamentos) => {
    await api.post('/acoes/proventos', { lancamentos });
    await carregar();
  };

  if (loading) return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:256}}>
      <div style={{width:32,height:32,border:'2px solid #C9A84C',borderTopColor:'transparent',borderRadius:'50%',animation:'spin 0.7s linear infinite'}}/>
    </div>
  );

  return (
    <div>
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
            <button onClick={()=>setModalCompra('comprar')} style={{padding:'8px 14px',borderRadius:7,fontSize:12,fontWeight:600,border:'1px solid #9AE6B4',background:'#C6F6D5',color:'#276749',cursor:'pointer'}}>▲ Comprar ação</button>
            <button onClick={()=>setModalCompra('vender')}  style={{padding:'8px 14px',borderRadius:7,fontSize:12,fontWeight:600,border:'1px solid #FC8181',background:'#FED7D7',color:'#9B2C2C',cursor:'pointer'}}>▼ Vender ação</button>
            <button onClick={()=>setModalProv(true)}        style={{padding:'8px 14px',borderRadius:7,fontSize:12,fontWeight:600,border:'1px solid #F6E05E',background:'#FEFCBF',color:'#7B6213',cursor:'pointer'}}>💰 Lançar proventos</button>
            <button onClick={()=>setModalProv(true)}        style={{padding:'8px 14px',borderRadius:7,fontSize:12,fontWeight:600,border:'1px solid #90CDF4',background:'#EBF8FF',color:'#2B6CB0',cursor:'pointer'}}>⬆ Importar B3</button>
          </>}
        </div>
      </div>

      {acoes.length > 0 && <Dashboard acoes={acoes}/>}

      <Suspense fallback={<div style={{background:'#FFF',border:'1px solid #E8ECF0',borderRadius:14,padding:20,marginBottom:24,height:90}}/>}>
        <AcoesForm onAdicionado={carregar}/>
      </Suspense>

      <div style={{background:'#FFFFFF',border:'1px solid #E8ECF0',borderRadius:12,padding:'12px 20px',marginBottom:8,display:'flex',alignItems:'center',gap:8,flexWrap:'wrap'}}>
        <span style={{fontSize:11,fontWeight:700,color:'#8896A8',textTransform:'uppercase',letterSpacing:'0.05em',marginRight:4}}>Critérios de avaliação (Score /6)</span>
        {['P/L < 15','P/VP < 1,5','Margem Liq. > 10%','ROE > 10%','Dívida/EBIT < 2x','DY ≥ 6%'].map(c=>(
          <span key={c} style={{fontSize:12,fontWeight:500,padding:'3px 10px',borderRadius:20,background:'#F0F2F5',color:'#4A5568',border:'1px solid #E8ECF0'}}>{c}</span>
        ))}
      </div>

      <div style={{display:'flex',alignItems:'center',gap:16,fontSize:11,color:'#8896A8',marginBottom:16}}>
        {[{c:'#16A34A',l:'Aprovado'},{c:'#DC2626',l:'Reprovado'},{c:'#D97706',l:'Sem dado'}].map(({c,l})=>(
          <span key={l}><span style={{display:'inline-block',width:7,height:7,borderRadius:'50%',background:c,marginRight:4}}/>{l}</span>
        ))}
      </div>

      {acoes.length > 0 ? (
        <div className="grid-cards">
          {acoes.map(a=>(
            <AcaoCard key={a.ticker} a={a}
              onRemover={remover}
              onSalvar={salvarEdicao}
              onAbrirProvento={()=>setModalProv(true)}
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

      {modalCompra && (
        <ModalCompraVenda acoes={acoes} tipo={modalCompra}
          onFechar={()=>setModalCompra(null)} onSalvar={salvarOperacao}/>
      )}
      {modalProv && (
        <ModalProventos acoes={acoes}
          onFechar={()=>setModalProv(false)} onSalvar={salvarProventos}/>
      )}
    </div>
  );
}
