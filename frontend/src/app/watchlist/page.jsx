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
  if (v.includes('BOM'))   return '#16A34A';
  if (v.includes('ATEN'))  return '#D97706';
  return '#DC2626';
}

// DY >= 6 (alterado de > 6)
const CRITERIOS_ACAO = [
  { label: 'P/L < 15',             fn: a => a.pl != null && a.pl > 0 && a.pl < 15,                           val: a => a.pl != null ? fmt.num(a.pl) : '-' },
  { label: 'P/VP < 1,5',           fn: a => a.pvp != null && a.pvp > 0 && a.pvp < 1.5,                       val: a => a.pvp != null ? fmt.num(a.pvp) : '-' },
  { label: 'Margem Liq. > 10%',    fn: a => a.margem_liquida != null && a.margem_liquida > 10,                val: a => a.margem_liquida != null ? fmt.pct(a.margem_liquida) : '-' },
  { label: 'ROE > 10%',            fn: a => a.roe != null && a.roe > 10,                                      val: a => a.roe != null ? fmt.pct(a.roe) : '-' },
  { label: 'Dívida/EBIT < 2x',     fn: a => a.divida_ebit != null && a.divida_ebit > 0 && a.divida_ebit < 2, val: a => a.divida_ebit != null ? fmt.num(a.divida_ebit) + 'x' : '-' },
  { label: 'DY ≥ 6%',              fn: a => a.dy != null && a.dy >= 6,                                       val: a => a.dy != null ? fmt.pct(a.dy) : '-' },
];

const CRITERIOS_FII = [
  { label: 'DY Mensal > 1%',        fn: f => f.dy_mensal != null && f.dy_mensal > 1,                          val: f => f.dy_mensal != null ? fmt.pct(f.dy_mensal) : '-' },
  { label: 'P/VP < 1,05',           fn: f => f.pvp != null && f.pvp > 0 && f.pvp < 1.05,                     val: f => f.pvp != null ? fmt.num(f.pvp) : '-' },
  { label: 'Volume Diário > R$ 1M', fn: f => f.volume_financeiro != null && f.volume_financeiro > 1000000,    val: f => f.volume_financeiro != null ? fmt.abrev(f.volume_financeiro) : '-' },
  { label: 'Patrimônio > R$ 1B',    fn: f => f.patrimonio_liquido != null && f.patrimonio_liquido > 1e9,      val: f => f.patrimonio_liquido != null ? fmt.abrev(f.patrimonio_liquido) : '-' },
];

/* ── Sparkline inline SVG ── */
function Sparkline({ precoAtual }) {
  // Gera pontos simulados em torno do preço atual (30 dias)
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
    { key: 'comprar',  label: 'Comprar agora', icon: '✓', bg: '#DCFCE7', border: '#16A34A', color: '#16A34A' },
    { key: 'aguardar', label: 'Aguardar mais',  icon: '⏱', bg: '#FEF3C7', border: '#D97706', color: '#D97706' },
    { key: 'remover',  label: 'Remover',        icon: '🗑', bg: '#FEE2E2', border: '#DC2626', color: '#DC2626' },
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
  const alvo  = Number(item.preco_alvo);
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

function RadarCard({ item, onRemover, onAddCarteira, onToggleFavorito, onUpdateItem }) {
  const isAcao = (item.tipo||'').toUpperCase()==='ACAO' || (item.tipo||'').toUpperCase()==='AÇÃO';
  const criterios = isAcao ? CRITERIOS_ACAO : CRITERIOS_FII;
  const maxScore  = item.max_score || (isAcao ? 6 : 4);
  const scoreNum  = typeof item.score==='string' ? parseInt(item.score) : (item.score??0);
  const fillPct   = (scoreNum/maxScore)*100;
  const varPos    = (item.variacao_dia??0) >= 0;
  const dias      = diasNoRadar(item.created_at);

  // Div/EBIT sem dado: null ou 0 → laranja
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
                'Fundo de Papel':  { bg:'#F3E8FF', color:'#7E22CE' },
                'Fundo de Agro':   { bg:'#DCFCE7', color:'#166534' },
                'Fundo Misto':     { bg:'#E0F9FF', color:'#0369A1' },
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

      {/* Chips: dias no radar + meta de preço */}
      {(dias != null || item.preco_alvo) && (
        <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap' }}>
          {dias != null && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: '#8896A8', background: '#F8F9FA', padding: '3px 9px', borderRadius: 20, border: '1px solid #E8ECF0' }}>
              🕐 No radar há {dias} {dias === 1 ? 'dia' : 'dias'}
            </span>
          )}
          {item.preco_alvo && item.preco_atual && (() => {
            const atingiu = item.preco_atual <= item.preco_alvo;
            return (
              <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11,
                color: atingiu ? '#16A34A' : '#2563EB',
                background: atingiu ? '#DCFCE7' : '#EFF6FF',
                padding: '3px 9px', borderRadius: 20,
                border: `1px solid ${atingiu ? '#BBF7D0' : '#BFDBFE'}` }}>
                🎯 Meta {fmt.brl(item.preco_alvo)} {atingiu ? '· ✓ atingida' : `· atual ${fmt.brl(item.preco_atual)}`}
              </span>
            );
          })()}
        </div>
      )}

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
            const v  = c.val(item);
            const isDivida = c.label === 'Dívida/EBIT < 2x';
            const semDado  = isDivida && dividaSemDado;
            const dotColor = semDado ? '#D97706' : ok ? '#16A34A' : '#DC2626';
            const bgItem   = semDado ? '#FFFBEB' : '#F8F9FA';
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
    const alvo  = Number(i.preco_alvo);
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
          {alertas.map(a => `${a.ticker} → ${fmt.brl(Number(a.preco_atual))}`).join('  ·  ')}
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

