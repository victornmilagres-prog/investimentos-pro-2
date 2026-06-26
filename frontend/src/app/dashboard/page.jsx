'use client';
import { useState, useEffect } from 'react';
import { TrendingUp, TrendingDown, RefreshCw, Star, AlertTriangle, BarChart3, Building2, Landmark } from 'lucide-react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import api from '@/lib/api';
import { fmt, badgeClassificacao, classeDecisao } from '@/lib/utils';

const StatCard = ({ title, value, sub, icon: Icon, color = 'blue' }) => {
  const colors = {
    blue:   'bg-blue-50 text-blue-600',
    green:  'bg-green-50 text-green-600',
    amber:  'bg-amber-50 text-amber-600',
    red:    'bg-red-50 text-red-600',
    purple: 'bg-purple-50 text-purple-600',
  };
  return (
    <div className="card p-5">
      <div className="flex items-start justify-between mb-3">
        <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{title}</p>
        <div className={`p-2 rounded-lg ${colors[color]}`}><Icon size={16}/></div>
      </div>
      <p className="text-2xl font-bold text-slate-900">{value}</p>
      {sub && <p className="text-xs text-slate-500 mt-1">{sub}</p>}
    </div>
  );
};

const CORES_PIZZA = ['#2b86fc', '#16a34a', '#d97706', '#dc2626', '#7c3aed', '#0891b2'];

