---
title: Criar projeto no Google Cloud Console com APIs YouTube habilitadas
type: chore
priority: HIGH
impact: 9
confidence: 10
effort: 2
tags:
  - youtube
  - google-cloud
  - setup
acceptanceCriteria:
  - Projeto GCP criado e nomeado
  - YouTube Data API v3 habilitada
  - YouTube Analytics API habilitada
  - Billing do projeto configurado
status: IN_REVIEW
body: |
  ## Objetivo

  Criar projeto no Google Cloud Console com APIs YouTube habilitadas

  ## Critérios de Aceite

  - [ ] Projeto GCP criado e nomeado
  - [ ] YouTube Data API v3 habilitada
  - [ ] YouTube Analytics API habilitada
  - [ ] Billing do projeto configurado
id: TASK-017
score: 45
createdAt: '2026-04-17T16:16:26.601Z'
updatedAt: '2026-04-19T22:15:21.203Z'
filePath: /projects/nexvideo/.pm/tasks/TASK-017.md
---
## Objetivo

Criar projeto no Google Cloud Console com APIs YouTube habilitadas

## Critérios de Aceite

- [ ] Projeto GCP criado e nomeado
- [ ] YouTube Data API v3 habilitada
- [ ] YouTube Analytics API habilitada
- [ ] Billing do projeto configurado

---

## Resumo Técnico

### Status do codebase

O codebase está **100% pronto** para consumir as APIs YouTube assim que o projeto GCP for configurado:

| Componente | Arquivo | API usada |
|---|---|---|
| `YouTubeDataAdapter` | `apps/api/src/adapters/implementations/youtube-data.adapter.ts` | YouTube Data API v3 (`YOUTUBE_API_KEY`) |
| `YoutubeOAuthService` | `apps/api/src/auth/services/youtube-oauth.service.ts` | YouTube Data API v3 + Analytics via OAuth |
| Validação de env | `apps/api/src/config/env.validation.ts` | Garante que `YOUTUBE_API_KEY` esteja definida na inicialização |

### O que foi implementado nesta task

Todos os critérios de aceite são **ações manuais no Google Cloud Console** — não há código a implementar. O que foi entregue:

- **`docs/gcp-project-setup.md`** — runbook completo com passo-a-passo para:
  1. Criar o projeto GCP (staging e produção separados)
  2. Configurar billing
  3. Habilitar YouTube Data API v3
  4. Habilitar YouTube Analytics API
  5. Criar e restringir a API Key
  6. Solicitar aumento de quota (10.000 unidades/dia → produção)
  7. Checklist de verificação final

### Pendência manual (responsável humano)

Os 4 critérios de aceite precisam ser executados no [console.cloud.google.com](https://console.cloud.google.com) por um membro da equipe com permissão de Owner/Editor no GCP. Após conclusão, marcar os checkboxes acima e mover a task para **DONE**.
