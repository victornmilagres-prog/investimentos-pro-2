'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff } from 'lucide-react';
import api from '@/lib/api';

function LogoIcon({ size = 40, dark = false }) {
  const gold = '#C9A84C';
  const stroke = dark ? '#1A1A2E' : '#FFFFFF';
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
      <polygon points="2,38 13,7 24,38" fill="none" stroke={stroke} strokeWidth="2.8" strokeLinejoin="round"/>
      <line x1="6" y1="27" x2="20" y2="27" stroke={stroke} strokeWidth="2.8"/>
      <circle cx="33" cy="8" r="4" fill={gold}/>
      <line x1="33" y1="14" x2="33" y2="38" stroke={stroke} strokeWidth="2.8" strokeLinecap="round"/>
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
    <div style={{ minHeight: '100vh', display: 'flex', background: '#F0F2F5' }}>
      {/* Lado esquerdo — branding (desktop) */}
      <div style={{
        display: 'none', width: '50%', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        padding: 48, background: '#FFFFFF', borderRight: '1px solid #E8ECF0',
      }} className="login-left">
        <div style={{ maxWidth: 320, textAlign: 'center' }}>
          <LogoIcon size={80} dark/>
          <h1 style={{ color: '#1A1A2E', fontSize: 26, fontWeight: 800, letterSpacing: 3, marginTop: 24 }}>AI INVESTIMENTOS</h1>
          <div style={{ width: 80, height: 2, background: '#C9A84C', margin: '12px auto' }}/>
          <p style={{ color: '#C9A84C', fontSize: 11, letterSpacing: 2, marginBottom: 40 }}>SEU COPILOTO INTELIGENTE PARA INVESTIR</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, textAlign: 'left' }}>
            {[
              { icon: '📈', text: 'Avaliação fundamentalista em tempo real' },
              { icon: '🏢', text: 'Análise de FIIs com critérios de qualidade' },
              { icon: '🔒', text: 'Carteira de renda fixa centralizada' },
            ].map(f => (
              <div key={f.text} style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#F8F9FA', border: '1px solid #E8ECF0', borderRadius: 10, padding: '9px 14px' }}>
                <span style={{ fontSize: 16 }}>{f.icon}</span>
                <span style={{ fontSize: 12, color: '#4A5568', fontWeight: 500 }}>{f.text}</span>
              </div>
            ))}
          </div>
          <p style={{ color: '#8896A8', fontSize: 11, marginTop: 40 }}>Não é recomendação de investimento</p>
        </div>
      </div>

      {/* Lado direito — formulário */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        {/* Logo mobile */}
        <div className="login-logo-mobile" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 32 }}>
          <LogoIcon size={56} dark/>
          <h1 style={{ color: '#1A1A2E', fontSize: 18, fontWeight: 800, letterSpacing: 3, marginTop: 12 }}>AI INVESTIMENTOS</h1>
          <div style={{ width: 60, height: 1.5, background: '#C9A84C', margin: '8px auto' }}/>
          <p style={{ color: '#C9A84C', fontSize: 9, letterSpacing: 2 }}>SEU COPILOTO INTELIGENTE PARA INVESTIR</p>
        </div>

        <div style={{ width: '100%', maxWidth: 360, background: '#FFFFFF', border: '1px solid #E8ECF0', borderRadius: 16, padding: 32 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: '#1A1A2E', marginBottom: 4 }}>Entrar na plataforma</h2>
          <p style={{ fontSize: 13, color: '#8896A8', marginBottom: 24 }}>Bem-vindo de volta</p>

          {erro && (
            <div style={{ marginBottom: 16, padding: 12, borderRadius: 8, background: '#FEF2F2', border: '1px solid #FECACA', color: '#DC2626', fontSize: 13 }}>
              {erro}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#4A5568', marginBottom: 6 }}>Email</label>
              <input type="email" className="input" placeholder="seu@email.com"
                style={{ background: '#F8F9FA', border: '1px solid #E8ECF0', color: '#1A1A2E' }}
                value={form.email} onChange={e => setForm({...form, email: e.target.value})} required autoFocus/>
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#4A5568' }}>Senha</label>
                <a href="/esqueci-senha" style={{ fontSize: 12, color: '#C9A84C', textDecoration: 'none' }}>Esqueceu a senha?</a>
              </div>
              <div style={{ position: 'relative' }}>
                <input type={showSenha ? 'text' : 'password'} className="input" placeholder="••••••••"
                  style={{ background: '#F8F9FA', border: '1px solid #E8ECF0', color: '#1A1A2E', paddingRight: 40 }}
                  value={form.senha} onChange={e => setForm({...form, senha: e.target.value})} required/>
                <button type="button" onClick={() => setShowSenha(!showSenha)} style={{
                  position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer', color: '#8896A8', padding: 0,
                }}>
                  {showSenha ? <EyeOff size={16}/> : <Eye size={16}/>}
                </button>
              </div>
            </div>
            <button type="submit" disabled={loading} style={{
              width: '100%', padding: '12px 0', borderRadius: 8, fontSize: 13, fontWeight: 700,
              background: '#C9A84C', color: '#FFFFFF', border: 'none', cursor: 'pointer',
              letterSpacing: '1px', opacity: loading ? 0.6 : 1,
            }}>
              {loading ? 'Entrando...' : 'ENTRAR'}
            </button>
          </form>

          <p style={{ marginTop: 20, textAlign: 'center', fontSize: 13, color: '#8896A8' }}>
            Não tem conta?{' '}
            <a href="/register" style={{ color: '#C9A84C', fontWeight: 600, textDecoration: 'none' }}>Criar conta</a>
          </p>
        </div>
      </div>

      <style>{`
        @media (min-width: 768px) {
          .login-left { display: flex !important; }
          .login-logo-mobile { display: none !important; }
        }
      `}</style>
    </div>
  );
}