export default function DashboardPage() {
  const [dados, setDados] = useState(null);
  const [loading, setLoading] = useState(true);
  const [atualizando, setAtualizando] = useState(false);

  const carregar = async () => {
    try {
      const r = await api.get('/dashboard');
      setDados(r.data);
    } catch { /* silencia */ }
    finally { setLoading(false); }
  };

  const atualizarTodos = async () => {
    setAtualizando(true);
    try {
      await Promise.all([
        api.post('/acoes/atualizar-todos'),
        api.post('/fiis/atualizar-todos'),
      ]);
      await carregar();
    } finally { setAtualizando(false); }
  };

  useEffect(() => { carregar(); }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="w-8 h-8 border-2 border-brand-600 border-t-transparent rounded-full animate-spin"/>
    </div>
  );

  if (!dados) return <p className="text-slate-500">Nenhum dado disponível. Adicione ações e FIIs nas abas de avaliação.</p>;

  const { resumo, rankingAcoes, rankingFIIs, oportunidades, riscos } = dados;

  const pizzaData = [
    { name: 'Ações', value: resumo.patrimonioAcoes },
    { name: 'FIIs', value: resumo.patrimonioFIIs },
    { name: 'Renda Fixa', value: resumo.patrimonioRendaFixa },
  ].filter(d => d.value > 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Dashboard</h2>
          <p className="text-sm text-slate-500">Visão geral do seu patrimônio</p>
        </div>
        <button onClick={atualizarTodos} disabled={atualizando} className="btn-secondary flex items-center gap-2">
          <RefreshCw size={15} className={atualizando ? 'animate-spin' : ''}/>
          {atualizando ? 'Atualizando...' : 'Atualizar tudo'}
        </button>
      </div>

      {/* Cards resumo */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Patrimônio Total" value={fmt.brl(resumo.patrimonioTotal)} icon={BarChart3} color="blue"/>
        <StatCard title="Em Ações" value={fmt.brl(resumo.patrimonioAcoes)}
          sub={resumo.ganhoAcoes >= 0 ? `+${fmt.brl(resumo.ganhoAcoes)}` : fmt.brl(resumo.ganhoAcoes)}
          icon={TrendingUp} color={resumo.ganhoAcoes >= 0 ? 'green' : 'red'}/>
        <StatCard title="Em FIIs" value={fmt.brl(resumo.patrimonioFIIs)}
          sub={resumo.ganhoFIIs >= 0 ? `+${fmt.brl(resumo.ganhoFIIs)}` : fmt.brl(resumo.ganhoFIIs)}
          icon={Building2} color={resumo.ganhoFIIs >= 0 ? 'green' : 'red'}/>
        <StatCard title="Renda Fixa" value={fmt.brl(resumo.patrimonioRendaFixa)} icon={Landmark} color="purple"/>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="Total de Ativos" value={resumo.totalAtivos} sub={`${resumo.totalAcoes} ações · ${resumo.totalFIIs} FIIs`} icon={BarChart3} color="blue"/>
        <StatCard title="Excelentes" value={resumo.ativosExcelentes} icon={Star} color="green"/>
        <StatCard title="Em Risco" value={resumo.ativosRisco} icon={AlertTriangle} color="red"/>
        <StatCard title="Watchlist" value={resumo.totalWatchlist} icon={TrendingUp} color="amber"/>
      </div>

      {/* Pizza + Rankings */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Distribuição */}
        {pizzaData.length > 0 && (
          <div className="card p-5">
            <h3 className="text-sm font-semibold text-slate-900 mb-4">Distribuição do Patrimônio</h3>
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie data={pizzaData} cx="50%" cy="50%" innerRadius={50} outerRadius={80}
                  paddingAngle={3} dataKey="value">
                  {pizzaData.map((_, i) => <Cell key={i} fill={CORES_PIZZA[i % CORES_PIZZA.length]}/>)}
                </Pie>
                <Tooltip formatter={(v) => fmt.brl(v)}/>
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-2 mt-2">
              {pizzaData.map((d, i) => (
                <div key={i} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ background: CORES_PIZZA[i] }}/>
                    <span className="text-slate-600">{d.name}</span>
                  </div>
                  <span className="font-medium text-slate-800">
                    {resumo.patrimonioTotal > 0 ? fmt.pct((d.value / resumo.patrimonioTotal) * 100) : '0%'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Ranking Ações */}
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-slate-900 mb-4">Ranking Ações</h3>
          <div className="space-y-2">
            {rankingAcoes.slice(0, 6).map((a, i) => (
              <div key={a.ticker} className="flex items-center gap-3">
                <span className="text-xs text-slate-400 w-4">{i + 1}</span>
                <span className="font-mono text-sm font-semibold text-slate-800 w-16">{a.ticker}</span>
                <span className="text-xs text-slate-500 flex-1">{a.score}</span>
                <span className={`text-xs font-medium ${classeDecisao(a.decisao)}`}>
                  {a.decisao?.split('/')[0]}
                </span>
              </div>
            ))}
            {rankingAcoes.length === 0 && <p className="text-xs text-slate-400">Nenhuma ação adicionada.</p>}
          </div>
        </div>

        {/* Ranking FIIs */}
        <div className="card p-5">
          <h3 className="text-sm font-semibold text-slate-900 mb-4">Ranking FIIs</h3>
          <div className="space-y-2">
            {rankingFIIs.slice(0, 6).map((f, i) => (
              <div key={f.ticker} className="flex items-center gap-3">
                <span className="text-xs text-slate-400 w-4">{i + 1}</span>
                <span className="font-mono text-sm font-semibold text-slate-800 w-16">{f.ticker}</span>
                <span className="text-xs text-slate-500 flex-1">{f.score}</span>
                <span className={`text-xs font-medium ${classeDecisao(f.decisao)}`}>
                  {f.decisao?.split('/')[0]}
                </span>
              </div>
            ))}
            {rankingFIIs.length === 0 && <p className="text-xs text-slate-400">Nenhum FII adicionado.</p>}
          </div>
        </div>
      </div>

      {/* Radar */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-2 h-2 rounded-full bg-green-500"/>
            <h3 className="text-sm font-semibold text-slate-900">Radar de Oportunidades</h3>
          </div>
          <div className="table-container">
            <table>
              <thead><tr>
                <th>Ativo</th><th>Tipo</th><th>Score</th><th>Decisão</th>
              </tr></thead>
              <tbody>
                {oportunidades.map(a => (
                  <tr key={a.ticker}>
                    <td className="font-mono font-semibold">{a.ticker}</td>
                    <td><span className="badge badge-bom">{a.tipo}</span></td>
                    <td>{a.score}</td>
                    <td><span className={classeDecisao(a.decisao)}>{a.decisao}</span></td>
                  </tr>
                ))}
                {oportunidades.length === 0 && <tr><td colSpan={4} className="text-center text-slate-400">Nenhuma oportunidade identificada.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-2 h-2 rounded-full bg-red-500"/>
            <h3 className="text-sm font-semibold text-slate-900">Radar de Risco</h3>
          </div>
          <div className="table-container">
            <table>
              <thead><tr>
                <th>Ativo</th><th>Tipo</th><th>Score</th><th>Decisão</th>
              </tr></thead>
              <tbody>
                {riscos.map(a => (
                  <tr key={a.ticker}>
                    <td className="font-mono font-semibold">{a.ticker}</td>
                    <td>{a.tipo}</td>
                    <td>{a.score}</td>
                    <td><span className={classeDecisao(a.decisao)}>{a.decisao}</span></td>
                  </tr>
                ))}
                {riscos.length === 0 && <tr><td colSpan={4} className="text-center text-slate-400">Nenhum risco identificado.</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <p className="text-xs text-slate-400 text-center">
        Atualizado em {fmt.dataHora(dados.atualizadoEm)} · Dados via Brapi.dev · Não é recomendação de investimento
      </p>
    </div>
  );
}
