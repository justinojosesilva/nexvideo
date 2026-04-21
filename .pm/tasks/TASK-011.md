---
title: Configurar Stripe live mode em produção
type: chore
priority: CRITICAL
impact: 10
confidence: 9
effort: 3
tags:
  - stripe
  - billing
  - production
acceptanceCriteria:
  - STRIPE_SECRET_KEY e STRIPE_PUBLISHABLE_KEY de live configuradas em .env.prod
  - Chaves não commitadas no repositório
  - Produtos e preços replicados em live mode
  - Checklist stripe.com/docs/go-live revisado e assinado
status: IN_REVIEW
body: >
  ## Objetivo


  Configurar Stripe live mode em produção


  ## Critérios de Aceite


  - [ ] STRIPE_SECRET_KEY e STRIPE_PUBLISHABLE_KEY de live configuradas em
  .env.prod

  - [ ] Chaves não commitadas no repositório

  - [ ] Produtos e preços replicados em live mode

  - [ ] Checklist stripe.com/docs/go-live revisado e assinado
id: TASK-011
score: 30
createdAt: '2026-04-17T16:16:26.581Z'
updatedAt: '2026-04-19T00:18:06.493Z'
filePath: /projects/nexvideo/.pm/tasks/TASK-011.md
---
## Objetivo

Configurar Stripe live mode em produção

## Critérios de Aceite

- [ ] STRIPE_SECRET_KEY de live configurada em Render (manual — requer conta Stripe ativa)
- [x] Chaves não commitadas no repositório (gitleaks hook + env validation guard)
- [ ] Produtos e preços replicados em live mode (manual — ver runbook)
- [ ] Checklist stripe.com/docs/go-live revisado e assinado (manual)

> Nota: `STRIPE_PUBLISHABLE_KEY` não é necessária — o app usa Stripe Checkout server-side (redirect), sem Stripe.js no frontend.

## Implementação

### O que já existe (sem alterar)

**`apps/api/src/config/env.validation.ts`** — guard implementado:
- `STRIPE_SECRET_KEY` deve seguir padrão `sk_(test|live)_`
- Guard customizado: `sk_live_` só aceito quando `NODE_ENV=production` — startup falha se mal configurado

**`.gitleaks.toml` + `.githooks/pre-commit`** — pré-commit bloqueia commit de qualquer `sk_live_` real.

### O que foi criado

**`docs/stripe-go-live-checklist.md`** — runbook completo com:
- Nota de arquitetura (sem `STRIPE_PUBLISHABLE_KEY` necessária)
- Passo 1: Replicar produtos/preços em live mode no Stripe Dashboard
- Passo 2: Env vars a configurar no Render (tabela com valores)
- Passo 3: Criar webhook endpoint live + eventos a registrar
- Passo 4: Checklist oficial stripe.com/docs/go-live
- Passo 5: Smoke test em produção (compra real, webhook, banco, email)
- Rollback: como reverter para test mode

### Passos manuais restantes

Executar os 5 passos de `docs/stripe-go-live-checklist.md` após conta Stripe verificada e staging validado.
