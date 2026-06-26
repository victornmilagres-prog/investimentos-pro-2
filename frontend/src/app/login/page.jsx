'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { TrendingUp, Eye, EyeOff } from 'lucide-react';
import api from '@/lib/api';

export default function LoginPage() {
  const [form, setForm] = useState({ email: '', senha: '' });
  const [showSenha, setShowSenha] = useState(false);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState('');
  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErro('');
    try {
      const r = await api.post('/auth/login', form);
      localStorage.setItem('token', r.data.token);
      router.push('/dashboard');
    } catch (err) {
      setErro(err.response?.data?.error || 'Erro ao fazer login.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-950 via-brand-900 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-brand-500 mb-4">
            <TrendingUp size={32} className="text-white"/>
          </div>
          <h1 className="text-2xl font-bold text-white">Investimentos Pro</h1>
          <p className="text-brand-300 text-sm mt-1">Versão 2.0 — Análise Patrimonial</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-xl shadow-2xl p-8">
          <h2 className="text-lg font-semibold text-slate-900 mb-6">Entrar na plataforma</h2>

          {erro && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {erro}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
              <input
                type="email" className="input" placeholder="seu@email.com"
                value={form.email} onChange={e => setForm({...form, email: e.target.value})}
                required autoFocus
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Senha</label>
              <div className="relative">
                <input
                  type={showSenha ? 'text' : 'password'} className="input pr-10"
                  placeholder="••••••••"
                  value={form.senha} onChange={e => setForm({...form, senha: e.target.value})}
                  required
                />
                <button type="button" onClick={() => setShowSenha(!showSenha)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  {showSenha ? <EyeOff size={16}/> : <Eye size={16}/>}
                </button>
              </div>
            </div>
            <button type="submit" className="btn-primary w-full mt-2" disabled={loading}>
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
          </form>

          <p className="mt-4 text-center text-sm text-slate-500">
            Não tem conta?{' '}
            <a href="/register" className="text-brand-600 font-medium hover:underline">
              Criar conta
            </a>
          </p>
        </div>

        <p className="text-center text-xs text-brand-400 mt-6">
          Dados em tempo real via Brapi.dev • Não é recomendação de investimento
        </p>
      </div>
    </div>
  );
}
