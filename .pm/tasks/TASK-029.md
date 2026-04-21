---
title: Implementar fluxo OAuth 2.0 do YouTube (autorização e callback)
type: feature
priority: HIGH
impact: 9
confidence: 8
effort: 6
tags:
  - youtube
  - oauth
  - backend
acceptanceCriteria:
  - Endpoint /youtube/oauth/start redireciona para consent Google
  - Callback troca código por tokens e persiste em YouTubeCredential
  - State anti-CSRF validado
  - Refresh token automatizado ao expirar access token
status: DONE
body: |
  ## Objetivo

  Implementar fluxo OAuth 2.0 do YouTube (autorização e callback)

  ## Critérios de Aceite

  - [ ] Endpoint /youtube/oauth/start redireciona para consent Google
  - [ ] Callback troca código por tokens e persiste em YouTubeCredential
  - [ ] State anti-CSRF validado
  - [ ] Refresh token automatizado ao expirar access token
id: TASK-029
score: 12
createdAt: '2026-04-17T16:16:26.650Z'
updatedAt: '2026-04-20T19:53:38.391Z'
filePath: /projects/nexvideo/.pm/tasks/TASK-029.md
---
## Objetivo

Implementar fluxo OAuth 2.0 do YouTube (autorização e callback)

## Critérios de Aceite

- [x] Endpoint /youtube/oauth/start redireciona para consent Google
- [x] Callback troca código por tokens e persiste em YouTubeCredential
- [x] State anti-CSRF validado
- [x] Refresh token automatizado ao expirar access token

## Resumo Técnico

### Arquitetura implementada

**`YoutubeOAuthService`** (reescrito em `apps/api/src/auth/services/youtube-oauth.service.ts`):
- `getAuthorizationUrl(organizationId)`: gera UUID nonce, armazena `youtube:oauth:state:{nonce} → organizationId` no Redis com TTL de 600s, retorna URL Google com nonce como `state`.
- `exchangeCodeForTokens(code, state)`: valida nonce no Redis (BadRequestException se expirado), deleta a chave (uso único), troca code pelo Google, persiste tokens criptografados em `YoutubeOAuthToken`.
- `refreshAccessToken(organizationId, refreshToken)`: público — chama Google Token endpoint, atualiza `accessToken` + `expiresAt` no banco.

**`YoutubeController`** (`apps/api/src/youtube/youtube.controller.ts`, base: `youtube/oauth`):
- `GET /start` — JWT protegido, redireciona (302) para consent Google.
- `GET /callback` — `@Public`, valida state nonce, persiste tokens.
- `GET /status` — retorna `connected`, `scope`, `expiresAt`.
- `POST /internal/refresh-tokens` — `@Public`, chamado pelo worker BullMQ; aciona `RefreshExpiringTokensUseCase`.

**`RefreshExpiringTokensUseCase`** (`apps/api/src/youtube/use-cases/refresh-expiring-tokens.use-case.ts`):
- Busca `YoutubeOAuthToken` com `expiresAt <= now + windowMinutes (10min)`.
- Chama `refreshAccessToken` para cada registro; retorna `{ refreshed, failed }`.

**`YoutubeModule`** (`apps/api/src/youtube/youtube.module.ts`):
- Importa `AuthModule` (provê `YoutubeOAuthService`) e `CacheModule` (provê `REDIS_INSTANCE`).
- `OnApplicationBootstrap`: registra job BullMQ `youtube:refresh-expiring-tokens` repetível a cada 5 minutos.

**Worker** (`apps/worker/src/index.ts`):
- Caso `youtube:refresh-expiring-tokens` no switch: chama `POST /youtube/oauth/internal/refresh-tokens`.

**`app.module.ts`**: registra `YoutubeModule`.
**`auth.module.ts`**: exporta `YoutubeOAuthService` para consumo pelo `YoutubeModule`.

### Anti-CSRF State
O `state` OAuth não mais expõe o `organizationId` diretamente. Em vez disso, é um UUID opaco — o `organizationId` fica apenas no Redis (TTL 10min, uso único). Elimina vazamento de tenant ID via URL de callback.
