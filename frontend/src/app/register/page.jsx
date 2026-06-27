'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { TrendingUp, Eye, EyeOff, ChevronRight, ChevronLeft, Check, X } from 'lucide-react';
import api from '@/lib/api';

const TERMO_VERSAO = '1.0';

function formatCPF(v) {
  return v.replace(/\D/g,'').slice(0,11)
    .replace(/(\d{3})(\d)/,'$1.$2')
    .replace(/(\d{3})(\d)/,'$1.$2')
    .replace(/(\d{3})(\d{1,2})$/,'$1-$2');
}

function formatTel(v) {
  return v.replace(/\D/g,'').slice(0,11)
    .replace(/(\d{2})(\d)/,'($1) $2')
    .replace(/(\d{5})(\d)/,'$1-$2');
}

function formatCEP(v) {
  return v.replace(/\D/g,'').slice(0,8)
    .replace(/(\d{5})(\d)/,'$1-$2');
}

export default function RegisterPage() {
  const router = useRouter();
  const [etapa, setEtapa] = useState(1); // 1=dados pessoais, 2=endereco, 3=acesso, 4=termo
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState('');
  const [showSenha, setShowSenha] = useState(false);
  const [termoAberto, setTermoAberto] = useState(false);

  const [form, setForm] = useState({
    nome: '', cpf: '', telefone: '', email: '',
    enderecoCep: '', enderecoRua: '', enderecoNumero: '',
    enderecoComplemento: '', enderecoBairro: '',
    enderecoCidade: '', enderecoEstado: '',
    senha: '', confirmarSenha: '',
    termoAceito: false
  });

  const set = (field, value) => setForm(f => ({ ...f, [field]: value }));

  const buscarCEP = async (cep) => {
    const c = cep.replace(/\D/g,'');
    if (c.length !== 8) return;
    try {
      const r = await fetch(`https://viacep.com.br/ws/${c}/json/`);
      const d = await r.json();
      if (!d.erro) {
        setForm(f => ({
          ...f,
          enderecoRua: d.logradouro || '',
          enderecoBairro: d.bairro || '',
          enderecoCidade: d.localidade || '',
          enderecoEstado: d.uf || ''
        }));
      }
    } catch {}
  };

  const validarEtapa = () => {
    setErro('');
    if (etapa === 1) {
      if (!form.nome.trim()) return setErro('Nome obrigatorio'), false;
      if (form.cpf.replace(/\D/g,'').length !== 11) return setErro('CPF invalido'), false;
      if (form.telefone.replace(/\D/g,'').length < 10) return setErro('Telefone invalido'), false;
      if (!form.email.includes('@')) return setErro('Email invalido'), false;
    }
    if (etapa === 3) {
      if (form.senha.length < 6) return setErro('Senha deve ter no minimo 6 caracteres'), false;
      if (form.senha !== form.confirmarSenha) return setErro('Senhas nao coincidem'), false;
    }
    if (etapa === 4) {
      if (!form.termoAceito) return setErro('Voce precisa aceitar os termos para continuar'), false;
    }
    return true;
  };

  const avancar = () => {
    if (!validarEtapa()) return;
    setEtapa(e => e + 1);
  };

  const handleSubmit = async () => {
    if (!validarEtapa()) return;
    setLoading(true);
    setErro('');
    try {
      const r = await api.post('/auth/register', {
        ...form,
        termoAceito: 'true',
        termoVersao: TERMO_VERSAO
      });
      localStorage.setItem('token', r.data.token);
      router.push('/dashboard');
    } catch (err) {
      const msg = err.response?.data?.errors?.[0]?.msg || err.response?.data?.error || 'Erro ao criar conta.';
      setErro(msg);
    } finally {
      setLoading(false);
    }
  };

  const Input = ({ label, value, onChange, type='text', placeholder='', required=true }) => (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1">{label}{required && <span className="text-red-500 ml-0.5">*</span>}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)}
        placeholder={placeholder} className="input w-full"/>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-950 via-brand-900 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Logo */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-brand-500 mb-3">
            <TrendingUp size={28} className="text-white"/>
          </div>
          <h1 className="text-xl font-bold text-white">Investimentos Pro</h1>
          <p className="text-brand-300 text-sm mt-1">Versao 2.0 — Analise Patrimonial</p>
        </div>

        {/* Progress */}
        <div className="flex items-center gap-1 mb-6">
          {[1,2,3,4].map(n => (
            <div key={n} className={`h-1.5 flex-1 rounded-full transition-all ${etapa >= n ? 'bg-brand-400' : 'bg-white/20'}`}/>
          ))}
        </div>

        <div className="bg-white rounded-xl shadow-2xl p-6">
          {/* Etapa 1 — Dados pessoais */}
          {etapa === 1 && (
            <>
              <h2 className="text-lg font-semibold text-slate-900 mb-1">Dados Pessoais</h2>
              <p className="text-sm text-slate-500 mb-4">Etapa 1 de 4</p>
              {erro && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{erro}</div>}
              <div className="space-y-3">
                <Input label="Nome completo" value={form.nome} onChange={v => set('nome', v)} placeholder="Seu nome completo"/>
                <Input label="CPF" value={form.cpf} onChange={v => set('cpf', formatCPF(v))} placeholder="000.000.000-00"/>
                <Input label="Telefone / WhatsApp" value={form.telefone} onChange={v => set('telefone', formatTel(v))} placeholder="(00) 00000-0000"/>
                <Input label="Email" value={form.email} onChange={v => set('email', v)} type="email" placeholder="seu@email.com"/>
              </div>
            </>
          )}

          {/* Etapa 2 — Endereco */}
          {etapa === 2 && (
            <>
              <h2 className="text-lg font-semibold text-slate-900 mb-1">Endereco</h2>
              <p className="text-sm text-slate-500 mb-4">Etapa 2 de 4 — opcional</p>
              {erro && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{erro}</div>}
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">CEP</label>
                  <input value={form.enderecoCep} onChange={e => { const v = formatCEP(e.target.value); set('enderecoCep', v); buscarCEP(v); }}
                    placeholder="00000-000" className="input w-full"/>
                </div>
                <Input label="Rua / Logradouro" value={form.enderecoRua} onChange={v => set('enderecoRua', v)} placeholder="Nome da rua" required={false}/>
                <div className="grid grid-cols-2 gap-3">
                  <Input label="Numero" value={form.enderecoNumero} onChange={v => set('enderecoNumero', v)} placeholder="123" required={false}/>
                  <Input label="Complemento" value={form.enderecoComplemento} onChange={v => set('enderecoComplemento', v)} placeholder="Apto 4" required={false}/>
                </div>
                <Input label="Bairro" value={form.enderecoBairro} onChange={v => set('enderecoBairro', v)} placeholder="Bairro" required={false}/>
                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-2">
                    <Input label="Cidade" value={form.enderecoCidade} onChange={v => set('enderecoCidade', v)} placeholder="Cidade" required={false}/>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">UF</label>
                    <input value={form.enderecoEstado} onChange={e => set('enderecoEstado', e.target.value.toUpperCase().slice(0,2))}
                      placeholder="RJ" className="input w-full"/>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Etapa 3 — Acesso */}
          {etapa === 3 && (
            <>
              <h2 className="text-lg font-semibold text-slate-900 mb-1">Criar Acesso</h2>
              <p className="text-sm text-slate-500 mb-4">Etapa 3 de 4</p>
              {erro && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{erro}</div>}
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Senha <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <input type={showSenha ? 'text' : 'password'} value={form.senha}
                      onChange={e => set('senha', e.target.value)} placeholder="Minimo 6 caracteres" className="input w-full pr-10"/>
                    <button type="button" onClick={() => setShowSenha(!showSenha)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                      {showSenha ? <EyeOff size={16}/> : <Eye size={16}/>}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Confirmar senha <span className="text-red-500">*</span></label>
                  <input type="password" value={form.confirmarSenha}
                    onChange={e => set('confirmarSenha', e.target.value)} placeholder="Repita a senha" className="input w-full"/>
                </div>
              </div>
            </>
          )}

          {/* Etapa 4 — Termo */}
          {etapa === 4 && (
            <>
              <h2 className="text-lg font-semibold text-slate-900 mb-1">Termos de Uso</h2>
              <p className="text-sm text-slate-500 mb-4">Etapa 4 de 4 — Leitura obrigatoria</p>
              {erro && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{erro}</div>}

              <div className="bg-slate-50 rounded-lg border border-slate-200 p-4 h-64 overflow-y-auto text-sm text-slate-700 space-y-3 mb-4">
                <p className="font-semibold text-slate-900">Termos de Uso e Politica de Privacidade — Investimentos Pro 2.0 (v1.0)</p>

                <p><strong>1. Natureza do Servico</strong><br/>
                O Investimentos Pro 2.0 e uma plataforma de visualizacao e analise de dados de ativos financeiros. As informacoes apresentadas sao obtidas de fontes publicas e nao constituem, em hipotese alguma, recomendacao, indicacao, sugestao ou conselho de investimento. O usuario e o unico responsavel por suas decisoes financeiras.</p>

                <p><strong>2. Nao e Recomendacao de Investimento</strong><br/>
                Nenhuma informacao disponibilizada nesta plataforma — incluindo scores, rankings, graficos e indicadores — deve ser interpretada como orientacao para compra ou venda de qualquer ativo. Sempre consulte um profissional certificado pela CVM antes de tomar decisoes de investimento.</p>

                <p><strong>3. Protecao de Dados — LGPD</strong><br/>
                Em conformidade com a Lei Geral de Protecao de Dados (Lei n° 13.709/2018 — LGPD), seus dados pessoais (nome, CPF, email, telefone e endereco) sao coletados exclusivamente para fins de identificacao e acesso a plataforma. Seus dados:</p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Nao serao vendidos, compartilhados ou divulgados a terceiros sem seu consentimento expresso;</li>
                  <li>Sao armazenados com criptografia e controles de acesso adequados;</li>
                  <li>Podem ser solicitados para exclusao a qualquer momento pelo titular;</li>
                  <li>Serao utilizados apenas para operacao da plataforma.</li>
                </ul>

                <p><strong>4. Responsabilidade</strong><br/>
                O Investimentos Pro 2.0 nao se responsabiliza por perdas financeiras decorrentes do uso das informacoes da plataforma. O usuario declara ciencia de que dados de mercado podem apresentar atrasos ou imprecisoes.</p>

                <p><strong>5. Aceite</strong><br/>
                Ao marcar a caixa de aceite, o usuario declara ter lido, compreendido e concordado com todos os termos acima. Este aceite e registrado com data, hora e IP do usuario para fins legais.</p>
              </div>

              <label className="flex items-start gap-3 cursor-pointer">
                <div onClick={() => set('termoAceito', !form.termoAceito)}
                  className={`mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors
                  ${form.termoAceito ? 'bg-brand-600 border-brand-600' : 'border-slate-300 bg-white'}`}>
                  {form.termoAceito && <Check size={12} className="text-white"/>}
                </div>
                <span className="text-sm text-slate-700">
                  Li e concordo com os <strong>Termos de Uso</strong> e a <strong>Politica de Privacidade (LGPD)</strong>. Entendo que esta plataforma nao oferece recomendacoes de investimento.
                </span>
              </label>
            </>
          )}

          {/* Botoes de navegacao */}
          <div className="flex gap-3 mt-6">
            {etapa > 1 && (
              <button onClick={() => { setErro(''); setEtapa(e => e-1); }}
                className="flex items-center gap-1 px-4 py-2 rounded-lg border border-slate-300 text-slate-600 text-sm font-medium hover:bg-slate-50">
                <ChevronLeft size={16}/> Voltar
              </button>
            )}
            {etapa < 4 ? (
              <button onClick={avancar} className="flex-1 btn-primary flex items-center justify-center gap-1">
                Continuar <ChevronRight size={16}/>
              </button>
            ) : (
              <button onClick={handleSubmit} disabled={loading || !form.termoAceito}
                className="flex-1 btn-primary flex items-center justify-center gap-2 disabled:opacity-50">
                {loading ? 'Criando conta...' : 'Criar minha conta'}
              </button>
            )}
          </div>

          {etapa === 1 && (
            <p className="mt-4 text-center text-sm text-slate-500">
              Ja tem conta?{' '}
              <a href="/login" className="text-brand-600 font-medium hover:underline">Entrar</a>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}