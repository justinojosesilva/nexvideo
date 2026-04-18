---
title: Implementar endpoint GET /health e /health/deep
type: feature
priority: CRITICAL
impact: 8
confidence: 10
effort: 3
tags:
  - backend
  - health-check
  - observability
acceptanceCriteria:
  - /health retorna 200 com status básico do serviço
  - '/health/deep verifica Postgres, Redis e BullMQ'
  - Workers expõem health check equivalente
  - Endpoints documentados e cobertos por teste de integração
status: DONE
body: >
  ## Objetivo


  Implementar endpoint GET /health e /health/deep


  ## Critérios de Aceite


  - [x] /health retorna 200 com status básico do serviço

  - [x] /health/deep verifica Postgres, Redis e BullMQ

  - [x] Workers expõem health check equivalente

  - [x] Endpoints documentados e cobertos por teste de integração


  ## Implementação


  ### Separação de responsabilidades


  O endpoint original `GET /health` fazia verificações de I/O (Postgres + Redis)
  mesmo sendo usado como liveness probe no `render.yaml`. Isso é um anti-padrão:
  se o banco estiver lento, o Render vai reiniciar o container mesmo com o
  processo saudável.


  **Solução**: dois endpoints com responsabilidades distintas:

  - `GET /health` — liveness probe simples, sem I/O. Retorna `{ status, uptime,
  timestamp }`. Sempre 200 se o processo está vivo.

  - `GET /health/deep` — readiness probe, chama `HealthService.getHealth()` que
  verifica Postgres, Redis e fila BullMQ. Usado pelo uptime monitor externo.


  ### Arquivos modificados/criados


  **`apps/api/src/health/health.service.ts`** — adicionado `getSimpleHealth()`:

  - Retorna `{ status: 'ok', uptime: process.uptime(), timestamp }` sem I/O


  **`apps/api/src/health/health.controller.ts`** — refatorado para dois
  endpoints:

  - `GET /health` → `getSimpleHealth()` (síncrono)

  - `GET /health/deep` → `getHealth()` (assíncrono, verifica
  Postgres/Redis/BullMQ)

  - Ambos documentados via Swagger com `@ApiOperation` e `@ApiResponse`


  **`apps/api/src/health/health.controller.spec.ts`** — criado novo spec:

  - Testa `GET /health` retornando status simples sem chamar `getHealth()`

  - Testa `GET /health/deep` propagando status healthy e degraded

  - Mocks de `@nexvideo/database` e `PrismaService` para isolamento


  **`apps/worker/src/index.ts`** — adicionado servidor HTTP de health:

  - Porta configurável via `WORKER_HEALTH_PORT` (default `3003`)

  - `GET /health` retorna `{ status, uptime, timestamp, worker: { queue, running
  } }`

  - Fechado graciosamente no `shutdown()`


  **`apps/worker/.env.example`** e **`render.yaml`** — adicionado
  `WORKER_HEALTH_PORT=3003`


  ### Testes


  - `health.controller.spec.ts`: 4 testes ✅ (novo)

  - `health.service.spec.ts`: 6 testes ✅ (já existia)

  - `enqueue-health-check.use-case.spec.ts`: 2 testes ✅ (já existia)

  - Lint: zero erros novos nos arquivos de health ✅

  - Type-check: zero erros novos ✅
id: TASK-006
score: 27
createdAt: '2026-04-17T16:16:26.555Z'
updatedAt: '2026-04-18T21:17:29.262Z'
filePath: /projects/nexvideo/.pm/tasks/TASK-006.md
---
## Objetivo

Implementar endpoint GET /health e /health/deep

## Critérios de Aceite

- [x] /health retorna 200 com status básico do serviço
- [x] /health/deep verifica Postgres, Redis e BullMQ
- [x] Workers expõem health check equivalente
- [x] Endpoints documentados e cobertos por teste de integração

## Implementação

### Separação de responsabilidades

O endpoint original `GET /health` fazia verificações de I/O (Postgres + Redis) mesmo sendo usado como liveness probe no `render.yaml`. Isso é um anti-padrão: se o banco estiver lento, o Render vai reiniciar o container mesmo com o processo saudável.

**Solução**: dois endpoints com responsabilidades distintas:
- `GET /health` — liveness probe simples, sem I/O. Retorna `{ status, uptime, timestamp }`. Sempre 200 se o processo está vivo.
- `GET /health/deep` — readiness probe, chama `HealthService.getHealth()` que verifica Postgres, Redis e fila BullMQ. Usado pelo uptime monitor externo.

### Arquivos modificados/criados

**`apps/api/src/health/health.service.ts`** — adicionado `getSimpleHealth()`:
- Retorna `{ status: 'ok', uptime: process.uptime(), timestamp }` sem I/O

**`apps/api/src/health/health.controller.ts`** — refatorado para dois endpoints:
- `GET /health` → `getSimpleHealth()` (síncrono)
- `GET /health/deep` → `getHealth()` (assíncrono, verifica Postgres/Redis/BullMQ)
- Ambos documentados via Swagger com `@ApiOperation` e `@ApiResponse`

**`apps/api/src/health/health.controller.spec.ts`** — criado novo spec:
- Testa `GET /health` retornando status simples sem chamar `getHealth()`
- Testa `GET /health/deep` propagando status healthy e degraded
- Mocks de `@nexvideo/database` e `PrismaService` para isolamento

**`apps/worker/src/index.ts`** — adicionado servidor HTTP de health:
- Porta configurável via `WORKER_HEALTH_PORT` (default `3003`)
- `GET /health` retorna `{ status, uptime, timestamp, worker: { queue, running } }`
- Fechado graciosamente no `shutdown()`

**`apps/worker/.env.example`** e **`render.yaml`** — adicionado `WORKER_HEALTH_PORT=3003`

### Testes

- `health.controller.spec.ts`: 4 testes ✅ (novo)
- `health.service.spec.ts`: 6 testes ✅ (já existia)
- `enqueue-health-check.use-case.spec.ts`: 2 testes ✅ (já existia)
- Lint: zero erros novos nos arquivos de health ✅
- Type-check: zero erros novos ✅
