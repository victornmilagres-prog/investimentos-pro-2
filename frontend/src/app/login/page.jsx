'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff } from 'lucide-react';
import api from '@/lib/api';

function LogoIcon({ size = 40 }) {
  const gold = '#C9A84C';
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <polygon points="2,38 13,7 24,38" fill="none" stroke="#FFFFFF" strokeWidth="2.8" strokeLinejoin="round"/>
      <line x1="6" y1="27" x2="20" y2="27" stroke="#FFFFFF" strokeWidth="2.8"/>
      <circle cx="33" cy="8" r="4" fill={gold}/>
      <line x1="33" y1="14" x2="33" y2="38" stroke="#FFFFFF" strokeWidth="2.8" strokeLinecap="round"/>
      <line x1="2" y1="39.5" x2="37" y2="39.5" stroke={gold} strokeWidth="1.5"/>
    </svg>
  );
}

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
    <div className="min-h-screen flex" style={{ background: '#0A0A0F' }}>
      {/* Lado esquerdo — branding (desktop) */}
      <div className="hidden lg:flex lg:w-1/2 flex-col items-center justify-center p-12" style={{ background: '#0F0F1A' }}>
        <div className="max-w-sm text-center">
          <LogoIcon size={80}/>
          <h1 style={{ color: '#FFFFFF', fontSize: '28px', fontWeight: '800', letterSpacing: '3px', marginTop: '24px' }}>AI INVESTIMENTOS</h1>
          <div style={{ width: '80px', height: '2px', background: '#C9A84C', margin: '12px auto' }}/>
          <p style={{ color: '#C9A84C', fontSize: '11px', letterSpacing: '2px', marginBottom: '40px' }}>SEU COPILOTO INTELIGENTE PARA INVESTIR</p>
          <p style={{ color: '#555', fontSize: '13px', lineHeight: '1.8' }}>Analise seu patrimônio com dados em tempo real. Acoes, FIIs e renda fixa em um so lugar.</p>
          <p style={{ color: '#333', fontSize: '11px', marginTop: '60px' }}>Nao é recomendacao de investimento</p>
        </div>
      </div>

      {/* Lado direito — formulario */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 lg:p-12">
        {/* Logo mobile */}
        <div className="lg:hidden flex flex-col items-center mb-8">
          <LogoIcon size={56}/>
          <h1 style={{ color: '#FFFFFF', fontSize: '18px', fontWeight: '800', letterSpacing: '3px', marginTop: '12px' }}>AI INVESTIMENTOS</h1>
          <div style={{ width: '60px', height: '1.5px', background: '#C9A84C', margin: '8px auto' }}/>
          <p style={{ color: '#C9A84C', fontSize: '9px', letterSpacing: '2px' }}>SEU COPILOTO INTELIGENTE PARA INVESTIR</p>
        </div>

        <div className="w-full max-w-sm">
          <h2 className="text-lg font-semibold mb-1" style={{ color: '#FFFFFF' }}>Entrar na plataforma</h2>
          <p className="text-sm mb-6" style={{ color: '#555' }}>Bem-vindo de volta</p>

          {erro && <div className="mb-4 p-3 rounded-lg text-sm" style={{ background: '#2D1515', border: '1px solid #5A2020', color: '#F87171' }}>{erro}</div>}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1" style={{ color: '#999' }}>Email</label>
              <input type="email" className="input" placeholder="seu@email.com" style={{ background: '#1A1A26', border: '1px solid #2A2A3A', color: '#FFF' }}
                value={form.email} onChange={e => setForm({...form, email: e.target.value})} required autoFocus/>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-sm font-medium" style={{ color: '#999' }}>Senha</label>
                <a href="/esqueci-senha" className="text-xs" style={{ color: '#C9A84C' }}>Esqueceu a senha?</a>
              </div>
              <div className="relative">
                <input type={showSenha ? 'text' : 'password'} className="input pr-10" placeholder="••••••••"
                  style={{ background: '#1A1A26', border: '1px solid #2A2A3A', color: '#FFF' }}
                  value={form.senha} onChange={e => setForm({...form, senha: e.target.value})} required/>
                <button type="button" onClick={() => setShowSenha(!showSenha)}
                  className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: '#555' }}>
                  {showSenha ? <EyeOff size={16}/> : <Eye size={16}/>}
                </button>
              </div>
            </div>
            <button type="submit" disabled={loading}
              className="w-full py-3 rounded-lg text-sm font-semibold transition-opacity disabled:opacity-50"
              style={{ background: '#C9A84C', color: '#0A0A0F', letterSpacing: '1px' }}>
              {loading ? 'Entrando...' : 'ENTRAR'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm" style={{ color: '#555' }}>
            Nao tem conta?{' '}
            <a href="/register" style={{ color: '#C9A84C', fontWeight: '600' }}>Criar conta</a>
          </p>
        </div>
      </div>
    </div>
  );
}