export default function WatchlistPage() {
  const [itens, setItens]             = useState([]);
  const [loading, setLoading]         = useState(true);
  const [atualizando, setAtualizando] = useState(false);
  const [form, setForm]               = useState({ ticker:'',tipo:'ACAO',preco_alvo:'',observacoes:'' });
  const [erro, setErro]               = useState('');
  const [abaRadar, setAbaRadar]       = useState('acoes');
  const [busca, setBusca]             = useState('');
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

  // Atualiza campos específicos de um item sem recarregar tudo
  const updateItem = (id, campos) => {
    setItens(prev => prev.map(i => i.id === id ? { ...i, ...campos } : i));
  };

  const addCarteira = (item) => {
    const isAcao=(item.tipo||'').toUpperCase()==='ACAO'||(item.tipo||'').toUpperCase()==='AÇÃO';
    router.push(`${isAcao?'/acoes':'/fiis'}?ticker=${item.ticker}`);
  };

  if(loading) return (
    <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:256}}>
      <div style={{width:32,height:32,border:'2px solid #C9A84C',borderTopColor:'transparent',borderRadius:'50%',animation:'spin 0.7s linear infinite'}}/>
    </div>
  );

  return (
    <div>
      <style>{`
        @keyframes pulse-green {
          0%, 100% { box-shadow: 0 0 0 0 rgba(22, 163, 74, 0.3); }
          50%       { box-shadow: 0 0 0 6px rgba(22, 163, 74, 0); }
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
          <button type="submit" className="btn-primary"><Plus size={14}/>  Adicionar</button>
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

          <div style={{display:'flex',gap:0,border:'0.5px solid #E8ECF0',borderRadius:8,overflow:'hidden',marginBottom:16,width:'fit-content'}}>
            <button onClick={()=>setAbaRadar('acoes')}
              style={{padding:'7px 20px',fontSize:13,fontWeight:500,
                background:abaRadar==='acoes'?'#2563EB':'#FFFFFF',
                color:abaRadar==='acoes'?'#FFFFFF':'#8896A8',
                border:'none',cursor:'pointer'}}>
              Ações
            </button>
            <button onClick={()=>setAbaRadar('fiis')}
              style={{padding:'7px 20px',fontSize:13,fontWeight:500,
                background:abaRadar==='fiis'?'#2563EB':'#FFFFFF',
                color:abaRadar==='fiis'?'#FFFFFF':'#8896A8',
                border:'none',borderLeft:'0.5px solid #E8ECF0',cursor:'pointer'}}>
              FIIs
            </button>
          </div>

          <div style={{background:'#FFFFFF',border:'1px solid #E8ECF0',borderRadius:10,padding:'10px 14px',display:'flex',alignItems:'center',gap:8,marginBottom:16}}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#8896A8" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
            <input value={busca} onChange={e=>setBusca(e.target.value)}
              placeholder={abaRadar==='acoes'?'Buscar ação... ex: VALE3, Petrobras':'Buscar FII... ex: CPTS11, Papel'}
              style={{border:'none',outline:'none',fontSize:13,color:'#1A1A2E',background:'transparent',flex:1}}/>
            {busca&&<button onClick={()=>setBusca('')} style={{background:'none',border:'none',cursor:'pointer',color:'#8896A8',fontSize:16}}>×</button>}
          </div>
        </>
      )}

      {itens.length>0?(()=>{
        const todosAcoes=itens.filter(i=>(i.tipo||'').toUpperCase()==='ACAO'||(i.tipo||'').toUpperCase()==='AÇÃO');
        const todosFIIs=itens.filter(i=>(i.tipo||'').toUpperCase()==='FII');
        const filtrar = arr => {
          const q = busca.toLowerCase();
          return [...arr]
            .sort((a,b)=>(b.favorito?1:0)-(a.favorito?1:0))
            .filter(i => !q || i.ticker.toLowerCase().includes(q) || (i.nome_ativo||'').toLowerCase().includes(q) || (i.tipo_fundo||'').toLowerCase().includes(q));
        };
        const acoes = filtrar(todosAcoes);
        const fiis  = filtrar(todosFIIs);
        const lista = abaRadar==='acoes' ? acoes : fiis;
        return (
          <div className="grid-cards">
            {lista.map(i=>(
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
        );
      })():(
        <div style={{background:'#FFF',border:'1px solid #E8ECF0',borderRadius:14,padding:40,textAlign:'center'}}>
          <Eye size={40} style={{color:'#D0D8E0',margin:'0 auto 12px'}}/>
          <p style={{color:'#4A5568',fontWeight:500,marginBottom:4}}>Radar vazio</p>
          <p style={{color:'#8896A8',fontSize:13}}>Adicione ativos que você quer acompanhar antes de investir.</>
        </div>
      )}
    </div>
  );
}
