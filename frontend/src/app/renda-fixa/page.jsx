'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

// ── Utilitários ──────────────────────────────────────────────────────────────
const fmt = (v, dec = 2) =>
  Number(v).toLocaleString('pt-BR', { minimumFractionDigits: dec, maximumFractionDigits: dec });
const fmtR = (v) => `R$ ${fmt(v)}`;
const fmtP = (v) => `${v >= 0 ? '+' : ''}${fmt(v)}%`;

// ── Componente principal ─────────────────────────────────────────────────────
export default function RendaFixa() {
  const router = useRouter();

  const [investimentos, setInvestimentos] = useState([]);
  const [taxas, setTaxas] = useState({ cdi: 0, selic: 0, ipca: 0 });
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState(null);
  const [showTimeline, setShowTimeline] = useState(false);
  const [showModal, setShowModal] = useState(false);

  // Filtros
  const [filtroObjetivo, setFiltroObjetivo] = useState('Todos');
  const [filtroTipo, setFiltroTipo] = useState('Todos');
  const [filtroIdx, setFiltroIdx] = useState('Todos');
  const [filtroVenc, setFiltroVenc] = useState('Todos');
  const [sortBy, setSortBy] = useState('vencimento');

  // Form
  const [form, setForm] = useState({
    nome: '', tipo: 'LCA', indexador: 'CDI', taxa: '', valor_investido: '',
    isento_ir: true, data_inicio: '', data_vencimento: '', emissor: '',
    objetivo: '', meta_valor: '', meta_descricao: '', observacoes: ''
  });
  const [sugestoesFiltradas, setSugestoesFiltradas] = useState([]);
  const [salvando, setSalvando] = useState(false);

  // ── Buscar dados ────────────────────────────────────────────────────────────
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

  // ── Derivados ───────────────────────────────────────────────────────────────
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
        if (filtroVenc === 'Este mês' && dias > 30) return false;
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

  // Grupos por objetivo
  const grupos = {};
  filtrados.forEach(i => {
    const k = i.objetivo || 'Sem objetivo';
    if (!grupos[k]) grupos[k] = [];
    grupos[k].push(i);
  });

  // Totais
  const totalInvestido = investimentos.reduce((s, i) => s + Number(i.valor_investido || 0), 0);
  const totalBruto = investimentos.reduce((s, i) => s + Number(i.valorBruto || i.valor_investido || 0), 0);
  const totalLiquido = investimentos.reduce((s, i) => s + Number(i.valorLiquido || i.valor_investido || 0), 0);
  const rendTotalR = totalBruto - totalInvestido;
  const rendTotalPct = totalInvestido > 0 ? (rendTotalR / totalInvestido) * 100 : 0;
  const rendMedioPct = investimentos.length > 0
    ? investimentos.reduce((s, i) => s + Number(i.rendBrutoPct || 0), 0) / investimentos.length : 0;
  // Rendimento mensal equivalente (taxa mensal = (1 + taxa_anual/100)^(1/12) - 1)
  const rendMedioMensal = rendMedioPct > 0 ? (Math.pow(1 + rendMedioPct / 100, 1 / 12) - 1) * 100 : 0;
  const rendTotalMensal = rendTotalPct > 0 ? (Math.pow(1 + rendTotalPct / 100, 1 / 12) - 1) * 100 : 0;

  // Próximo vencimento
  const proxVenc = [...investimentos].sort((a, b) =>
    new Date(a.data_vencimento) - new Date(b.data_vencimento)
  ).find(i => new Date(i.data_vencimento) > hoje);
  const diasProx = proxVenc
    ? Math.ceil((new Date(proxVenc.data_vencimento) - hoje) / 86400000) : null;

  // Sugestões de objetivo
  const objetivosExistentes = [...new Set(investimentos.map(i => i.objetivo).filter(Boolean))];
  const mostrarSugestoes = (val) => {
    setSugestoesFiltradas(objetivosExistentes.filter(o =>
      !val || o.toLowerCase().includes(val.toLowerCase())
    ));
  };

  // ── Salvar novo investimento ────────────────────────────────────────────────
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
      setForm({
        nome: '', tipo: 'LCA', indexador: 'CDI', taxa: '', valor_investido: '',
        isento_ir: true, data_inicio: '', data_vencimento: '', emissor: '',
        objetivo: '', meta_valor: '', meta_descricao: '', observacoes: ''
      });
    } catch (e) {
      alert(e.message);
    } finally {
      setSalvando(false);
    }
  };

  // ── Editar investimento ─────────────────────────────────────────────────────
  const [editando, setEditando] = useState(null); // objeto inv sendo editado
  const [showEditModal, setShowEditModal] = useState(false);
  const [salvandoEdit, setSalvandoEdit] = useState(false);

  const abrirEdit = (inv) => {
    setEditando({
      id: inv.id, nome: inv.nome, tipo: inv.tipo, indexador: inv.indexador,
      taxa: String(inv.taxa), valor_investido: String(inv.valor_investido),
      isento_ir: inv.isento_ir, data_inicio: inv.data_inicio?.slice(0,10) || '',
      data_vencimento: inv.data_vencimento?.slice(0,10) || '',
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
        body: JSON.stringify({
          ...editando,
          taxa: parseFloat(editando.taxa),
          valor_investido: parseFloat(editando.valor_investido),
          isento_ir: editando.isento_ir === true || editando.isento_ir === 'true',
        }),
      });
      const atualizado = await res.json();
      if (!res.ok) throw new Error(atualizado.error || 'Erro');
      setInvestimentos(prev => prev.map(i => i.id === editando.id ? { ...i, ...atualizado } : i));
      setShowEditModal(false);
      setEditando(null);
    } catch (e) {
      alert(e.message);
    } finally {
      setSalvandoEdit(false);
    }
  };

  // ── Excluir investimento ────────────────────────────────────────────────────
  const excluir = async (id, nome) => {
    if (!confirm(`Excluir "${nome}"? Esta ação não pode ser desfeita.`)) return;
    const token = localStorage.getItem('token');
    try {
      const res = await fetch(`/_/backend/api/renda-fixa/${id}`, {
        method: 'DELETE', headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Erro ao excluir');
      setInvestimentos(prev => prev.filter(i => i.id !== id));
    } catch (e) {
      alert(e.message);
    }
  };

  // ── Vender investimento ─────────────────────────────────────────────────────
  const [vendendo, setVendendo] = useState(null); // { id, nome, valor_investido }
  const [showVendaModal, setShowVendaModal] = useState(false);
  const [valorVenda, setValorVenda] = useState('');
  const [salvandoVenda, setSalvandoVenda] = useState(false);

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
        body: JSON.stringify({ valor_venda: parseFloat(valorVenda), data_venda: new Date().toISOString().slice(0,10) }),
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
    } catch (e) {
      alert(e.message);
    } finally {
      setSalvandoVenda(false);
    }
  };

  // ── Cor por indexador ───────────────────────────────────────────────────────
  const corIdx = { CDI: '#1a56db', Selic: '#0c9e6a', IPCA: '#7c3aed', Prefixado: '#d97706' };
  const corBadge = {
    LCA: 'badge-lca', LCI: 'badge-lci', CDB: 'badge-cdb',
    'Tesouro Direto': 'badge-teso', Debênture: 'badge-deb', Outro: 'badge-outro'
  };

  // ── Alerta vencimento ───────────────────────────────────────────────────────
  const alertaVenc = (inv) => {
    const dias = inv.diasParaVencer ?? Math.ceil((new Date(inv.data_vencimento) - hoje) / 86400000);
    if (dias <= 0) return { cls: 'alerta-vencido', txt: 'Vencido' };
    if (dias <= 30) return { cls: 'alerta-critico', txt: `🚨 Vence em ${dias} dias` };
    if (dias <= 90) return { cls: 'alerta-atencao', txt: `⚠️ Vence em ${dias} dias — planeje o reinvestimento` };
    if (dias <= 180) return { cls: 'alerta-info', txt: `📅 Vence em ${dias} dias` };
    return null;
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh', color: 'var(--fg2)' }}>
      Carregando...
    </div>
  );
  if (erro) return (
    <div style={{ padding: '32px', color: 'var(--red)' }}>{erro}</div>
  );

  return (
    <>
      <style>{`
        /* ── Tokens ── */
        :root {
          --bg:#f0f2f5; --surface:#fff; --surface2:#f8f9fb; --border:#e2e6ed;
          --fg:#0f1923; --fg2:#5a6474; --fg3:#8e98a8;
          --accent:#1a56db; --accent-light:#e8effe;
          --green:#0c9e6a; --green-light:#e3f6ee;
          --yellow:#d97706; --yellow-light:#fef3c7;
          --red:#dc2626; --red-light:#fee2e2;
          --purple:#7c3aed; --purple-light:#ede9fe;
          --teal:#0891b2; --teal-light:#e0f9ff;
          --radius:12px; --radius-sm:8px;
          --shadow:0 1px 3px rgba(0,0,0,.08);
          --shadow-md:0 4px 12px rgba(0,0,0,.10);
        }
        @media(prefers-color-scheme:dark){
          :root:not([data-theme=light]){
            --bg:#0d1117; --surface:#161b22; --surface2:#1c2230; --border:#2a3140;
            --fg:#e6edf3; --fg2:#8b949e; --fg3:#484f58;
            --accent:#4f8ef7; --accent-light:#1a2744;
            --green:#3fb884; --green-light:#0d2b1e;
            --yellow:#f59e0b; --yellow-light:#2a1f07;
            --red:#f87171; --red-light:#2a0f0f;
            --purple:#a78bfa; --purple-light:#1e1434;
            --teal:#22d3ee; --teal-light:#061e24;
          }
        }
        :root[data-theme=dark]{
          --bg:#0d1117; --surface:#161b22; --surface2:#1c2230; --border:#2a3140;
          --fg:#e6edf3; --fg2:#8b949e; --fg3:#484f58;
          --accent:#4f8ef7; --accent-light:#1a2744;
          --green:#3fb884; --green-light:#0d2b1e;
          --yellow:#f59e0b; --yellow-light:#2a1f07;
          --red:#f87171; --red-light:#2a0f0f;
          --purple:#a78bfa; --purple-light:#1e1434;
          --teal:#22d3ee; --teal-light:#061e24;
        }

        .rf-wrap{padding:24px 16px;max-width:1200px;margin:0 auto;}
        /* Header */
        .rf-header{display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;margin-bottom:20px;}
        .rf-header h1{font-size:20px;font-weight:700;letter-spacing:-.3px;}
        .rf-header h1 span{color:var(--accent);}
        .rf-header-right{display:flex;gap:8px;}
        .btn-outline{display:flex;align-items:center;gap:5px;background:var(--surface);color:var(--fg2);border:1px solid var(--border);border-radius:var(--radius-sm);padding:8px 14px;font-size:13px;font-weight:500;cursor:pointer;}
        .btn-outline:hover{border-color:var(--accent);color:var(--accent);}
        .btn-primary{display:flex;align-items:center;gap:6px;background:var(--accent);color:#fff;border:none;border-radius:var(--radius-sm);padding:8px 16px;font-size:13px;font-weight:600;cursor:pointer;}
        /* Taxas */
        .taxas-bar{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px;}
        .taxa-pill{display:flex;align-items:center;gap:6px;background:var(--surface);border:1px solid var(--border);border-radius:20px;padding:5px 12px;font-size:12px;}
        .t-nome{color:var(--fg3);font-weight:600;text-transform:uppercase;letter-spacing:.4px;}
        .t-val{font-weight:700;font-variant-numeric:tabular-nums;}
        /* Resumo */
        .resumo-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(155px,1fr));gap:12px;margin-bottom:20px;}
        .resumo-card{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:16px;box-shadow:var(--shadow);}
        .r-label{font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.6px;color:var(--fg3);margin-bottom:6px;}
        .r-valor{font-size:20px;font-weight:700;font-variant-numeric:tabular-nums;line-height:1.1;}
        .r-sub{font-size:12px;color:var(--fg2);margin-top:3px;}
        .r-delta{display:inline-flex;align-items:center;gap:3px;font-size:12px;font-weight:600;margin-top:4px;padding:2px 7px;border-radius:4px;}
        .delta-pos{background:var(--green-light);color:var(--green);}
        .venc-card{border-left:3px solid var(--yellow);}
        .venc-card .r-valor{color:var(--yellow);font-size:16px;}
        /* Timeline */
        .timeline-section{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:18px 20px;margin-bottom:20px;box-shadow:var(--shadow);}
        .tl-row{display:flex;align-items:center;gap:10px;margin-bottom:10px;}
        .tl-nome{font-size:12px;color:var(--fg2);width:140px;flex-shrink:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
        .tl-track{flex:1;height:8px;background:var(--border);border-radius:4px;}
        .tl-fill{height:100%;border-radius:4px;}
        .tl-data{font-size:11px;color:var(--fg3);width:60px;flex-shrink:0;text-align:right;}
        /* Filtros */
        .filtros-bar{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:14px 16px;margin-bottom:20px;display:flex;flex-wrap:wrap;gap:10px;align-items:center;box-shadow:var(--shadow);}
        .filtro-label{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.6px;color:var(--fg3);}
        .chip-group{display:flex;flex-wrap:wrap;gap:6px;}
        .chip{padding:4px 11px;border-radius:20px;border:1px solid var(--border);background:var(--surface2);color:var(--fg2);font-size:12px;font-weight:500;cursor:pointer;transition:all .15s;}
        .chip:hover{border-color:var(--accent);color:var(--accent);}
        .chip.active{background:var(--accent-light);border-color:var(--accent);color:var(--accent);font-weight:600;}
        .filtro-divider{width:1px;height:28px;background:var(--border);}
        .sort-sel{margin-left:auto;padding:5px 10px;border:1px solid var(--border);border-radius:var(--radius-sm);background:var(--surface2);color:var(--fg2);font-size:12px;cursor:pointer;}
        /* Objetivo section */
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
        /* Meta barra */
        .meta-barra{background:var(--surface2);border:1px solid var(--border);border-radius:var(--radius-sm);padding:10px 14px;margin-bottom:12px;display:flex;align-items:center;gap:12px;}
        .meta-info .meta-label{font-size:11px;color:var(--fg3);margin-bottom:4px;}
        .meta-track{height:6px;background:var(--border);border-radius:3px;overflow:hidden;}
        .meta-fill{height:100%;border-radius:3px;background:var(--accent);}
        .meta-pct{font-size:13px;font-weight:700;color:var(--accent);white-space:nowrap;}
        /* Cards */
        .inv-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:12px;}
        .inv-card{background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);padding:16px;box-shadow:var(--shadow);position:relative;overflow:hidden;transition:box-shadow .2s,transform .15s;cursor:pointer;}
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
        .divider{height:1px;background:var(--border);margin:10px 0;}
        .prog-bar{height:4px;background:var(--border);border-radius:2px;overflow:hidden;margin-bottom:4px;}
        .prog-fill{height:100%;border-radius:2px;background:var(--accent);}
        .prog-label{display:flex;justify-content:space-between;font-size:10px;color:var(--fg3);}
        .projecao{background:var(--surface2);border:1px solid var(--border);border-radius:var(--radius-sm);padding:8px 10px;margin-top:10px;display:flex;justify-content:space-between;align-items:center;gap:8px;}
        .pj-label{font-size:11px;color:var(--fg3);}
        .pj-val{font-size:13px;font-weight:700;color:var(--accent);font-variant-numeric:tabular-nums;}
        .alertas{display:flex;flex-wrap:wrap;gap:5px;margin-top:8px;}
        .alerta{display:inline-flex;align-items:center;gap:4px;font-size:11px;font-weight:600;padding:3px 8px;border-radius:4px;}
        .alerta-critico{background:var(--red-light);color:var(--red);}
        .alerta-atencao{background:var(--yellow-light);color:var(--yellow);}
        .alerta-info{background:var(--accent-light);color:var(--accent);}
        .alerta-vencido{background:var(--border);color:var(--fg2);}
        .card-acoes{display:flex;gap:6px;margin-top:10px;border-top:1px solid var(--border);padding-top:10px;}
        .btn-card-acao{flex:1;padding:6px 4px;border:1px solid var(--border);border-radius:6px;font-size:11px;font-weight:600;cursor:pointer;background:var(--surface);color:var(--fg2);transition:all .15s;letter-spacing:.01em;}
        .btn-card-acao:hover{background:var(--bg);color:var(--fg);}
        .btn-editar:hover{border-color:var(--accent);color:var(--accent);}
        .btn-vender:hover{border-color:var(--green);color:var(--green);}
        .btn-excluir:hover{border-color:var(--red);color:var(--red);}
        /* Modal */
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
        {/* Header */}
        <div className="rf-header">
          <h1>Renda <span>Fixa</span></h1>
          <div className="rf-header-right">
            <button className="btn-outline" onClick={() => setShowTimeline(v => !v)}>
              📅 Vencimentos
            </button>
            <button className="btn-primary" onClick={() => setShowModal(true)}>
              + Novo Lançamento
            </button>
          </div>
        </div>

        {/* Taxas do dia */}
        <div className="taxas-bar">
          <div className="taxa-pill">
            <span className="t-nome">CDI</span>
            <span className="t-val" style={{ color: 'var(--accent)' }}>{fmt(taxas.cdi, 2)}% a.a.</span>
          </div>
          <div className="taxa-pill">
            <span className="t-nome">Selic</span>
            <span className="t-val" style={{ color: 'var(--green)' }}>{fmt(taxas.selic, 2)}% a.a.</span>
          </div>
          <div className="taxa-pill">
            <span className="t-nome">IPCA</span>
            <span className="t-val" style={{ color: 'var(--purple)' }}>{fmt(taxas.ipca, 2)}% a.a.</span>
          </div>
          <span style={{ fontSize: 11, color: 'var(--fg3)', alignSelf: 'center' }}>Atualizado via BCB</span>
        </div>

        {/* Resumo */}
        <div className="resumo-grid">
          <div className="resumo-card">
            <div className="r-label">Total Investido</div>
            <div className="r-valor">{fmtR(totalInvestido)}</div>
            <div className="r-sub">{investimentos.length} aplicações</div>
          </div>
          <div className="resumo-card">
            <div className="r-label">Valor Bruto Atual</div>
            <div className="r-valor" style={{ color: 'var(--green)' }}>{fmtR(totalBruto)}</div>
            <div className="r-delta delta-pos">▲ {fmtR(rendTotalR)} ({fmt(rendTotalPct)}%)</div>
          </div>
          <div className="resumo-card">
            <div className="r-label">Valor Líquido (IR)</div>
            <div className="r-valor" style={{ color: 'var(--green)' }}>{fmtR(totalLiquido)}</div>
            <div className="r-sub">IR descontado: {fmtR(totalBruto - totalLiquido)}</div>
          </div>
          <div className="resumo-card">
            <div className="r-label">Rendimento Médio</div>
            <div className="r-valor" style={{ color: 'var(--accent)' }}>{fmt(rendMedioPct)}% <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--fg2)' }}>a.a.</span></div>
            <div className="r-sub" style={{ marginBottom: 2 }}>≈ {taxas.cdi > 0 ? fmt((rendMedioPct / taxas.cdi) * 100) : '–'}% do CDI atual</div>
            <div className="r-sub" style={{ color: 'var(--green)', fontWeight: 600 }}>≈ {fmt(rendMedioMensal, 2)}% a.m.</div>
          </div>
          {proxVenc && (
            <div className="resumo-card venc-card">
              <div className="r-label">Próximo Vencimento</div>
              <div className="r-valor">{proxVenc.nome}</div>
              <div className="r-sub">
                {diasProx <= 90 ? '⚠️' : '📅'} {diasProx} dias · {new Date(proxVenc.data_vencimento).toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' })}
              </div>
            </div>
          )}
        </div>

        {/* Timeline */}
        {showTimeline && (
          <div className="timeline-section">
            <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 14 }}>📅 Linha do Tempo — Vencimentos</div>
            {[...investimentos]
              .sort((a, b) => new Date(a.data_vencimento) - new Date(b.data_vencimento))
              .map(inv => {
                const inicio = new Date(inv.data_inicio);
                const venc = new Date(inv.data_vencimento);
                const total = Math.max(1, venc - inicio);
                const corrido = Math.min(hoje - inicio, total);
                const pct = Math.max(2, Math.min(98, (corrido / total) * 100));
                const cor = corIdx[inv.indexador] || '#8e98a8';
                return (
                  <div className="tl-row" key={inv.id}>
                    <div className="tl-nome">{inv.nome}</div>
                    <div className="tl-track">
                      <div className="tl-fill" style={{ width: `${pct}%`, background: cor }} />
                    </div>
                    <div className="tl-data">
                      {new Date(inv.data_vencimento).toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' })}
                      {(inv.diasParaVencer ?? 999) <= 90 ? ' ⚠️' : ''}
                    </div>
                  </div>
                );
              })}
            <div style={{ fontSize: 11, color: 'var(--fg3)', marginTop: 8 }}>
              A barra indica quanto do prazo total já transcorreu.
            </div>
          </div>
        )}

        {/* Filtros */}
        <div className="filtros-bar">
          <span className="filtro-label">Objetivo</span>
          <div className="chip-group">
            {objetivosUnicos.map(o => (
              <div key={o} className={`chip${filtroObjetivo === o ? ' active' : ''}`}
                onClick={() => setFiltroObjetivo(o)}>{o}</div>
            ))}
          </div>
          <div className="filtro-divider" />
          <span className="filtro-label">Tipo</span>
          <div className="chip-group">
            {tiposUnicos.map(t => (
              <div key={t} className={`chip${filtroTipo === t ? ' active' : ''}`}
                onClick={() => setFiltroTipo(t)}>{t}</div>
            ))}
          </div>
          <div className="filtro-divider" />
          <span className="filtro-label">Indexador</span>
          <div className="chip-group">
            {['Todos', 'CDI', 'Selic', 'IPCA', 'Prefixado'].map(i => (
              <div key={i} className={`chip${filtroIdx === i ? ' active' : ''}`}
                onClick={() => setFiltroIdx(i)}>{i}</div>
            ))}
          </div>
          <div className="filtro-divider" />
          <span className="filtro-label">Vencimento</span>
          <div className="chip-group">
            {['Todos', 'Este mês', '90 dias', 'Este ano'].map(v => (
              <div key={v} className={`chip${filtroVenc === v ? ' active' : ''}`}
                onClick={() => setFiltroVenc(v)}>{v}</div>
            ))}
          </div>
          <select className="sort-sel" value={sortBy} onChange={e => setSortBy(e.target.value)}>
            <option value="vencimento">Ordenar: Vencimento ↑</option>
            <option value="rendimento">Ordenar: Maior rendimento</option>
            <option value="valor">Ordenar: Maior valor</option>
            <option value="nome">Ordenar: Nome A–Z</option>
            <option value="cdi">Ordenar: % CDI</option>
          </select>
        </div>

        {/* Grupos por objetivo */}
        {Object.entries(grupos).length === 0 && (
          <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--fg3)' }}>
            Nenhum investimento encontrado com esses filtros.
          </div>
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
                    <span className="qtd">{itens.length} aplicaç{itens.length === 1 ? 'ão' : 'ões'}</span>
                  </div>
                </div>
                <div className="obj-total">
                  <div className="t-label">Total atual</div>
                  <div className="t-valor">{fmtR(totObj)}</div>
                  <div className="t-rend">+{fmtR(totObj - invObj)} · Líq: {fmtR(liqObj)}</div>
                </div>
              </div>

              <div className="inv-grid">
                {itens.map(inv => {
                  const vencDate = new Date(inv.data_vencimento);
                  const inicDate = new Date(inv.data_inicio);
                  const totalDias = Math.max(1, Math.floor((vencDate - inicDate) / 86400000));
                  const corridoDias = Math.max(0, Math.floor((hoje - inicDate) / 86400000));
                  const progPct = inv.progressoPct ?? Math.min(100, (corridoDias / totalDias) * 100);
                  const alerta = alertaVenc(inv);

                  // Rendimento mensal do investimento
                  const rendAnualInv = inv.rendBrutoPct || 0;
                  const rendMensalInv = rendAnualInv > 0 ? (Math.pow(1 + rendAnualInv / 100, 1 / 12) - 1) * 100 : 0;

                  // Comparativo CDI com contexto de isenção IR
                  let cdiComp = null;
                  if (inv.indexador === 'CDI' && taxas.cdi > 0) {
                    const taxaEfetiva = (inv.taxa / 100) * taxas.cdi;
                    const diff = taxaEfetiva - taxas.cdi;
                    if (diff >= 0) {
                      cdiComp = <span className="cdi-badge cdi-acima">▲ {fmt(diff, 1)}% acima do CDI</span>;
                    } else if (inv.isento_ir) {
                      // Isento IR: compara com CDB equivalente (tabela regressiva ~15-20%)
                      const aliquota = 0.175; // alíquota média estimada
                      const cdiLiquido = taxas.cdi * (1 - aliquota);
                      const diffLiquido = taxaEfetiva - cdiLiquido;
                      cdiComp = diffLiquido >= 0
                        ? <span className="cdi-badge cdi-acima">✓ Isento IR compensa · +{fmt(diffLiquido, 1)}% liq.</span>
                        : <span className="cdi-badge cdi-abaixo">▼ {fmt(Math.abs(diff), 1)}% abaixo do CDI</span>;
                    } else {
                      cdiComp = <span className="cdi-badge cdi-abaixo">▼ {fmt(Math.abs(diff), 1)}% abaixo do CDI</span>;
                    }
                  }

                  return (
                    <div className={`inv-card idx-${inv.indexador}${inv.vencido ? ' vencido' : ''}`} key={inv.id}>
                      <div className="card-top">
                        <div className="card-nome">{inv.nome}</div>
                        <div className="card-badges">
                          <span className={`badge ${corBadge[inv.tipo] || 'badge-outro'}`}>{inv.tipo}</span>
                          {inv.isento_ir && <span className="badge badge-isento">Isento IR</span>}
                          {inv.vencido && <span className="badge" style={{ background: 'var(--border)', color: 'var(--fg3)' }}>Vencido</span>}
                        </div>
                      </div>
                      <div className="card-taxa">
                        {inv.emissor} · {fmt(inv.taxa)}% {inv.indexador !== 'Prefixado' ? `do ${inv.indexador}` : 'a.a.'}
                      </div>
                      {rendAnualInv > 0 && (
                        <div className="card-rend-row">
                          <span className="rend-pill rend-aa">≈ {fmt(rendAnualInv)}% <span className="rend-period">a.a.</span></span>
                          <span className="rend-sep">·</span>
                          <span className="rend-pill rend-am">≈ {fmt(rendMensalInv, 2)}% <span className="rend-period">a.m.</span></span>
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
                          <span className="ck">Valor líquido (IR {inv.aliquotaIR}%)</span>
                          <span className="cv cv-green">{fmtR(inv.valorLiquido || inv.valor_investido)}</span>
                        </div>
                      )}
                      {cdiComp && (
                        <div className="cdi-comp">{cdiComp}</div>
                      )}
                      <div className="divider" />
                      <div className="prog-bar">
                        <div className="prog-fill" style={{ width: `${progPct}%`, background: corIdx[inv.indexador] || 'var(--accent)' }} />
                      </div>
                      <div className="prog-label">
                        <span>{inicDate.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' })}</span>
                        <span>{fmt(progPct, 0)}% do prazo</span>
                        <span>{vencDate.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' })}</span>
                      </div>
                      {alerta && (
                        <div className="alertas">
                          <span className={`alerta ${alerta.cls}`}>{alerta.txt}</span>
                        </div>
                      )}
                      <div className="card-acoes">
                        <button className="btn-card-acao btn-editar" onClick={() => abrirEdit(inv)} title="Editar">✏️ Editar</button>
                        <button className="btn-card-acao btn-vender" onClick={() => abrirVenda(inv)} title="Registrar venda">💰 Vender</button>
                        <button className="btn-card-acao btn-excluir" onClick={() => excluir(inv.id, inv.nome)} title="Excluir">🗑️ Excluir</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal">
            <div className="modal-head">
              <h3>Novo Lançamento de Renda Fixa</h3>
              <button className="btn-close" onClick={() => setShowModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-sec" style={{ borderTop: 'none', paddingTop: 0 }}>
                🎯 Objetivo <span style={{ fontWeight: 400, color: 'var(--fg3)', textTransform: 'none', letterSpacing: 0 }}>(opcional)</span>
              </div>
              <div className="form-grp">
                <label>Para que é esse investimento? <span style={{ color: 'var(--fg3)', fontWeight: 400 }}>— deixe em branco se não houver</span></label>
                <input
                  type="text"
                  value={form.objetivo}
                  placeholder="Ex: Reserva de emergência, Futuro do filho..."
                  onChange={e => { setForm(f => ({ ...f, objetivo: e.target.value })); mostrarSugestoes(e.target.value); }}
                  onFocus={() => mostrarSugestoes(form.objetivo)}
                />
                {sugestoesFiltradas.length > 0 && (
                  <div style={{ marginTop: 6 }}>
                    <span className="form-hint" style={{ display: 'block', marginBottom: 5 }}>Objetivos já cadastrados:</span>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {sugestoesFiltradas.map(o => (
                        <div key={o} className="obj-chip"
                          onClick={() => { setForm(f => ({ ...f, objetivo: o })); setSugestoesFiltradas([]); }}>
                          {o}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <span className="form-hint">💡 Sem objetivo, aparece em &quot;Sem objetivo&quot; na listagem.</span>
              </div>

              <div className="form-sec">📋 Dados do Investimento</div>
              <div className="form-grp">
                <label>Nome / Apelido</label>
                <input type="text" value={form.nome} placeholder="Ex: LCA Reserva Nov/28"
                  onChange={e => setForm(f => ({ ...f, nome: e.target.value }))} />
              </div>
              <div className="form-row">
                <div className="form-grp">
                  <label>Tipo</label>
                  <select value={form.tipo} onChange={e => setForm(f => ({ ...f, tipo: e.target.value }))}>
                    <option>LCA</option><option>LCI</option><option>CDB</option>
                    <option>Tesouro Direto</option><option>Debênture</option><option>Outro</option>
                  </select>
                </div>
                <div className="form-grp">
                  <label>Instituição</label>
                  <input type="text" value={form.emissor} placeholder="Ex: XP, Nubank, Itaú..."
                    onChange={e => setForm(f => ({ ...f, emissor: e.target.value }))} />
                </div>
              </div>
              <div className="form-row">
                <div className="form-grp">
                  <label>Indexador</label>
                  <select value={form.indexador} onChange={e => setForm(f => ({ ...f, indexador: e.target.value }))}>
                    <option>CDI</option><option>Selic</option>
                    <option>IPCA</option><option>Prefixado</option>
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
                    <option value="false">Não (CDB/outros)</option>
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-grp">
                  <label>Data de Aplicação</label>
                  <input type="date" value={form.data_inicio}
                    onChange={e => setForm(f => ({ ...f, data_inicio: e.target.value }))} />
                </div>
                <div className="form-grp">
                  <label>Data de Vencimento</label>
                  <input type="date" value={form.data_vencimento}
                    onChange={e => setForm(f => ({ ...f, data_vencimento: e.target.value }))} />
                </div>
              </div>

              <div className="form-sec">📝 Observações <span style={{ fontWeight: 400, color: 'var(--fg3)', textTransform: 'none', letterSpacing: 0 }}>(opcional)</span></div>
              <div className="form-grp">
                <textarea placeholder="Condições especiais, motivo da escolha..."
                  value={form.observacoes}
                  onChange={e => setForm(f => ({ ...f, observacoes: e.target.value }))} />
              </div>
            </div>
            <div className="modal-foot">
              <button className="btn-cancel" onClick={() => setShowModal(false)}>Cancelar</button>
              <button className="btn-salvar" onClick={salvar} disabled={salvando}>
                {salvando ? 'Salvando...' : 'Salvar Lançamento'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Editar */}
      {showEditModal && editando && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowEditModal(false)}>
          <div className="modal">
            <div className="modal-head">
              <h3>Editar Investimento</h3>
              <button className="btn-close" onClick={() => setShowEditModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="form-grp">
                <label>Nome / Instituição</label>
                <input type="text" value={editando.nome} onChange={e => setEditando(f => ({...f, nome: e.target.value}))} />
              </div>
              <div className="form-row">
                <div className="form-grp">
                  <label>Tipo</label>
                  <select value={editando.tipo} onChange={e => setEditando(f => ({...f, tipo: e.target.value}))}>
                    {['LCA','LCI','CDB','Tesouro Direto','Debênture','Outro'].map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div className="form-grp">
                  <label>Indexador</label>
                  <select value={editando.indexador} onChange={e => setEditando(f => ({...f, indexador: e.target.value}))}>
                    {['CDI','Selic','IPCA','Prefixado'].map(i => <option key={i}>{i}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-grp">
                  <label>Taxa (%)</label>
                  <input type="number" value={editando.taxa} onChange={e => setEditando(f => ({...f, taxa: e.target.value}))} />
                </div>
                <div className="form-grp">
                  <label>Valor Investido (R$)</label>
                  <input type="number" value={editando.valor_investido} onChange={e => setEditando(f => ({...f, valor_investido: e.target.value}))} />
                </div>
              </div>
              <div className="form-row">
                <div className="form-grp">
                  <label>Data de Início</label>
                  <input type="date" value={editando.data_inicio} onChange={e => setEditando(f => ({...f, data_inicio: e.target.value}))} />
                </div>
                <div className="form-grp">
                  <label>Data de Vencimento</label>
                  <input type="date" value={editando.data_vencimento} onChange={e => setEditando(f => ({...f, data_vencimento: e.target.value}))} />
                </div>
              </div>
              <div className="form-grp">
                <label>Emissor</label>
                <input type="text" value={editando.emissor} onChange={e => setEditando(f => ({...f, emissor: e.target.value}))} />
              </div>
              <div className="form-grp">
                <label>Objetivo</label>
                <input type="text" value={editando.objetivo} onChange={e => setEditando(f => ({...f, objetivo: e.target.value}))} />
              </div>
              <div className="form-grp">
                <label style={{display:'flex',alignItems:'center',gap:8,cursor:'pointer'}}>
                  <input type="checkbox" checked={editando.isento_ir}
                    onChange={e => setEditando(f => ({...f, isento_ir: e.target.checked}))} />
                  Isento de Imposto de Renda (LCI, LCA, CRI, CRA, Poupança)
                </label>
              </div>
            </div>
            <div className="modal-foot">
              <button className="btn-cancel" onClick={() => setShowEditModal(false)}>Cancelar</button>
              <button className="btn-salvar" onClick={salvarEdit} disabled={salvandoEdit}>
                {salvandoEdit ? 'Salvando...' : 'Salvar Alterações'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Vender */}
      {showVendaModal && vendendo && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowVendaModal(false)}>
          <div className="modal" style={{maxWidth:400}}>
            <div className="modal-head">
              <h3>Registrar Venda</h3>
              <button className="btn-close" onClick={() => setShowVendaModal(false)}>✕</button>
            </div>
            <div className="modal-body">
              <p style={{color:'var(--fg2)',marginBottom:16}}>{vendendo.nome}</p>
              <div className="form-grp">
                <label>Valor investido atual</label>
                <div style={{padding:'8px 12px',background:'var(--bg)',borderRadius:8,color:'var(--fg2)',fontSize:14}}>
                  {fmtR(vendendo.valor_investido)}
                </div>
              </div>
              <div className="form-grp">
                <label>Valor da venda (R$)</label>
                <input type="number" value={valorVenda}
                  onChange={e => setValorVenda(e.target.value)}
                  placeholder="Ex: 5000.00" />
                <span className="form-hint">
                  {parseFloat(valorVenda) >= parseFloat(vendendo.valor_investido)
                    ? '🔴 Venda total — o registro será removido'
                    : `🟡 Venda parcial — restará ${fmtR(parseFloat(vendendo.valor_investido) - (parseFloat(valorVenda)||0))}`}
                </span>
              </div>
            </div>
            <div className="modal-foot">
              <button className="btn-cancel" onClick={() => setShowVendaModal(false)}>Cancelar</button>
              <button className="btn-salvar" onClick={confirmarVenda} disabled={salvandoVenda || !valorVenda}>
                {salvandoVenda ? 'Registrando...' : 'Confirmar Venda'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
