---
title: Implementar YouTubeAnalyticsAdapter
type: feature
priority: HIGH
impact: 9
confidence: 8
effort: 5
tags:
  - youtube
  - analytics
  - backend
acceptanceCriteria:
  - 'Adapter busca views, watch time, CTR e impressões'
  - Filtros por período e vídeo suportados
  - Cache Redis aplicado com TTL adequado
  - Testes unitários com mock da API
status: DONE
body: |
  ## Objetivo

  Implementar YouTubeAnalyticsAdapter

  ## Critérios de Aceite

  - [ ] Adapter busca views, watch time, CTR e impressões
  - [ ] Filtros por período e vídeo suportados
  - [ ] Cache Redis aplicado com TTL adequado
  - [ ] Testes unitários com mock da API
id: TASK-031
score: 14
createdAt: '2026-04-17T16:16:26.659Z'
updatedAt: '2026-04-20T19:53:46.664Z'
filePath: /projects/nexvideo/.pm/tasks/TASK-031.md
---
## Objetivo

Implementar YouTubeAnalyticsAdapter

## Critérios de Aceite

- [x] Adapter busca views, watch time, CTR e impressões
- [x] Filtros por período e vídeo suportados
- [x] Cache Redis aplicado com TTL adequado
- [x] Testes unitários com mock da API

## Resumo Técnico

### Arquitetura

**`IYouTubeAnalyticsPort`** (`adapters/interfaces/youtube-analytics.port.ts`):
```typescript
interface AnalyticsFilters { startDate: string; endDate: string; videoId?: string; }
interface VideoAnalyticsMetrics { views: number; watchTimeSeconds: number; ctr: number; impressions: number; }
```

**`YouTubeAnalyticsAdapter`** (`adapters/implementations/youtube-analytics.adapter.ts`):
- Injeta `YoutubeOAuthService` (obtém access token OAuth via `getValidAccessToken`) e `ICachePort`.
- Chama `GET https://youtubeanalytics.googleapis.com/v2/reports` com metrics: `views,estimatedMinutesWatched,impressions,impressionClickThroughRate`, dimensão `day`.
- Filtro opcional `videoId` é passado como query param `filters=video=={videoId}`.
- Agrega todas as linhas retornadas: soma views/impressions/watchTime, média ponderada de CTR.
- `watchTimeSeconds = round(estimatedMinutesWatched * 60)`.

### Cache Redis
- Chave: `youtube:analytics:{organizationId}:{startDate}:{endDate}:{videoId|all}`
- TTL: **3600s (1h)** — dados de analytics mudam lentamente; alinhado com o padrão `youtube:` já definido no `RedisCacheAdapter`.
- Cache hit retorna imediatamente sem chamar a API nem o OAuth service.

### Registro
- `AdaptersModule`: importa `AuthModule` (provê `YoutubeOAuthService`), registra `{ provide: 'IYouTubeAnalyticsPort', useClass: YouTubeAnalyticsAdapter }`.

### Testes
**`youtube-analytics.adapter.spec.ts`** — 7 casos:
1. Cache hit → sem chamada à API nem ao OAuth
2. Agregação correta de views/watchTime/impressions/CTR de múltiplas linhas
3. Resultado é persistido no cache após chamada à API
4. `videoId` incluso na cache key quando fornecido
5. `videoId` passado corretamente como query param na URL da API
6. Sem linhas retornadas → todos os valores zerados
7. Erro HTTP da API → lança exceção com mensagem adequada
