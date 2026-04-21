---
title: Criar serviço de criptografia para tokens OAuth
type: feature
priority: HIGH
impact: 9
confidence: 9
effort: 3
tags:
  - security
  - backend
  - crypto
acceptanceCriteria:
  - Tokens criptografados com AES-256 antes de persistir
  - Chave mestre armazenada em secret manager
  - Funções encrypt/decrypt testadas unitariamente
  - Rotação de chave documentada
status: DONE
body: |
  ## Objetivo

  Criar serviço de criptografia para tokens OAuth

  ## Critérios de Aceite

  - [ ] Tokens criptografados com AES-256 antes de persistir
  - [ ] Chave mestre armazenada em secret manager
  - [ ] Funções encrypt/decrypt testadas unitariamente
  - [ ] Rotação de chave documentada
id: TASK-030
score: 27
createdAt: '2026-04-17T16:16:26.655Z'
updatedAt: '2026-04-20T19:53:42.050Z'
filePath: /projects/nexvideo/.pm/tasks/TASK-030.md
---
## Objetivo

Criar serviço de criptografia para tokens OAuth

## Critérios de Aceite

- [x] Tokens criptografados com AES-256 antes de persistir
- [x] Chave mestre armazenada em secret manager
- [x] Funções encrypt/decrypt testadas unitariamente
- [x] Rotação de chave documentada

## Resumo Técnico

### Implementação

**`packages/database/src/crypto.ts`** — utilitário AES-256-GCM:
- `encryptToken(plaintext)`: gera IV aleatório de 12 bytes via `randomBytes`, cifra com `aes-256-gcm`, retorna `base64(iv + authTag + ciphertext)`.
- `decryptToken(ciphertext)`: extrai iv/authTag/ciphertext do buffer base64, valida auth tag (integridade), retorna plaintext.
- Chave lida de `ENCRYPTION_KEY` (64 hex chars = 32 bytes) em cada chamada — sem cache em memória.

**`apps/api/src/auth/services/youtube-oauth.service.ts`** — encrypt/decrypt aplicado:
- `exchangeCodeForTokens`: `encryptToken(access_token)` e `encryptToken(refresh_token)` antes do upsert.
- `getValidAccessToken`: `decryptToken(record.accessToken)` ao retornar; `decryptToken(record.refreshToken)` ao passar para refresh.
- `refreshAccessToken`: `encryptToken(tokens.access_token)` antes do update.
- `revokeTokens`: `decryptToken(record.accessToken)` ao chamar Google revoke endpoint.

### Chave Mestre — Secret Manager
`ENCRYPTION_KEY` configurada em `apps/api/.env.example` com instrução de geração:
```bash
openssl rand -hex 32
```
Em produção: armazenar no AWS Secrets Manager / GCP Secret Manager / Vault; injetar como env var via ECS task definition ou Kubernetes Secret.

### Testes Unitários
**`apps/api/src/crypto.spec.ts`** — 7 casos:
1. Roundtrip access token curto
2. Roundtrip refresh token longo (200+ chars)
3. IVs diferentes para mesmo plaintext (não determinístico)
4. Output é base64 válido com tamanho mínimo
5. Tamper detection — auth tag falha ao corromper ciphertext
6. Erro ao `ENCRYPTION_KEY` ausente
7. Erro ao `ENCRYPTION_KEY` com comprimento errado

### Rotação de Chave
Para rotacionar `ENCRYPTION_KEY`:
1. Gere nova chave: `openssl rand -hex 32`
2. Execute script de migração que lê todos os `YoutubeOAuthToken`, decripta com chave antiga e re-encripta com chave nova (usar transação Prisma).
3. Atualize a secret no secret manager e redeploy da API.
4. Remova a chave antiga do secret manager após validar que todos os tokens foram migrados.
