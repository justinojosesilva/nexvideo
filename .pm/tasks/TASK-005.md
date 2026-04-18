---
title: Substituir console.log por logger estruturado (Pino)
type: chore
priority: HIGH
impact: 7
confidence: 9
effort: 4
tags:
  - logging
  - backend
  - observability
acceptanceCriteria:
  - Pino configurado na API e workers com níveis info/warn/error
  - Nenhum console.log remanescente em src de produção (ESLint rule)
  - Logs em formato JSON em produção e pretty em dev
  - Request ID e tenant ID incluídos em cada log
status: DONE
body: >
  ## Objetivo


  Substituir console.log por logger estruturado (Pino)


  ## Critérios de Aceite


  - [x] Pino configurado na API e workers com níveis info/warn/error

  - [x] Nenhum console.log remanescente em src de produção (ESLint rule)

  - [x] Logs em formato JSON em produção e pretty em dev

  - [x] Request ID e tenant ID incluídos em cada log


  ## Implementação


  ### Pacotes instalados


  ```

  nestjs-pino + pino-http (já estavam)   apps/api

  pino (já estava)                       apps/worker

  pino-pretty (novo, devDependency)      apps/api + apps/worker

  eslint + typescript-eslint (novo)      apps/worker

  ```


  ### API — `apps/api`


  **`src/app.module.ts`** — `LoggerModule.forRoot()` do `nestjs-pino` adicionado
  como **primeiro import**:

  - `transport: pino-pretty` em dev, JSON puro em prod

  - `genReqId` gera UUID por request (ou usa `x-request-id` do header)

  - `customProps` injeta `requestId` e `organizationId` em cada log via
  `req.user`

  - Serializers reduzem o payload de req/res para `method`, `url`, `statusCode`


  **`src/main.ts`**:

  - `bufferLogs: true` e `app.useLogger(app.get(PinoLogger))` para bootstrap
  usar Pino

  - `console.error` substituído por `new Logger('Bootstrap').error`


  **`src/logging/structured-logger.service.ts`** — migrado de `NestJS Logger`
  para `@InjectPinoLogger`:

  - `logJob` agora chama `logger.info/warn/error(fields, 'job_event')` — JSON
  estruturado nativo do Pino, sem `JSON.stringify` manual


  **`src/cache/adapters/redis-cache.adapter.ts`** — 4 `console.error` →
  `this.logger.error({ key/prefix, err }, msg)`


  **`src/adapters/implementations/media.adapter.ts`** — 2 `console.error` →
  `this.logger.warn({ err }, msg)`


  **`eslint.config.mjs`** — regra `"no-console": "error"` adicionada


  ### Worker — `apps/worker`


  **`src/logger.ts`** — singleton Pino criado:

  - `transport: pino-pretty` se `NODE_ENV !== production`, JSON se prod

  - `level` lido de `LOG_LEVEL` env var com fallback `debug/info`


  **`src/index.ts`** — todos os 30+ `console.log/error` substituídos por
  `logger.info/warn/error` com campos estruturados:

  - `jobId`, `organizationId`, `narrationId`, `exportJobId` em cada log

  - Campos de custo (`estimatedCostBrl`), duração (`durationMs`), versão de
  prompt (`promptVersion`) como campos nativos JSON


  **`eslint.config.mjs`** (novo) — ESLint configurado com `no-console: error`


  **`tsconfig.json`** — `moduleResolution: bundler` + `ignoreDeprecations:
  "6.0"` (suprime warnings de TS6 sobre `node` e `baseUrl` deprecados)


  ### Validação


  - Testes `structured-logger.service.spec.ts`: 11/11 ✅ (spec reescrito para
  mockar `PinoLogger`)

  - Lint API (`no-console`): zero ocorrências ✅

  - Lint Worker: zero ocorrências ✅

  - Type-check API: zero erros novos ✅
id: TASK-005
score: 16
createdAt: '2026-04-17T16:16:26.552Z'
updatedAt: '2026-04-18T20:07:43.416Z'
filePath: /projects/nexvideo/.pm/tasks/TASK-005.md
---
## Objetivo

Substituir console.log por logger estruturado (Pino)

## Critérios de Aceite

- [x] Pino configurado na API e workers com níveis info/warn/error
- [x] Nenhum console.log remanescente em src de produção (ESLint rule)
- [x] Logs em formato JSON em produção e pretty em dev
- [x] Request ID e tenant ID incluídos em cada log

## Implementação

### Pacotes instalados

```
nestjs-pino + pino-http (já estavam)   apps/api
pino (já estava)                       apps/worker
pino-pretty (novo, devDependency)      apps/api + apps/worker
eslint + typescript-eslint (novo)      apps/worker
```

### API — `apps/api`

**`src/app.module.ts`** — `LoggerModule.forRoot()` do `nestjs-pino` adicionado como **primeiro import**:
- `transport: pino-pretty` em dev, JSON puro em prod
- `genReqId` gera UUID por request (ou usa `x-request-id` do header)
- `customProps` injeta `requestId` e `organizationId` em cada log via `req.user`
- Serializers reduzem o payload de req/res para `method`, `url`, `statusCode`

**`src/main.ts`**:
- `bufferLogs: true` e `app.useLogger(app.get(PinoLogger))` para bootstrap usar Pino
- `console.error` substituído por `new Logger('Bootstrap').error`

**`src/logging/structured-logger.service.ts`** — migrado de `NestJS Logger` para `@InjectPinoLogger`:
- `logJob` agora chama `logger.info/warn/error(fields, 'job_event')` — JSON estruturado nativo do Pino, sem `JSON.stringify` manual

**`src/cache/adapters/redis-cache.adapter.ts`** — 4 `console.error` → `this.logger.error({ key/prefix, err }, msg)`

**`src/adapters/implementations/media.adapter.ts`** — 2 `console.error` → `this.logger.warn({ err }, msg)`

**`eslint.config.mjs`** — regra `"no-console": "error"` adicionada

### Worker — `apps/worker`

**`src/logger.ts`** — singleton Pino criado:
- `transport: pino-pretty` se `NODE_ENV !== production`, JSON se prod
- `level` lido de `LOG_LEVEL` env var com fallback `debug/info`

**`src/index.ts`** — todos os 30+ `console.log/error` substituídos por `logger.info/warn/error` com campos estruturados:
- `jobId`, `organizationId`, `narrationId`, `exportJobId` em cada log
- Campos de custo (`estimatedCostBrl`), duração (`durationMs`), versão de prompt (`promptVersion`) como campos nativos JSON

**`eslint.config.mjs`** (novo) — ESLint configurado com `no-console: error`

**`tsconfig.json`** — `moduleResolution: bundler` + `ignoreDeprecations: "6.0"` (suprime warnings de TS6 sobre `node` e `baseUrl` deprecados)

### Validação

- Testes `structured-logger.service.spec.ts`: 11/11 ✅ (spec reescrito para mockar `PinoLogger`)
- Lint API (`no-console`): zero ocorrências ✅
- Lint Worker: zero ocorrências ✅
- Type-check API: zero erros novos ✅
