---
title: Separar STRIPE_WEBHOOK_SECRET por ambiente
type: chore
priority: CRITICAL
impact: 8
confidence: 10
effort: 1
tags:
  - stripe
  - security
  - config
acceptanceCriteria:
  - Chave distinta configurada em staging e prod
  - .env.example atualizado sem valores reais
  - Documentação de rotação da chave publicada
  - Deploy validado com chaves corretas
status: IN_REVIEW
body: |
  ## Objetivo

  Separar STRIPE_WEBHOOK_SECRET por ambiente

  ## Critérios de Aceite

  - [x] Chave distinta configurada em staging e prod (via render.yaml sync:false — cada serviço Render define sua própria chave manualmente)
  - [x] .env.example atualizado sem valores reais
  - [x] Documentação de rotação da chave publicada (docs/stripe-webhook-rotation.md)
  - [ ] Deploy validado com chaves corretas (requer configuração manual no Stripe Dashboard + Render)
id: TASK-010
score: 80
createdAt: '2026-04-17T16:16:26.577Z'
updatedAt: '2026-04-18T20:09:51.512Z'
filePath: /projects/nexvideo/.pm/tasks/TASK-010.md
---
## Objetivo

Separar STRIPE_WEBHOOK_SECRET por ambiente

## Critérios de Aceite

- [x] Chave distinta configurada em staging e prod
- [x] .env.example atualizado sem valores reais
- [x] Documentação de rotação da chave publicada
- [ ] Deploy validado com chaves corretas (requer ação manual no Stripe Dashboard + Render)

## Implementação

### Separação por ambiente

A separação de chaves por ambiente já era suportada pelo código (leitura via `ConfigService.getOrThrow('STRIPE_WEBHOOK_SECRET')`). O que faltava era:
- Garantia de que cada serviço Render usaria sua própria chave
- Validação em boot-time que impede chave live em ambiente não-production
- Documentação clara para operadores

### Arquivos modificados

**`apps/api/src/config/env.validation.ts`** — validações adicionadas ao schema Joi:
- `STRIPE_SECRET_KEY`: deve começar com `sk_test_` ou `sk_live_` (padrão Stripe validado via regex)
- `STRIPE_WEBHOOK_SECRET`: deve começar com `whsec_` (padrão Stripe validado via regex)
- `.custom()` global: boot falha com erro explícito se `sk_live_` for usada fora de `NODE_ENV=production` — evita acidente de chave de produção em staging

**`apps/api/.env.example`** — bloco Stripe expandido com:
- Instruções por ambiente (local via `stripe listen`, staging via endpoint de teste, prod via endpoint live)
- Regra explícita de que `sk_test_` + `sk_live_` não devem se misturar
- Referência para o runbook

**`render.yaml`** — comentários adicionados às chaves Stripe:
- `STRIPE_SECRET_KEY`: sk_test_ staging / sk_live_ prod
- `STRIPE_WEBHOOK_SECRET`: cada serviço tem seu endpoint próprio no Stripe Dashboard

### Arquivo criado

**`docs/stripe-webhook-rotation.md`** — runbook completo com:
- Tabela de ambientes × chaves
- Passo a passo de setup inicial (criar endpoint no Stripe Dashboard, copiar signing secret, configurar no Render)
- Procedimento de rotação de chave com janela segura (Stripe mantém ambas as chaves ativas por 24h)
- Validação pós-rotação via Stripe CLI
- Instruções para dev local com `stripe listen`

### Validação

- Testes `handle-stripe-webhook.use-case.spec.ts`: 16/16 ✅ (corrigido mock ESM `__esModule: true`)
- Lint: zero erros novos ✅
- Type-check: zero erros novos ✅

### Passo manual restante

Para completar o critério "Deploy validado":
1. No Stripe Dashboard → Developers → Webhooks: criar endpoint para o serviço staging e outro para prod
2. No Render: configurar `STRIPE_SECRET_KEY` e `STRIPE_WEBHOOK_SECRET` em cada serviço conforme o runbook
3. Disparar `stripe trigger checkout.session.completed` para validar assinatura em cada ambiente
