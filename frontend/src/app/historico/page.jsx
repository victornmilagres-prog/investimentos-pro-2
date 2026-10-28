'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { History, TrendingUp, TrendingDown, DollarSign, RefreshCw, Search, Database, Upload, FileSpreadsheet, X, CheckCircle } from 'lucide-react';
import api from '@/lib/api';

const CATEGORIAS = [
  { value: 'todos', label: 'Todas' },
  { value: 'acao',  label: 'Ações' },
  { value: 'fii',   label: 'FIIs' },
  { value: 'renda_fixa', label: 'Renda Fixa' },
  { value: 'outros', label: 'Outros' },
];

const TIPOS = [
  { value: 'todos',    label: 'Todos' },
  { value: 'compra',   label: 'Compra' },
  { value: 'venda',    label: 'Venda' },
  { value: 'dividendo', label: 'Dividendo' },
  { value: 'aplicacao', label: 'Aplicação' },
  { value: 'resgate',  label: 'Resgate' },
];

const PERIODOS = [
  { value: 'tudo', label: 'Todo período' },
  { value: '7d',   label: 'Últimos 7 dias' },
  { value: '30d',  label: 'Últimos 30 dias' },
  { value: '90d',  label: 'Últimos 90 dias' },
  { value: '1a',   label: 'Último ano' },
];

const TIPO_CONFIG = {
  compra:   { cor: '#2563EB', bg: '#EFF6FF', label: 'Compra' },
  venda:    { cor: '#DC2626', bg: '#FEF2F2', label: 'Venda' },
  dividendo:{ cor: '#16A34A', bg: '#F0FDF4', label: 'Dividendo' },
  aplicacao:{ cor: '#7C3AED', bg: '#F5F3FF', label: 'Aplicação' },
  resgate:  { cor: '#D97706', bg: '#FFFBEB', label: 'Resgate' },
  rendimento:{ cor: '#16A34A', bg: '#F0FDF4', label: 'Rendimento' },
};

const CAT_LABEL = { acao: 'Ação', fii: 'FII', renda_fixa: 'Renda Fixa', outros: 'Outros' };

function fmt(v) {
  if (v == null || v === '') return '—';
  return Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}
function fmtDate(d) {
  if (!d) return '—';
  const dt = new Date(d + 'T12:00:00');
  return dt.toLocaleDateString('pt-BR');
}
function fmtQtd(v) {
  if (!v) return '—';
  const n = Number(v);
  return n % 1 === 0 ? n.toLocaleString('pt-BR') : n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 8 });
}

