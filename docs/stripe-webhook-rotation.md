# Stripe Webhook Secret — Setup & Rotation Runbook

## Visão geral

Cada ambiente possui um **endpoint de webhook separado** no Stripe Dashboard, com seu próprio
`STRIPE_WEBHOOK_SECRET` (`whsec_...`). Nunca reutilize o segredo entre staging e produção.

| Ambiente    | STRIPE_SECRET_KEY  | Webhook endpoint             |
|-------------|--------------------|------------------------------|
| dev/local   | `sk_test_...`      | `stripe listen` (CLI local)  |
| staging     | `sk_test_...`      | Endpoint do serviço staging  |
| production  | `sk_live_...`      | Endpoint do serviço prod     |

> **Invariante validada na inicialização:** a API recusa boot se `sk_live_` for usada fora
> de `NODE_ENV=production` (validação Joi em `src/config/env.validation.ts`).

---

## Setup inicial (primeiro deploy de um ambiente)

### 1. Criar o endpoint no Stripe Dashboard

1. Acesse **Stripe Dashboard → Developers → Webhooks → Add endpoint**
2. URL: `https://<seu-servico>.onrender.com/billing/webhook`
3. Eventos a escutar:
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_failed`
4. Clique em **Add endpoint**

### 2. Copiar o Signing Secret

1. Na página do endpoint criado, clique em **Reveal** ao lado de "Signing secret"
2. Copie o valor `whsec_...`

### 3. Configurar no Render

1. Acesse o serviço `nexvideo-api` correspondente ao ambiente no Render Dashboard
2. Vá em **Environment → Environment Variables**
3. Defina `STRIPE_WEBHOOK_SECRET` = o valor copiado no passo anterior
4. Salve e aguarde o redeploy automático

---

## Rotação de chave (quando necessário)

A rotação é necessária em caso de comprometimento da chave, saída de membro com acesso,
ou auditoria de segurança periódica (recomendado a cada 90 dias).

### Passo a passo

```
1. Stripe Dashboard → Developers → Webhooks → selecione o endpoint
2. Clique em "Roll secret"  (Stripe mantém ambas as chaves ativas por ~24h)
3. Copie o novo whsec_...
4. No Render: atualize STRIPE_WEBHOOK_SECRET com o novo valor
5. Aguarde redeploy e valide com um evento de teste (veja abaixo)
6. Após confirmação, clique "Expire old secret" no Stripe Dashboard
```

### Validação após rotação

```bash
# Dispare um evento de teste via Stripe CLI
stripe trigger checkout.session.completed

# Confirme no Sentry / logs que o evento foi processado sem erro de assinatura:
# "Webhook signature verification failed" = chave errada → reverta imediatamente
```

---

## Dev local

Use o Stripe CLI para receber eventos localmente sem configurar endpoint:

```bash
# Instalar (macOS)
brew install stripe/stripe-cli/stripe

# Fazer login
stripe login

# Encaminhar eventos para a API local
stripe listen --forward-to localhost:3002/billing/webhook
```

O CLI exibe `whsec_...` no terminal — copie esse valor para `.env` local como
`STRIPE_WEBHOOK_SECRET`. **Nunca comite esse valor.**

---

## Referências rápidas

- Stripe CLI: `stripe trigger <event>` para simular qualquer evento
- Logs de webhook: Stripe Dashboard → Developers → Webhooks → selecione endpoint → Recent deliveries
- Documentação Stripe: https://stripe.com/docs/webhooks
