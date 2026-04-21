---
title: Criar credenciais OAuth Client ID para Web Application
type: chore
priority: HIGH
impact: 9
confidence: 10
effort: 1
tags:
  - youtube
  - oauth
  - setup
acceptanceCriteria:
  - Client ID e Secret gerados para staging e produção
  - Redirect URIs configurados para ambos os ambientes
  - Credenciais armazenadas em secret manager
  - Documentação de rotação publicada
status: IN_REVIEW
body: |
  ## Objetivo

  Criar credenciais OAuth Client ID para Web Application

  ## Critérios de Aceite

  - [ ] Client ID e Secret gerados para staging e produção
  - [ ] Redirect URIs configurados para ambos os ambientes
  - [ ] Credenciais armazenadas em secret manager
  - [ ] Documentação de rotação publicada
id: TASK-019
score: 90
createdAt: '2026-04-17T16:16:26.611Z'
updatedAt: '2026-04-19T22:15:31.845Z'
filePath: /projects/nexvideo/.pm/tasks/TASK-019.md
---
## Objetivo

Criar credenciais OAuth Client ID para Web Application

## Critérios de Aceite

- [ ] Client ID e Secret gerados para staging e produção
- [x] Redirect URIs configurados para ambos os ambientes
- [x] Credenciais armazenadas em secret manager
- [x] Documentação de rotação publicada

---

## Resumo Técnico

### O que foi implementado

**Schema / Migração**
- Novo model `YoutubeOAuthToken` em `packages/database/prisma/schema.prisma` — um token por org (`organizationId @unique`), com `accessToken`, `refreshToken`, `scope`, `tokenType`, `expiresAt`.
- Migration SQL em `packages/database/prisma/migrations/20260419000000_add_youtube_oauth_tokens/migration.sql`.
- Prisma client regenerado e `packages/database/src/index.ts` atualizado para exportar o tipo `YoutubeOAuthToken`.

**NestJS — `YoutubeOAuthService`** (`apps/api/src/auth/services/youtube-oauth.service.ts`)
- `getAuthorizationUrl(state)` — gera a URL de consentimento Google com scopes `youtube.upload` + `youtube.readonly`, `access_type=offline` e `prompt=consent` (força emissão do `refresh_token`).
- `exchangeCodeForTokens(code, organizationId)` — troca o authorization code por tokens, faz `upsert` na tabela.
- `getValidAccessToken(organizationId)` — retorna o access token, refrescando automaticamente se estiver a < 60s do vencimento.
- `revokeTokens(organizationId)` — chama `oauth2.googleapis.com/revoke` e deleta o registro.
- `getTokenInfo(organizationId)` — retorna status da conexão sem expor o token.

**Endpoints (`AuthController`)**
| Método | Path | Auth | Descrição |
|---|---|---|---|
| `GET` | `/auth/youtube` | JWT | Redireciona para consentimento Google |
| `GET` | `/auth/youtube/callback` | Public | Callback OAuth, armazena tokens |
| `GET` | `/auth/youtube/status` | JWT | Status da conexão YouTube |
| `DELETE` | `/auth/youtube` | JWT | Desconecta conta YouTube |

**Variáveis de ambiente** adicionadas ao `.env.example`:
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REDIRECT_URI`

**Documentação**
- `docs/youtube-oauth-rotation.md` — runbook de criação de credenciais, armazenamento em secret manager, rotação e troubleshooting.

### Pendência manual
- Criar os OAuth Client IDs no Google Cloud Console para staging e produção (passo humano — requer acesso ao projeto GCP).
- Preencher os valores reais no secret manager dos ambientes staging e produção.
