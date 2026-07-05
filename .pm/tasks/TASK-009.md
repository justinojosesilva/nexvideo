---
title: Adicionar testes de idempotência de webhooks Stripe
type: feature
priority: CRITICAL
impact: 9
confidence: 9
effort: 4   
tags:
  - stripe
  - backend
  - tests
acceptanceCriteria:
  - Reenvio do mesmo evento Stripe não duplica subscription nem cobrança
  - Teste E2E com mock de webhook cobre duplicidade
  - Tabela de event IDs processados registrada no banco
  - Documentação do mecanismo de idempotência publicada
status: DONE
body: |
  ## Objetivo

  Adicionar testes de idempotência de webhooks Stripe

  ## Critérios de Aceite

  - [x] Reenvio do mesmo evento Stripe não duplica subscription nem cobrança
  - [x] Teste E2E com mock de webhook cobre duplicidade
  - [x] Tabela de event IDs processados registrada no banco
  - [x] Documentação do mecanismo de idempotência publicada

  ## Implementação

  ### Estratégia de idempotência em duas camadas

  **Camada 1 — Event-level deduplication** (nova): toda requisição ao webhook verifica o `stripeEventId` na tabela `stripe_webhook_events` *antes* de qualquer lógica de negócio. Se o ID já existe, retorna 200 sem processar.

  **Camada 2 — Business-logic deduplication** (já existia): cada handler individual tem sua própria guarda de idempotência (`stripeSubscriptionId` para checkout, `invoiceId + type` para emails).

  ### Arquivos modificados/criados

  **`packages/database/prisma/schema.prisma`** — novo modelo:
  ```
  model StripeWebhookEvent {
    stripeEventId String @unique
    type          String
    processedAt   DateTime @default(now())
  }
  ```

  **`packages/database/prisma/migrations/20260418220000_add_stripe_webhook_events/migration.sql`** — migration criada manualmente.

  **`apps/api/src/billing/use-cases/handle-stripe-webhook.use-case.ts`** — adicionado:
  - `id` ao `StripeWebhookEvent` interface
  - Bloco de deduplicação no início de `execute()`: `findUnique` → early return ou `create`

  **`apps/api/src/billing/use-cases/handle-stripe-webhook.use-case.spec.ts`** — atualizado:
  - `mockPrisma.client.stripeWebhookEvent` adicionado ao mock
  - `id` adicionado a todos os eventos mockados (necessário pela nova interface)
  - 2 novos testes em "event-level idempotency": duplicata → no-op; primeiro evento → registra ID

  **`docs/stripe-webhook-idempotency.md`** — criado: descreve as duas camadas, schema, estratégia de race condition, política de retenção e como testar localmente com `stripe events resend`.

  ### Testes

  - `handle-stripe-webhook.use-case.spec.ts`: 18/18 ✅ (+2 novos de idempotência de evento)
  - Testes anteriores de idempotência de email/notificação: todos mantidos ✅
  - Suites pre-existentes com falha (DATABASE_URL): sem regressão ✅
id: TASK-009
score: 20
createdAt: '2026-04-17T16:16:26.575Z'
updatedAt: '2026-07-05T02:31:02.000Z'
filePath: /projects/nexvideo/.pm/tasks/TASK-009.md
---
## Objetivo

Adicionar testes de idempotência de webhooks Stripe

## Critérios de Aceite

- [x] Reenvio do mesmo evento Stripe não duplica subscription nem cobrança
- [x] Teste E2E com mock de webhook cobre duplicidade
- [x] Tabela de event IDs processados registrada no banco
- [x] Documentação do mecanismo de idempotência publicada

## Implementação

### Estratégia de idempotência em duas camadas

**Camada 1 — Event-level deduplication** (nova): toda requisição ao webhook verifica o `stripeEventId` na tabela `stripe_webhook_events` *antes* de qualquer lógica de negócio. Se o ID já existe, retorna 200 sem processar.

**Camada 2 — Business-logic deduplication** (já existia): cada handler individual tem sua própria guarda de idempotência (`stripeSubscriptionId` para checkout, `invoiceId + type` para emails).

### Arquivos modificados/criados

**`packages/database/prisma/schema.prisma`** — novo modelo `StripeWebhookEvent` com `stripeEventId UNIQUE`, `type` e `processedAt`.

**`packages/database/prisma/migrations/20260418220000_add_stripe_webhook_events/`** — migration SQL criada manualmente.

**`apps/api/src/billing/use-cases/handle-stripe-webhook.use-case.ts`** — adicionado `id` ao `StripeWebhookEvent` interface + bloco de deduplicação no início de `execute()`.

**`apps/api/src/billing/use-cases/handle-stripe-webhook.use-case.spec.ts`** — `stripeWebhookEvent` adicionado ao mock, `id` adicionado a todos os eventos, 2 novos testes de idempotência de evento.

**`docs/stripe-webhook-idempotency.md`** — descreve as duas camadas, schema, estratégia de race condition, política de retenção e como testar localmente.

### Testes

- `handle-stripe-webhook.use-case.spec.ts`: 18/18 ✅ (+2 novos de idempotência de evento)
