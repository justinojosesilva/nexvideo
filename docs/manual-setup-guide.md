# Guia de Ações Manuais — OpenAI, Stripe e Google

> **Objetivo:** este documento reúne, num só lugar, tudo que precisa ser feito manualmente (fora do código) para que a aplicação funcione de verdade em desenvolvimento — e o que falta adicionalmente para produção. As credenciais placeholder usadas no smoke test local (`apps/api/.env`, `apps/worker/.env`) precisam ser substituídas pelos valores reais descritos aqui.
>
> Para o runbook completo de go-live (Stripe live mode, verificação Google, GCP em produção), ver [production-readiness-gate.md](./production-readiness-gate.md). Este guia cobre o nível anterior: **conseguir rodar a aplicação com integrações reais em modo de teste/desenvolvimento**.

---

## Resumo — o que falta preencher

| Variável | Onde | Serviço | Obrigatória para |
|---|---|---|---|
| `OPENAI_API_KEY` | `apps/api/.env` | OpenAI | Geração de roteiro, thumbnail, narração (texto), scoring |
| `STRIPE_SECRET_KEY` | `apps/api/.env` | Stripe | Checkout, portal, assinatura |
| `STRIPE_WEBHOOK_SECRET` | `apps/api/.env` | Stripe | Validar eventos de webhook |
| `YOUTUBE_API_KEY` | `apps/api/.env` | Google Cloud | Trends/scoring (busca e stats de vídeos) |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | `apps/api/.env` | Google Cloud | OAuth de conexão de canal do YouTube |

Todas as demais variáveis já usadas no smoke test (`JWT_SECRET`, `ENCRYPTION_KEY`, `REDIS_URL`, etc.) são infraestrutura local e não dependem de nenhuma conta externa.

---

## 1. OpenAI

**Usado em:** `packages/prompts` (geração de scripts, títulos, thumbnails, scoring) — chamado pelo worker e pela API.

