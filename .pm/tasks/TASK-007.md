---
title: Configurar uptime monitoring externo
type: chore
priority: HIGH
impact: 7
confidence: 9
effort: 2
tags:
  - monitoring
  - devops
acceptanceCriteria:
  - Better Uptime ou UptimeRobot configurado em endpoints críticos
  - Alertas por email disparando em caso de downtime
  - Status page pública configurada
  - Intervalo de checagem definido em <= 1 min
status: IN_REVIEW
body: |
  ## Objetivo

  Configurar uptime monitoring externo

  ## Critérios de Aceite

  - [ ] Better Uptime ou UptimeRobot configurado em endpoints críticos (requer ação manual)
  - [ ] Alertas por email disparando em caso de downtime (requer ação manual)
  - [ ] Status page pública configurada (requer ação manual)
  - [ ] Intervalo de checagem definido em <= 1 min (requer ação manual)

  ## Implementação

  ### O que foi feito

  Esta task é puramente de configuração de serviço externo — não há código a implementar.

  O endpoint de health check já existia em `GET /health` (público, sem auth), retornando status de Postgres, Redis e BullMQ workers. O endpoint está configurado no `render.yaml` como `healthCheckPath: /health`.

  **`docs/uptime-monitoring-setup.md`** — runbook criado com:
  - Tabela de endpoints a monitorar (`/health` da API e a URL do web)
  - Passo a passo para Better Uptime (recomendado — suporta intervalo de 1 min no Starter)
  - Alternativa com UptimeRobot (free tier = 5 min; Pro = 1 min)
  - Instruções de alert policy com email e status page pública
  - Checklist de validação pós-setup

  ### Passo manual restante

  Todos os critérios requerem ação manual no serviço de monitoramento escolhido:
  1. Criar conta em Better Uptime ou UptimeRobot
  2. Adicionar monitores para `https://nexvideo-api.onrender.com/health` e `https://nexvideo-web.onrender.com`
  3. Configurar alert policy com email `justinojosesilva@gmail.com`
  4. Criar status page pública
  5. Verificar intervalo de checagem ≤ 1 min

  Ver runbook completo: `docs/uptime-monitoring-setup.md`
id: TASK-007
score: 32
createdAt: '2026-04-17T16:16:26.561Z'
updatedAt: '2026-04-18T20:08:56.344Z'
filePath: /projects/nexvideo/.pm/tasks/TASK-007.md
---
## Objetivo

Configurar uptime monitoring externo

## Critérios de Aceite

- [ ] Better Uptime ou UptimeRobot configurado em endpoints críticos (requer ação manual)
- [ ] Alertas por email disparando em caso de downtime (requer ação manual)
- [ ] Status page pública configurada (requer ação manual)
- [ ] Intervalo de checagem definido em <= 1 min (requer ação manual)

## Implementação

### O que foi feito

Esta task é puramente de configuração de serviço externo — não há código a implementar.

O endpoint de health check já existia em `GET /health` (público, sem auth), retornando status de Postgres, Redis e BullMQ workers. O endpoint está configurado no `render.yaml` como `healthCheckPath: /health`.

**`docs/uptime-monitoring-setup.md`** — runbook criado com:
- Tabela de endpoints a monitorar (`/health` da API e a URL do web)
- Passo a passo para Better Uptime (recomendado — suporta intervalo de 1 min no Starter)
- Alternativa com UptimeRobot (free tier = 5 min; Pro = 1 min)
- Instruções de alert policy com email e status page pública
- Checklist de validação pós-setup

### Passo manual restante

Todos os critérios requerem ação manual no serviço de monitoramento escolhido:
1. Criar conta em Better Uptime ou UptimeRobot
2. Adicionar monitores para `https://nexvideo-api.onrender.com/health` e `https://nexvideo-web.onrender.com`
3. Configurar alert policy com email `justinojosesilva@gmail.com`
4. Criar status page pública
5. Verificar intervalo de checagem ≤ 1 min

Ver runbook completo: `docs/uptime-monitoring-setup.md`
