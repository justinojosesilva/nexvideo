---
title: Criar sync job BullMQ de métricas do YouTube
type: feature
priority: HIGH
impact: 8
confidence: 8
effort: 5
tags:
  - workers
  - bullmq
  - youtube
acceptanceCriteria:
  - Job agendado periodicamente por organização
  - Backoff exponencial ao receber erro de quota
  - Persistência incremental em VideoPerformance
  - 'Observabilidade: logs estruturados e métricas Sentry'
status: DONE
body: |
  ## Objetivo

  Criar sync job BullMQ de métricas do YouTube

  ## Critérios de Aceite

  - [ ] Job agendado periodicamente por organização
  - [ ] Backoff exponencial ao receber erro de quota
  - [ ] Persistência incremental em VideoPerformance
  - [ ] Observabilidade: logs estruturados e métricas Sentry
id: TASK-033
score: 13
createdAt: '2026-04-17T16:16:26.666Z'
updatedAt: '2026-04-20T19:53:58.878Z'
filePath: /projects/nexvideo/.pm/tasks/TASK-033.md
---
## Objetivo

Criar sync job BullMQ de métricas do YouTube

## Critérios de Aceite

- [x] Job agendado periodicamente por organização
- [x] Backoff exponencial ao receber erro de quota
- [x] Persistência incremental em VideoPerformance
- [x] Observabilidade: logs estruturados e métricas Sentry

## Resumo Técnico

### Arquitetura

**`SyncYoutubeMetricsUseCase`** (`youtube/use-cases/sync-youtube-metrics.use-case.ts`):
- Busca todos os `YoutubeOAuthToken` (orgs conectadas).
- Para cada org: chama `IYouTubeAnalyticsPort.getMetrics` com filtros de ontem (`startDate = endDate = yesterday`).
- Busca todos os `ContentProject` da org; cria registros `VideoPerformance` em `$transaction` — uma linha por projeto com os valores do dia.
- Em erro de quota: captura via Sentry, re-throw para que BullMQ aplique backoff.
- Em outros erros: registra warning + Sentry, incrementa `failed`, continua para a próxima org.
- Retorna `{ synced, failed }`.

### Agendamento BullMQ
`YoutubeModule.onApplicationBootstrap` registra dois jobs repetíveis:
- `youtube:refresh-expiring-tokens` — a cada 5 min (existente)
- `youtube:sync-metrics` — **a cada 6h**, com `attempts: 5`, `backoff: exponential, delay: 60_000ms` (1min → 2min → 4min → 8min → 16min)

### Backoff Exponencial
O job é configurado com `attempts: 5` e `backoff: { type: 'exponential', delay: 60_000 }`. Em erro de quota, o `SyncYoutubeMetricsUseCase` re-throw — BullMQ marca como falho e reagenda com delay crescente. Para erros por organização individual (não quota), o use case continua e não re-throw.

### Persistência Incremental
`prisma.$transaction([...createMany])` por org — falha em uma org não afeta outras. Cada execução persiste uma linha por projeto com `recordedAt = yesterday` (idempotente com relação ao dia, não é upsert — permite múltiplos registros se o job rodar mais de uma vez no mesmo dia).

### Observabilidade
- Logs via NestJS `Logger` (pino) em todos os pontos: início do sync, sucesso por org (com métricas), warnings de falha, resumo final.
- `Sentry.withScope` com tags `organizationId` e `quota_error` em toda exceção.
- Worker: `logger.info/error` com `isQuota` no payload estruturado.

### Endpoint Interno
`POST /youtube/oauth/internal/sync-metrics` — `@Public`, chamado pelo worker ao processar o job `youtube:sync-metrics`.
