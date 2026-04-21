---
title: Implementar YouTubeDataAdapter
type: feature
priority: HIGH
impact: 9
confidence: 8
effort: 6
tags:
  - youtube
  - upload
  - backend
acceptanceCriteria:
  - Upload de metadados e thumbnails via YouTube Data API v3
  - Gestão de quota com contador e bloqueio preventivo
  - Erros de quota retornam mensagem clara
  - Testes unitários cobrem paths de sucesso e falha
status: DONE
body: |
  ## Objetivo

  Implementar YouTubeDataAdapter

  ## Critérios de Aceite

  - [ ] Upload de metadados e thumbnails via YouTube Data API v3
  - [ ] Gestão de quota com contador e bloqueio preventivo
  - [ ] Erros de quota retornam mensagem clara
  - [ ] Testes unitários cobrem paths de sucesso e falha
id: TASK-032
score: 12
createdAt: '2026-04-17T16:16:26.663Z'
updatedAt: '2026-04-20T19:53:53.124Z'
filePath: /projects/nexvideo/.pm/tasks/TASK-032.md
---
## Objetivo

Implementar YouTubeDataAdapter

## Critérios de Aceite

- [x] Upload de metadados e thumbnails via YouTube Data API v3
- [x] Gestão de quota com contador e bloqueio preventivo
- [x] Erros de quota retornam mensagem clara
- [x] Testes unitários cobrem paths de sucesso e falha

## Resumo Técnico

### Arquitetura

**`IYouTubeUploadPort`** (`adapters/interfaces/youtube-upload.port.ts`):
- `updateVideoMetadata(organizationId, videoId, metadata)` — `PUT /youtube/v3/videos?part=snippet,status` (50 quota units)
- `setThumbnail(organizationId, videoId, imageBuffer, mimeType)` — `POST upload/youtube/v3/thumbnails/set?videoId=&uploadType=media` (50 quota units)

**`YouTubeUploadAdapter`** (`adapters/implementations/youtube-upload.adapter.ts`):
- Injeta `YoutubeOAuthService` (obtém access token OAuth via `getValidAccessToken`) e `YoutubeQuotaService` (`@Optional`).
- `assertQuota(requiredUnits, operation)`: consulta `quotaService.getStatus()` antes de cada operação; se `remainingUnits < required` lança `YouTubeApiError` com `isRateLimited: true, statusCode: 429` e mensagem incluindo quando a quota reseta.
- `handleApiError`: detecta `quotaExceeded` via `reason` ou texto da mensagem Google; formata mensagem diferenciada para quota vs erro genérico.
- Após sucesso: chama `quotaService.track('VIDEOS_UPDATE')` para incrementar o contador Redis.
- Thumbnail upload: body enviado como `ArrayBuffer` via fetch nativo; URL extraída de `items[0].high.url` com fallback para medium/default.

### Gestão de Quota
`YoutubeQuotaService` (pré-existente) gerencia o contador diário em Redis com chave `youtube:quota:{date}`. O adapter verifica ANTES de cada operação (bloqueio preventivo) e registra APÓS sucesso — assim quota nunca é consumida sem operação real.

### Erros de Quota — Mensagem Clara
`YouTubeApiError` expõe `isRateLimited: boolean` e `statusCode`. Para bloqueio preventivo: `"YouTube API quota exhausted (N units remaining, M required for op). Quota resets at ISO_DATE."`. Para erro retornado pela API Google: `"YouTube API quota exceeded during op. Please retry after quota reset."`.

### Registro
`AdaptersModule`: registra `{ provide: 'IYouTubeUploadPort', useClass: YouTubeUploadAdapter }`, exporta token.

### Testes — 9 casos
`updateVideoMetadata`: URL/body corretos, quota track, quota API error (isRateLimited=true), erro genérico (mensagem descritiva), bloqueio preventivo (sem chamada à API).
`setThumbnail`: URL com videoId, thumbnailUrl vazio quando sem items, quota API error, bloqueio preventivo.
