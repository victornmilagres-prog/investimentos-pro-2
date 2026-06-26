'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { TrendingUp } from 'lucide-react';
import api from '@/lib/api';

export default function RegisterPage() {
  const [form, setForm] = useState({ nome: '', email: '', senha: '', confirmar: '' });
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState('');
  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.senha !== form.confirmar) return setErro('As senhas não coincidem.');
    setLoading(true); setErro('');
    try {
      const r = await api.post('/auth/register', { nome: form.nome, email: form.email, senha: form.senha });
      localStorage.setItem('token', r.data.token);
      router.push('/planejamento');
    } catch (err) {
      setErro(err.response?.data?.error || err.response?.data?.errors?.[0]?.msg || 'Erro ao criar conta.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-950 via-brand-900 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-brand-500 mb-4">
            <TrendingUp size={32} className="text-white"/>
          </div>
          <h1 className="text-2xl font-bold text-white">Criar conta</h1>
          <p className="text-brand-300 text-sm mt-1">Investimentos Pro 2.0</p>
        </div>
        <div className="bg-white rounded-xl shadow-2xl p-8">
          <h2 className="text-lg font-semibold text-slate-900 mb-6">Dados de acesso</h2>
          {erro && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{erro}</div>}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Nome completo</label>
              <input className="input" type="text" placeholder="Seu nome" value={form.nome}
                onChange={e => setForm({...form, nome: e.target.value})} required autoFocus/>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
              <input className="input" type="email" placeholder="seu@email.com" value={form.email}
                onChange={e => setForm({...form, email: e.target.value})} required/>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Senha</label>
              <input className="input" type="password" placeholder="Mínimo 6 caracteres" value={form.senha}
                onChange={e => setForm({...form, senha: e.target.value})} required minLength={6}/>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Confirmar senha</label>
              <input className="input" type="password" placeholder="Repita a senha" value={form.confirmar}
                onChange={e => setForm({...form, confirmar: e.target.value})} required/>
            </div>
            <button type="submit" className="btn-primary w-full mt-2" disabled={loading}>
              {loading ? 'Criando conta...' : 'Criar conta'}
            </button>
          </form>
          <p className="mt-4 text-center text-sm text-slate-500">
            Já tem conta?{' '}
            <a href="/login" className="text-brand-600 font-medium hover:underline">Entrar</a>
          </p>
        </div>
      </div>
    </div>
  );
}
