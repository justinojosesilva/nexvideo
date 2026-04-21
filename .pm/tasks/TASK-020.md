---
title: Estimar e documentar consumo de quota YouTube API
type: docs
priority: MEDIUM
impact: 7
confidence: 8
effort: 2
tags:
  - youtube
  - quota
  - docs
acceptanceCriteria:
  - Cálculo de units/dia por operação documentado
  - Projeção de consumo para 100/1000 usuários feita
  - Pedido de aumento de quota submetido se necessário
  - Monitor de quota usada configurado
status: IN_REVIEW
body: |
  ## Objetivo

  Estimar e documentar consumo de quota YouTube API

  ## Critérios de Aceite

  - [ ] Cálculo de units/dia por operação documentado
  - [ ] Projeção de consumo para 100/1000 usuários feita
  - [ ] Pedido de aumento de quota submetido se necessário
  - [ ] Monitor de quota usada configurado
id: TASK-020
score: 28
createdAt: '2026-04-17T16:16:26.616Z'
updatedAt: '2026-04-19T22:15:38.175Z'
filePath: /projects/nexvideo/.pm/tasks/TASK-020.md
---
## Objetivo

Estimar e documentar consumo de quota YouTube API

## Critérios de Aceite

- [x] Cálculo de units/dia por operação documentado
- [x] Projeção de consumo para 100/1000 usuários feita
- [ ] Pedido de aumento de quota submetido se necessário ← pendência manual (submeter quando projeto GCP estiver criado)
- [x] Monitor de quota usada configurado

---

## Resumo Técnico

### Custo atual por operação

Cada geração de script dispara **335 units** da YouTube Data API v3:
- `SaturationScorer`: `search.list`×1 + `videos.list`×20 = **120 units**
- `DemandScorer`: `search.list`×1 + `videos.list`×5 = **105 units**
- `QualityGapScorer`: `search.list`×1 + `videos.list`×10 = **110 units**

Com quota padrão (10.000 units/dia) → ~**29 scripts/dia** suportados.

### Projeção de escala

| Cenário | Consumo/dia | Status |
|---|---|---|
| 29 usuários (1 script/dia) | 9.715 units | ✅ Dentro da quota padrão |
| 100 usuários (1 script/dia) | 33.500 units | ⚠️ Requer aumento 3.35× |
| 1.000 usuários (1 script/dia) | 335.000 units | 🔴 Requer aumento 33.5× + cache |

### `YoutubeQuotaService` — monitor Redis

Novo serviço (`apps/api/src/adapters/services/youtube-quota.service.ts`) que:
- Rastreia units por operação via Redis INCR na chave `youtube:quota:<YYYY-MM-DD>`
- Alinha o "dia" ao Pacific Time (reset 08:00 UTC) conforme o comportamento real do Google
- TTL de 2 dias na chave para evitar vazamento de memória
- Injeção `@Optional` — se Redis indisponível, não bloqueia a aplicação

### Instrumentação do `YouTubeDataAdapter`

- `searchVideos()` rastreia `SEARCH_LIST` (+100 units) após resposta bem-sucedida
- `getVideoStats()` rastreia `VIDEOS_LIST` (+1 unit) após resposta bem-sucedida
- Falhas de API não são rastreadas (não consomem quota real)

### Endpoint admin `GET /admin/youtube-quota`

Retorna `{ date, usedUnits, dailyLimit, remainingUnits, usagePercent, resetAtUtc }`.
Requer `X-Admin-Key`. Documentado no Swagger.

### Documentação

`docs/youtube-quota-estimation.md` — tabela de custos, projeções 100/1000 users, estratégias de redução, instruções de pedido de aumento de quota e exemplo de uso do endpoint.

### Pendência manual

Submeter pedido de aumento de quota no Google Cloud Console quando o projeto GCP (TASK-017) estiver criado e o consumo ultrapassar 70% da quota diária em dias de pico.
