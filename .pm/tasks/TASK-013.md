---
title: Restringir CORS a domínios conhecidos em produção
type: chore
priority: CRITICAL
impact: 8
confidence: 10
effort: 2
tags:
  - security
  - backend
  - cors
acceptanceCriteria:
  - Lista de origins permitidos por ambiente via env
  - Wildcard * removido em produção
  - Requisições de origem não autorizada retornam erro
  - Documentação de whitelist publicada
status: DONE
body: >
  ## Objetivo


  Restringir CORS a domínios conhecidos em produção


  ## Critérios de Aceite


  - [x] Lista de origins permitidos por ambiente via env

  - [x] Wildcard * removido em produção

  - [x] Requisições de origem não autorizada retornam erro

  - [x] Documentação de whitelist publicada


  ## Implementação


  ### `apps/api/src/main.ts`


  Substituiu a config CORS de `origin: string` para `origin: function` com
  validação explícita:


  - Lê `ALLOWED_ORIGINS` (comma-separated) com fallback para `FRONTEND_URL` e
  `http://localhost:3001`

  - Requisições sem `Origin` (server-to-server) sempre passam

  - Origens não listadas recebem `new Error('CORS: origin not allowed')` →
  browser bloqueia

  - Nunca usa wildcard `*`


  ### `apps/api/.env.example`


  Adicionado `ALLOWED_ORIGINS="http://localhost:3001"` com comentário explicando
  formato e uso em produção.


  ### `docs/cors-whitelist.md`


  Documentação publicada com:

  - Tabela de origins por ambiente (local / staging / production)

  - Instruções para Render (variável de env)

  - Como adicionar novo origin

  - Comandos curl para testar CORS autorizado vs não autorizado
id: TASK-013
score: 40
createdAt: '2026-04-17T16:16:26.588Z'
updatedAt: '2026-04-19T18:51:11.302Z'
filePath: /projects/nexvideo/.pm/tasks/TASK-013.md
---
## Objetivo

Restringir CORS a domínios conhecidos em produção

## Critérios de Aceite

- [x] Lista de origins permitidos por ambiente via env
- [x] Wildcard * removido em produção
- [x] Requisições de origem não autorizada retornam erro
- [x] Documentação de whitelist publicada

## Implementação

### `apps/api/src/main.ts`

Substituiu a config CORS de `origin: string` para `origin: function` com validação explícita:

- Lê `ALLOWED_ORIGINS` (comma-separated) com fallback para `FRONTEND_URL` e `http://localhost:3001`
- Requisições sem `Origin` (server-to-server) sempre passam
- Origens não listadas recebem `new Error('CORS: origin not allowed')` → browser bloqueia
- Nunca usa wildcard `*`

### `apps/api/.env.example`

Adicionado `ALLOWED_ORIGINS="http://localhost:3001"` com comentário explicando formato e uso em produção.

### `docs/cors-whitelist.md`

Documentação publicada com:
- Tabela de origins por ambiente (local / staging / production)
- Instruções para Render (variável de env)
- Como adicionar novo origin
- Comandos curl para testar CORS autorizado vs não autorizado
