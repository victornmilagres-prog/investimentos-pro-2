'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, ChevronRight, ChevronLeft, Check } from 'lucide-react';
import api from '@/lib/api';

const TERMO_VERSAO = '2.0';

function LogoIcon({ size = 36 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" fill="none">
      <polygon points="2,38 13,7 24,38" fill="none" stroke="#FFFFFF" strokeWidth="2.8" strokeLinejoin="round"/>
      <line x1="6" y1="27" x2="20" y2="27" stroke="#FFFFFF" strokeWidth="2.8"/>
      <circle cx="33" cy="8" r="4" fill="#C9A84C"/>
      <line x1="33" y1="14" x2="33" y2="38" stroke="#FFFFFF" strokeWidth="2.8" strokeLinecap="round"/>
      <line x1="2" y1="39.5" x2="37" y2="39.5" stroke="#C9A84C" strokeWidth="1.5"/>
    </svg>
  );
}

function formatCPF(v) { return v.replace(/\D/g,'').slice(0,11).replace(/(\d{3})(\d)/,'$1.$2').replace(/(\d{3})(\d)/,'$1.$2').replace(/(\d{3})(\d{1,2})$/,'$1-$2'); }
function formatTel(v) { return v.replace(/\D/g,'').slice(0,11).replace(/(\d{2})(\d)/,'($1) $2').replace(/(\d{5})(\d)/,'$1-$2'); }
function formatCEP(v) { return v.replace(/\D/g,'').slice(0,8).replace(/(\d{5})(\d)/,'$1-$2'); }

