'use client';
import { useState, useEffect } from 'react';
import { Save, Target, RefreshCw } from 'lucide-react';
import api from '@/lib/api';
import { fmt } from '@/lib/utils';

export default function PlanejamentoPage() {
  const [plan, setPlan] = useState(null);
  const [sim, setSim] = useState(null);
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [msg, setMsg] = useState('');

  const carregar = async () => {
    try {
      const [rPlan, rSim] = await Promise.all([
        api.get('/planejamento'),
        api.get('/planejamento/simulador').catch(() => ({ data: null }))
      ]);
      setPlan(rPlan.data);
      setSim(rSim.data);
    } finally { setLoading(false); }
  };

  useEffect(() => { carregar(); }, []);

  const salvar = async (e) => {
    e.preventDefault();
    setSalvando(true); setMsg('');
    try {
      await api.put('/planejamento', plan);
      const r = await api.get('/planejamento/simulador').catch(() => ({ data: null }));
      setSim(r.data);
      setMsg('Planejamento salvo com sucesso!');
      setTimeout(() => setMsg(''), 3000);
    } catch { setMsg('Erro ao salvar.'); }
    finally { setSalvando(false); }
  };

  const upd = (k, v) => setPlan(p => ({ ...p, [k]: v }));

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-brand-600 border-t-transparent rounded-full animate-spin"/></div>;

  const valorMes = plan ? (Number(plan.salario) * Number(plan.percentual_investimento)) / 100 : 0;

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h2 className="text-xl font-bold text-slate-900">Planejamento Patrimonial</h2>
        <p className="text-sm text-slate-500">Configure sua estratégia de alocação de investimentos</p>
      </div>

      {msg && (
        <div className={`p-3 rounded-lg text-sm font-medium ${msg.includes('Erro') ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}`}>
          {msg}
        </div>
      )}

      <form onSubmit={salvar} className="space-y-6">
        {/* Dados básicos */}
        <div className="card p-6">
          <h3 className="text-sm font-semibold text-slate-900 mb-4">Dados Financeiros</h3>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Salário mensal (R$)</label>
              <input className="input" type="number" step="0.01" min="0"
                value={plan?.salario || ''} onChange={e => upd('salario', e.target.value)}/>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">% para investir</label>
              <input className="input" type="number" step="0.1" min="0" max="100"
                value={plan?.percentual_investimento || ''} onChange={e => upd('percentual_investimento', e.target.value)}/>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Meta de patrimônio (R$)</label>
              <input className="input" type="number" step="1000" min="0"
                value={plan?.meta_patrimonio || ''} onChange={e => upd('meta_patrimonio', e.target.value)}/>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Meta renda passiva/mês (R$)</label>
              <input className="input" type="number" step="100" min="0"
                value={plan?.meta_renda_passiva || ''} onChange={e => upd('meta_renda_passiva', e.target.value)}/>
            </div>
          </div>

          {valorMes > 0 && (
            <div className="mt-4 p-4 bg-brand-50 rounded-lg">
              <p className="text-xs text-brand-700 font-medium">Valor investido por mês</p>
              <p className="text-2xl font-bold text-brand-900">{fmt.brl(valorMes)}</p>
              <p className="text-xs text-brand-600 mt-1">{fmt.pct(plan?.percentual_investimento || 0)} do salário de {fmt.brl(plan?.salario || 0)}</p>
            </div>
          )}
        </div>

        {/* Alocação */}
        <div className="card p-6">
          <h3 className="text-sm font-semibold text-slate-900 mb-1">Alocação Mensal</h3>
          <p className="text-xs text-slate-500 mb-4">Defina como distribuir o valor investido mensalmente</p>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { k_perc: 'perc_reserva_emergencia', k_inst: 'inst_reserva', label: 'Reserva de Emergência', cor: 'blue' },
              { k_perc: 'perc_cdb', k_inst: 'inst_cdb', label: 'CDB Estratégico', cor: 'purple' },
              { k_perc: 'perc_acoes', k_inst: 'inst_acoes', label: 'Ações', cor: 'green' },
              { k_perc: 'perc_fiis', k_inst: 'inst_fiis', label: 'FIIs', cor: 'amber' },
              { k_perc: 'perc_bitcoin', k_inst: 'inst_bitcoin', label: 'Bitcoin', cor: 'orange' },
              { k_perc: 'perc_ouro', k_inst: 'inst_ouro', label: 'Ouro', cor: 'yellow' },
            ].map(({ k_perc, k_inst, label }) => (
              <div key={k_perc} className="bg-slate-50 rounded-lg p-4 space-y-2">
                <p className="text-xs font-semibold text-slate-700">{label}</p>
                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className="block text-xs text-slate-500 mb-1">%</label>
                    <input className="input text-sm" type="number" step="0.1" min="0" max="100"
                      value={plan?.[k_perc] || ''} onChange={e => upd(k_perc, e.target.value)}/>
                  </div>
                  <div className="flex-1">
                    <label className="block text-xs text-slate-500 mb-1">Instituição</label>
                    <input className="input text-sm" placeholder="XP..."
                      value={plan?.[k_inst] || ''} onChange={e => upd(k_inst, e.target.value)}/>
                  </div>
                </div>
                {valorMes > 0 && plan?.[k_perc] > 0 && (
                  <p className="text-xs font-medium text-brand-700">
                    = {fmt.brl((valorMes * Number(plan[k_perc])) / 100)}/mês
                  </p>
                )}
              </div>
            ))}
          </div>
          <div className="mt-3 text-xs text-slate-500">
            Total alocado: {fmt.pct(
              [plan?.perc_reserva_emergencia, plan?.perc_cdb, plan?.perc_acoes,
               plan?.perc_fiis, plan?.perc_bitcoin, plan?.perc_ouro]
              .reduce((s, v) => s + Number(v||0), 0)
            )}
          </div>
        </div>

        <button type="submit" disabled={salvando} className="btn-primary flex items-center gap-2">
          <Save size={15}/>
          {salvando ? 'Salvando...' : 'Salvar planejamento'}
        </button>
      </form>

      {/* Simulador de aportes */}
      {sim && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-slate-900">Simulador de Aporte</h3>
            <button onClick={carregar} className="btn-secondary text-xs flex items-center gap-1">
              <RefreshCw size={13}/> Recalcular
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="card p-5">
              <h4 className="text-sm font-semibold text-slate-800 mb-3">
                Ações — {fmt.brl(sim.alocacoes?.acoes?.valor || 0)}/mês
              </h4>
              {sim.aporteAcoes?.length > 0 ? (
                <table className="w-full text-sm">
                  <thead><tr className="border-b border-slate-100">
                    <th className="text-left text-xs text-slate-500 pb-2">Ação</th>
                    <th className="text-right text-xs text-slate-500 pb-2">Peso</th>
                    <th className="text-right text-xs text-slate-500 pb-2">Valor sugerido</th>
                  </tr></thead>
                  <tbody>
                    {sim.aporteAcoes.map(a => (
                      <tr key={a.ticker} className="border-b border-slate-50">
                        <td className="py-1.5 font-mono font-semibold text-brand-700">{a.ticker}</td>
                        <td className="py-1.5 text-right text-slate-500">{fmt.pct(a.peso * 100)}</td>
                        <td className="py-1.5 text-right font-semibold text-slate-900">{fmt.brl(a.valorSugerido)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : <p className="text-sm text-slate-400">Adicione ações na aba de avaliação.</p>}
            </div>

            <div className="card p-5">
              <h4 className="text-sm font-semibold text-slate-800 mb-3">
                FIIs — {fmt.brl(sim.alocacoes?.fiis?.valor || 0)}/mês
              </h4>
              {sim.aporteFIIs?.length > 0 ? (
                <table className="w-full text-sm">
                  <thead><tr className="border-b border-slate-100">
                    <th className="text-left text-xs text-slate-500 pb-2">FII</th>
                    <th className="text-right text-xs text-slate-500 pb-2">Peso</th>
                    <th className="text-right text-xs text-slate-500 pb-2">Valor sugerido</th>
                  </tr></thead>
                  <tbody>
                    {sim.aporteFIIs.map(f => (
                      <tr key={f.ticker} className="border-b border-slate-50">
                        <td className="py-1.5 font-mono font-semibold text-brand-700">{f.ticker}</td>
                        <td className="py-1.5 text-right text-slate-500">{fmt.pct(f.peso * 100)}</td>
                        <td className="py-1.5 text-right font-semibold text-slate-900">{fmt.brl(f.valorSugerido)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : <p className="text-sm text-slate-400">Adicione FIIs na aba de avaliação.</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
