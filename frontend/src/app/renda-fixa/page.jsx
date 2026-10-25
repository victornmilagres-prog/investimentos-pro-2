'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';

const fmt = (v, dec = 2) =>
  Number(v).toLocaleString('pt-BR', { minimumFractionDigits: dec, maximumFractionDigits: dec });
const fmtR = (v) => `R$ ${fmt(v)}`;
const fmtP = (v) => `${v >= 0 ? '+' : ''}${fmt(v)}%`;

export default function RendaFixa() {
  const router = useRouter();

  const [investimentos, setInvestimentos] = useState([]);
  const [taxas, setTaxas] = useState({ cdi: 0, selic: 0, ipca: 0 });
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState(null);
  const [showTimeline, setShowTimeline] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [abaAtiva, setAbaAtiva] = useState('cards');
  const [simAberto, setSimAberto] = useState(null);
  const [simMeses, setSimMeses] = useState(12);
  const [filtroObjetivo, setFiltroObjetivo] = useState('Todos');
  const [filtroTipo, setFiltroTipo] = useState('Todos');
  const [filtroIdx, setFiltroIdx] = useState('Todos');
  const [filtroVenc, setFiltroVenc] = useState('Todos');
  const [sortBy, setSortBy] = useState('vencimento');
  const [form, setForm] = useState({
    nome: '', tipo: 'LCA', indexador: 'CDI', taxa: '', valor_investido: '',
    isento_ir: true, data_inicio: '', data_vencimento: '', emissor: '',
    objetivo: '', liquidez: 'Vencimento', observacoes: ''
  });
  const [sugestoesFiltradas, setSugestoesFiltradas] = useState([]);
  const [salvando, setSalvando] = useState(false);
  const [editando, setEditando] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [salvandoEdit, setSalvandoEdit] = useState(false);
  const [vendendo, setVendendo] = useState(null);
  const [showVendaModal, setShowVendaModal] = useState(false);
  const [valorVenda, setValorVenda] = useState('');
  const [salvandoVenda, setSalvandoVenda] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) { router.push('/login'); return; }
    Promise.all([
      fetch('/_/backend/api/renda-fixa', { headers: { Authorization: `Bearer ${token}` } }),
      fetch('/_/backend/api/renda-fixa/taxas', { headers: { Authorization: `Bearer ${token}` } }),
    ])
      .then(([r1, r2]) => Promise.all([r1.json(), r2.json()]))
      .then(([dados, tx]) => {
        setInvestimentos(dados.itens || dados);
        setTaxas(tx);
        setLoading(false);
      })
      .catch(() => { setErro('Erro ao carregar dados.'); setLoading(false); });
  }, []);

  const objetivosUnicos = ['Todos', ...new Set(investimentos.map(i => i.objetivo || 'Sem objetivo'))];
  const tiposUnicos = ['Todos', ...new Set(investimentos.map(i => i.tipo))];
  const hoje = new Date();

  const filtrados = investimentos
    .filter(i => {
      const obj = i.objetivo || 'Sem objetivo';
      if (filtroObjetivo !== 'Todos' && obj !== filtroObjetivo) return false;
      if (filtroTipo !== 'Todos' && i.tipo !== filtroTipo) return false;
      if (filtroIdx !== 'Todos' && i.indexador !== filtroIdx) return false;
      if (filtroVenc !== 'Todos') {
        const venc = new Date(i.data_vencimento);
        const dias = Math.ceil((venc - hoje) / 86400000);
        if (filtroVenc === 'Este mes' && dias > 30) return false;
        if (filtroVenc === '90 dias' && dias > 90) return false;
        if (filtroVenc === 'Este ano' && venc.getFullYear() !== hoje.getFullYear()) return false;
      }
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'vencimento') return new Date(a.data_vencimento) - new Date(b.data_vencimento);
      if (sortBy === 'rendimento') return (b.rendBrutoPct || 0) - (a.rendBrutoPct || 0);
      if (sortBy === 'valor') return (b.valorBruto || 0) - (a.valorBruto || 0);
      if (sortBy === 'nome') return a.nome.localeCompare(b.nome);
      if (sortBy === 'cdi') return (b.taxaAnual || 0) - (a.taxaAnual || 0);
      return 0;
    });

  const grupos = {};
  filtrados.forEach(i => {
    const k = i.objetivo || 'Sem objetivo';
    if (!grupos[k]) grupos[k] = [];
    grupos[k].push(i);
  });

  const totalInvestido = investimentos.reduce((s, i) => s + Number(i.valor_investido || 0), 0);
  const totalBruto = investimentos.reduce((s, i) => s + Number(i.valorBruto || i.valor_investido || 0), 0);
  const totalLiquido = investimentos.reduce((s, i) => s + Number(i.valorLiquido || i.valor_investido || 0), 0);
  const rendTotalR = totalBruto - totalInvestido;
  const rendTotalPct = totalInvestido > 0 ? (rendTotalR / totalInvestido) * 100 : 0;
  const rendMedioPct = investimentos.length > 0
    ? investimentos.reduce((s, i) => s + Number(i.rendBrutoPct || 0), 0) / investimentos.length : 0;
  const rendMedioMensal = rendMedioPct > 0 ? (Math.pow(1 + rendMedioPct / 100, 1 / 12) - 1) * 100 : 0;

  const proxVenc = [...investimentos].sort((a, b) =>
    new Date(a.data_vencimento) - new Date(b.data_vencimento)
  ).find(i => new Date(i.data_vencimento) > hoje);
  const diasProx = proxVenc
    ? Math.ceil((new Date(proxVenc.data_vencimento) - hoje) / 86400000) : null;

  const diversEmissores = useMemo(() => {
    if (totalInvestido === 0) return [];
    const map = {};
    investimentos.forEach(i => {
      const k = i.emissor || 'Sem emissor';
      if (!map[k]) map[k] = 0;
      map[k] += Number(i.valor_investido || 0);
    });
    return Object.entries(map)
      .map(([nome, valor]) => ({ nome, valor, pct: (valor / totalInvestido) * 100 }))
      .sort((a, b) => b.valor - a.valor);
  }, [investimentos, totalInvestido]);

  const emissorConcentrado = diversEmissores.find(e => e.pct > 50);

  // Ranking por taxa liquida real (usa aliquota pelo prazo total)
  const rankingLiqReal = useMemo(() => {
    return [...investimentos].map(inv => {
      const prazoTotalDias = Math.max(1, Math.floor((new Date(inv.data_vencimento) - new Date(inv.data_inicio)) / 86400000));
      const aliq = prazoTotalDias <= 180 ? 0.225 : prazoTotalDias <= 360 ? 0.20 : prazoTotalDias <= 720 ? 0.175 : 0.15;
      const taxaAnual = inv.taxaAnual || 0;
      const taxaLiq = inv.isento_ir ? taxaAnual : taxaAnual * (1 - aliq);
      const taxaReal = taxaLiq - (taxas.ipca || 0);
      return { ...inv, taxaLiq: parseFloat(taxaLiq.toFixed(2)), taxaReal: parseFloat(taxaReal.toFixed(2)), aliqPct: aliq * 100 };
    }).sort((a, b) => b.taxaReal - a.taxaReal);
  }, [investimentos, taxas.ipca]);

  const fluxoCaixa = useMemo(() => {
    const map = {};
    investimentos.forEach(inv => {
      const venc = new Date(inv.data_vencimento);
      const key = `${venc.getFullYear()}-${String(venc.getMonth() + 1).padStart(2, '0')}`;
      if (!map[key]) map[key] = { mes: key, label: venc.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }), total: 0, count: 0, itens: [] };
      map[key].total += Number(inv.valorBruto || inv.valor_investido || 0);
      map[key].count += 1;
      map[key].itens.push(inv.nome);
    });
    return Object.values(map).sort((a, b) => a.mes.localeCompare(b.mes)).slice(0, 18);
  }, [investimentos]);

  const maxFluxo = fluxoCaixa.reduce((m, f) => Math.max(m, f.total), 0);
  const objetivosExistentes = [...new Set(investimentos.map(i => i.objetivo).filter(Boolean))];

  const mostrarSugestoes = (val) => {
    setSugestoesFiltradas(objetivosExistentes.filter(o =>
      !val || o.toLowerCase().includes(val.toLowerCase())
    ));
  };

  const salvar = async () => {
    setSalvando(true);
    const token = localStorage.getItem('token');
    try {
      const res = await fetch('/_/backend/api/renda-fixa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          ...form,
          taxa: parseFloat(form.taxa),
          valor_investido: parseFloat(form.valor_investido),
          isento_ir: form.isento_ir === true || form.isento_ir === 'true',
        }),
      });
      const novo = await res.json();
      if (!res.ok) throw new Error(novo.error || 'Erro');
      setInvestimentos(prev => [...prev, novo]);
      setShowModal(false);
      setForm({ nome: '', tipo: 'LCA', indexador: 'CDI', taxa: '', valor_investido: '', isento_ir: true, data_inicio: '', data_vencimento: '', emissor: '', objetivo: '', liquidez: 'Vencimento', observacoes: '' });
    } catch (e) { alert(e.message); }
    finally { setSalvando(false); }
  };

  const abrirEdit = (inv) => {
    setEditando({
      id: inv.id, nome: inv.nome, tipo: inv.tipo, indexador: inv.indexador,
      taxa: String(inv.taxa), valor_investido: String(inv.valor_investido),
      isento_ir: inv.isento_ir, data_inicio: inv.data_inicio?.slice(0, 10) || '',
      data_vencimento: inv.data_vencimento?.slice(0, 10) || '',
      emissor: inv.emissor || '', liquidez: inv.liquidez || 'Vencimento',
      objetivo: inv.objetivo || '', observacoes: inv.observacoes || '',
    });
    setShowEditModal(true);
  };

  const salvarEdit = async () => {
    setSalvandoEdit(true);
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`/_/backend/api/renda-fixa/${editando.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ ...editando, taxa: parseFloat(editando.taxa), valor_investido: parseFloat(editando.valor_investido), isento_ir: editando.isento_ir === true || editando.isento_ir === 'true' }),
      });
      const atualizado = await res.json();
      if (!res.ok) throw new Error(atualizado.error || 'Erro');
      setInvestimentos(prev => prev.map(i => i.id === editando.id ? { ...i, ...atualizado } : i));
      setShowEditModal(false);
      setEditando(null);
    } catch (e) { alert(e.message); }
    finally { setSalvandoEdit(false); }
  };

  const excluir = async (id, nome) => {
    if (!confirm(`Excluir "${nome}"? Esta acao nao pode ser desfeita.`)) return;
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`/_/backend/api/renda-fixa/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error('Erro ao excluir');
      setInvestimentos(prev => prev.filter(i => i.id !== id));
    } catch (e) { alert(e.message); }
  };

  const abrirVenda = (inv) => {
    setVendendo(inv);
    setValorVenda(String(inv.valor_investido));
    setShowVendaModal(true);
  };

  const confirmarVenda = async () => {
    setSalvandoVenda(true);
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`/_/backend/api/renda-fixa/${vendendo.id}/vender`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ valor_venda: parseFloat(valorVenda), data_venda: new Date().toISOString().slice(0, 10) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro');
      if (data.vendido) {
        setInvestimentos(prev => prev.filter(i => i.id !== vendendo.id));
      } else {
        setInvestimentos(prev => prev.map(i => i.id === vendendo.id ? { ...i, ...data } : i));
      }
      setShowVendaModal(false);
      setVendendo(null);
      setValorVenda('');
    } catch (e) { alert(e.message); }
    finally { setSalvandoVenda(false); }
  };

  const corIdx = { CDI: '#1a56db', Selic: '#0c9e6a', IPCA: '#7c3aed', Prefixado: '#d97706' };
  const corBadge = { LCA: 'badge-lca', LCI: 'badge-lci', CDB: 'badge-cdb', 'Tesouro Direto': 'badge-teso', Debenture: 'badge-deb', Outro: 'badge-outro' };

  const alertaVenc = (inv) => {
    const dias = inv.diasParaVencer ?? Math.ceil((new Date(inv.data_vencimento) - hoje) / 86400000);
    if (dias <= 0) return { cls: 'alerta-vencido', txt: 'Vencido' };
    if (dias <= 30) return { cls: 'alerta-critico', txt: `Vence em ${dias} dias` };
    if (dias <= 90) return { cls: 'alerta-atencao', txt: `Vence em ${dias} dias` };
    if (dias <= 180) return { cls: 'alerta-info', txt: `Vence em ${dias} dias` };
    return null;
  };

  const calcSimulador = (inv, meses) => {
    const taxaAnualPct = inv.taxaAnual || 0;
    const taxaMensalPct = (Math.pow(1 + taxaAnualPct / 100, 1 / 12) - 1) * 100;
    const base = Number(inv.valorBruto || inv.valor_investido);
    const valorFinal = base * Math.pow(1 + taxaMensalPct / 100, meses);
    return { valorFinal, rendimento: valorFinal - base, taxaMensalPct };
  };

  if (loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', color: 'var(--fg2)' }}>Carregando...</div>;
  if (erro) return <div style={{ padding: '32px', color: 'var(--red)' }}>{erro}</div>;

  return (
    <>
      <style>{`
        :root {
          --bg:#f0f2f5;--surface:#fff;--surface2:#f8f9fb;--border:#e2e6ed;
          --fg:#0f1923;--fg2:#5a6474;--fg3:#8e98a8;
          --accent:#1a56db;--accent-light:#e8effe;
          --green:#0c9e6a;--green-light:#e3f6ee;
          --yellow:#d97706;--yellow-light:#fef3c7;
          --red:#dc2626;--red-light:#fee2e2;
          --purple:#7c3aed;--purple-light:#ede9fe;
          --teal:#0891b2;--teal-light:#e0f9ff;
          --orange:#ea6c00;--orange-light:#fff3e0;
          --radius:12px;--radius-sm:8px;
          --shadow:0 1px 3px rgba(0,0,0,.08);--shadow-md:0 4px 12px rgba(0,0,0,.10);
        }
        @media(prefers-color-scheme:dark){:root:not([data-theme=light]){
          --bg:#0d1117;--surface:#161b22;--surface2:#1c2230;--border:#2a3140;
          --fg:#e6edf3;--fg2:#8b949e;--fg3:#484f58;
          --accent:#4f8ef7;--accent-light:#1a2744;
          --green:#3fb884;--green-light:#0d2b1e;
          --yellow:#f59e0b;--yellow-light:#2a1f07;
          --red:#f87171;--red-light:#2a0f0f;
          --purple:#a78bfa;--purple-light:#1e1434;
          --teal:#22d3ee;--teal-light:#061e24;
          --orange:#fb923c;--orange-light:#2a1300;
        }}
        :root[data-theme=dark]{
          --bg:#0d1117;--surface:#161b22;--surface2:#1c2230;--border:#2a3140;
          --fg:#e6edf3;--fg2:#8b949e;--fg3:#484f58;
          --accent:#4f8ef7;--accent-light:#1a2744;
          --green:#3fb884;--green-light:#0d2b1e;
          --yellow:#f59e0b;--yellow-light:#2a1f07;
          --red:#f87171;--red-light:#2a0f0f;
          --purple:#a78bfa;--purple-light:#1e1434;
          --teal:#22d3ee;--teal-light:#061e24;
          --orange:#fb923c;--orange-light:#2a1300;
        }
        .rf-wrap{padding:24px 16px;max-width:1200px;margin:0 auto;}
        .rf-header{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;margin-bottom:20px;}
        .rf-header h1{font-size:20px;font-weight:700;letter-spacing:-.3px;}
        .rf-header h1 span{color:var(--accent);}
        .rf-header-right{display:flex;gap:8px;}
        .btn-outline{display:flex;align-items:center;gap:5px;background:var(--surface);color:var(--fg2);border:1px solid var(--border);border-radius:var(--radius-sm);padding:8px 14px;font-size:13px;font-weight:500;cursor:pointer;}
        .btn-outline:hover{border-color:var(--accent);color:var(--accent);}
        .btn-primary{display:flex;align-items:center;gap:6px;background:var(--accent);color:#fff;border:none;border-radius:var(--radius-sm);padding:8px 16px;font-size:13px;font-weight:600;cursor:pointer;}
        .taxas-bar{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px;}
        .taxa-pill{display:flex;align-items:center;gap:6px;background:var(--surface);border:1px solid var(--border);border-radius:20px;padding:5px 12px;font-size:12px;}
        .t-nome{color:var(--fg3);font-weight:600;text-transform:uppercase;letter-spacing:.4px;}
        .t-val{font-weight:700;font-variant-numeric:tabular-nums;}
        .resumo-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(155px,1fr));gap:12px;margin-bottom:16px;}
        .resumo-card{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:16px;box-shadow:var(--shadow);}
        .r-label{font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.6px;color:var(--fg3);margin-bottom:6px;}
        .r-valor{font-size:20px;font-weight:700;font-variant-numeric:tabular-nums;line-height:1.1;}
        .r-sub{font-size:12px;color:var(--fg2);margin-top:3px;}
        .r-delta{display:inline-flex;align-items:center;gap:3px;font-size:12px;font-weight:600;margin-top:4px;padding:2px 7px;border-radius:4px;}
        .delta-pos{background:var(--green-light);color:var(--green);}
        .venc-card{border-left:3px solid var(--yellow);}
        .venc-card .r-valor{color:var(--yellow);font-size:16px;}
        .divers-section{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:16px 18px;margin-bottom:16px;box-shadow:var(--shadow);}
        .divers-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;flex-wrap:wrap;gap:8px;}
        .divers-title{font-size:13px;font-weight:700;}
        .alerta-concentracao{font-size:11px;font-weight:600;padding:3px 8px;border-radius:4px;background:var(--yellow-light);color:var(--yellow);}
        .emissor-row{display:flex;align-items:center;gap:8px;margin-bottom:7px;}
        .emissor-nome{font-size:12px;color:var(--fg2);width:120px;flex-shrink:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
        .emissor-track{flex:1;height:7px;background:var(--border);border-radius:4px;overflow:hidden;}
        .emissor-fill{height:100%;border-radius:4px;}
        .emissor-pct{font-size:11px;font-weight:700;width:38px;text-align:right;flex-shrink:0;}
        .emissor-val{font-size:11px;color:var(--fg3);width:90px;text-align:right;flex-shrink:0;}
        .abas{display:flex;gap:4px;margin-bottom:16px;background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:4px;box-shadow:var(--shadow);}
        .aba{flex:1;padding:8px 4px;border:none;border-radius:var(--radius-sm);font-size:13px;font-weight:600;cursor:pointer;background:transparent;color:var(--fg2);transition:all .15s;}
        .aba.active{background:var(--accent);color:#fff;}
        .timeline-section{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:18px 20px;margin-bottom:20px;box-shadow:var(--shadow);}
        .tl-row{display:flex;align-items:center;gap:10px;margin-bottom:10px;}
        .tl-nome{font-size:12px;color:var(--fg2);width:140px;flex-shrink:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
        .tl-track{flex:1;height:8px;background:var(--border);border-radius:4px;}
        .tl-fill{height:100%;border-radius:4px;}
        .tl-data{font-size:11px;color:var(--fg3);width:60px;flex-shrink:0;text-align:right;}
        .filtros-bar{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:14px 16px;margin-bottom:20px;display:flex;flex-wrap:wrap;gap:10px;align-items:center;box-shadow:var(--shadow);}
        .filtro-label{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.6px;color:var(--fg3);}
        .chip-group{display:flex;flex-wrap:wrap;gap:6px;}
        .chip{padding:4px 11px;border-radius:20px;border:1px solid var(--border);background:var(--surface2);color:var(--fg2);font-size:12px;font-weight:500;cursor:pointer;transition:all .15s;}
        .chip:hover{border-color:var(--accent);color:var(--accent);}
        .chip.active{background:var(--accent-light);border-color:var(--accent);color:var(--accent);font-weight:600;}
        .filtro-divider{width:1px;height:28px;background:var(--border);}
        .sort-sel{margin-left:auto;padding:5px 10px;border:1px solid var(--border);border-radius:var(--radius-sm);background:var(--surface2);color:var(--fg2);font-size:12px;cursor:pointer;}
        .obj-section{margin-bottom:28px;}
        .obj-header{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:12px;flex-wrap:wrap;}
        .obj-title{display:flex;align-items:center;gap:8px;}
        .obj-icon{width:32px;height:32px;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:16px;background:var(--accent-light);}
        .obj-title h2{font-size:15px;font-weight:700;}
        .obj-title .qtd{font-size:12px;color:var(--fg3);}
        .obj-total{text-align:right;}
        .obj-total .t-label{font-size:11px;color:var(--fg3);}
        .obj-total .t-valor{font-size:16px;font-weight:700;color:var(--green);font-variant-numeric:tabular-nums;}
        .obj-total .t-rend{font-size:12px;color:var(--fg2);}
        .inv-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:12px;}
        .inv-card{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:16px;box-shadow:var(--shadow);position:relative;overflow:hidden;transition:box-shadow .2s,transform .15s;}
        .inv-card:hover{box-shadow:var(--shadow-md);transform:translateY(-1px);}
        .inv-card::before{content:'';position:absolute;top:0;left:0;right:0;height:3px;}
        .inv-card.idx-CDI::before{background:var(--accent);}
        .inv-card.idx-Selic::before{background:var(--green);}
        .inv-card.idx-IPCA::before{background:var(--purple);}
        .inv-card.idx-Prefixado::before{background:var(--yellow);}
        .card-top{display:flex;align-items:flex-start;justify-content:space-between;gap:8px;margin-bottom:10px;}
        .card-nome{font-size:14px;font-weight:700;line-height:1.3;}
        .card-badges{display:flex;gap:4px;flex-wrap:wrap;justify-content:flex-end;}
        .badge{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;padding:2px 7px;border-radius:4px;}
        .badge-lca{background:var(--green-light);color:var(--green);}
        .badge-lci{background:var(--teal-light);color:var(--teal);}
        .badge-cdb{background:var(--accent-light);color:var(--accent);}
        .badge-teso{background:var(--purple-light);color:var(--purple);}
        .badge-isento{background:var(--green-light);color:var(--green);}
        .badge-liquidez{background:var(--teal-light);color:var(--teal);}
        .badge-liquidez-d{background:var(--yellow-light);color:var(--yellow);}
        .card-taxa{font-size:12px;color:var(--fg2);margin-bottom:4px;}
        .card-rend-row{display:flex;align-items:center;gap:6px;margin-bottom:10px;}
        .rend-sep{font-size:11px;color:var(--fg3);}
        .rend-pill{font-size:12px;font-weight:700;font-variant-numeric:tabular-nums;}
        .rend-pill.rend-aa{color:var(--accent);}
        .rend-pill.rend-am{color:var(--green);}
        .rend-period{font-size:10px;font-weight:500;color:var(--fg3);}
        .card-row{display:flex;align-items:baseline;justify-content:space-between;gap:8px;margin-bottom:4px;}
        .ck{font-size:11px;color:var(--fg3);}
        .cv{font-size:13px;font-weight:600;font-variant-numeric:tabular-nums;}
        .cv-green{color:var(--green);}
        .cdi-comp{display:flex;align-items:center;gap:6px;font-size:11px;color:var(--fg3);margin-top:4px;}
        .cdi-badge{font-size:10px;font-weight:700;padding:2px 6px;border-radius:4px;}
        .cdi-acima{background:var(--green-light);color:var(--green);}
        .cdi-abaixo{background:var(--red-light);color:var(--red);}
        .rend-real-row{display:flex;align-items:center;gap:5px;margin-top:4px;flex-wrap:wrap;}
        .rend-real-badge{font-size:10px;font-weight:700;padding:2px 6px;border-radius:4px;}
        .rend-real-pos{background:var(--green-light);color:var(--green);}
        .rend-real-neg{background:var(--red-light);color:var(--red);}
        .alerta-ir{font-size:10px;font-weight:700;padding:2px 7px;border-radius:4px;background:var(--orange-light);color:var(--orange);}
        .divider{height:1px;background:var(--border);margin:10px 0;}
        .prog-bar{height:4px;background:var(--border);border-radius:2px;overflow:hidden;margin-bottom:4px;}
        .prog-fill{height:100%;border-radius:2px;background:var(--accent);}
        .prog-label{display:flex;justify-content:space-between;font-size:10px;color:var(--fg3);}
        .alertas{display:flex;flex-wrap:wrap;gap:5px;margin-top:8px;}
        .alerta{display:inline-flex;align-items:center;gap:4px;font-size:11px;font-weight:600;padding:3px 8px;border-radius:4px;}
        .alerta-critico{background:var(--red-light);color:var(--red);}
        .alerta-atencao{background:var(--yellow-light);color:var(--yellow);}
        .alerta-info{background:var(--accent-light);color:var(--accent);}
        .alerta-vencido{background:var(--border);color:var(--fg2);}
        .card-acoes{display:flex;gap:6px;margin-top:10px;border-top:1px solid var(--border);padding-top:10px;}
        .btn-card-acao{flex:1;padding:6px 4px;border:1px solid var(--border);border-radius:6px;font-size:11px;font-weight:600;cursor:pointer;background:var(--surface);color:var(--fg2);transition:all .15s;}
        .btn-card-acao:hover{background:var(--bg);}
        .btn-editar:hover{border-color:var(--accent);color:var(--accent);}
        .btn-vender:hover{border-color:var(--green);color:var(--green);}
        .btn-excluir:hover{border-color:var(--red);color:var(--red);}
        .btn-sim:hover{border-color:var(--purple);color:var(--purple);}
        .simulador-box{background:var(--surface2);border:1px solid var(--border);border-radius:var(--radius-sm);padding:12px;margin-top:8px;}
        .sim-title{font-size:11px;font-weight:700;color:var(--fg3);text-transform:uppercase;letter-spacing:.5px;margin-bottom:10px;}
        .sim-slider{width:100%;accent-color:var(--purple);}
        .sim-resultado{display:flex;justify-content:space-between;align-items:center;margin-top:8px;}
        .sim-val{font-size:15px;font-weight:700;color:var(--purple);font-variant-numeric:tabular-nums;}
        .sim-rend{font-size:11px;color:var(--green);font-weight:600;}
        .ranking-section{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:18px 20px;box-shadow:var(--shadow);overflow-x:auto;}
        .ranking-table{width:100%;border-collapse:collapse;min-width:520px;}
        .ranking-table th{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:var(--fg3);padding:8px 12px;text-align:left;border-bottom:2px solid var(--border);}
        .ranking-table td{padding:10px 12px;border-bottom:1px solid var(--border);font-size:13px;vertical-align:middle;}
        .rank-num{font-size:16px;font-weight:700;color:var(--fg3);}
        .rank-num.gold{color:#f59e0b;}
        .rank-num.silver{color:#94a3b8;}
        .rank-num.bronze{color:#b45309;}
        .rank-nome{font-weight:600;}
        .rank-emissor{font-size:11px;color:var(--fg3);}
        .rank-pill{font-size:10px;font-weight:700;padding:2px 6px;border-radius:4px;}
        .rank-taxa-real{font-weight:700;font-variant-numeric:tabular-nums;}
        .rank-taxa-real.pos{color:var(--green);}
        .rank-taxa-real.neg{color:var(--red);}
        .fluxo-section{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:18px 20px;box-shadow:var(--shadow);}
        .fluxo-title{font-size:13px;font-weight:700;margin-bottom:16px;}
        .fluxo-chart{display:flex;align-items:flex-end;gap:6px;height:140px;overflow-x:auto;padding-bottom:4px;}
        .fluxo-col{display:flex;flex-direction:column;align-items:center;gap:4px;min-width:48px;flex:1;}
        .fluxo-bar-wrap{flex:1;display:flex;align-items:flex-end;width:100%;}
        .fluxo-bar{width:100%;border-radius:4px 4px 0 0;min-height:4px;}
        .fluxo-mes{font-size:10px;color:var(--fg3);text-align:center;white-space:nowrap;}
        .fluxo-valor{font-size:10px;font-weight:700;color:var(--accent);text-align:center;white-space:nowrap;}
        .fluxo-count{font-size:10px;color:var(--fg3);text-align:center;}
        .modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,.4);backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;padding:16px;z-index:100;}
        .modal{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);width:100%;max-width:500px;max-height:92vh;overflow-y:auto;box-shadow:0 20px 60px rgba(0,0,0,.25);}
        .modal-head{display:flex;align-items:center;justify-content:space-between;padding:18px 20px;border-bottom:1px solid var(--border);position:sticky;top:0;background:var(--surface);z-index:1;}
        .modal-head h3{font-size:15px;font-weight:700;}
        .btn-close{background:none;border:none;color:var(--fg3);font-size:18px;cursor:pointer;padding:2px 6px;border-radius:4px;}
        .modal-body{padding:20px;display:flex;flex-direction:column;gap:14px;}
        .form-sec{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.6px;color:var(--fg3);border-top:1px solid var(--border);padding-top:12px;margin-top:2px;}
        .form-sec:first-child{border-top:none;padding-top:0;margin-top:0;}
        .form-row{display:grid;grid-template-columns:1fr 1fr;gap:10px;}
        .form-grp{display:flex;flex-direction:column;gap:5px;}
        .form-grp label{font-size:12px;font-weight:600;color:var(--fg2);}
        .form-grp input,.form-grp select,.form-grp textarea{padding:9px 12px;border:1px solid var(--border);border-radius:var(--radius-sm);background:var(--surface2);color:var(--fg);font-family:inherit;font-size:13px;}
        .form-grp input:focus,.form-grp select:focus{outline:none;border-color:var(--accent);}
        .form-hint{font-size:11px;color:var(--fg3);}
        .obj-chip{padding:5px 11px;border-radius:20px;border:1px solid var(--border);background:var(--surface2);color:var(--fg2);font-size:12px;cursor:pointer;}
        .obj-chip:hover{border-color:var(--accent);color:var(--accent);}
        .modal-foot{padding:14px 20px;border-top:1px solid var(--border);display:flex;gap:8px;justify-content:flex-end;position:sticky;bottom:0;background:var(--surface);}
        .btn-cancel{padding:8px 16px;border-radius:var(--radius-sm);border:1px solid var(--border);background:var(--surface2);color:var(--fg2);font-size:13px;font-weight:600;cursor:pointer;}
        .btn-salvar{padding:8px 20px;border-radius:var(--radius-sm);border:none;background:var(--accent);color:#fff;font-size:13px;font-weight:600;cursor:pointer;}
        @media(max-width:500px){.form-row{grid-template-columns:1fr;}}
      `}</style>

      <div className="rf-wrap">
        <div className="rf-header">
          <h1>Renda <span>Fixa</span></h1>
          <div className="rf-header-right">
            <button className="btn-outline" onClick={() => setShowTimeline(v => !v)}>Vencimentos</button>
            <button className="btn-primary" onClick={() => setShowModal(true)}>+ Novo Lancamento</button>
          </div>
        </div>

        <div className="taxas-bar">
          {[['CDI', taxas.cdi, 'var(--accent)'], ['Selic', taxas.selic, 'var(--green)'], ['IPCA', taxas.ipca, 'var(--purple)']].map(([nome, val, cor]) => (
            <div className="taxa-pill" key={nome}>
              <span className="t-nome">{nome}</span>
              <span className="t-val" style={{ color: cor }}>{fmt(val, 2)}% a.a.</span>
            </div>
          ))}
          <span style={{ fontSize: 11, color: 'var(--fg3)', alignSelf: 'center' }}>Atualizado via BCB</span>
        </div>

        <div className="resumo-grid">
          <div className="resumo-card">
            <div className="r-label">Total Investido</div>
            <div className="r-valor">{fmtR(totalInvestido)}</div>
            <div className="r-sub">{investimentos.length} aplicacoes</div>
          </div>
          <div className="resumo-card">
            <div className="r-label">Valor Bruto Atual</div>
            <div className="r-valor" style={{ color: 'var(--green)' }}>{fmtR(totalBruto)}</div>
            <div className="r-delta delta-pos">+{fmtR(rendTotalR)} ({fmt(rendTotalPct)}%)</div>
          </div>
          <div className="resumo-card">
            <div className="r-label">Valor Liquido (IR)</div>
            <div className="r-valor" style={{ color: 'var(--green)' }}>{fmtR(totalLiquido)}</div>
            <div className="r-sub">IR: {fmtR(totalBruto - totalLiquido)}</div>
          </div>
          <div className="resumo-card">
            <div className="r-label">Rendimento Medio</div>
            <div className="r-valor" style={{ color: 'var(--accent)' }}>{fmt(rendMedioPct)}% <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--fg2)' }}>a.a.</span></div>
            <div className="r-sub">{taxas.cdi > 0 ? fmt((rendMedioPct / taxas.cdi) * 100) : '-'}% do CDI</div>
            <div className="r-sub" style={{ color: 'var(--green)', fontWeight: 600 }}>{fmt(rendMedioMensal, 2)}% a.m.</div>
          </div>
          {taxas.ipca > 0 && (
            <div className="resumo-card">
              <div className="r-label">Rentab. Real (vs IPCA)</div>
              <div className="r-valor" style={{ color: rendMedioPct - taxas.ipca >= 0 ? 'var(--green)' : 'var(--red)' }}>
                {fmtP(rendMedioPct - taxas.ipca)} <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--fg2)' }}>a.a.</span>
              </div>
              <div className="r-sub">IPCA: {fmt(taxas.ipca, 2)}%</div>
            </div>
          )}
          {proxVenc && (
            <div className="resumo-card venc-card">
              <div className="r-label">Proximo Vencimento</div>
              <div className="r-valor">{proxVenc.nome}</div>
              <div className="r-sub">{diasProx} dias · {new Date(proxVenc.data_vencimento).toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })}</div>
            </div>
          )}
        </div>

        {diversEmissores.length > 0 && (
          <div className="divers-section">
            <div className="divers-header">
              <span className="divers-title">Diversificacao por Emissor</span>
              {emissorConcentrado && (
                <span className="alerta-concentracao">{emissorConcentrado.nome} = {fmt(emissorConcentrado.pct, 0)}% da carteira</span>
              )}
            </div>
            {diversEmissores.map((e, idx) => {
              const cores = ['var(--accent)', 'var(--green)', 'var(--purple)', 'var(--yellow)', 'var(--teal)', 'var(--orange)'];
              const cor = e.pct > 50 ? 'var(--yellow)' : cores[idx % cores.length];
              return (
                <div className="emissor-row" key={e.nome}>
                  <div className="emissor-nome" title={e.nome}>{e.nome}</div>
                  <div className="emissor-track"><div className="emissor-fill" style={{ width: `${e.pct}%`, background: cor }} /></div>
                  <div className="emissor-pct" style={{ color: cor }}>{fmt(e.pct, 0)}%</div>
                  <div className="emissor-val">{fmtR(e.valor)}</div>
                </div>
              );
            })}
          </div>
        )}

        {showTimeline && (
          <div className="timeline-section">
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 14 }}>Linha do Tempo - Vencimentos</div>
            {[...investimentos].sort((a, b) => new Date(a.data_vencimento) - new Date(b.data_vencimento)).map(inv => {
              const inicio = new Date(inv.data_inicio);
              const venc = new Date(inv.data_vencimento);
              const total = Math.max(1, venc - inicio);
              const corrido = Math.min(hoje - inicio, total);
              const pct = Math.max(2, Math.min(98, (corrido / total) * 100));
              const cor = corIdx[inv.indexador] || '#8e98a8';
              return (
                <div className="tl-row" key={inv.id}>
                  <div className="tl-nome">{inv.nome}</div>
                  <div className="tl-track"><div className="tl-fill" style={{ width: `${pct}%`, background: cor }} /></div>
                  <div className="tl-data">{new Date(inv.data_vencimento).toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' })}</div>
                </div>
              );
            })}
          </div>
        )}

        <div className="abas">
          <button className={`aba${abaAtiva === 'cards' ? ' active' : ''}`} onClick={() => setAbaAtiva('cards')}>Carteira</button>
          <button className={`aba${abaAtiva === 'ranking' ? ' active' : ''}`} onClick={() => setAbaAtiva('ranking')}>Ranking</button>
          <button className={`aba${abaAtiva === 'fluxo' ? ' active' : ''}`} onClick={() => setAbaAtiva('fluxo')}>Fluxo de Caixa</button>
        </div>

        {abaAtiva === 'ranking' && (
          <div className="ranking-section">
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 4 }}>Ranking por Rentabilidade Liquida Real</div>
            <div style={{ fontSize: 11, color: 'var(--fg3)', marginBottom: 16 }}>Taxa liquida de IR descontando IPCA ({fmt(taxas.ipca, 2)}% a.a.)</div>
            <table className="ranking-table">
              <thead>
                <tr>
                  <th>#</th><th>Investimento</th><th>Taxa Bruta</th><th>Taxa Liq.</th><th>Real (-IPCA)</th><th>Valor</th>
                </tr>
              </thead>
              <tbody>
                {rankingLiqReal.map((inv, idx) => (
                  <tr key={inv.id}>
                    <td><span className={`rank-num${idx === 0 ? ' gold' : idx === 1 ? ' silver' : idx === 2 ? ' bronze' : ''}`}>{idx + 1}</span></td>
                    <td>
                      <div className="rank-nome">{inv.nome}</div>
                      <div className="rank-emissor">{inv.emissor} - {inv.indexador}</div>
                    </td>
                    <td><span className="rank-pill" style={{ background: 'var(--accent-light)', color: 'var(--accent)' }}>{fmt(inv.taxaAnual)}% a.a.</span></td>
                    <td><span className="rank-pill" style={{ background: inv.isento_ir ? 'var(--green-light)' : 'var(--surface2)', color: inv.isento_ir ? 'var(--green)' : 'var(--fg2)' }}>{fmt(inv.taxaLiq)}% {inv.isento_ir ? '(isento)' : `(IR ${fmt(inv.aliqPct, 0)}%)`}</span></td>
                    <td><span className={`rank-taxa-real${inv.taxaReal >= 0 ? ' pos' : ' neg'}`}>{fmtP(inv.taxaReal)} a.a.</span></td>
                    <td style={{ fontVariantNumeric: 'tabular-nums', fontSize: 12 }}>{fmtR(inv.valorBruto || inv.valor_investido)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {abaAtiva === 'fluxo' && (
          <div className="fluxo-section">
            <div className="fluxo-title">Fluxo de Caixa - Vencimentos Mes a Mes</div>
            {fluxoCaixa.length === 0 ? (
              <div style={{ color: 'var(--fg3)', fontSize: 13 }}>Nenhum vencimento registrado.</div>
            ) : (
              <>
                <div className="fluxo-chart">
                  {fluxoCaixa.map(f => {
                    const pct = maxFluxo > 0 ? (f.total / maxFluxo) * 100 : 0;
                    const mesAtual = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`;
                    const isPast = f.mes < mesAtual;
                    return (
                      <div className="fluxo-col" key={f.mes} title={f.itens.join(', ')}>
                        <div className="fluxo-valor">{f.total >= 10000 ? `${fmt(f.total / 1000, 0)}k` : fmtR(f.total).replace('R$ ', '')}</div>
                        <div className="fluxo-bar-wrap">
                          <div className="fluxo-bar" style={{ height: `${Math.max(4, pct)}%`, background: isPast ? 'var(--fg3)' : 'var(--accent)', opacity: isPast ? 0.4 : 1 }} />
                        </div>
                        <div className="fluxo-mes">{f.label}</div>
                        <div className="fluxo-count">{f.count}x</div>
                      </div>
                    );
                  })}
                </div>
                <div style={{ fontSize: 11, color: 'var(--fg3)', marginTop: 8 }}>Barras escuras = ja vencidos.</div>
              </>
            )}
          </div>
        )}

        {abaAtiva === 'cards' && (
          <>
            <div className="filtros-bar">
              <span className="filtro-label">Objetivo</span>
              <div className="chip-group">
                {objetivosUnicos.map(o => (
                  <div key={o} className={`chip${filtroObjetivo === o ? ' active' : ''}`} onClick={() => setFiltroObjetivo(o)}>{o}</div>
                ))}
              </div>
              <div className="filtro-divider" />
              <span className="filtro-label">Tipo</span>
              <div className="chip-group">
                {tiposUnicos.map(t => (
                  <div key={t} className={`chip${filtroTipo === t ? ' active' : ''}`} onClick={() => setFiltroTipo(t)}>{t}</div>
                ))}
              </div>
              <div className="filtro-divider" />
              <span className="filtro-label">Indexador</span>
              <div className="chip-group">
                {['Todos', 'CDI', 'Selic', 'IPCA', 'Prefixado'].map(i => (
                  <div key={i} className={`chip${filtroIdx === i ? ' active' : ''}`} onClick={() => setFiltroIdx(i)}>{i}</div>
                ))}
              </div>
              <div className="filtro-divider" />
              <span className="filtro-label">Vencimento</span>
              <div className="chip-group">
                {['Todos', 'Este mes', '90 dias', 'Este ano'].map(v => (
                  <div key={v} className={`chip${filtroVenc === v ? ' active' : ''}`} onClick={() => setFiltroVenc(v)}>{v}</div>
                ))}
              </div>
              <select className="sort-sel" value={sortBy} onChange={e => setSortBy(e.target.value)}>
                <option value="vencimento">Vencimento</option>
                <option value="rendimento">Maior rendimento</option>
                <option value="valor">Maior valor</option>
                <option value="nome">Nome A-Z</option>
                <option value="cdi">% CDI</option>
              </select>
            </div>

            {Object.entries(grupos).length === 0 && (
              <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--fg3)' }}>Nenhum investimento encontrado.</div>
            )}

            {Object.entries(grupos).map(([objetivo, itens]) => {
              const totObj = itens.reduce((s, i) => s + Number(i.valorBruto || i.valor_investido || 0), 0);
              const invObj = itens.reduce((s, i) => s + Number(i.valor_investido || 0), 0);
              const liqObj = itens.reduce((s, i) => s + Number(i.valorLiquido || i.valor_investido || 0), 0);
              return (
                <div className="obj-section" key={objetivo}>
                  <div className="obj-header">
                    <div className="obj-title">
                      <div className="obj-icon">🎯</div>
                      <div>
                        <h2>{objetivo}</h2>
                        <span className="qtd">{itens.length} aplicacoes</span>
                      </div>
                    </div>
                    <div className="obj-total">
                      <div className="t-label">Total atual</div>
                      <div className="t-valor">{fmtR(totObj)}</div>
                      <div className="t-rend">+{fmtR(totObj - invObj)} · Liq: {fmtR(liqObj)}</div>
                    </div>
                  </div>

                  <div className="inv-grid">
                    {itens.map(inv => {
                      const vencDate = new Date(inv.data_vencimento);
                      const inicDate = new Date(inv.data_inicio);
                      const corridoDias = Math.max(0, Math.floor((hoje - inicDate) / 86400000));
                      const prazoTotalDias = Math.max(1, Math.floor((vencDate - inicDate) / 86400000));
                      const progPct = inv.progressoPct ?? Math.min(100, (corridoDias / prazoTotalDias) * 100);
                      const alerta = alertaVenc(inv);
                      const rendAnualInv = inv.taxaAnual || 0;
                      const rendMensalInv = rendAnualInv > 0 ? (Math.pow(1 + rendAnualInv / 100, 1 / 12) - 1) * 100 : 0;

                      // Aliquota ATUAL pelos dias corridos (para alerta IR e calculo de liquidez real)
                      const diasCorridos = inv.diasCorridos ?? corridoDias;
                      const aliqAtual = diasCorridos <= 180 ? 0.225 : diasCorridos <= 360 ? 0.20 : diasCorridos <= 720 ? 0.175 : 0.15;

                      // Equivalencia CDB: para TODO investimento isento de IR (LCA, LCI, CRI, CRA, etc)
                      // Responde: "esse investimento isento equivale a um CDB de X% do indexador considerando IR 22,5%"
                      // Usa sempre IR 22,5% (aliquota maxima) — referencia padrao de comparacao
                      let cdiComp = null;
                      if (inv.isento_ir) {
                        const equivCDB = inv.taxa / (1 - 0.225);
                        const valeApena = equivCDB >= 100;
                        const idx = inv.indexador === 'Prefixado' ? 'a.a.' : `do ${inv.indexador}`;
                        if (valeApena) {
                          cdiComp = <span className="cdi-badge cdi-acima">= CDB {fmt(equivCDB, 1)}% {idx} (IR 22,5%) - Vale a pena</span>;
                        } else {
                          cdiComp = <span className="cdi-badge cdi-abaixo">= CDB {fmt(equivCDB, 1)}% {idx} (IR 22,5%) - Nao compensa</span>;
                        }
                      }

                      // Rentabilidade real vs IPCA (usa aliq atual pelos dias corridos)
                      const taxaLiqAnual = inv.isento_ir ? rendAnualInv : rendAnualInv * (1 - aliqAtual);
                      const taxaRealAnual = taxaLiqAnual - (taxas.ipca || 0);

                      // Alerta IR regressivo: dias para proxima queda de aliquota
                      let alertaIR = null;
                      if (!inv.isento_ir) {
                        const proxPrazos = [180, 360, 720];
                        const proximo = proxPrazos.find(p => diasCorridos < p);
                        if (proximo) {
                          const diasFaltam = proximo - diasCorridos;
                          if (diasFaltam <= 90) {
                            const aliqAtualPct = aliqAtual * 100;
                            const aliqProxPct = proximo <= 180 ? 20 : proximo <= 360 ? 17.5 : 15;
                            alertaIR = `IR cai ${aliqAtualPct}% p/ ${aliqProxPct}% em ${diasFaltam} dias`;
                          }
                        }
                      }

                      const liquidez = inv.liquidez || 'Vencimento';
                      const isLiqD = liquidez === 'D+0' || liquidez === 'D+1' || liquidez === 'Diaria';
                      const simEstaAberto = simAberto === inv.id;
                      const sim = simEstaAberto ? calcSimulador(inv, simMeses) : null;

                      return (
                        <div className={`inv-card idx-${inv.indexador}`} key={inv.id}>
                          <div className="card-top">
                            <div className="card-nome">{inv.nome}</div>
                            <div className="card-badges">
                              <span className={`badge ${corBadge[inv.tipo] || 'badge-outro'}`}>{inv.tipo}</span>
                              {inv.isento_ir && <span className="badge badge-isento">Isento IR</span>}
                              {liquidez && liquidez !== 'Vencimento' && (
                                <span className={`badge ${isLiqD ? 'badge-liquidez' : 'badge-liquidez-d'}`}>{liquidez}</span>
                              )}
                            </div>
                          </div>
                          <div className="card-taxa">{inv.emissor} - {fmt(inv.taxa)}% {inv.indexador !== 'Prefixado' ? `do ${inv.indexador}` : 'a.a.'}</div>
                          {rendAnualInv > 0 && (
                            <div className="card-rend-row">
                              <span className="rend-pill rend-aa">{fmt(rendAnualInv)}% <span className="rend-period">a.a.</span></span>
                              <span className="rend-sep">-</span>
                              <span className="rend-pill rend-am">{fmt(rendMensalInv, 2)}% <span className="rend-period">a.m.</span></span>
                            </div>
                          )}
                          <div className="card-row">
                            <span className="ck">Investido</span>
                            <span className="cv">{fmtR(inv.valor_investido)}</span>
                          </div>
                          <div className="card-row">
                            <span className="ck">Valor bruto</span>
                            <span className="cv cv-green">{fmtR(inv.valorBruto || inv.valor_investido)}</span>
                          </div>
                          {!inv.isento_ir && (
                            <div className="card-row">
                              <span className="ck">Liq. (IR {inv.aliquotaIR}%)</span>
                              <span className="cv cv-green">{fmtR(inv.valorLiquido || inv.valor_investido)}</span>
                            </div>
                          )}
                          {cdiComp && <div className="cdi-comp">{cdiComp}</div>}
                          {taxas.ipca > 0 && rendAnualInv > 0 && (
                            <div className="rend-real-row">
                              <span style={{ fontSize: 10, color: 'var(--fg3)' }}>Real:</span>
                              <span className={`rend-real-badge ${taxaRealAnual >= 0 ? 'rend-real-pos' : 'rend-real-neg'}`}>
                                {fmtP(taxaRealAnual)} a.a. vs IPCA
                              </span>
                            </div>
                          )}
                          {alertaIR && (
                            <div className="rend-real-row">
                              <span className="alerta-ir">{alertaIR}</span>
                            </div>
                          )}
                          <div className="divider" />
                          <div className="prog-bar">
                            <div className="prog-fill" style={{ width: `${progPct}%`, background: corIdx[inv.indexador] || 'var(--accent)' }} />
                          </div>
                          <div className="prog-label">
                            <span>{inicDate.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' })}</span>
                            <span>{fmt(progPct, 0)}%</span>
                            <span>{vencDate.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' })}</span>
                          </div>
                          {alerta && (
                            <div className="alertas">
                              <span className={`alerta ${alerta.cls}`}>{alerta.txt}</span>
                            </div>
                          )}
                          {simEstaAberto && sim && (
                            <div className="simulador-box">
                              <div className="sim-title">Simulador de Reinvestimento</div>
                              <input className="sim-slider" type="range" min="1" max="60" value={simMeses}
                                onChange={e => setSimMeses(Number(e.target.value))} />
                              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--fg3)', marginBottom: 6 }}>
                                <span>1 mes</span>
                                <span style={{ fontWeight: 700, color: 'var(--purple)' }}>{simMeses} {simMeses === 1 ? 'mes' : 'meses'}</span>
                                <span>60 meses</span>
                              </div>
                              <div className="sim-resultado">
                                <div>
                                  <div style={{ fontSize: 10, color: 'var(--fg3)' }}>Valor projetado</div>
                                  <div className="sim-val">{fmtR(sim.valorFinal)}</div>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                  <div style={{ fontSize: 10, color: 'var(--fg3)' }}>Rendimento</div>
                                  <div className="sim-rend">+{fmtR(sim.rendimento)}</div>
                                  <div style={{ fontSize: 10, color: 'var(--fg3)' }}>{fmt(sim.taxaMensalPct, 3)}% a.m.</div>
                                </div>
                              </div>
                            </div>
                          )}
                          <div className="card-acoes">
                            <button className="btn-card-acao btn-editar" onClick={() => abrirEdit(inv)}>Editar</button>
                            <button className="btn-card-acao btn-vender" onClick={() => abrirVenda(inv)}>Vender</button>
                            <button className="btn-card-acao btn-sim" onClick={() => setSimAberto(simEstaAberto ? null : inv.id)}>
                              {simEstaAberto ? 'Fechar' : 'Simular'}
                            </button>
                            <button className="btn-card-acao btn-excluir" onClick={() => excluir(inv.id, inv.nome)}>Excluir</button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal">
            <div className="modal-head">
              <h3>Novo Lancamento de Renda Fixa</h3>
              <button className="btn-close" onClick={() => setShowModal(false)}>X</button>
            </div>
            <div className="modal-body">
              <div className="form-sec" style={{ borderTop: 'none', paddingTop: 0 }}>Objetivo (opcional)</div>
              <div className="form-grp">
                <label>Para que e esse investimento?</label>
                <input type="text" value={form.objetivo} placeholder="Ex: Reserva de emergencia, Futuro do filho..."
                  onChange={e => { setForm(f => ({ ...f, objetivo: e.target.value })); mostrarSugestoes(e.target.value); }}
                  onFocus={() => mostrarSugestoes(form.objetivo)} />
                {sugestoesFiltradas.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
                    {sugestoesFiltradas.map(o => (
                      <div key={o} className="obj-chip" onClick={() => { setForm(f => ({ ...f, objetivo: o })); setSugestoesFiltradas([]); }}>{o}</div>
                    ))}
                  </div>
                )}
              </div>
              <div className="form-sec">Dados do Investimento</div>
              <div className="form-grp">
                <label>Nome / Apelido</label>
                <input type="text" value={form.nome} placeholder="Ex: LCA Reserva Nov/28"
                  onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} />
              </div>
              <div className="form-row">
                <div className="form-grp">
                  <label>Tipo</label>
                  <select value={form.tipo} onChange={e => setForm(f => ({ ...f, tipo: e.target.value }))}>
                    {['LCA', 'LCI', 'CDB', 'Tesouro Direto', 'Debenture', 'Outro'].map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div className="form-grp">
                  <label>Instituicao</label>
                  <input type="text" value={form.emissor} placeholder="Ex: XP, Nubank, Itau..."
                    onChange={e => setForm(f => ({ ...f, emissor: e.target.value }))} />
                </div>
              </div>
              <div className="form-row">
                <div className="form-grp">
                  <label>Indexador</label>
                  <select value={form.indexador} onChange={e => setForm(f => ({ ...f, indexador: e.target.value }))}>
                    {['CDI', 'Selic', 'IPCA', 'Prefixado'].map(i => <option key={i}>{i}</option>)}
                  </select>
                </div>
                <div className="form-grp">
                  <label>Taxa (%)</label>
                  <input type="number" value={form.taxa} placeholder="Ex: 96.5"
                    onChange={e => setForm(f => ({ ...f, taxa: e.target.value }))} />
                </div>
              </div>
              <div className="form-row">
                <div className="form-grp">
                  <label>Valor Investido (R$)</label>
                  <input type="number" value={form.valor_investido} placeholder="Ex: 9000"
                    onChange={e => setForm(f => ({ ...f, valor_investido: e.target.value }))} />
                </div>
                <div className="form-grp">
                  <label>Isento de IR?</label>
                  <select value={form.isento_ir ? 'true' : 'false'}
                    onChange={e => setForm(f => ({ ...f, isento_ir: e.target.value === 'true' }))}>
                    <option value="true">Sim (LCA/LCI)</option>
                    <option value="false">Nao (CDB/outros)</option>
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-grp">
                  <label>Liquidez</label>
                  <select value={form.liquidez || 'Vencimento'}
                    onChange={e => setForm(f => ({ ...f, liquidez: e.target.value }))}>
                    <option value="Vencimento">No vencimento</option>
                    <option value="D+0">D+0 (imediata)</option>
                    <option value="D+1">D+1</option>
                    <option value="D+30">D+30</option>
                    <option value="Diaria">Diaria</option>
                  </select>
                </div>
                <div className="form-grp">
                  <label>Data de Aplicacao</label>
                  <input type="date" value={form.data_inicio}
                    onChange={e => setForm(f => ({ ...f, data_inicio: e.target.value }))} />
                </div>
              </div>
              <div className="form-grp">
                <label>Data de Vencimento</label>
                <input type="date" value={form.data_vencimento}
                  onChange={e => setForm(f => ({ ...f, data_vencimento: e.target.value }))} />
              </div>
              <div className="form-sec">Observacoes (opcional)</div>
              <div className="form-grp">
                <textarea placeholder="Condicoes especiais, motivo da escolha..." value={form.observacoes}
                  onChange={e => setForm(f => ({ ...f, observacoes: e.target.value }))} />
              </div>
            </div>
            <div className="modal-foot">
              <button className="btn-cancel" onClick={() => setShowModal(false)}>Cancelar</button>
              <button className="btn-salvar" onClick={salvar} disabled={salvando}>{salvando ? 'Salvando...' : 'Salvar'}</button>
            </div>
          </div>
        </div>
      )}

      {showEditModal && editando && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowEditModal(false)}>
          <div className="modal">
            <div className="modal-head">
              <h3>Editar Investimento</h3>
              <button className="btn-close" onClick={() => setShowEditModal(false)}>X</button>
            </div>
            <div className="modal-body">
              <div className="form-grp">
                <label>Nome</label>
                <input type="text" value={editando.nome} onChange={e => setEditando(f => ({ ...f, nome: e.target.value }))} />
              </div>
              <div className="form-row">
                <div className="form-grp">
                  <label>Tipo</label>
                  <select value={editando.tipo} onChange={e => setEditando(f => ({ ...f, tipo: e.target.value }))}>
                    {['LCA', 'LCI', 'CDB', 'Tesouro Direto', 'Debenture', 'Outro'].map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div className="form-grp">
                  <label>Indexador</label>
                  <select value={editando.indexador} onChange={e => setEditando(f => ({ ...f, indexador: e.target.value }))}>
                    {['CDI', 'Selic', 'IPCA', 'Prefixado'].map(i => <option key={i}>{i}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-grp">
                  <label>Taxa (%)</label>
                  <input type="number" value={editando.taxa} onChange={e => setEditando(f => ({ ...f, taxa: e.target.value }))} />
                </div>
                <div className="form-grp">
                  <label>Valor Investido (R$)</label>
                  <input type="number" value={editando.valor_investido} onChange={e => setEditando(f => ({ ...f, valor_investido: e.target.value }))} />
                </div>
              </div>
              <div className="form-row">
                <div className="form-grp">
                  <label>Data de Inicio</label>
                  <input type="date" value={editando.data_inicio} onChange={e => setEditando(f => ({ ...f, data_inicio: e.target.value }))} />
                </div>
                <div className="form-grp">
                  <label>Data de Vencimento</label>
                  <input type="date" value={editando.data_vencimento} onChange={e => setEditando(f => ({ ...f, data_vencimento: e.target.value }))} />
                </div>
              </div>
              <div className="form-row">
                <div className="form-grp">
                  <label>Emissor</label>
                  <input type="text" value={editando.emissor} onChange={e => setEditando(f => ({ ...f, emissor: e.target.value }))} />
                </div>
                <div className="form-grp">
                  <label>Liquidez</label>
                  <select value={editando.liquidez || 'Vencimento'} onChange={e => setEditando(f => ({ ...f, liquidez: e.target.value }))}>
                    <option value="Vencimento">No vencimento</option>
                    <option value="D+0">D+0</option>
                    <option value="D+1">D+1</option>
                    <option value="D+30">D+30</option>
                    <option value="Diaria">Diaria</option>
                  </select>
                </div>
              </div>
              <div className="form-grp">
                <label>Objetivo</label>
                <input type="text" value={editando.objetivo} onChange={e => setEditando(f => ({ ...f, objetivo: e.target.value }))} />
              </div>
              <div className="form-grp">
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                  <input type="checkbox" checked={editando.isento_ir}
                    onChange={e => setEditando(f => ({ ...f, isento_ir: e.target.checked }))} />
                  Isento de IR (LCI, LCA, CRI, CRA)
                </label>
              </div>
            </div>
            <div className="modal-foot">
              <button className="btn-cancel" onClick={() => setShowEditModal(false)}>Cancelar</button>
              <button className="btn-salvar" onClick={salvarEdit} disabled={salvandoEdit}>{salvandoEdit ? 'Salvando...' : 'Salvar'}</button>
            </div>
          </div>
        </div>
      )}

      {showVendaModal && vendendo && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowVendaModal(false)}>
          <div className="modal" style={{ maxWidth: 400 }}>
            <div className="modal-head">
              <h3>Registrar Venda</h3>
              <button className="btn-close" onClick={() => setShowVendaModal(false)}>X</button>
            </div>
            <div className="modal-body">
              <p style={{ color: 'var(--fg2)', marginBottom: 16 }}>{vendendo.nome}</p>
              <div className="form-grp">
                <label>Valor investido</label>
                <div style={{ padding: '8px 12px', background: 'var(--bg)', borderRadius: 8, color: 'var(--fg2)', fontSize: 14 }}>{fmtR(vendendo.valor_investido)}</div>
              </div>
              <div className="form-grp">
                <label>Valor da venda (R$)</label>
                <input type="number" value={valorVenda} onChange={e => setValorVenda(e.target.value)} />
                <span className="form-hint">
                  {parseFloat(valorVenda) >= parseFloat(vendendo.valor_investido)
                    ? 'Venda total - registro sera removido'
                    : `Venda parcial - restara ${fmtR(parseFloat(vendendo.valor_investido) - (parseFloat(valorVenda) || 0))}`}
                </span>
              </div>
            </div>
            <div className="modal-foot">
              <button className="btn-cancel" onClick={() => setShowVendaModal(false)}>Cancelar</button>
              <button className="btn-salvar" onClick={confirmarVenda} disabled={salvandoVenda || !valorVenda}>{salvandoVenda ? 'Registrando...' : 'Confirmar'}</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