export default function RegisterPage() {
  const router = useRouter();
  const [etapa, setEtapa] = useState(1);
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState('');
  const [showSenha, setShowSenha] = useState(false);
  const [form, setForm] = useState({
    nome:'',cpf:'',telefone:'',email:'',
    enderecoCep:'',enderecoRua:'',enderecoNumero:'',enderecoComplemento:'',
    enderecoBairro:'',enderecoCidade:'',enderecoEstado:'',
    senha:'',confirmarSenha:'',termoAceito:false
  });
  const set = (f,v) => setForm(p=>({...p,[f]:v}));

  const buscarCEP = async (cep) => {
    const c = cep.replace(/\D/g,'');
    if(c.length!==8)return;
    try { const r=await fetch(`https://viacep.com.br/ws/${c}/json/`); const d=await r.json(); if(!d.erro){setForm(p=>({...p,enderecoRua:d.logradouro||'',enderecoBairro:d.bairro||'',enderecoCidade:d.localidade||'',enderecoEstado:d.uf||''}));} } catch{}
  };

  const validar = () => {
    setErro('');
    if(etapa===1){ if(!form.nome.trim())return setErro('Nome obrigatorio'),false; if(form.cpf.replace(/\D/g,'').length!==11)return setErro('CPF invalido'),false; if(form.telefone.replace(/\D/g,'').length<10)return setErro('Telefone invalido'),false; if(!form.email.includes('@'))return setErro('Email invalido'),false; }
    if(etapa===3){ if(form.senha.length<6)return setErro('Senha deve ter no minimo 6 caracteres'),false; if(form.senha!==form.confirmarSenha)return setErro('Senhas nao coincidem'),false; }
    if(etapa===4&&!form.termoAceito)return setErro('Voce precisa aceitar os termos para continuar'),false;
    return true;
  };

  const handleSubmit = async () => {
    if(!validar())return;
    setLoading(true);
    try {
      const r = await api.post('/auth/register',{...form,termoAceito:'true',termoVersao:TERMO_VERSAO});
      localStorage.setItem('token',r.data.token);
      router.push('/dashboard');
    } catch(err){ setErro(err.response?.data?.errors?.[0]?.msg||err.response?.data?.error||'Erro ao criar conta.'); }
    finally{ setLoading(false); }
  };

  const inp = (label,value,onChange,opts={}) => (
    <div>
      <label className="block text-sm font-medium mb-1" style={{color:'#999'}}>{label}{opts.required!==false&&<span style={{color:'#F87171'}}> *</span>}</label>
      <input type={opts.type||'text'} value={value} onChange={e=>onChange(e.target.value)} placeholder={opts.placeholder||''}
        className="input w-full" style={{background:'#1A1A26',border:'1px solid #2A2A3A',color:'#FFF'}}/>
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4" style={{background:'#0A0A0F'}}>
      <div className="w-full max-w-lg">
        <div className="flex flex-col items-center mb-6">
          <LogoIcon size={48}/>
          <h1 style={{color:'#FFF',fontSize:'16px',fontWeight:'800',letterSpacing:'3px',marginTop:'10px'}}>AI INVESTIMENTOS</h1>
          <div style={{width:'50px',height:'1.5px',background:'#C9A84C',margin:'6px auto'}}/>
          <p style={{color:'#C9A84C',fontSize:'9px',letterSpacing:'2px'}}>SEU COPILOTO INTELIGENTE PARA INVESTIR</p>
        </div>

        {/* Progress */}
        <div className="flex gap-1 mb-5">
          {[1,2,3,4].map(n=>(
            <div key={n} style={{flex:1,height:'3px',borderRadius:'2px',background:etapa>=n?'#C9A84C':'#222'}}/>
          ))}
        </div>

        <div className="rounded-xl p-6" style={{background:'#0F0F1A',border:'1px solid #1A1A2E'}}>
          {erro&&<div className="mb-4 p-3 rounded-lg text-sm" style={{background:'#2D1515',border:'1px solid #5A2020',color:'#F87171'}}>{erro}</div>}

          {etapa===1&&(
            <>
              <h2 className="text-base font-semibold mb-0.5" style={{color:'#FFF'}}>Dados pessoais</h2>
              <p className="text-xs mb-4" style={{color:'#555'}}>Etapa 1 de 4</p>
              <div className="space-y-3">
                {inp('Nome completo',form.nome,v=>set('nome',v),{placeholder:'Seu nome completo'})}
                {inp('CPF',form.cpf,v=>set('cpf',formatCPF(v)),{placeholder:'000.000.000-00'})}
                {inp('Telefone / WhatsApp',form.telefone,v=>set('telefone',formatTel(v)),{placeholder:'(00) 00000-0000'})}
                {inp('Email',form.email,v=>set('email',v),{type:'email',placeholder:'seu@email.com'})}
              </div>
            </>
          )}

          {etapa===2&&(
            <>
              <h2 className="text-base font-semibold mb-0.5" style={{color:'#FFF'}}>Endereco</h2>
              <p className="text-xs mb-4" style={{color:'#555'}}>Etapa 2 de 4 — opcional</p>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium mb-1" style={{color:'#999'}}>CEP</label>
                  <input value={form.enderecoCep} onChange={e=>{const v=formatCEP(e.target.value);set('enderecoCep',v);buscarCEP(v);}}
                    placeholder="00000-000" className="input w-full" style={{background:'#1A1A26',border:'1px solid #2A2A3A',color:'#FFF'}}/>
                </div>
                {inp('Rua / Logradouro',form.enderecoRua,v=>set('enderecoRua',v),{placeholder:'Nome da rua',required:false})}
                <div className="grid grid-cols-2 gap-3">
                  {inp('Numero',form.enderecoNumero,v=>set('enderecoNumero',v),{placeholder:'123',required:false})}
                  {inp('Complemento',form.enderecoComplemento,v=>set('enderecoComplemento',v),{placeholder:'Apto 4',required:false})}
                </div>
                {inp('Bairro',form.enderecoBairro,v=>set('enderecoBairro',v),{placeholder:'Bairro',required:false})}
                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-2">{inp('Cidade',form.enderecoCidade,v=>set('enderecoCidade',v),{placeholder:'Cidade',required:false})}</div>
                  <div>
                    <label className="block text-sm font-medium mb-1" style={{color:'#999'}}>UF</label>
                    <input value={form.enderecoEstado} onChange={e=>set('enderecoEstado',e.target.value.toUpperCase().slice(0,2))}
                      placeholder="RJ" className="input w-full" style={{background:'#1A1A26',border:'1px solid #2A2A3A',color:'#FFF'}}/>
                  </div>
                </div>
              </div>
            </>
          )}

          {etapa===3&&(
            <>
              <h2 className="text-base font-semibold mb-0.5" style={{color:'#FFF'}}>Criar acesso</h2>
              <p className="text-xs mb-4" style={{color:'#555'}}>Etapa 3 de 4</p>
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium mb-1" style={{color:'#999'}}>Senha <span style={{color:'#F87171'}}>*</span></label>
                  <div className="relative">
                    <input type={showSenha?'text':'password'} value={form.senha} onChange={e=>set('senha',e.target.value)}
                      placeholder="Minimo 6 caracteres" className="input w-full pr-10" style={{background:'#1A1A26',border:'1px solid #2A2A3A',color:'#FFF'}}/>
                    <button type="button" onClick={()=>setShowSenha(!showSenha)} className="absolute right-3 top-1/2 -translate-y-1/2" style={{color:'#555'}}>
                      {showSenha?<EyeOff size={16}/>:<Eye size={16}/>}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1" style={{color:'#999'}}>Confirmar senha <span style={{color:'#F87171'}}>*</span></label>
                  <input type="password" value={form.confirmarSenha} onChange={e=>set('confirmarSenha',e.target.value)}
                    placeholder="Repita a senha" className="input w-full" style={{background:'#1A1A26',border:'1px solid #2A2A3A',color:'#FFF'}}/>
                </div>
              </div>
            </>
          )}

          {etapa===4&&(
            <>
              <h2 className="text-base font-semibold mb-0.5" style={{color:'#FFF'}}>Termos de Uso e Privacidade</h2>
              <p className="text-xs mb-4" style={{color:'#555'}}>Etapa 4 de 4 — Leitura obrigatoria</p>
              <div className="rounded-lg p-4 mb-4 overflow-y-auto text-sm space-y-3" style={{background:'#0A0A0F',border:'1px solid #1A1A2E',height:'260px',color:'#999',lineHeight:'1.7'}}>
                <p style={{color:'#C9A84C',fontWeight:'600',fontSize:'12px',letterSpacing:'1px'}}>TERMOS DE USO E POLITICA DE PRIVACIDADE — AI INVESTIMENTOS (v2.0)</p>

                <p><span style={{color:'#FFF',fontWeight:'600'}}>1. Natureza e Finalidade do Servico</span><br/>
                O AI Investimentos e uma plataforma digital de visualizacao, organizacao e analise de dados financeiros publicos. As informacoes apresentadas — incluindo cotacoes, indicadores, rankings, graficos e scores — sao obtidas de fontes publicas e processadas exclusivamente para fins informativos. O servico NAO constitui, em hipotese alguma, recomendacao, indicacao, consultoria, sugestao ou oferta de investimento. O usuario e o unico e exclusivo responsavel por suas decisoes financeiras.</p>

                <p><span style={{color:'#FFF',fontWeight:'600'}}>2. Nao Configuracao como Assessoria de Investimentos</span><br/>
                Nos termos da Resolucao CVM n 20/2021 e legislacao correlata, o AI Investimentos nao e registrado como assessor de investimentos perante a Comissao de Valores Mobiliarios (CVM) e nao exerce atividade de consultoria financeira regulada. Nenhum conteudo desta plataforma deve ser interpretado como recomendacao de compra, venda ou manutencao de qualquer ativo financeiro. Para decisoes de investimento, o usuario deve consultar profissional devidamente habilitado e certificado pelos orgaos competentes.</p>

                <p><span style={{color:'#FFF',fontWeight:'600'}}>3. Coleta e Tratamento de Dados Pessoais — LGPD</span><br/>
                Em conformidade com a Lei Geral de Protecao de Dados Pessoais (Lei Federal n 13.709/2018 — LGPD), o AI Investimentos realiza o tratamento dos dados pessoais do usuario com base no consentimento expresso e na execucao do contrato de prestacao de servicos. Os dados coletados (nome, CPF, e-mail, telefone e endereco) sao utilizados exclusivamente para:<br/>
                (a) Identificacao e autenticacao do usuario na plataforma;<br/>
                (b) Comunicacoes relacionadas ao servico contratado;<br/>
                (c) Cumprimento de obrigacoes legais e regulatorias;<br/>
                (d) Melhoria continua dos servicos oferecidos.</p>

                <p><span style={{color:'#FFF',fontWeight:'600'}}>4. Compartilhamento de Dados</span><br/>
                Os dados pessoais do usuario NAO serao vendidos, cedidos, alugados ou compartilhados com terceiros para fins comerciais ou publicitarios. O compartilhamento podera ocorrer apenas nas seguintes hipoteses: (a) cumprimento de ordem judicial ou determinacao de autoridade competente; (b) integracao com servicos tecnicos essenciais ao funcionamento da plataforma, mediante clausulas de confidencialidade; (c) mediante consentimento expresso e especifico do titular.</p>

                <p><span style={{color:'#FFF',fontWeight:'600'}}>5. Direitos do Titular dos Dados</span><br/>
                Nos termos do art. 18 da LGPD, o usuario tem direito a: confirmacao da existencia de tratamento; acesso aos dados; correcao de dados incompletos ou desatualizados; anonimizacao, bloqueio ou eliminacao de dados desnecessarios; portabilidade dos dados; informacao sobre compartilhamento; revogacao do consentimento; e peticao perante a Autoridade Nacional de Protecao de Dados (ANPD). Para exercer esses direitos, o usuario deve entrar em contato atraves dos canais oficiais da plataforma.</p>

                <p><span style={{color:'#FFF',fontWeight:'600'}}>6. Seguranca dos Dados</span><br/>
                O AI Investimentos adota medidas tecnicas e organizacionais adequadas para proteger os dados pessoais contra acesso nao autorizado, alteracao, divulgacao ou destruicao, incluindo criptografia de senhas, controle de acesso e monitoramento de seguranca.</p>

                <p><span style={{color:'#FFF',fontWeight:'600'}}>7. Retencao dos Dados</span><br/>
                Os dados pessoais serao mantidos pelo periodo necessario ao cumprimento das finalidades para as quais foram coletados, observados os prazos legais aplicaveis. Apos o encerramento da conta, os dados poderao ser retidos pelo prazo minimo exigido por lei.</p>

                <p><span style={{color:'#FFF',fontWeight:'600'}}>8. Registro de Aceite</span><br/>
                O presente aceite e registrado com data, hora e endereco IP do usuario, constituindo prova do consentimento para todos os fins legais. O usuario declara ter capacidade civil plena para celebrar o presente instrumento.</p>

                <p><span style={{color:'#FFF',fontWeight:'600'}}>9. Alteracoes nos Termos</span><br/>
                O AI Investimentos reserva-se o direito de atualizar os presentes termos. Alteracoes substanciais serao comunicadas ao usuario com antecedencia minima de 15 dias. O uso continuado da plataforma apos a vigencia das novas condicoes implica aceite tacito das alteracoes.</p>

                <p><span style={{color:'#FFF',fontWeight:'600'}}>10. Foro</span><br/>
                Fica eleito o foro da comarca de Niteroi, Estado do Rio de Janeiro, para dirimir eventuais controversias decorrentes dos presentes termos, com renancia expressa a qualquer outro, por mais privilegiado que seja.</p>
              </div>

              <label className="flex items-start gap-3 cursor-pointer" onClick={()=>set('termoAceito',!form.termoAceito)}>
                <div className="mt-0.5 flex-shrink-0 w-5 h-5 rounded flex items-center justify-center transition-colors"
                  style={{background:form.termoAceito?'#C9A84C':'transparent',border:form.termoAceito?'2px solid #C9A84C':'2px solid #333'}}>
                  {form.termoAceito&&<Check size={12} style={{color:'#0A0A0F'}}/>}
                </div>
                <span className="text-sm" style={{color:'#999'}}>
                  Li e concordo com os <strong style={{color:'#C9A84C'}}>Termos de Uso</strong> e a <strong style={{color:'#C9A84C'}}>Politica de Privacidade (LGPD)</strong>. Entendo que esta plataforma nao oferece recomendacoes de investimento.
                </span>
              </label>
            </>
          )}

          <div className="flex gap-3 mt-6">
            {etapa>1&&(
              <button onClick={()=>{setErro('');setEtapa(e=>e-1);}} className="flex items-center gap-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                style={{border:'1px solid #2A2A3A',color:'#999',background:'transparent'}}>
                <ChevronLeft size={16}/> Voltar
              </button>
            )}
            {etapa<4?(
              <button onClick={()=>{if(validar())setEtapa(e=>e+1);}} className="flex-1 py-2.5 rounded-lg text-sm font-semibold flex items-center justify-center gap-1"
                style={{background:'#C9A84C',color:'#0A0A0F'}}>
                Continuar <ChevronRight size={16}/>
              </button>
            ):(
              <button onClick={handleSubmit} disabled={loading||!form.termoAceito}
                className="flex-1 py-2.5 rounded-lg text-sm font-semibold disabled:opacity-40"
                style={{background:'#C9A84C',color:'#0A0A0F'}}>
                {loading?'Criando conta...':'Criar minha conta'}
              </button>
            )}
          </div>

          {etapa===1&&(
            <p className="mt-4 text-center text-sm" style={{color:'#555'}}>
              Ja tem conta? <a href="/login" style={{color:'#C9A84C',fontWeight:'600'}}>Entrar</a>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}