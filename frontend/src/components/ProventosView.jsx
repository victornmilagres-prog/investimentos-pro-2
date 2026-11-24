'use client';
import { useState, useMemo } from 'react';

const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

const fmtBrl = v => `R$ ${Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function ProventosView({ proventos, ano, setAno, onLancar, onExcluir, tipo, anosDisponiveis }) {
  const [expanded, setExpanded] = useState({});

  const mesAtual = new Date().getMonth();
  const anoAtual = new Date().getFullYear();

  const porMes = useMemo(() => {
    const map = {};
    for (let m = 0; m < 12; m++) {
      const key = `${ano}-${String(m + 1).padStart(2, '0')}`;
      map[key] = { mes: m, itens: [], total: 0 };
    }
    proventos.forEach(p => {
      const key = p.mes_referencia.slice(0, 7);
      if (map[key]) {
        map[key].itens.push(p);
        map[key].total += Number(p.total);
      }
    });
    return Object.entries(map)
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([key, val]) => ({ key, ...val }));
  }, [proventos, ano]);

  const totalAno      = proventos.reduce((s, p) => s + Number(p.total), 0);
  const mesesLancados = porMes.filter(m => m.itens.length > 0).length;
  const media         = mesesLancados > 0 ? totalAno / mesesLancados : 0;
  const maiorMes      = Math.max(...porMes.map(m => m.total), 0);

  const toggle = key => setExpanded(e => ({ ...e, [key]: !e[key] }));

  const anos = useMemo(() => {
    const base = anosDisponiveis && anosDisponiveis.length > 0 ? [...anosDisponiveis] : [];
    const set = new Set(base);
    set.add(anoAtual);
    return Array.from(set).sort((a, b) => a - b);
  }, [anosDisponiveis, anoAtual]);

  return (
    <div>
      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 20 }}>
        {[
          { label: `Total ${ano}`,     val: fmtBrl(totalAno), color: 'var(--success)' },
          { label: 'Meses lançados',   val: `${mesesLancados} / ${ano === anoAtual ? mesAtual + 1 : 12}`, color: 'var(--accent)' },
          { label: 'Média / Mês',      val: fmtBrl(media), color: '' },
          { label: 'Maior mês',        val: fmtBrl(maiorMes), color: 'var(--accent)' },
        ].map(c => (
          <div key={c.label} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '14px 16px' }}>
            <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-secondary)', marginBottom: 6 }}>{c.label}</div>
            <div style={{ fontSize: 19, fontWeight: 700, color: c.color || 'var(--text-primary)' }}>{c.val}</div>
          </div>
        ))}
      </div>

      {/* Controles */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
        <div style={{ display: 'flex', gap: 4, background: 'var(--border)', borderRadius: 8, padding: 3 }}>
          {anos.map(y => (
            <button key={y} onClick={() => setAno(y)}
              style={{ padding: '5px 14px', border: 'none', borderRadius: 6, fontSize: 13, fontWeight: y === ano ? 700 : 500,
                background: y === ano ? 'var(--surface)' : 'none', color: y === ano ? 'var(--text-primary)' : 'var(--text-secondary)', cursor: 'pointer' }}>
              {y}
            </button>
          ))}
        </div>
        <button onClick={onLancar}
          style={{ padding: '8px 16px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
          + Lançar Provento
        </button>
      </div>

      {/* Alerta mês pendente */}
      {(() => {
        const keyAtual = `${anoAtual}-${String(mesAtual + 1).padStart(2, '0')}`;
        const mesAtualData = porMes.find(m => m.key === keyAtual);
        if (ano === anoAtual && mesAtualData && mesAtualData.itens.length === 0) {
          return (
            <div style={{ background: 'rgba(217,119,6,0.08)', border: '1px solid var(--warning)', borderRadius: 10, padding: '10px 16px', marginBottom: 14, color: 'var(--warning)', fontSize: 13, fontWeight: 500 }}>
              ⚠️ <strong>{MESES[mesAtual]}/{anoAtual}</strong> ainda não foi lançado — verifique se há proventos a registrar.
            </div>
          );
        }
      })()}

      {/* Lista de meses */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {porMes.filter(m => ano < anoAtual ? true : m.mes <= mesAtual).map(m => {
          const lancado = m.itens.length > 0;
          const isOpen  = expanded[m.key];
          const ultimoLanc = lancado ? [...m.itens].sort((a, b) => a.created_at < b.created_at ? 1 : -1)[0].created_at : null;
          return (
            <div key={m.key} style={{ background: 'var(--surface)', border: `1px solid ${lancado ? 'var(--border)' : 'var(--warning)'}`, borderRadius: 12, overflow: 'hidden' }}>
              <div onClick={() => toggle(m.key)}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '13px 18px', cursor: 'pointer', gap: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: lancado ? 'var(--success)' : 'var(--warning)', flexShrink: 0 }} />
                  <span style={{ fontWeight: 700, fontSize: 15, minWidth: 130 }}>{MESES[m.mes]} {ano}</span>
                  <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 10px', borderRadius: 20, textTransform: 'uppercase', letterSpacing: '0.04em',
                    background: lancado ? 'rgba(22,163,74,0.1)' : 'rgba(217,119,6,0.1)',
                    color: lancado ? 'var(--success)' : 'var(--warning)' }}>
                    {lancado ? '✓ Lançado' : '⚠ Pendente'}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 700, fontSize: 16, color: lancado ? 'var(--success)' : 'var(--text-secondary)' }}>
                      {lancado ? fmtBrl(m.total) : '— —'}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                      {lancado ? `${m.itens.length} lançamento${m.itens.length > 1 ? 's' : ''} · ${new Date(ultimoLanc).toLocaleDateString('pt-BR')}` : 'Nenhum lançamento'}
                    </div>
                  </div>
                  <span style={{ fontSize: 12, color: 'var(--text-secondary)', transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>▼</span>
                </div>
              </div>

              {isOpen && (
                <div style={{ borderTop: '1px solid var(--border)', padding: '4px 18px 14px' }}>
                  {lancado ? (
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, marginTop: 10 }}>
                      <thead>
                        <tr>
                          {['Ativo', 'Tipo', 'Qtd', 'Valor/cota', 'Total', 'Data Pgto', ''].map(h => (
                            <th key={h} style={{ textAlign: ['Qtd','Valor/cota','Total'].includes(h) ? 'right' : 'left', padding: '6px 10px', borderBottom: '1px solid var(--border)', color: 'var(--text-secondary)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {m.itens.map(item => (
                          <tr key={item.id}>
                            <td style={{ padding: '9px 10px', borderBottom: '1px solid var(--border)' }}>
                              <span style={{ background: 'var(--border)', borderRadius: 5, padding: '2px 8px', fontWeight: 700, fontSize: 13 }}>{item.ticker}</span>
                            </td>
                            <td style={{ padding: '9px 10px', borderBottom: '1px solid var(--border)' }}>
                              <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 7px', borderRadius: 10, textTransform: 'uppercase', background: 'rgba(22,163,74,0.1)', color: 'var(--success)' }}>{item.tipo}</span>
                            </td>
                            <td style={{ padding: '9px 10px', borderBottom: '1px solid var(--border)', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{item.quantidade}</td>
                            <td style={{ padding: '9px 10px', borderBottom: '1px solid var(--border)', textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{fmtBrl(item.valor_por_cota)}</td>
                            <td style={{ padding: '9px 10px', borderBottom: '1px solid var(--border)', textAlign: 'right', fontWeight: 700, color: 'var(--success)', fontVariantNumeric: 'tabular-nums' }}>{fmtBrl(item.total)}</td>
                            <td style={{ padding: '9px 10px', borderBottom: '1px solid var(--border)', fontSize: 12, color: 'var(--text-secondary)' }}>
                              {item.data_pagamento ? new Date(item.data_pagamento + 'T12:00').toLocaleDateString('pt-BR') : '—'}
                            </td>
                            <td style={{ padding: '9px 10px', borderBottom: '1px solid var(--border)' }}>
                              <button onClick={() => onExcluir(item.id)} style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer', fontSize: 14 }}>🗑</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <div style={{ padding: '16px 0', textAlign: 'center', color: 'var(--text-secondary)', fontSize: 13 }}>
                      Nenhum provento lançado para este mês.
                      <button onClick={onLancar} style={{ marginLeft: 10, padding: '4px 12px', background: 'rgba(37,99,235,0.08)', color: 'var(--accent)', border: '1px solid var(--accent)', borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>+ Lançar agora</button>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Total */}
      <div style={{ background: 'rgba(37,99,235,0.06)', border: '1px solid var(--accent)', borderRadius: 10, padding: '12px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12, flexWrap: 'wrap', gap: 10 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>TOTAL LANÇADO {tipo.toUpperCase()} {ano}</span>
        <span style={{ fontSize: 19, fontWeight: 700, color: 'var(--accent)', fontVariantNumeric: 'tabular-nums' }}>{fmtBrl(totalAno)}</span>
      </div>
    </div>
  );
}
