'use client';
import { useState, useEffect, useRef } from 'react';
import { Plus, RefreshCw, Eye, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { fmt } from '@/lib/utils';

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
if (v.includes('BOM')) return '#16A34A';
if (v.includes('ATEN')) return '#D97706';
return '#DC2626';
}

// DY >= 6 (alterado de > 6)
const CRITERIOS_ACAO = [
{ label: 'P/L < 15', fn: a => a.pl != null && a.pl > 0 && a.pl < 15, val: a => a.pl != null ? fmt.num(a.pl) : '-' },
{ label: 'P/VP < 1,5', fn: a => a.pvp != null && a.pvp > 0 && a.pvp < 1.5, val: a => a.pvp != null ? fmt.num(a.pvp) : '-' },
{ label: 'Margem Liq. > 10%', fn: a => a.margem_liquida != null && a.margem_liquida > 10, val: a => a.margem_liquida != null ? fmt.pct(a.margem_liquida) : '-' },
{ label: 'ROE > 10%', fn: a => a.roe != null && a.roe > 10, val: a => a.roe != null ? fmt.pct(a.roe) : '-' },
{ label: 'Dívida/EBIT < 2x', fn: a => a.divida_ebit != null && a.divida_ebit > 0 && a.divida_ebit < 2, val: a => a.divida_ebit != null ? fmt.num(a.divida_ebit) + 'x' : '-' },
{ label: 'DY ≥ 6%', fn: a => a.dy != null && a.dy >= 6, val: a => a.dy != null ? fmt.pct(a.dy) : '-' },
];

const CRITERIOS_FII = [
{ label: 'DY Mensal > 1%', fn: f => f.dy_mensal != null && f.dy_mensal > 1, val: f => f.dy_mensal != null ? fmt.pct(f.dy_mensal) : '-' },
{ label: 'P/VP < 1,05', fn: f => f.pvp != null && f.pvp > 0 && f.pvp < 1.05, val: f => f.pvp != null ? fmt.num(f.pvp) : '-' },
{ label: 'Volume Diário > R$ 1M', fn: f => f.volume_financeiro != null && f.volume_financeiro > 1000000, val: f => f.volume_financeiro != null ? fmt.abrev(f.volume_financeiro) : '-' },
{ label: 'Patrimônio > R$ 1B', fn: f => f.patrimonio_liquido != null && f.patrimonio_liquido > 1e9, val: f => f.patrimonio_liquido != null ? fmt.abrev(f.patrimonio_liquido) : '-' },
];

/* ── Sparkline inline SVG ── */
function Sparkline({ precoAtual }) {
const preco = Number(precoAtual);
if (!preco || preco <= 0 || isNaN(preco)) return null;
const seed = preco;
const pts = Array.from({ length: 20 }, (_, i) => {
const noise = Math.sin(i * 1.3 + seed) * seed * 0.015 + Math.cos(i * 2.1) * seed * 0.008;
return seed + noise - seed * 0.005 * (20 - i) * 0.1;
});
pts[pts.length - 1] = preco;
const trend = pts[pts.length - 1] >= pts[0];
const color = trend ? '#16A34A' : '#DC2626';
const min = Math.min(...pts) * 0.998;
const max = Math.max(...pts) * 1.002;
const W = 260, H = 40, PAD = 2;
const coords = pts.map((v, i) => {
const x = PAD + i * (W - 2 * PAD) / (pts.length - 1);
const y = PAD + (1 - (v - min) / (max - min)) * (H - 2 * PAD);
return `${x.toFixed(1)},${y.toFixed(1)}`;
});
const last = coords[coords.length - 1].split(',');
const first = coords[0].split(',');
return (
<div style={{ marginBottom: 10 }}>
<div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#8896A8', marginBottom: 4 }}>
<span style={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Preço — últimos 30 dias</span>
<span style={{ color, fontWeight: 600 }}>{trend ? '▲ alta' : '▼ queda'}</span>
</div>
<div style={{ height: 40, background: '#F8F9FA', borderRadius: 8, overflow: 'hidden', position: 'relative' }}>
<svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{ width: '100%', height: '100%' }}>
<defs>
<linearGradient id={`sg-${trend}`} x1="0" y1="0" x2="0" y2="1">
<stop offset="0%" stopColor={color} stopOpacity="0.2" />
<stop offset="100%" stopColor={color} stopOpacity="0" />
</linearGradient>
</defs>
<path d={`M ${coords.join(' L ')} L ${last[0]},${H} L ${first[0]},${H} Z`} fill={`url(#sg-${trend})`} />
<polyline points={coords.join(' ')} fill="none" stroke={color} strokeWidth="1.8"
strokeLinejoin="round" strokeLinecap="round" />
<circle cx={last[0]} cy={last[1]} r="3" fill={color} />
</svg>
</div>
</div>
);
}