1. Acesse [platform.openai.com](https://platform.openai.com/) e crie/faça login na conta.
2. Vá em **Settings → Billing** e adicione um método de pagamento (a API não funciona no plano gratuito sem crédito ativo).
3. Vá em **API keys → Create new secret key**.
4. Copie a chave (só é exibida uma vez).
5. Cole em `OPENAI_API_KEY` em `apps/api/.env` e `apps/worker/.env`.

**Custo:** cada geração de script tem um teto configurado em `MAX_COST_PER_SCRIPT_BRL` (padrão R$1,50, ver `env.validation.ts`). Recomenda-se configurar um **limite de gasto mensal** em Settings → Limits para evitar surpresas durante testes.

**Como validar:** com a API rodando, dispare `POST /scripts/project/:projectId/generate` — se a chave estiver errada, o erro aparece nos logs do worker como `OpenAI API Error`.

---

## 2. Stripe

**Usado em:** `apps/api/src/billing` (checkout, portal, assinaturas, webhooks).

### 2.1 Conta e chaves de teste

1. Acesse [dashboard.stripe.com/register](https://dashboard.stripe.com/register) e crie a conta (ou use uma existente).
2. Certifique-se de estar em **modo Test** (toggle no canto superior direito do dashboard).
3. Vá em **Developers → API keys** e copie a **Secret key** (`sk_test_...`).
4. Cole em `STRIPE_SECRET_KEY` em `apps/api/.env`.

### 2.2 Produtos e preços

1. Vá em **Product catalog → Add product** e crie os planos que a aplicação espera (ver `apps/api/src/billing/` e a tabela `Plan` no schema Prisma para os slugs/nomes esperados).
2. Anote os `price_...` gerados — são referenciados pelo `planSlug` no banco (tabela `Plan`), não direto por env var.

### 2.3 Webhook (obrigatório para checkout funcionar de ponta a ponta)

Localmente, use a Stripe CLI em vez de configurar um endpoint público:

```bash
brew install stripe/stripe-cli/stripe
stripe login
stripe listen --forward-to localhost:3002/billing/webhook
```

O comando `stripe listen` imprime um `whsec_...` — cole em `STRIPE_WEBHOOK_SECRET` em `apps/api/.env`. Esse valor muda a cada execução do `stripe listen`, então repita esse passo sempre que reiniciar.

### 2.4 URLs de retorno

Já configuradas no `.env` local para apontar para o frontend (`STRIPE_SUCCESS_URL`, `STRIPE_CANCEL_URL`, `STRIPE_PORTAL_RETURN_URL`) — não precisam de ação manual em dev.

**Como validar:** rode o playbook de 7 casos de teste em [stripe-e2e-test-playbook.md](./stripe-e2e-test-playbook.md) com cartões de teste ([lista oficial](https://stripe.com/docs/testing)).

**Para produção (live mode):** ver [stripe-go-live-checklist.md](./stripe-go-live-checklist.md) — chaves `sk_live_`, webhook endpoint público, revisão de conta Stripe.

---

## 3. Google (YouTube Data API + OAuth)

**Usado em:** `apps/api/src/adapters/implementations/youtube-data.adapter.ts` (busca/scoring) e `apps/api/src/youtube` (conexão OAuth de canal).

### 3.1 Criar o projeto GCP e habilitar as APIs

Siga [gcp-project-setup.md](./gcp-project-setup.md) seções 1–3. Resumo rápido para dev local:

1. [console.cloud.google.com](https://console.cloud.google.com) → **New Project** (ex: `nexvideo-dev`).
2. **APIs & Services → Library** → habilite **YouTube Data API v3** (e **YouTube Analytics API**, se for testar o fluxo de conexão de canal).
3. Billing não é obrigatório para uso dentro da quota gratuita (10.000 unidades/dia), mas sem ele algumas APIs recusam ativação — vincule um cartão se necessário (não deve gerar cobrança dentro da quota gratuita).

### 3.2 API Key (para busca/scoring de trends)

1. **APIs & Services → Credentials → Create Credentials → API Key**.
2. Restrinja a chave: **API restrictions → YouTube Data API v3**.
3. Cole em `YOUTUBE_API_KEY` em `apps/api/.env`.

### 3.3 OAuth Client (para conectar canal do usuário)

Necessário apenas se for testar o fluxo `GET /youtube/oauth/start` (conexão de canal, upload, analytics). Para só rodar trends/scoring, a API key acima já basta.

1. **APIs & Services → OAuth consent screen** — configure como **External**, modo **Testing**, e adicione seu e-mail em **Test users** (detalhes em [oauth-consent-screen-setup.md](./oauth-consent-screen-setup.md)).
2. **APIs & Services → Credentials → Create Credentials → OAuth Client ID**:
   - Tipo: **Web application**
   - **Authorized redirect URI:** `http://localhost:3002/youtube/oauth/callback`
3. Copie **Client ID** e **Client Secret**.
4. Cole em `GOOGLE_CLIENT_ID` e `GOOGLE_CLIENT_SECRET` em `apps/api/.env`. `GOOGLE_REDIRECT_URI` já está correto no `.env` local.

**Como validar:** com a API rodando e um usuário logado, acesse `GET /youtube/oauth/start` — deve redirecionar para a tela de consentimento do Google (aparece aviso "Google hasn't verified this app", normal em modo Testing — clique em **Advanced → Go to NexVideo (unsafe)**).

> **Nota:** o código atual tem duas implementações paralelas do fluxo OAuth do YouTube — `AuthController` (`/auth/youtube*`, usa `youtube-oauth.service.ts`) e `YoutubeController` (`/youtube/oauth/*`, módulo dedicado `YoutubeModule`). O `.env.example` já aponta para `/youtube/oauth/callback`, então esta é a rota corrente; a outra parece resquício de uma implementação anterior e vale uma limpeza futura.

**Para produção:** domínio verificado, Privacy Policy/Terms publicados (já existem em `/privacy` e `/terms`), submissão de verificação dos scopes Restricted — processo de 4-6 semanas, ver seção 6 de [oauth-consent-screen-setup.md](./oauth-consent-screen-setup.md).

---

## 4. Checklist final

- [ ] `OPENAI_API_KEY` real, com billing ativo na OpenAI
- [ ] `STRIPE_SECRET_KEY` de teste (`sk_test_...`)
- [ ] Produtos/preços criados no Stripe Dashboard (modo Test)
- [ ] `stripe listen` rodando e `STRIPE_WEBHOOK_SECRET` atualizado
- [ ] Projeto GCP criado com YouTube Data API v3 habilitada
- [ ] `YOUTUBE_API_KEY` restrita à YouTube Data API v3
- [ ] OAuth Consent Screen configurado (modo Testing) + `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` (se for testar conexão de canal)

Depois de preencher, reinicie a API (`pnpm --filter api dev`) — o schema de validação (`apps/api/src/config/env.validation.ts`) acusa na inicialização qualquer variável obrigatória ausente ou malformada.