export default function HistoricoPage() {
  const [operacoes, setOperacoes] = useState([]);
  const [resumo, setResumo]       = useState([]);
  const [loading, setLoading]     = useState(true);
  const [categoria, setCategoria] = useState('todos');
  const [tipo, setTipo]           = useState('todos');
  const [periodo, setPeriodo]     = useState('tudo');
  const [busca, setBusca]         = useState('');
  const [buscaInput, setBuscaInput] = useState('');
  const [migrando, setMigrando]     = useState(false);
  const [importando, setImportando] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const fileInputRef = useRef(null);

  const carregar = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (categoria !== 'todos') params.set('categoria', categoria);
      if (tipo !== 'todos')      params.set('tipo', tipo);
      if (periodo !== 'tudo')    params.set('periodo', periodo);
      if (busca)                 params.set('ticker', busca);
      const r = await api.get(`/historico?${params}`);
      setOperacoes(r.data.operacoes || []);
      setResumo(r.data.resumo || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [categoria, tipo, periodo, busca]);

  useEffect(() => { carregar(); }, [carregar]);

  const totalEntradas = operacoes
    .filter(o => ['compra','aplicacao'].includes(o.tipo))
    .reduce((s, o) => s + Number(o.total || 0), 0);
  const totalSaidas = operacoes
    .filter(o => ['venda','resgate'].includes(o.tipo))
    .reduce((s, o) => s + Number(o.total || 0), 0);
  const totalProventos = operacoes
    .filter(o => ['dividendo','rendimento'].includes(o.tipo))
    .reduce((s, o) => s + Number(o.total || 0), 0);

  const handleBusca = (e) => {
    e.preventDefault();
    setBusca(buscaInput.trim().toUpperCase());
  };

  const importarB3 = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.name.match(/\.(xlsx|xls)$/i)) {
      setImportResult({ ok: false, mensagem: 'Use o arquivo .xlsx exportado da B3 (investidor.b3.com.br).' });
      return;
    }
    setImportando(true);
    setImportResult(null);
    try {
      const form = new FormData();
      form.append('arquivo', file);
      const r = await api.post('/historico/importar-b3', form, { headers: { 'Content-Type': 'multipart/form-data' } });
      setImportResult({ ok: true, ...r.data });
      if (r.data.inseridos > 0) carregar();
    } catch (err) {
      setImportResult({ ok: false, mensagem: err.response?.data?.error || 'Erro ao importar arquivo.' });
    } finally {
      setImportando(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const migrar = async () => {
    if (!confirm('Importar operações existentes das carteiras para o histórico?')) return;
    setMigrando(true);
    try {
      const r = await api.post('/historico/migrar');
      alert(r.data.mensagem || 'Migração concluída!');
      carregar();
    } catch (e) {
      alert('Erro ao migrar: ' + (e.response?.data?.erro || e.message));
    } finally {
      setMigrando(false);
    }
  };

  return (
    <div style={{ maxWidth: 1100, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <div style={{ width: 42, height: 42, borderRadius: 10, background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <History size={22} color="#2563EB"/>
        </div>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: '#1A1A2E', margin: 0 }}>Histórico de Operações</h1>
          <p style={{ fontSize: 12, color: '#8896A8', margin: 0 }}>Registro completo de todas as movimentações</p>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
          <input ref={fileInputRef} type="file" accept=".xlsx,.xls" style={{ display: 'none' }} onChange={importarB3}/>
          <button onClick={() => fileInputRef.current?.click()} disabled={importando} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', background: importando ? '#E5E7EB' : '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: importando ? 'not-allowed' : 'pointer', color: '#16A34A' }}>
            <FileSpreadsheet size={13}/>
            {importando ? 'Processando...' : 'Importar extrato B3'}
          </button>
          <button onClick={migrar} disabled={migrando} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', background: migrando ? '#E5E7EB' : '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: migrando ? 'not-allowed' : 'pointer', color: '#2563EB' }}>
            <Database size={13}/>
            {migrando ? 'Importando...' : 'Importar portfólio'}
          </button>
        </div>
      </div>

      {importResult && (
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 16, padding: '12px 16px', borderRadius: 10, background: importResult.ok ? '#F0FDF4' : '#FEF2F2', border: `1px solid ${importResult.ok ? '#BBF7D0' : '#FECACA'}` }}>
          {importResult.ok ? <CheckCircle size={16} color="#16A34A" style={{ flexShrink: 0, marginTop: 1 }}/> : <X size={16} color="#DC2626" style={{ flexShrink: 0, marginTop: 1 }}/>}
          <div style={{ flex: 1, fontSize: 13, color: importResult.ok ? '#166534' : '#991B1B', lineHeight: 1.5 }}>
            {importResult.mensagem}
          </div>
          <button onClick={() => setImportResult(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', padding: 0 }}>
            <X size={14}/>
          </button>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14, marginBottom: 24 }}>
        {[
          { label: 'Total Investido',   valor: totalEntradas,  icon: TrendingUp,   cor: '#2563EB', bg: '#EFF6FF' },
          { label: 'Total Resgates',    valor: totalSaidas,    icon: TrendingDown, cor: '#DC2626', bg: '#FEF2F2' },
          { label: 'Proventos Recebidos', valor: totalProventos, icon: DollarSign, cor: '#16A34A', bg: '#F0FDF4' },
        ].map(({ label, valor, icon: Icon, cor, bg }) => (
          <div key={label} style={{ background: '#fff', borderRadius: 12, padding: '16px 20px', border: '1px solid #E8ECF0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <div style={{ width: 34, height: 34, borderRadius: 8, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon size={16} color={cor}/>
              </div>
              <span style={{ fontSize: 12, color: '#8896A8', fontWeight: 500 }}>{label}</span>
            </div>
            <p style={{ fontSize: 20, fontWeight: 700, color: '#1A1A2E', margin: 0 }}>{fmt(valor)}</p>
          </div>
        ))}
      </div>

      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #E8ECF0', padding: '16px 20px', marginBottom: 16 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center' }}>
          <form onSubmit={handleBusca} style={{ display: 'flex', gap: 6 }}>
            <div style={{ position: 'relative' }}>
              <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#8896A8' }}/>
              <input value={buscaInput} onChange={e => setBuscaInput(e.target.value)} placeholder="Buscar ticker..." style={{ paddingLeft: 30, paddingRight: 12, paddingTop: 7, paddingBottom: 7, border: '1px solid #E8ECF0', borderRadius: 8, fontSize: 13, width: 160, outline: 'none' }}/>
            </div>
            <button type="submit" style={{ padding: '7px 14px', background: '#2563EB', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, cursor: 'pointer' }}>Buscar</button>
            {busca && <button type="button" onClick={() => { setBusca(''); setBuscaInput(''); }} style={{ padding: '7px 10px', background: '#F3F4F6', border: 'none', borderRadius: 8, fontSize: 12, cursor: 'pointer', color: '#6B7280' }}>x</button>}
          </form>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {CATEGORIAS.map(c => (
              <button key={c.value} onClick={() => setCategoria(c.value)} style={{ padding: '6px 12px', borderRadius: 20, fontSize: 12, fontWeight: 500, cursor: 'pointer', border: 'none', background: categoria === c.value ? '#1A1A2E' : '#F3F4F6', color: categoria === c.value ? '#fff' : '#6B7280' }}>{c.label}</button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {TIPOS.map(t => { const cfg = TIPO_CONFIG[t.value] || {}; const ativo = tipo === t.value; return (<button key={t.value} onClick={() => setTipo(t.value)} style={{ padding: '6px 12px', borderRadius: 20, fontSize: 12, fontWeight: 500, cursor: 'pointer', border: 'none', background: ativo ? (cfg.bg || '#F3F4F6') : '#F3F4F6', color: ativo ? (cfg.cor || '#1A1A2E') : '#6B7280' }}>{t.label}</button>); })}
          </div>
          <select value={periodo} onChange={e => setPeriodo(e.target.value)} style={{ padding: '7px 12px', border: '1px solid #E8ECF0', borderRadius: 8, fontSize: 13, outline: 'none', cursor: 'pointer' }}>
            {PERIODOS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
          <button onClick={carregar} style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', background: '#F3F4F6', border: 'none', borderRadius: 8, fontSize: 13, cursor: 'pointer', color: '#6B7280' }}>
            <RefreshCw size={14}/> Atualizar
          </button>
        </div>
      </div>

      <div style={{ background: '#fff', borderRadius: 12, border: '1px solid #E8ECF0', overflow: 'hidden' }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid #E8ECF0' }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: '#1A1A2E' }}>
            {loading ? 'Carregando...' : `${operacoes.length} operação(ões)`}
          </span>
        </div>
        {loading ? (
          <div style={{ padding: 40, display: 'flex', justifyContent: 'center' }}>
            <div style={{ width: 28, height: 28, border: '2px solid #C9A84C', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }}/>
          </div>
        ) : operacoes.length === 0 ? (
          <div style={{ padding: 48, textAlign: 'center', color: '#8896A8' }}>
            <History size={36} style={{ margin: '0 auto 12px', opacity: 0.3 }}/>
            <p style={{ fontSize: 14, margin: 0 }}>Nenhuma operação encontrada</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#F8F9FA' }}>
                  {['Data', 'Ticker', 'Categoria', 'Tipo', 'Qtd', 'Preço Unit.', 'Total', 'Resultado', 'Obs.'].map(h => (
                    <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 600, color: '#6B7280', whiteSpace: 'nowrap', borderBottom: '1px solid #E8ECF0', fontSize: 12 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {operacoes.map((op, i) => {
                  const cfg = TIPO_CONFIG[op.tipo] || { cor: '#6B7280', bg: '#F3F4F6', label: op.tipo };
                  return (
                    <tr key={op.id} style={{ borderBottom: '1px solid #F0F2F5', background: i % 2 === 0 ? '#fff' : '#FAFBFC' }}>
                      <td style={{ padding: '11px 16px', color: '#6B7280', whiteSpace: 'nowrap' }}>{fmtDate(op.data_operacao)}</td>
                      <td style={{ padding: '11px 16px', fontWeight: 700, color: '#1A1A2E' }}>{op.ticker}</td>
                      <td style={{ padding: '11px 16px', color: '#8896A8' }}>{CAT_LABEL[op.categoria] || op.categoria}</td>
                      <td style={{ padding: '11px 16px' }}>
                        <span style={{ display: 'inline-block', padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 600, background: cfg.bg, color: cfg.cor }}>{cfg.label}</span>
                      </td>
                      <td style={{ padding: '11px 16px', color: '#374151', textAlign: 'right' }}>{fmtQtd(op.quantidade)}</td>
                      <td style={{ padding: '11px 16px', color: '#374151', textAlign: 'right' }}>{fmt(op.preco_unitario)}</td>
                      <td style={{ padding: '11px 16px', fontWeight: 600, color: '#1A1A2E', textAlign: 'right' }}>{fmt(op.total)}</td>
                      <td style={{ padding: '11px 16px', textAlign: 'right' }}>
                        {op.resultado != null ? (
                          <span style={{ color: Number(op.resultado) >= 0 ? '#16A34A' : '#DC2626', fontWeight: 600 }}>
                            {Number(op.resultado) >= 0 ? '+' : ''}{fmt(op.resultado)}
                          </span>
                        ) : <span style={{ color: '#CBD5E1' }}>—</span>}
                      </td>
                      <td style={{ padding: '11px 16px', color: '#8896A8', maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {op.observacao || '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