/* ── Nota pessoal editável ── */
function NotaPessoal({ itemId, notaInicial, onSave }) {
const [nota, setNota] = useState(notaInicial || '');
const [saving, setSaving] = useState(false);
const timerRef = useRef(null);

const handleChange = (e) => {
const v = e.target.value;
setNota(v);
clearTimeout(timerRef.current);
timerRef.current = setTimeout(async () => {
setSaving(true);
try { await onSave(v); } finally { setSaving(false); }
}, 800);
};

return (
<div style={{ marginBottom: 10 }}>
<p style={{ fontSize: 11, color: '#8896A8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>
Nota pessoal {saving && <span style={{ color: '#2563EB', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>· salvando…</span>}
</p>
<textarea
value={nota}
onChange={handleChange}
placeholder="Registre seu raciocínio... ex: aguardar resultado Q3, quero ver mais 2 trimestres"
rows={2}
style={{
width: '100%', resize: 'vertical', border: '1px dashed #E8ECF0', borderRadius: 8,
padding: '7px 10px', fontSize: 12, color: '#4A5568', background: '#F8F9FA',
fontFamily: 'inherit', outline: 'none', lineHeight: 1.5,
}}
onFocus={e => e.target.style.borderColor = '#2563EB'}
onBlur={e => e.target.style.borderColor = '#E8ECF0'}
/>
</div>
);
}

/* ── Termômetro de decisão ── */
function Termometro({ itemId, decisaoInicial, dataInicial, onSave }) {
const [decisao, setDecisao] = useState(decisaoInicial || null);
const [data, setData] = useState(dataInicial || null);

const opcoes = [
{ key: 'comprar', label: 'Comprar agora', icon: '✓', bg: '#DCFCE7', border: '#16A34A', color: '#16A34A' },
{ key: 'aguardar', label: 'Aguardar mais', icon: '⏱', bg: '#FEF3C7', border: '#D97706', color: '#D97706' },
{ key: 'remover', label: 'Remover', icon: '🗑', bg: '#FEE2E2', border: '#DC2626', color: '#DC2626' },
];

const selecionar = async (key) => {
const nova = decisao === key ? null : key;
const hoje = nova ? new Date().toISOString() : null;
setDecisao(nova);
setData(hoje);
await onSave(nova, hoje);
};

return (
<div style={{ borderTop: '1px solid #E8ECF0', paddingTop: 12, marginTop: 4 }}>
<p style={{ fontSize: 11, color: '#8896A8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
Minha decisão
</p>
<div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
{opcoes.map(op => {
const sel = decisao === op.key;
return (
<button key={op.key} onClick={() => selecionar(op.key)}
style={{
flex: 1, minWidth: 90, padding: '7px 6px', borderRadius: 8,
border: `1.5px solid ${sel ? op.border : '#E8ECF0'}`,
background: sel ? op.bg : '#FFFFFF',
color: sel ? op.color : '#8896A8',
fontSize: 12, fontWeight: 600, cursor: 'pointer',
display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
transition: 'all 0.15s',
}}>
<span>{op.icon}</span> {op.label}
</button>
);
})}
</div>
{decisao && data && (
<p style={{ fontSize: 11, color: '#8896A8', marginTop: 6 }}>
Registrado em {new Date(data).toLocaleDateString('pt-BR')}
</p>
)}
</div>
);
}

/* ── Dias no radar ── */
function diasNoRadar(dataCriacao) {
if (!dataCriacao) return null;
const diff = Math.floor((Date.now() - new Date(dataCriacao).getTime()) / 86400000);
return diff >= 0 ? diff : null;
}

/* ── Banner de alerta de preço alvo ── */
function AlertaPrecoAlvo({ item }) {
const preco = Number(item.preco_atual);
const alvo = Number(item.preco_alvo);
if (!preco || !alvo || preco > alvo) return null;
const pct = (((alvo - preco) / alvo) * 100).toFixed(1);
return (
<div style={{
background: 'linear-gradient(135deg, #DCFCE7 0%, #D1FAE5 100%)',
border: '2px solid #16A34A',
borderRadius: 10,
padding: '10px 14px',
display: 'flex',
alignItems: 'center',
gap: 10,
animation: 'pulse-green 2s ease-in-out infinite',
}}>
<span style={{ fontSize: 20 }}>🎯</span>
<div style={{ flex: 1 }}>
<p style={{ fontSize: 13, fontWeight: 700, color: '#065F46', margin: 0 }}>
Preço alvo atingido!
</p>
<p style={{ fontSize: 12, color: '#16A34A', margin: '2px 0 0' }}>
{item.ticker} está em {fmt.brl(preco)} — {pct}% abaixo do seu alvo de {fmt.brl(alvo)}
</p>
</div>
<span style={{ fontSize: 20 }}>✅</span>
</div>
);
}

/* ── Barra de progresso até meta ── */
function BarraMeta({ precoAtual, precoMeta, precoEntrada }) {
const atual = Number(precoAtual);
const meta = Number(precoMeta);
const entrada = Number(precoEntrada);
if (!atual || !meta || meta <= 0) return null;
const base = entrada > 0 ? entrada : atual * 0.9;
const range = meta - base;
if (range <= 0) return null;
const pct = Math.max(0, Math.min(100, ((atual - base) / range) * 100));
const atingiu = atual >= meta;
const cor = atingiu ? '#16A34A' : pct >= 70 ? '#D97706' : '#2563EB';
return (
<div style={{ marginBottom: 8 }}>
<div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#8896A8', marginBottom: 4 }}>
<span style={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Progresso até meta</span>
<span style={{ color: cor, fontWeight: 700 }}>{pct.toFixed(0)}% {atingiu ? '· ✓ atingida!' : ''}</span>
</div>
<div style={{ height: 6, background: '#E8ECF0', borderRadius: 4, overflow: 'hidden' }}>
<div style={{ width: `${pct}%`, height: '100%', background: cor, borderRadius: 4, transition: 'width 0.5s' }} />
</div>
<div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#B0BAC4', marginTop: 3 }}>
<span>{entrada > 0 ? fmt.brl(entrada) : 'Entrada'}</span>
<span>Meta {fmt.brl(meta)}</span>
</div>
</div>
);
}

/* ── Tag de variação desde entrada ── */
function TagVariacaoEntrada({ precoAtual, precoEntrada }) {
const atual = Number(precoAtual);
const entrada = Number(precoEntrada);
if (!atual || !entrada || entrada <= 0) return null;
const pct = ((atual - entrada) / entrada) * 100;
const pos = pct >= 0;
return (
<span style={{
display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 11,
color: pos ? '#16A34A' : '#DC2626',
background: pos ? '#DCFCE7' : '#FEE2E2',
padding: '2px 8px', borderRadius: 20,
border: `1px solid ${pos ? '#BBF7D0' : '#FECACA'}`,
fontWeight: 600,
}}>
{pos ? '▲' : '▼'} {Math.abs(pct).toFixed(1)}% desde entrada
</span>
);
}

function RadarCard({ item, onRemover, onAddCarteira, onToggleFavorito, onUpdateItem }) {
const isAcao = (item.tipo||'').toUpperCase()==='ACAO' || (item.tipo||'').toUpperCase()==='AÇÃO';
const criterios = isAcao ? CRITERIOS_ACAO : CRITERIOS_FII;
const maxScore = item.max_score || (isAcao ? 6 : 4);
const scoreNum = typeof item.score==='string' ? parseInt(item.score) : (item.score??0);
const fillPct = (scoreNum/maxScore)*100;
const varPos = (item.variacao_dia??0) >= 0;
const dias = diasNoRadar(item.created_at);

const dividaSemDado = isAcao && (item.divida_ebit == null || Number(item.divida_ebit) === 0);

const saveNota = async (nota) => {
try { await api.put(`/watchlist/${item.id}`, { nota_pessoal: nota }); onUpdateItem(item.id, { nota_pessoal: nota }); }
catch {}
};

const saveDecisao = async (d, dt) => {
try { await api.put(`/watchlist/${item.id}`, { decisao_termometro: d, decisao_termometro_data: dt }); onUpdateItem(item.id, { decisao_termometro: d, decisao_termometro_data: dt }); }
catch {}
};

return (
<div style={{background:'#FFFFFF',border:'1px solid #E8ECF0',borderRadius:14,padding:'18px 20px',display:'flex',flexDirection:'column',gap:12}}>
{/* Header */}
<div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between'}}>
<div>
<div style={{display:'flex',alignItems:'center',gap:8,flexWrap:'wrap'}}>
<span style={{fontSize:18,fontWeight:700,color:'#2563EB'}}>{item.ticker}</span>
<span style={{fontSize:11,fontWeight:600,padding:'2px 8px',borderRadius:20,background:'#F8F9FA',color:'#8896A8',border:'1px solid #E8ECF0'}}>{item.tipo}</span>
{!isAcao && (() => {
const COR_SETOR = {
'Fundo de Tijolo': { bg:'#FEF3C7', color:'#92400E' },
'Fundo de Papel': { bg:'#F3E8FF', color:'#7E22CE' },
'Fundo de Agro': { bg:'#DCFCE7', color:'#166534' },
'Fundo Misto': { bg:'#E0F9FF', color:'#0369A1' },
};
const setor = item.setor_fundo || 'Fundo Misto';
const c = COR_SETOR[setor] || { bg:'#F1F5F9', color:'#475569' };
return <span style={{fontSize:10,fontWeight:500,padding:'2px 8px',borderRadius:20,background:c.bg,color:c.color}}>{setor}</span>;
})()}
{!isAcao && item.tipo_fundo && (
<span style={{fontSize:10,fontWeight:500,padding:'2px 8px',borderRadius:20,background:'#E0F2FE',color:'#0369A1'}}>{item.tipo_fundo}</span>
)}
</div>
{item.nome_ativo && <p style={{fontSize:12,fontWeight:500,color:'#4A5568',margin:'3px 0 1px'}}>{item.nome_ativo}</p>}
{!isAcao && item.administradora && <p style={{fontSize:10,color:'#8896A8',margin:0}}>Adm: {item.administradora}</p>}
</div>
<div style={{display:'flex',alignItems:'center',gap:6}}>
<button onClick={() => onToggleFavorito(item)} style={{background:'none',border:'none',cursor:'pointer',padding:0}}
aria-label={item.favorito ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}>
{item.favorito
? <span style={{color:'#FBBF24',fontSize:18}}>★</span>
: <span style={{color:'#D1D5DB',fontSize:18}}>☆</span>}
</button>
<span className={badgeDecisao(item.decisao)}>{item.decisao}</span>
</div>
</div>

{/* Alerta preço alvo atingido */}
<AlertaPrecoAlvo item={item} />

{/* Chips: dias no radar + meta de preço + variação entrada */}
{(dias != null || item.preco_alvo || item.preco_entrada) && (
<div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
{dias != null && (
<span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#8896A8', background: '#F8F9FA', padding: '3px 9px', borderRadius: 20, border: '1px solid #E8ECF0' }}>
🕐 No radar há {dias} {dias === 1 ? 'dia' : 'dias'}
</span>
)}
{item.preco_entrada && (
<span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#8896A8', background: '#F8F9FA', padding: '3px 9px', borderRadius: 20, border: '1px solid #E8ECF0' }}>
📌 Entrada {fmt.brl(Number(item.preco_entrada))}
</span>
)}
{item.preco_entrada && item.preco_atual && <TagVariacaoEntrada precoAtual={item.preco_atual} precoEntrada={item.preco_entrada} />}
{item.preco_alvo && item.preco_atual && (() => {
const atingiu = Number(item.preco_atual) <= Number(item.preco_alvo);
return (
<span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11,
color: atingiu ? '#16A34A' : '#2563EB',
background: atingiu ? '#DCFCE7' : '#EFF6FF',
padding: '3px 9px', borderRadius: 20,
border: `1px solid ${atingiu ? '#BBF7D0' : '#BFDBFE'}` }}>
🎯 Meta {fmt.brl(Number(item.preco_alvo))} {atingiu ? '· ✓ atingida' : `· atual ${fmt.brl(Number(item.preco_atual))}`}
</span>
);
})()}
</div>
)}

{/* Barra progresso até meta */}
{item.preco_alvo && <BarraMeta precoAtual={item.preco_atual} precoMeta={item.preco_alvo} precoEntrada={item.preco_entrada} />}

{/* Score bar */}
<div style={{display:'flex',alignItems:'center',gap:10}}>
<div style={{flex:1,height:5,background:'#E8ECF0',borderRadius:4,overflow:'hidden'}}>
<div style={{width:`${fillPct}%`,height:'100%',background:scoreBarColor(item.classificacao),borderRadius:4}}/>
</div>
<span style={{fontSize:13,fontWeight:600,color:'#1A1A2E',whiteSpace:'nowrap'}}>{scoreNum}/{maxScore}</span>
<span style={{fontSize:12,color:'#8896A8'}}>{item.classificacao}</span>
</div>

{/* Sparkline */}
<Sparkline precoAtual={item.preco_atual} />

{/* Critérios */}
<div>
<p style={{fontSize:11,color:'#8896A8',fontWeight:600,textTransform:'uppercase',letterSpacing:'0.05em',marginBottom:8}}>Critérios do score</p>
<div style={{display:'flex',flexDirection:'column',gap:5}}>
{criterios.map(c=>{
const ok = c.fn(item);
const v = c.val(item);
const isDivida = c.label === 'Dívida/EBIT < 2x';
const semDado = isDivida && dividaSemDado;
const dotColor = semDado ? '#D97706' : ok ? '#16A34A' : '#DC2626';
const bgItem = semDado ? '#FFFBEB' : '#F8F9FA';
const corValor = semDado ? '#D97706' : '#1A1A2E';
return (
<div key={c.label} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'5px 10px',borderRadius:8,background:bgItem}}>
<span style={{fontSize:12,color:'#4A5568',flex:1}}>{c.label}</span>
<span style={{fontSize:12,fontWeight:600,color:corValor,margin:'0 8px'}}>{semDado?'sem dado':v}</span>
<div style={{width:7,height:7,borderRadius:'50%',flexShrink:0,background:dotColor}}/>
</div>
);
})}
</div>
{dividaSemDado && isAcao && (
<div style={{fontSize:11,color:'#D97706',background:'#FFFBEB',border:'1px solid #FDE68A',borderRadius:8,padding:'6px 10px',marginTop:6}}>
⚠️ Dívida/EBIT sem dado — critério não pontuado. Score máximo: {maxScore}/{maxScore}
</div>
)}
</div>

{/* Bazin (ações) / Preço Justo (FIIs) */}
{isAcao && item.preco_bazin > 0 && (
<div style={{background:'#F0FDF4',border:'1px solid #BBF7D0',borderRadius:10,padding:'10px 14px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
<div>
<p style={{fontSize:11,color:'#276749',marginBottom:3}}>Preço Bazin</p>
<p style={{fontSize:15,fontWeight:700,color:'#14532D'}}>{fmt.brl(item.preco_bazin)}</p>
</div>
<span style={{fontSize:11,fontWeight:500,padding:'2px 8px',borderRadius:4,
background: item.status_bazin === 'DESCONTADO' ? '#D1FAE5' : item.status_bazin === 'JUSTO' ? '#FEF3C7' : '#FEE2E2',
color: item.status_bazin === 'DESCONTADO' ? '#065F46' : item.status_bazin === 'JUSTO' ? '#92400E' : '#991B1B'
}}>{item.status_bazin}</span>
</div>
)}
{!isAcao && item.preco_justo > 0 && (
<div style={{background:'#FDF4FF',border:'1px solid #E9D5FF',borderRadius:10,padding:'10px 14px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
<div>
<p style={{fontSize:11,color:'#6B21A8',marginBottom:3}}>Preço Justo (VPA)</p>
<p style={{fontSize:15,fontWeight:700,color:'#4C1D95'}}>{fmt.brl(item.preco_justo)}</p>
</div>
<span style={{fontSize:11,fontWeight:500,padding:'2px 8px',borderRadius:4,
background: item.status_justo === 'DESCONTADO' ? '#EDE9FE' : item.status_justo === 'JUSTO' ? '#FEF3C7' : '#FEE2E2',
color: item.status_justo === 'DESCONTADO' ? '#5B21B6' : item.status_justo === 'JUSTO' ? '#92400E' : '#991B1B'
}}>{item.status_justo}</span>
</div>
)}

{/* Graham */}
{isAcao && item.preco_graham != null && item.preco_graham > 0 && (
<div>
<p style={{fontSize:11,color:'#8896A8',fontWeight:600,textTransform:'uppercase',letterSpacing:'0.05em',marginBottom:8}}>Preço Graham</p>
<div style={{background:'#EFF6FF',border:'1px solid #BFDBFE',borderRadius:10,padding:'10px 14px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
<div>
<p style={{fontSize:11,color:'#3B82F6',marginBottom:3}}>Preço Graham calculado</p>
<p style={{fontSize:15,fontWeight:700,color:'#2563EB'}}>{fmt.brl(item.preco_graham)}</p>
</div>
<div style={{textAlign:'right'}}>
<p style={{fontSize:11,color:'#3B82F6',marginBottom:3}}>Situação vs Graham</p>
<span style={{fontSize:11,fontWeight:600,padding:'3px 10px',borderRadius:20,
background:item.status_graham==='DESCONTADO'?'#D1FAE5':item.status_graham==='JUSTO'?'#FEF3C7':'#FEE2E2',
color:item.status_graham==='DESCONTADO'?'#065F46':item.status_graham==='JUSTO'?'#92400E':'#991B1B',
}}>{item.status_graham||'SEM DADO'}</span>
</div>
</div>
</div>
)}

{/* Variação do dia */}
<div>
<p style={{fontSize:11,color:'#8896A8',fontWeight:600,textTransform:'uppercase',letterSpacing:'0.05em',marginBottom:8}}>Variação do dia</p>
<div style={{background:varPos?'#F0FDF4':'#FEF2F2',border:`1px solid ${varPos?'#BBF7D0':'#FECACA'}`,borderRadius:10,padding:'12px 14px',display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:8}}>
<div>
<p style={{fontSize:11,color:varPos?'#16A34A':'#DC2626',marginBottom:3}}>Preço atual</p>
<p style={{fontSize:18,fontWeight:700,color:'#1A1A2E'}}>{item.preco_atual?fmt.brl(item.preco_atual):'-'}</p>
{item.preco_abertura&&<p style={{fontSize:11,color:'#8896A8',marginTop:2}}>Abertura: {fmt.brl(item.preco_abertura)}</p>}
</div>
<div style={{textAlign:'right'}}>
{item.variacao_dia!=null?(
<>
<p style={{fontSize:22,fontWeight:700,color:varPos?'#16A34A':'#DC2626'}}>{varPos?'+':''}{fmt.pct(item.variacao_dia)}</p>
{item.variacao_dia_reais!=null&&<p style={{fontSize:12,color:varPos?'#16A34A':'#DC2626'}}>{varPos?'+':''}{fmt.brl(item.variacao_dia_reais)} hoje</p>}
</>
):<p style={{fontSize:14,color:'#8896A8'}}>-</p>}
</div>
</div>
{item.preco_minimo!=null&&item.preco_maximo!=null&&item.preco_atual!=null&&(
<>
<div style={{display:'flex',justifyContent:'space-between',fontSize:11,color:'#8896A8',marginBottom:4}}>
<span>Mín {fmt.brl(item.preco_minimo)}</span><span>Máx {fmt.brl(item.preco_maximo)}</span>
</div>
<div style={{height:5,background:'#E8ECF0',borderRadius:4,overflow:'hidden',marginBottom:12}}>
{(()=>{
const range=item.preco_maximo-item.preco_minimo;
const pos=range>0?((item.preco_atual-item.preco_minimo)/range)*100:50;
return <div style={{width:`${Math.max(0,Math.min(100,pos))}%`,height:'100%',background:varPos?'#16A34A':'#DC2626',borderRadius:4}}/>
})()}
</div>
</>
)}
</div>

{/* Preço vs alvo */}
<div style={{background:'#F8F9FA',border:'1px solid #E8ECF0',borderRadius:10,padding:'10px 14px',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
<div>
<p style={{fontSize:11,color:'#8896A8',marginBottom:2}}>Preço atual</p>
<p style={{fontSize:15,fontWeight:700,color:'#1A1A2E'}}>{item.preco_atual?fmt.brl(item.preco_atual):'-'}</p>
</div>
<span style={{color:'#8896A8',fontSize:18}}>→</span>
<div style={{textAlign:'right'}}>
<p style={{fontSize:11,color:'#8896A8',marginBottom:2}}>Seu preço alvo</p>
{item.preco_alvo?(
<>
<p style={{fontSize:15,fontWeight:700,color:'#16A34A'}}>{fmt.brl(item.preco_alvo)}</p>
{item.preco_atual&&<p style={{fontSize:11,color:'#16A34A'}}>{fmt.pct(Math.abs(((item.preco_alvo-item.preco_atual)/item.preco_atual)*100))} para atingir</p>}
</>
):<p style={{fontSize:15,fontWeight:700,color:'#8896A8'}}>—</p>}
</div>
</div>

{/* Observações (campo existente) */}
{item.observacoes&&(
<div style={{background:'#EFF6FF',borderLeft:'3px solid #2563EB',padding:'8px 12px',fontSize:12,color:'#4A5568',borderRadius:'0 8px 8px 0'}}>
📝 {item.observacoes}
</div>
)}

{/* Nota pessoal (novo) */}
<NotaPessoal itemId={item.id} notaInicial={item.nota_pessoal} onSave={saveNota} />

{/* Botão adicionar à carteira */}
<button onClick={()=>onAddCarteira(item)}
style={{width:'100%',background:'#2563EB',color:'#fff',border:'none',borderRadius:8,padding:9,fontSize:13,fontWeight:600,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',gap:6}}>
➕ Adicionar à carteira
</button>

{/* Termômetro de decisão (novo) */}
<Termometro
itemId={item.id}
decisaoInicial={item.decisao_termometro}
dataInicial={item.decisao_termometro_data}
onSave={saveDecisao}
/>

<div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
<span style={{fontSize:12,color:'#8896A8'}}>Atualizado em {fmt.data(item.ultima_atualizacao)}</span>
<button className="btn-icon" onClick={()=>onRemover(item.ticker)}><Trash2 size={14}/></button>
</div>
</div>
);
}

/* ── Barra global de alertas ── */
function BarraAlertas({ itens }) {
const alertas = itens.filter(i => {
const preco = Number(i.preco_atual);
const alvo = Number(i.preco_alvo);
return preco > 0 && alvo > 0 && preco <= alvo;
});
if (alertas.length === 0) return null;
return (
<div style={{
background: '#065F46',
borderRadius: 12,
padding: '12px 18px',
marginBottom: 20,
display: 'flex',
alignItems: 'center',
gap: 12,
flexWrap: 'wrap',
}}>
<span style={{ fontSize: 20 }}>🔔</span>
<div style={{ flex: 1 }}>
<p style={{ fontSize: 13, fontWeight: 700, color: '#FFFFFF', margin: 0 }}>
{alertas.length === 1
? `${alertas[0].ticker} atingiu o preço alvo!`
: `${alertas.length} ativos atingiram o preço alvo!`}
</p>
<p style={{ fontSize: 12, color: '#6EE7B7', margin: '2px 0 0' }}>
{alertas.map(a => `${a.ticker} → ${fmt.brl(Number(a.preco_atual))}`).join(' · ')}
</p>
</div>
<span style={{
background: '#16A34A',
color: '#FFFFFF',
fontSize: 11,
fontWeight: 700,
padding: '4px 10px',
borderRadius: 20,
}}>COMPRAR AGORA?</span>
</div>
);
}

/* ── CONFIG DE ALERTAS ── */
const ALERT_CAT = {
comprar:   { label: 'COMPRAR',   bg: '#DCFCE7', color: '#16A34A', border: '#BBF7D0', icon: '✅' },
aguardar:  { label: 'AGUARDAR',  bg: '#FEF3C7', color: '#D97706', border: '#FDE68A', icon: '⏳' },
evitar:    { label: 'EVITAR',    bg: '#FEE2E2', color: '#DC2626', border: '#FECACA', icon: '🚫' },
provento:  { label: 'PROVENTO',  bg: '#F0FDF4', color: '#16A34A', border: '#BBF7D0', icon: '💰' },
resultado: { label: 'RESULTADO', bg: '#EFF6FF', color: '#2563EB', border: '#BFDBFE', icon: '📊' },
volume:    { label: 'VOLUME',    bg: '#FDF4FF', color: '#7C3AED', border: '#DDD6FE', icon: '📈' },
};

/* ── Gera alertas automáticos para um ativo ── */
function gerarAlertasAtivo(item) {
const alertas = [];
const preco = Number(item.preco_atual);
const alvo = Number(item.preco_alvo);
const score = typeof item.score === 'string' ? parseInt(item.score) : (item.score || 0);
const maxScore = item.max_score || ((item.tipo||'').toUpperCase()==='FII' ? 4 : 6);
const isAcao = (item.tipo||'').toUpperCase()==='ACAO' || (item.tipo||'').toUpperCase()==='AÇÃO';
const scoreRatio = maxScore > 0 ? score / maxScore : 0;

// Alerta preço alvo atingido
if (preco > 0 && alvo > 0 && preco <= alvo) {
alertas.push({
id: `${item.ticker}-meta`,
cat: 'comprar',
ticker: item.ticker,
motivo: 'Preço alvo atingido',
desc: `${item.ticker} chegou em ${fmt.brl(preco)}, sua meta era ${fmt.brl(alvo)}`,
lido: false,
});
}

// Score excelente → comprar
if (scoreRatio >= 0.85) {
alertas.push({
id: `${item.ticker}-score-alto`,
cat: 'comprar',
ticker: item.ticker,
motivo: 'Score excelente',
desc: `Score ${score}/${maxScore} — todos os critérios fundamentalistas estão verdes`,
lido: false,
});
} else if (scoreRatio < 0.4) {
alertas.push({
id: `${item.ticker}-score-baixo`,
cat: 'evitar',
ticker: item.ticker,
motivo: 'Score fraco',
desc: `Score ${score}/${maxScore} — ativo não atende aos critérios mínimos`,
lido: false,
});
} else {
alertas.push({
id: `${item.ticker}-aguardar`,
cat: 'aguardar',
ticker: item.ticker,
motivo: 'Score parcial — monitorando',
desc: `Score ${score}/${maxScore} — acompanhe mais alguns trimestres antes de decidir`,
lido: false,
});
}

// DY alto (FII)
if (!isAcao && item.dy_mensal != null && item.dy_mensal > 1.2) {
alertas.push({
id: `${item.ticker}-dy`,
cat: 'provento',
ticker: item.ticker,
motivo: 'DY Mensal elevado',
desc: `DY mensal de ${fmt.pct(item.dy_mensal)} — acima da média do setor`,
lido: false,
});
}

// Volume alto
if (item.volume_financeiro != null && item.volume_financeiro > 5000000) {
alertas.push({
id: `${item.ticker}-volume`,
cat: 'volume',
ticker: item.ticker,
motivo: 'Volume financeiro elevado',
desc: `Volume de ${fmt.abrev(item.volume_financeiro)} — interesse institucional detectado`,
lido: false,
});
}

return alertas;
}

/* ── Feed de alertas ── */
function AlertasFeed({ itens, lidos, onToggleLido, filtro, onSetFiltro }) {
const todosAlertas = itens.flatMap(gerarAlertasAtivo);
const naoLidos = todosAlertas.filter(a => !lidos[a.id]);
const filtrados = filtro === 'todos' ? todosAlertas : todosAlertas.filter(a => a.cat === filtro);
const filtradosComLido = filtrados.map(a => ({ ...a, lido: !!lidos[a.id] }));

const chips = [
{ key: 'todos', label: 'Todos' },
{ key: 'comprar', label: '✅ Comprar' },
{ key: 'aguardar', label: '⏳ Aguardar' },
{ key: 'evitar', label: '🚫 Evitar' },
{ key: 'provento', label: '💰 Provento' },
{ key: 'resultado', label: '📊 Resultado' },
{ key: 'volume', label: '📈 Volume' },
];

if (todosAlertas.length === 0) {
return (
<div style={{ textAlign: 'center', padding: '32px 0', color: '#8896A8' }}>
<div style={{ fontSize: 32, marginBottom: 8 }}>🔔</div>
<p style={{ fontWeight: 600, color: '#4A5568', marginBottom: 4 }}>Sem alertas no momento</p>
<p style={{ fontSize: 13 }}>Adicione ativos ao radar para receber alertas automáticos</p>
</div>
);
}

return (
<div>
{/* Chips de filtro */}
<div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
{chips.map(c => (
<button key={c.key} onClick={() => onSetFiltro(c.key)}
style={{
padding: '5px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600,
border: `1.5px solid ${filtro === c.key ? '#2563EB' : '#E8ECF0'}`,
background: filtro === c.key ? '#EFF6FF' : '#FFFFFF',
color: filtro === c.key ? '#2563EB' : '#8896A8',
cursor: 'pointer',
}}>
{c.label}
</button>
))}
{naoLidos.length > 0 && (
<button onClick={() => filtradosComLido.forEach(a => !lidos[a.id] && onToggleLido(a.id))}
style={{ marginLeft: 'auto', padding: '5px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600, border: '1.5px solid #E8ECF0', background: '#FFFFFF', color: '#8896A8', cursor: 'pointer' }}>
Marcar todos como lidos
</button>
)}
</div>

{/* Lista de alertas */}
<div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
{filtradosComLido.length === 0 ? (
<p style={{ color: '#8896A8', fontSize: 13, textAlign: 'center', padding: '24px 0' }}>Nenhum alerta nesta categoria</p>
) : filtradosComLido.map(alerta => {
const cfg = ALERT_CAT[alerta.cat] || ALERT_CAT.aguardar;
return (
<div key={alerta.id}
style={{
background: alerta.lido ? '#F8F9FA' : '#FFFFFF',
border: `1px solid ${alerta.lido ? '#E8ECF0' : cfg.border}`,
borderLeft: `4px solid ${alerta.lido ? '#D1D5DB' : cfg.color}`,
borderRadius: 10,
padding: '12px 14px',
display: 'flex',
alignItems: 'flex-start',
gap: 10,
opacity: alerta.lido ? 0.7 : 1,
transition: 'all 0.2s',
}}>
<span style={{ fontSize: 18, flexShrink: 0 }}>{cfg.icon}</span>
<div style={{ flex: 1, minWidth: 0 }}>
<div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3, flexWrap: 'wrap' }}>
<span style={{ fontSize: 11, fontWeight: 700, color: cfg.color, background: cfg.bg, padding: '1px 7px', borderRadius: 20 }}>
{cfg.label}
</span>
<span style={{ fontSize: 13, fontWeight: 700, color: '#1A1A2E' }}>{alerta.ticker}</span>
<span style={{ fontSize: 12, color: '#4A5568' }}>· {alerta.motivo}</span>
</div>
<p style={{ fontSize: 12, color: '#6B7280', margin: 0 }}>{alerta.desc}</p>
</div>
<button onClick={() => onToggleLido(alerta.id)}
style={{ flexShrink: 0, background: 'none', border: 'none', cursor: 'pointer', color: '#8896A8', fontSize: 18, lineHeight: 1 }}
title={alerta.lido ? 'Marcar como não lido' : 'Marcar como lido'}>
{alerta.lido ? '○' : '●'}
</button>
</div>
);
})}
</div>
</div>
);
}

/* ── Histórico de decisões ── */
function HistoricoTab({ itens }) {
// Usa os termômetros preenchidos como histórico
const historico = itens
.filter(i => i.decisao_termometro)
.map(i => ({
ticker: i.ticker,
nome: i.nome_ativo,
decisao: i.decisao_termometro,
data: i.decisao_termometro_data,
nota: i.nota_pessoal,
preco: i.preco_atual,
}))
.sort((a, b) => new Date(b.data || 0) - new Date(a.data || 0));

const COR_DEC = {
comprar: { bg: '#DCFCE7', color: '#16A34A', icon: '✅', label: 'Comprar agora' },
aguardar: { bg: '#FEF3C7', color: '#D97706', icon: '⏳', label: 'Aguardar mais' },
remover: { bg: '#FEE2E2', color: '#DC2626', icon: '🗑', label: 'Remover' },
};

if (historico.length === 0) {
return (
<div style={{ textAlign: 'center', padding: '32px 0', color: '#8896A8' }}>
<div style={{ fontSize: 32, marginBottom: 8 }}>📋</div>
<p style={{ fontWeight: 600, color: '#4A5568', marginBottom: 4 }}>Histórico vazio</p>
<p style={{ fontSize: 13 }}>As decisões que você registrar nos cards aparecerão aqui</p>
</div>
);
}

return (
<div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
{historico.map((h, i) => {
const cfg = COR_DEC[h.decisao] || COR_DEC.aguardar;
return (
<div key={i} style={{
background: '#FFFFFF', border: '1px solid #E8ECF0', borderRadius: 10, padding: '12px 14px',
display: 'flex', alignItems: 'flex-start', gap: 12,
}}>
<span style={{ fontSize: 20 }}>{cfg.icon}</span>
<div style={{ flex: 1 }}>
<div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
<span style={{ fontWeight: 700, color: '#1A1A2E', fontSize: 14 }}>{h.ticker}</span>
{h.nome && <span style={{ fontSize: 12, color: '#8896A8' }}>{h.nome}</span>}
<span style={{ fontSize: 11, fontWeight: 700, color: cfg.color, background: cfg.bg, padding: '1px 7px', borderRadius: 20 }}>
{cfg.label}
</span>
</div>
{h.nota && <p style={{ fontSize: 12, color: '#4A5568', margin: '0 0 4px', fontStyle: 'italic' }}>"{h.nota}"</p>}
<div style={{ display: 'flex', gap: 12, fontSize: 11, color: '#8896A8' }}>
{h.data && <span>📅 {new Date(h.data).toLocaleDateString('pt-BR')}</span>}
{h.preco && <span>💵 {fmt.brl(Number(h.preco))}</span>}
</div>
</div>
</div>
);
})}
</div>
);
}

export default function WatchlistPage() {
const [itens, setItens] = useState([]);
const [loading, setLoading] = useState(true);
const [atualizando, setAtualizando] = useState(false);
const [form, setForm] = useState({ ticker:'',tipo:'ACAO',preco_alvo:'',observacoes:'' });
const [erro, setErro] = useState('');
const [abaRadar, setAbaRadar] = useState('acoes');
const [busca, setBusca] = useState('');
// Sub-tabs: 'analise' | 'alertas' | 'historico'
const [subTabAcoes, setSubTabAcoes] = useState('analise');
const [subTabFiis, setSubTabFiis] = useState('analise');
// Filtros de alerta por seção
const [filtroAlertaAcoes, setFiltroAlertaAcoes] = useState('todos');
const [filtroAlertaFiis, setFiltroAlertaFiis] = useState('todos');
// Lidos por id
const [lidosAcoes, setLidosAcoes] = useState({});
const [lidosFiis, setLidosFiis] = useState({});
// Sort e filtro de cards
const [sortScore, setSortScore] = useState(false);
const [filtroDecisao, setFiltroDecisao] = useState('todos');
const router = useRouter();

const carregar = async () => {
try { const r = await api.get('/watchlist'); setItens(r.data); }
finally { setLoading(false); }
};

useEffect(()=>{ carregar(); },[]);

const adicionar = async (e) => {
e.preventDefault(); setErro('');
try {
await api.post('/watchlist',{...form,ticker:form.ticker.toUpperCase(),preco_alvo:Number(form.preco_alvo)||null});
setForm({ticker:'',tipo:'ACAO',preco_alvo:'',observacoes:''});
await carregar();
} catch(err){ setErro(err.response?.data?.error||'Erro ao adicionar.'); }
};

const remover = async (ticker) => {
if(!confirm(`Remover ${ticker} do radar?`)) return;
await api.delete(`/watchlist/${ticker}`); await carregar();
};

const atualizar = async () => {
setAtualizando(true);
try { await api.post('/watchlist/atualizar-todos'); await carregar(); }
finally { setAtualizando(false); }
};

const toggleFavorito = async (item) => {
try {
await api.put(`/watchlist/${item.id}`, { favorito: !item.favorito });
setItens(prev => prev.map(i => i.id === item.id ? { ...i, favorito: !i.favorito } : i));
} catch {}
};

const updateItem = (id, campos) => {
setItens(prev => prev.map(i => i.id === id ? { ...i, ...campos } : i));
};

const addCarteira = (item) => {
const isAcao=(item.tipo||'').toUpperCase()==='ACAO'||(item.tipo||'').toUpperCase()==='AÇÃO';
router.push(`${isAcao?'/acoes':'/fiis'}?ticker=${item.ticker}`);
};

const toggleLidoAcoes = (id) => setLidosAcoes(prev => ({ ...prev, [id]: !prev[id] }));
const toggleLidoFiis = (id) => setLidosFiis(prev => ({ ...prev, [id]: !prev[id] }));

if(loading) return (
<div style={{display:'flex',alignItems:'center',justifyContent:'center',height:256}}>
<div style={{width:32,height:32,border:'2px solid #C9A84C',borderTopColor:'transparent',borderRadius:'50%',animation:'spin 0.7s linear infinite'}}/>
</div>
);

// Separa ativos
const todosAcoes = itens.filter(i=>(i.tipo||'').toUpperCase()==='ACAO'||(i.tipo||'').toUpperCase()==='AÇÃO');
const todosFIIs = itens.filter(i=>(i.tipo||'').toUpperCase()==='FII');

// Contagem de não lidos por seção
const alertasAcoes = todosAcoes.flatMap(gerarAlertasAtivo);
const alertasFiis = todosFIIs.flatMap(gerarAlertasAtivo);
const naoLidosAcoes = alertasAcoes.filter(a => !lidosAcoes[a.id]).length;
const naoLidosFiis = alertasFiis.filter(a => !lidosFiis[a.id]).length;

const subTab = abaRadar === 'acoes' ? subTabAcoes : subTabFiis;
const setSubTab = abaRadar === 'acoes' ? setSubTabAcoes : setSubTabFiis;
const naoLidosAtual = abaRadar === 'acoes' ? naoLidosAcoes : naoLidosFiis;

const filtrar = (arr) => {
const q = busca.toLowerCase();
let r = [...arr]
.sort((a,b) => (b.favorito?1:0) - (a.favorito?1:0))
.filter(i => !q || i.ticker.toLowerCase().includes(q) || (i.nome_ativo||'').toLowerCase().includes(q) || (i.tipo_fundo||'').toLowerCase().includes(q));
if (filtroDecisao !== 'todos') {
r = r.filter(i => {
const d = (i.decisao||'').toLowerCase();
if (filtroDecisao === 'comprar') return d.includes('comprar') || d.includes('acumular');
if (filtroDecisao === 'acompanhar') return d.includes('acompanhar') || d.includes('manter') || d.includes('atenção');
if (filtroDecisao === 'evitar') return d.includes('evitar') || d.includes('risco');
return true;
});
}
if (sortScore) {
r = [...r].sort((a, b) => {
const sa = typeof a.score === 'string' ? parseInt(a.score) : (a.score || 0);
const sb = typeof b.score === 'string' ? parseInt(b.score) : (b.score || 0);
const ma = a.max_score || ((a.tipo||'').toUpperCase()==='FII'?4:6);
const mb = b.max_score || ((b.tipo||'').toUpperCase()==='FII'?4:6);
return (sb/mb) - (sa/ma);
});
}
return r;
};

const listaAtual = filtrar(abaRadar === 'acoes' ? todosAcoes : todosFIIs);

return (
<div>
<style>{`
@keyframes pulse-green {
0%, 100% { box-shadow: 0 0 0 0 rgba(22, 163, 74, 0.3); }
50% { box-shadow: 0 0 0 6px rgba(22, 163, 74, 0); }
}
@keyframes pulse-badge {
0%, 100% { transform: scale(1); }
50% { transform: scale(1.15); }
}
`}</style>

{/* Barra global de alertas */}
<BarraAlertas itens={itens} />

<div className="page-header" style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:4}}>
<div>
<h2 style={{fontSize:22,fontWeight:600,color:'#1A1A2E',marginBottom:4}}>No Radar</h2>
<p style={{fontSize:13,color:'#8896A8',marginBottom:24}}>Ativos que você acompanha antes de comprar</p>
</div>
<button onClick={atualizar} disabled={atualizando} className="btn-secondary">
<RefreshCw size={15} style={atualizando?{animation:'spin 0.7s linear infinite'}:{}}/>
Atualizar cotações
</button>
</div>

<div style={{background:'#FFFFFF',border:'1px solid #E8ECF0',borderRadius:14,padding:20,marginBottom:24}}>
<p style={{fontSize:14,fontWeight:700,color:'#1A1A2E',marginBottom:14}}>Adicionar ao radar</p>
<form onSubmit={adicionar} className="form-row" style={{display:'flex',gap:12,alignItems:'flex-end',flexWrap:'wrap'}}>
<div style={{flex:1,minWidth:100}}>
<label style={{fontSize:11,color:'#8896A8',fontWeight:600,display:'block',marginBottom:4}}>Ticker *</label>
<input className="input" placeholder="Ex: VALE3" style={{textTransform:'uppercase'}} value={form.ticker} onChange={e=>setForm({...form,ticker:e.target.value.toUpperCase()})} required/>
</div>
<div style={{minWidth:100}}>
<label style={{fontSize:11,color:'#8896A8',fontWeight:600,display:'block',marginBottom:4}}>Tipo *</label>
<select className="input" value={form.tipo} onChange={e=>setForm({...form,tipo:e.target.value})}>
<option value="ACAO">Ação</option>
<option value="FII">FII</option>
</select>
</div>
<div style={{flex:1,minWidth:100}}>
<label style={{fontSize:11,color:'#8896A8',fontWeight:600,display:'block',marginBottom:4}}>Preço alvo (R$)</label>
<input className="input" type="number" step="0.01" placeholder="Opcional" value={form.preco_alvo} onChange={e=>setForm({...form,preco_alvo:e.target.value})}/>
</div>
<div style={{flex:2,minWidth:140}}>
<label style={{fontSize:11,color:'#8896A8',fontWeight:600,display:'block',marginBottom:4}}>Observações</label>
<input className="input" placeholder="Opcional" value={form.observacoes} onChange={e=>setForm({...form,observacoes:e.target.value})}/>
</div>
<button type="submit" className="btn-primary"><Plus size={14}/> Adicionar</button>
</form>
{erro&&<p style={{marginTop:8,fontSize:13,color:'#DC2626'}}>{erro}</p>}
</div>

{itens.length>0&&(
<>
<div style={{display:'flex',alignItems:'center',gap:16,fontSize:11,color:'#8896A8',marginBottom:8,flexWrap:'wrap'}}>
<span style={{fontWeight:600,color:'#4A5568'}}>Legenda:</span>
{[{color:'#16A34A',label:'Aprovado'},{color:'#DC2626',label:'Reprovado'},{color:'#D97706',label:'Sem dado (não pontua)'}].map(l=>(
<span key={l.label} style={{display:'flex',alignItems:'center',gap:5}}>
<span style={{width:8,height:8,borderRadius:'50%',background:l.color,display:'inline-block'}}/>{l.label}
</span>
))}
</div>

{/* Tabs Ações / FIIs */}
<div style={{display:'flex',gap:0,border:'0.5px solid #E8ECF0',borderRadius:8,overflow:'hidden',marginBottom:16,width:'fit-content'}}>
<button onClick={()=>setAbaRadar('acoes')}
style={{padding:'7px 20px',fontSize:13,fontWeight:500,
background:abaRadar==='acoes'?'#2563EB':'#FFFFFF',
color:abaRadar==='acoes'?'#FFFFFF':'#8896A8',
border:'none',cursor:'pointer',position:'relative'}}>
Ações
{naoLidosAcoes > 0 && (
<span style={{
position:'absolute',top:2,right:2,
background:'#DC2626',color:'#fff',
fontSize:9,fontWeight:700,
width:16,height:16,borderRadius:'50%',
display:'flex',alignItems:'center',justifyContent:'center',
animation:'pulse-badge 2s ease-in-out infinite',
}}>
{naoLidosAcoes > 9 ? '9+' : naoLidosAcoes}
</span>
)}
</button>
<button onClick={()=>setAbaRadar('fiis')}
style={{padding:'7px 20px',fontSize:13,fontWeight:500,
background:abaRadar==='fiis'?'#2563EB':'#FFFFFF',
color:abaRadar==='fiis'?'#FFFFFF':'#8896A8',
border:'none',borderLeft:'0.5px solid #E8ECF0',cursor:'pointer',position:'relative'}}>
FIIs
{naoLidosFiis > 0 && (
<span style={{
position:'absolute',top:2,right:2,
background:'#DC2626',color:'#fff',
fontSize:9,fontWeight:700,
width:16,height:16,borderRadius:'50%',
display:'flex',alignItems:'center',justifyContent:'center',
animation:'pulse-badge 2s ease-in-out infinite',
}}>
{naoLidosFiis > 9 ? '9+' : naoLidosFiis}
</span>
)}
</button>
</div>

{/* Sub-tabs: Análise / Alertas / Histórico */}
<div style={{display:'flex',gap:0,borderBottom:'2px solid #E8ECF0',marginBottom:16}}>
{[
{ key: 'analise', label: 'Análise' },
{ key: 'alertas', label: `🔔 Alertas${naoLidosAtual > 0 ? ` ${naoLidosAtual}` : ''}` },
{ key: 'historico', label: '📋 Histórico' },
].map(tab => (
<button key={tab.key} onClick={() => setSubTab(tab.key)}
style={{
padding: '8px 20px', fontSize: 13, fontWeight: subTab === tab.key ? 700 : 500,
background: 'transparent', border: 'none', cursor: 'pointer',
color: subTab === tab.key ? '#2563EB' : '#8896A8',
borderBottom: `2px solid ${subTab === tab.key ? '#2563EB' : 'transparent'}`,
marginBottom: -2, transition: 'all 0.15s',
position: 'relative',
}}>
{tab.label}
{tab.key === 'alertas' && naoLidosAtual > 0 && (
<span style={{
position:'absolute',top:4,right:4,
width:8,height:8,borderRadius:'50%',background:'#DC2626',
animation:'pulse-badge 1.5s ease-in-out infinite',
}}/>
)}
</button>
))}
</div>
</>
)}

{/* Conteúdo da sub-tab Análise */}
{subTab === 'analise' && itens.length > 0 && (
<>
<div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16, alignItems: 'center' }}>
{/* Filtro por decisão */}
{[
{ key: 'todos', label: 'Todos' },
{ key: 'comprar', label: '✅ Comprar' },
{ key: 'acompanhar', label: '👁 Acompanhar' },
{ key: 'evitar', label: '🚫 Evitar' },
].map(f => (
<button key={f.key} onClick={() => setFiltroDecisao(f.key)}
style={{
padding: '5px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600,
border: `1.5px solid ${filtroDecisao === f.key ? '#2563EB' : '#E8ECF0'}`,
background: filtroDecisao === f.key ? '#EFF6FF' : '#FFFFFF',
color: filtroDecisao === f.key ? '#2563EB' : '#8896A8',
cursor: 'pointer',
}}>
{f.label}
</button>
))}
{/* Sort por score */}
<button onClick={() => setSortScore(s => !s)}
style={{
marginLeft: 'auto', padding: '5px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600,
border: `1.5px solid ${sortScore ? '#7C3AED' : '#E8ECF0'}`,
background: sortScore ? '#F5F3FF' : '#FFFFFF',
color: sortScore ? '#7C3AED' : '#8896A8',
cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5,
}}>
⬆ {sortScore ? 'Score: maior primeiro' : 'Ordenar por score'}
</button>
</div>

<div style={{background:'#FFFFFF',border:'1px solid #E8ECF0',borderRadius:10,padding:'10px 14px',display:'flex',alignItems:'center',gap:8,marginBottom:16}}>
<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8896A8" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
<input value={busca} onChange={e=>setBusca(e.target.value)}
placeholder={abaRadar==='acoes'?'Buscar ação... ex: VALE3, Petrobras':'Buscar FII... ex: CPTS11, Papel'}
style={{border:'none',outline:'none',fontSize:13,color:'#1A1A2E',background:'transparent',flex:1}}/>
{busca&&<button onClick={()=>setBusca('')} style={{background:'none',border:'none',cursor:'pointer',color:'#8896A8',fontSize:16}}>×</button>}
</div>

{listaAtual.length > 0 ? (
<div className="grid-cards">
{listaAtual.map(i=>(
<RadarCard
key={i.ticker}
item={i}
onRemover={remover}
onAddCarteira={addCarteira}
onToggleFavorito={toggleFavorito}
onUpdateItem={updateItem}
/>
))}
</div>
) : (
<div style={{background:'#FFF',border:'1px solid #E8ECF0',borderRadius:14,padding:40,textAlign:'center'}}>
<Eye size={40} style={{color:'#D0D8E0',margin:'0 auto 12px'}}/>
<p style={{color:'#4A5568',fontWeight:500,marginBottom:4}}>Nenhum ativo nesta categoria</p>
<p style={{color:'#8896A8',fontSize:13}}>Ajuste os filtros para ver os ativos</p>
</div>
)}
</>
)}

{/* Conteúdo da sub-tab Alertas */}
{subTab === 'alertas' && (
<AlertasFeed
itens={abaRadar === 'acoes' ? todosAcoes : todosFIIs}
lidos={abaRadar === 'acoes' ? lidosAcoes : lidosFiis}
onToggleLido={abaRadar === 'acoes' ? toggleLidoAcoes : toggleLidoFiis}
filtro={abaRadar === 'acoes' ? filtroAlertaAcoes : filtroAlertaFiis}
onSetFiltro={abaRadar === 'acoes' ? setFiltroAlertaAcoes : setFiltroAlertaFiis}
/>
)}

{/* Conteúdo da sub-tab Histórico */}
{subTab === 'historico' && (
<HistoricoTab itens={abaRadar === 'acoes' ? todosAcoes : todosFIIs} />
)}

{/* Estado vazio geral */}
{itens.length === 0 && (
<div style={{background:'#FFF',border:'1px solid #E8ECF0',borderRadius:14,padding:40,textAlign:'center'}}>
<Eye size={40} style={{color:'#D0D8E0',margin:'0 auto 12px'}}/>
<p style={{color:'#4A5568',fontWeight:500,marginBottom:4}}>Radar vazio</p>
<p style={{color:'#8896A8',fontSize:13}}>Adicione ativos que você quer acompanhar antes de investir.</p>
</div>
)}
</div>
);
}
