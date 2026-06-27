'use client';
import { useState } from 'react';
import { TrendingUp, ArrowLeft, KeyRound, CheckCircle, Mail } from 'lucide-react';
import api from '@/lib/api';

export default function EsqueciSenhaPage() {
  const [etapa, setEtapa] = useState('email');
  const [email, setEmail] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [novaSenha, setNovaSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState('');

  const handleSolicitarCodigo = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErro('');
    try {
      await api.post('/auth/esqueci-senha', { email });
      setEtapa('token');
    } catch (err) {
      setErro(err.response?.data?.error || 'Erro ao solicitar redefinicao.');
    } finally {
      setLoading(false);
    }
  };

  const handleRedefinir = async (e) => {
    e.preventDefault();
    if (novaSenha !== confirmarSenha) { setErro('As senhas nao coincidem.'); return; }
    setLoading(true);
    setErro('');
    try {
      await api.post('/auth/redefinir-senha', { resetCode, novaSenha });
      setEtapa('sucesso');
    } catch (err) {
      setErro(err.response?.data?.error || 'Codigo invalido ou expirado.');
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
          <h1 className="text-2xl font-bold text-white">Investimentos Pro</h1>
          <p className="text-brand-300 text-sm mt-1">Redefinicao de Senha</p>
        </div>

        <div className="bg-white rounded-xl shadow-2xl p-8">

          {etapa === 'email' && (
            <>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-full bg-brand-100 flex items-center justify-center">
                  <KeyRound size={20} className="text-brand-600"/>
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">Esqueceu sua senha?</h2>
                  <p className="text-sm text-slate-500">Informe seu email para receber o codigo</p>
                </div>
              </div>
              {erro && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{erro}</div>}
              <form onSubmit={handleSolicitarCodigo} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Email cadastrado</label>
                  <input type="email" className="input" placeholder="seu@email.com"
                    value={email} onChange={e => setEmail(e.target.value)} required autoFocus/>
                </div>
                <button type="submit" className="btn-primary w-full" disabled={loading}>
                  {loading ? 'Enviando...' : 'Enviar codigo por email'}
                </button>
              </form>
            </>
          )}

          {etapa === 'token' && (
            <>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                  <Mail size={20} className="text-blue-600"/>
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">Verifique seu email</h2>
                  <p className="text-sm text-slate-500">Enviamos um codigo de 6 digitos para <strong>{email}</strong></p>
                </div>
              </div>
              <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-blue-700 text-sm">
                Abra seu email e copie o codigo de 6 digitos. O codigo expira em 1 hora.
              </div>
              {erro && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{erro}</div>}
              <form onSubmit={handleRedefinir} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Codigo recebido por email</label>
                  <input type="text" className="input text-center text-2xl font-bold tracking-widest"
                    placeholder="000000" maxLength={6} value={resetCode}
                    onChange={e => setResetCode(e.target.value.replace(/D/g, ''))} required/>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Nova senha</label>
                  <input type="password" className="input" placeholder="Minimo 6 caracteres"
                    value={novaSenha} onChange={e => setNovaSenha(e.target.value)} required minLength={6}/>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Confirmar nova senha</label>
                  <input type="password" className="input" placeholder="Repita a nova senha"
                    value={confirmarSenha} onChange={e => setConfirmarSenha(e.target.value)} required minLength={6}/>
                </div>
                <button type="submit" className="btn-primary w-full" disabled={loading}>
                  {loading ? 'Redefinindo...' : 'Redefinir senha'}
                </button>
              </form>
              <button onClick={() => { setEtapa('email'); setErro(''); }}
                className="mt-3 w-full text-sm text-slate-500 hover:text-brand-600 text-center">
                Nao recebi o email, tentar novamente
              </button>
            </>
          )}

          {etapa === 'sucesso' && (
            <div className="text-center py-4">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mb-4">
                <CheckCircle size={32} className="text-green-600"/>
              </div>
              <h2 className="text-lg font-semibold text-slate-900 mb-2">Senha redefinida!</h2>
              <p className="text-sm text-slate-500 mb-6">Sua senha foi atualizada com sucesso.</p>
              <a href="/login" className="btn-primary inline-block">Ir para o login</a>
            </div>
          )}

          {etapa !== 'sucesso' && (
            <div className="mt-6 text-center">
              <a href="/login" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-brand-600">
                <ArrowLeft size={14}/> Voltar ao login
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}