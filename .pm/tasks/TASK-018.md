---
title: Configurar OAuth Consent Screen para YouTube APIs
type: chore
priority: HIGH
impact: 9
confidence: 7
effort: 3
tags:
  - youtube
  - oauth
  - compliance
acceptanceCriteria:
  - Consent screen em modo Testing com emails de teste adicionados
  - 'Scopes documentados: youtube.readonly, youtube.upload, yt-analytics.readonly'
  - Solicitação de verificação submetida ao Google
  - Screenshots/runbook do processo salvos
status: IN_REVIEW
body: >
  ## Objetivo


  Configurar OAuth Consent Screen para YouTube APIs


  ## Critérios de Aceite


  - [ ] Consent screen em modo Testing com emails de teste adicionados

  - [ ] Scopes documentados: youtube.readonly, youtube.upload,
  yt-analytics.readonly

  - [ ] Solicitação de verificação submetida ao Google

  - [ ] Screenshots/runbook do processo salvos
id: TASK-018
score: 21
createdAt: '2026-04-17T16:16:26.606Z'
updatedAt: '2026-04-19T22:15:27.195Z'
filePath: /projects/nexvideo/.pm/tasks/TASK-018.md
---
## Objetivo

Configurar OAuth Consent Screen para YouTube APIs

## Critérios de Aceite

- [ ] Consent screen em modo Testing com emails de teste adicionados ← pendência manual (GCP Console)
- [x] Scopes documentados: youtube.readonly, youtube.upload, yt-analytics.readonly
- [ ] Solicitação de verificação submetida ao Google ← pendência manual (após launch em produção)
- [x] Screenshots/runbook do processo salvos

---

## Resumo Técnico

### Alterações no codebase

**`YoutubeOAuthService`** — scope `yt-analytics.readonly` adicionado:
```
SCOPES = [
  youtube.upload,
  youtube.readonly,
  yt-analytics.readonly   ← adicionado
]
```

**`docs/youtube-oauth-rotation.md`** — tabela de scopes atualizada para incluir `yt-analytics.readonly`.

### Documentação criada

**`docs/oauth-consent-screen-setup.md`** — runbook completo (8 seções) cobrindo:

1. **Visão geral dos scopes** — tabela com URI, classificação (todos "Restricted") e finalidade de cada scope
2. **Pré-requisitos** — projeto GCP, APIs habilitadas, domínio verificado, Privacy Policy/ToS URLs
3. **Configuração do Consent Screen** — tipo External, campos obrigatórios (app name, logo, URLs, authorized domain)
4. **Adição de scopes** — passo-a-passo para adicionar os 3 scopes Restricted
5. **Modo Testing** — como adicionar emails de teste (até 100), comportamento esperado durante dev
6. **Teste end-to-end local** — comandos para validar o fluxo OAuth com a API em dev
7. **Processo de verificação Google** — requisitos para scopes Restricted (vídeo de demo, Privacy Policy, justificativas por scope), passos de submissão, prazo (4-6 semanas)
8. **Checklist + Troubleshooting** — 7 itens de verificação e 5 erros comuns com solução

### Pendências manuais (responsável humano)

1. **Consent Screen em Testing:** acessar GCP Console → OAuth Consent Screen e seguir `docs/oauth-consent-screen-setup.md` §2-§5.
2. **Emails de teste:** adicionar emails da equipe em Test Users (§4).
3. **Verificação Google:** submeter após launch em produção (§6) — prazo de aprovação: 4-6 semanas. Todos os scopes são "Restricted" e exigem vídeo de demonstração.
