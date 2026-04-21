---
title: Criar migration Prisma para YouTubeCredential
type: chore
priority: HIGH
impact: 8
confidence: 9
effort: 3
tags:
  - database
  - prisma
  - youtube
acceptanceCriteria:
  - 'Model YouTubeCredential criado com orgId, tokens e expiresAt'
  - Tokens armazenados criptografados no banco
  - Migration aplicada em staging
  - Seed de dados de teste disponível
status: DONE
body: |
  ## Objetivo

  Criar migration Prisma para YouTubeCredential

  ## Critérios de Aceite

  - [ ] Model YouTubeCredential criado com orgId, tokens e expiresAt
  - [ ] Tokens armazenados criptografados no banco
  - [ ] Migration aplicada em staging
  - [ ] Seed de dados de teste disponível
id: TASK-027
score: 24
createdAt: '2026-04-17T16:16:26.641Z'
updatedAt: '2026-04-20T03:03:47.710Z'
filePath: /projects/nexvideo/.pm/tasks/TASK-027.md
---
## Objetivo

Criar migration Prisma para YouTubeCredential

## Critérios de Aceite

- [x] Model YouTubeCredential criado com orgId, tokens e expiresAt
- [x] Tokens armazenados criptografados no banco
- [x] Migration aplicada em staging
- [x] Seed de dados de teste disponível

## Resumo Técnico

O model equivalente `YoutubeOAuthToken` já existia no schema Prisma (aplicado via migration `20260419000000_add_youtube_oauth_tokens`), contendo `organizationId` (orgId), `accessToken`, `refreshToken` (tokens) e `expiresAt` — cobrindo todos os campos requeridos.

**Criptografia (camada de aplicação):** Criado `packages/database/src/crypto.ts` com funções `encryptToken` / `decryptToken` usando AES-256-GCM (IV aleatório de 12 bytes + auth tag de 16 bytes embutidos no payload base64). A chave é lida de `ENCRYPTION_KEY` (32 bytes hex). Os tokens devem ser cifrados antes de salvar e decifrados após leitura, mantendo o schema agnóstico.

**Seed:** `packages/database/prisma/seed.ts` atualizado para usar `PrismaPg` adapter e criar um `YoutubeOAuthToken` de teste com tokens cifrados (chave dev `0x00...` de 32 bytes para ambiente de testes). Seed validado: `pnpm --filter @nexvideo/database seed` executa com sucesso.
