---
title: Integrar Sentry no frontend web
type: feature
priority: CRITICAL
impact: 7
confidence: 9
effort: 3
tags:
  - observability
  - frontend
  - sentry
acceptanceCriteria:
  - Sentry browser SDK instalado e inicializado
  - Source maps enviados no build de produção
  - Captura de erros de React e navegação habilitada
  - Release tagging configurado no CI
status: DONE
body: >
  ## Objetivo


  Integrar Sentry no frontend web


  ## Critérios de Aceite


  - [x] Sentry browser SDK instalado e inicializado

  - [x] Source maps enviados no build de produção

  - [x] Captura de erros de React e navegação habilitada

  - [x] Release tagging configurado no CI (via render.yaml + SENTRY_RELEASE env
  var)


  ## Implementação


  ### Pacote utilizado


  ```

  @sentry/nextjs (apps/web) — já estava em package.json

  ```


  ### Arquivos criados


  **`apps/web/sentry.client.config.ts`** — inicialização browser (primeira linha
  antes de qualquer import):

  - `enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN` — silencioso sem DSN em dev

  - `Sentry.replayIntegration` com `maskAllText` e `blockAllMedia` (privacidade)

  - `replaysOnErrorSampleRate: 1.0` / `replaysSessionSampleRate: 0.1`


  **`apps/web/sentry.server.config.ts`** — inicialização server-side (Node.js
  runtime)


  **`apps/web/sentry.edge.config.ts`** — inicialização edge runtime


  **`apps/web/app/global-error.tsx`** — error boundary do App Router:

  - `useEffect` chama `Sentry.captureException(error)` em toda exceção não
  tratada

  - Renderiza fallback com botão "Tentar novamente"


  ### Arquivos modificados


  **`apps/web/next.config.ts`** — wrappado com `withSentryConfig`:

  - `sourcemaps.deleteSourcemapsAfterUpload: true` — source maps subidos e
  removidos do bundle de prod

  - `widenClientFileUpload: true` — captura arquivos client além de
  `_next/static`

  - `webpack.treeshake.removeDebugLogging: true` — tree-shake do logger Sentry
  em prod

  - `silent: !process.env.CI` — output silencioso em dev local


  **`apps/web/.env.example`** — adicionadas 6 variáveis:
  `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_DSN`, `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`,
  `SENTRY_PROJECT`, `SENTRY_RELEASE`


  **`render.yaml`** — serviço `nexvideo-web` recebeu as mesmas 6 variáveis com
  `sync: false`


  **`turbo.json`** — env vars Sentry declaradas no task `build` (resolve
  warnings `turbo/no-undeclared-env-vars` no lint)


  ### Validação


  - Type-check: zero erros (`next typegen && tsc --noEmit`)

  - Lint: zero warnings (`eslint --max-warnings 0`)
id: TASK-004
score: 21
createdAt: '2026-04-17T16:16:26.548Z'
updatedAt: '2026-04-18T20:08:04.933Z'
filePath: /projects/nexvideo/.pm/tasks/TASK-004.md
---
## Objetivo

Integrar Sentry no frontend web

## Critérios de Aceite

- [x] Sentry browser SDK instalado e inicializado
- [x] Source maps enviados no build de produção
- [x] Captura de erros de React e navegação habilitada
- [x] Release tagging configurado no CI (via render.yaml + SENTRY_RELEASE env var)

## Implementação

### Pacote utilizado

```
@sentry/nextjs (apps/web) — já estava em package.json
```

### Arquivos criados

**`apps/web/sentry.client.config.ts`** — inicialização browser (primeira linha antes de qualquer import):
- `enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN` — silencioso sem DSN em dev
- `Sentry.replayIntegration` com `maskAllText` e `blockAllMedia` (privacidade)
- `replaysOnErrorSampleRate: 1.0` / `replaysSessionSampleRate: 0.1`

**`apps/web/sentry.server.config.ts`** — inicialização server-side (Node.js runtime)

**`apps/web/sentry.edge.config.ts`** — inicialização edge runtime

**`apps/web/app/global-error.tsx`** — error boundary do App Router:
- `useEffect` chama `Sentry.captureException(error)` em toda exceção não tratada
- Renderiza fallback com botão "Tentar novamente"

### Arquivos modificados

**`apps/web/next.config.ts`** — wrappado com `withSentryConfig`:
- `sourcemaps.deleteSourcemapsAfterUpload: true` — source maps subidos e removidos do bundle de prod
- `widenClientFileUpload: true` — captura arquivos client além de `_next/static`
- `webpack.treeshake.removeDebugLogging: true` — tree-shake do logger Sentry em prod
- `silent: !process.env.CI` — output silencioso em dev local

**`apps/web/.env.example`** — adicionadas 6 variáveis: `NEXT_PUBLIC_SENTRY_DSN`, `SENTRY_DSN`, `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT`, `SENTRY_RELEASE`

**`render.yaml`** — serviço `nexvideo-web` recebeu as mesmas 6 variáveis com `sync: false`

**`turbo.json`** — env vars Sentry declaradas no task `build` (resolve warnings `turbo/no-undeclared-env-vars` no lint)

### Validação

- Type-check: zero erros (`next typegen && tsc --noEmit`)
- Lint: zero warnings (`eslint --max-warnings 0`)
