# 🚀 Investimentos Pro 2.0

Plataforma completa de análise patrimonial com dados em tempo real via Brapi.dev.

## 📋 O que você vai precisar

- [Node.js 18+](https://nodejs.org) instalado no seu computador
- [Git](https://git-scm.com) instalado
- Conta gratuita no [Railway](https://railway.app) (banco de dados)
- Conta gratuita no [Vercel](https://vercel.com) (frontend)
- Sua chave da Brapi (já tem)

---

## 🗂️ Estrutura do projeto

```
investimentos-pro-2/
├── backend/      → API Node.js + Express
└── frontend/     → Interface Next.js
```

---

## ⚙️ Passo a Passo Completo

### 1. Baixe o projeto

```bash
# Clone o repositório
git clone https://github.com/SEU_USUARIO/investimentos-pro-2.git
cd investimentos-pro-2
```

---

### 2. Configure o banco de dados (Railway)

1. Acesse [railway.app](https://railway.app) e faça login com GitHub
2. Clique em **New Project → Add a service → Database → PostgreSQL**
3. Aguarde criar. Clique no banco → aba **Connect**
4. Copie a **DATABASE_URL** (começa com `postgresql://...`)

---

### 3. Configure o Backend

```bash
cd backend

# Instale as dependências
npm install

# Crie o arquivo de configuração
cp .env.example .env
```

Agora abra o arquivo `backend/.env` e preencha:

```env
PORT=3001
NODE_ENV=development
DATABASE_URL=postgresql://... (cole aqui a URL do Railway)
JWT_SECRET=coloque_aqui_uma_senha_longa_e_aleatoria_ex_abc123xyz456
JWT_EXPIRES_IN=7d
BRAPI_TOKEN=4iMXGMidcSS1XN32qwkDib
FRONTEND_URL=http://localhost:3000
```

**Crie as tabelas no banco:**

```bash
npm run db:migrate
```

Você deve ver: `✅ Migração concluída com sucesso!`

**Inicie o backend:**

```bash
npm run dev
```

Você verá: `🚀 Investimentos Pro 2.0 rodando na porta 3001`

> Deixe este terminal aberto e abra um novo terminal para o frontend.

---

### 4. Configure o Frontend

```bash
cd ../frontend

# Instale as dependências
npm install

# Crie o arquivo de configuração
cp .env.example .env.local
```

O arquivo `frontend/.env.local` já está correto para desenvolvimento local:
```env
NEXT_PUBLIC_API_URL=http://localhost:3001/api
```

**Inicie o frontend:**

```bash
npm run dev
```

Acesse: **http://localhost:3000**

---

### 5. Primeiro acesso

1. Acesse `http://localhost:3000`
2. Clique em **Criar conta**
3. Use seu email e senha
4. Pronto! Você será redirecionado ao Dashboard

**Criando outros usuários:**
- Cada pessoa acessa `/register` e cria a própria conta
- Cada conta tem dados completamente isolados

---

## 🌐 Deploy em Produção (grátis)

### Backend no Railway

1. No Railway, clique em **New Project → Deploy from GitHub repo**
2. Selecione este repositório
3. Clique em **Add service** e aponte para a pasta `backend`
4. Vá em **Variables** e adicione todas as variáveis do `.env`:
   - `DATABASE_URL` (a mesma do banco)
   - `JWT_SECRET`
   - `BRAPI_TOKEN`
   - `NODE_ENV=production`
   - `FRONTEND_URL=https://seu-app.vercel.app`
5. Após o deploy, copie a **URL pública** do backend (ex: `https://xxx.railway.app`)
6. Execute a migração via Railway Shell: `node src/config/migrate.js`

### Frontend no Vercel

1. Acesse [vercel.com](https://vercel.com) e faça login com GitHub
2. Clique em **New Project** → importe este repositório
3. Em **Root Directory**, selecione `frontend`
4. Em **Environment Variables**, adicione:
   - `NEXT_PUBLIC_API_URL=https://xxx.railway.app/api` (URL do backend no Railway)
5. Clique em **Deploy**
6. Sua URL será algo como `https://investimentos-pro.vercel.app`

---

## 📱 Abas do Sistema

| Aba | O que faz |
|-----|-----------|
| **Planejamento Patrimonial** | Configura salário, % de investimento, alocação por categoria e visualiza simulador de aportes |
| **Dashboard** | Visão geral do patrimônio, rankings, radar de oportunidades e riscos |
| **Avaliação de Ações** | Busca ação na Brapi, calcula Score /6 (P/L, P/VP, Margem, ROE, Dívida, DY), mostra performance da posição |
| **Avaliação de FIIs** | Busca FII na Brapi, calcula Score /4 (DY, P/VP, Volume, Patrimônio), mostra performance |
| **Renda Fixa** | Registro manual de CDBs, LCIs, Tesouro Direto etc. |
| **Watchlist** | Ativos que você monitora antes de comprar |

---

## 🔑 Critérios de Avaliação

### Ações (Score /6)
- ✅ P/L < 15
- ✅ P/VP < 1,5
- ✅ Margem Líquida > 10%
- ✅ ROE > 10%
- ✅ Dívida Líq./EBIT < 2x
- ✅ Dividend Yield > 6%

**Classificação:** 5-6 pts = EXCELENTE | 4 pts = BOM | 3 pts = ATENÇÃO | 0-2 pts = RISCO

### FIIs (Score /4)
- ✅ DY Mensal > 1%
- ✅ P/VP < 1,05
- ✅ Volume Financeiro Diário > R$ 1M
- ✅ Patrimônio Líquido > R$ 1B

**Classificação:** 4 pts = EXCELENTE | 3 pts = BOM | 2 pts = ATENÇÃO | 0-1 pt = RISCO

---

## 🔔 Notificações

O sistema gera notificações automáticas quando:
- Um ativo muda de classificação (ex: passa de BOM para EXCELENTE)
- Um ativo entra na zona de RISCO
- Um ativo está com decisão COMPRAR/ACUMULAR

---

## 🛠️ Comandos úteis

```bash
# Backend
npm run dev          # Inicia em modo desenvolvimento
npm run start        # Inicia em produção
npm run db:migrate   # Cria/atualiza tabelas

# Frontend
npm run dev          # Inicia em modo desenvolvimento
npm run build        # Gera build de produção
npm run start        # Inicia build de produção
```

---

## ❓ Problemas comuns

**"Cannot connect to database"**
→ Verifique se a `DATABASE_URL` no `.env` está correta

**"Ação não encontrada na Brapi"**
→ Verifique se o ticker está correto (ex: PETR4, não PETR4.SA)

**CORS error no frontend**
→ Verifique se `FRONTEND_URL` no backend aponta para a URL correta

---

> ⚠️ Este sistema é um radar de decisão baseado em critérios predefinidos. Não é recomendação de compra ou venda de ativos.
