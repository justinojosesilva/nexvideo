---
title: Criar migration Prisma para VideoPerformance
type: chore
priority: HIGH
impact: 7
confidence: 10
effort: 2
tags:
  - database
  - prisma
  - analytics
acceptanceCriteria:
  - 'Model VideoPerformance com projectId, views, watchTime, CTR, impressions'
  - Índices definidos para queries por projeto e período
  - Migration aplicada em staging
  - Relações com ContentProject definidas
status: DONE
body: |
  ## Objetivo

  Criar migration Prisma para VideoPerformance

  ## Critérios de Aceite

  - [ ] Model VideoPerformance com projectId, views, watchTime, CTR, impressions
  - [ ] Índices definidos para queries por projeto e período
  - [ ] Migration aplicada em staging
  - [ ] Relações com ContentProject definidas
id: TASK-028
score: 35
createdAt: '2026-04-17T16:16:26.645Z'
updatedAt: '2026-04-20T03:03:52.940Z'
filePath: /projects/nexvideo/.pm/tasks/TASK-028.md
---
## Objetivo

Criar migration Prisma para VideoPerformance

## Critérios de Aceite

- [x] Model VideoPerformance com projectId, views, watchTime, CTR, impressions
- [x] Índices definidos para queries por projeto e período
- [x] Migration aplicada em staging
- [x] Relações com ContentProject definidas

## Resumo Técnico

Adicionado model `VideoPerformance` ao schema Prisma (`packages/database/prisma/schema.prisma`) com os campos:
- `projectId` — FK para `ContentProject` com `onDelete: Cascade`
- `recordedAt` — timestamp do registro (permite múltiplos snapshots por projeto)
- `views`, `impressions` — contadores inteiros
- `watchTime` — tempo total em segundos (Float)
- `ctr` — click-through rate entre 0 e 1 (Float)

Índices criados:
- `(projectId)` — queries por projeto
- `(projectId, recordedAt)` — queries por projeto + período (composto)
- `(recordedAt)` — queries por período global

Relação bidirecional definida: `ContentProject.videoPerformances` → `VideoPerformance[]`.

Migration gerada e aplicada: `20260420193524_add_video_performance`. Prisma Client regenerado com os novos tipos.
