# Production Readiness Gate — Runbook

> **Gate**: o Sprint 7-PRE precisa estar **100% concluído** (todos os itens em `DONE` e aprovados) antes do go-live para tráfego real, antes de ativar Stripe `live` mode, e antes de abrir o cadastro público.
>
> **Owner do runbook**: Tech Lead — responsável final pela liberação do gate.
>
> **Origem**: [Sprint 7-PRE](../.pm/sprints/SPRINT-07-PRE.md) · 23 tasks · 2026-04-15 → 2026-04-17.

## 1. Como usar este documento

1. Antes de qualquer release de produção, abra este runbook e verifique a tabela de status.
2. Cada item deve estar em **DONE** com o checkbox de aprovação marcado pelo owner correspondente.
3. Se algum item estiver `IN_REVIEW`, `IN_PROGRESS` ou `BLOCKED` → **o gate está fechado**. Resolva antes de continuar.
4. Tech Lead faz o sign-off final na seção [§5 Aprovação](#5-aprovação-do-gate) só depois que todas as caixas estiverem marcadas.

Status legend: `DONE` ✅ · `IN_REVIEW` 🟡 · `IN_PROGRESS` 🔵 · `TODO` ⚪ · `BLOCKED` 🔴.

## 2. Itens do gate

### 2.1 Infra & Observabilidade

| Task | Item | Owner sugerido | Status atual | Aprovado |
|------|------|---------------|--------------|----------|
| [TASK-001](../.pm/tasks/TASK-001.md) | Ambiente de staging com paridade de produção | DevOps | 🟡 IN_REVIEW | ☐ |
| [TASK-002](../.pm/tasks/TASK-002.md) | Sentry integrado na API NestJS | Backend | ✅ DONE | ☐ |
| [TASK-003](../.pm/tasks/TASK-003.md) | Sentry integrado nos workers BullMQ | Backend | 🟡 IN_REVIEW | ☐ |
| [TASK-004](../.pm/tasks/TASK-004.md) | Sentry integrado no frontend web | Frontend | ✅ DONE | ☐ |
| [TASK-005](../.pm/tasks/TASK-005.md) | Logger estruturado (Pino) sem `console.log` | Backend | ✅ DONE | ☐ |
| [TASK-006](../.pm/tasks/TASK-006.md) | Endpoint `/health` e `/health/deep` | Backend | ✅ DONE | ☐ |
| [TASK-007](../.pm/tasks/TASK-007.md) | Uptime monitoring externo configurado | DevOps | 🟡 IN_REVIEW | ☐ |

Saída esperada do bloco:
- `GET /health` responde 200 em staging e produção.
- Sentry recebe um teste de erro de cada um dos 3 ambientes (API, worker, web).
- Dashboard de uptime ativo com regras de alerta documentadas em [`uptime-monitoring-setup.md`](./uptime-monitoring-setup.md).

### 2.2 Stripe

| Task | Item | Owner sugerido | Status atual | Aprovado |
|------|------|---------------|--------------|----------|
| [TASK-008](../.pm/tasks/TASK-008.md) | Stripe test mode E2E validado em staging | Backend + QA | 🟡 IN_REVIEW | ☐ |
| [TASK-009](../.pm/tasks/TASK-009.md) | Testes de idempotência de webhooks | Backend | 🟡 IN_REVIEW | ☐ |
| [TASK-010](../.pm/tasks/TASK-010.md) | `STRIPE_WEBHOOK_SECRET` distinto por ambiente | DevOps | 🟡 IN_REVIEW | ☐ |
| [TASK-011](../.pm/tasks/TASK-011.md) | Stripe live mode configurado em produção | Tech Lead | 🟡 IN_REVIEW | ☐ |

Saída esperada do bloco:
- [Checklist Stripe go-live](./stripe-go-live-checklist.md) marcado.
- [Playbook E2E](./stripe-e2e-test-playbook.md) executado em staging com sucesso.
- Idempotência verificada via reenvio: ver [`stripe-webhook-idempotency.md`](./stripe-webhook-idempotency.md).
- Rotação documentada em [`stripe-webhook-rotation.md`](./stripe-webhook-rotation.md).
- Load test ([`stripe-webhook-load-test.md`](./stripe-webhook-load-test.md)) passou nos SLOs (p95 < 250ms, p99 < 500ms, error rate < 1%).

### 2.3 Segurança

| Task | Item | Owner sugerido | Status atual | Aprovado |
|------|------|---------------|--------------|----------|
| [TASK-012](../.pm/tasks/TASK-012.md) | Rate limiting em auth e endpoints de geração | Backend | ✅ DONE | ☐ |
| [TASK-013](../.pm/tasks/TASK-013.md) | CORS restrito a domínios conhecidos | Backend | ✅ DONE | ☐ |
| [TASK-014](../.pm/tasks/TASK-014.md) | Helmet + CSRF em rotas de formulário | Backend | 🟡 IN_REVIEW | ☐ |
| [TASK-015](../.pm/tasks/TASK-015.md) | Auditoria de secrets no repositório | Tech Lead | ✅ DONE | ☐ |
| [TASK-016](../.pm/tasks/TASK-016.md) | Backup automático do Postgres | DevOps | 🟡 IN_REVIEW | ☐ |

Saída esperada do bloco:
- Headers de segurança validados em produção (`Helmet`, CSRF, CSP — ver [`helmet-csp.md`](./helmet-csp.md)).
- CORS allow-list publicada em [`cors-whitelist.md`](./cors-whitelist.md).
- Backup verificado com restauração em DB de teste (ver [`disaster-recovery.md`](./disaster-recovery.md)).
- `gitleaks`/`trufflehog` sem hits novos na branch.

### 2.4 YouTube / Google APIs

| Task | Item | Owner sugerido | Status atual | Aprovado |
|------|------|---------------|--------------|----------|
| [TASK-017](../.pm/tasks/TASK-017.md) | GCP project com APIs YouTube habilitadas | Backend | 🟡 IN_REVIEW | ☐ |
| [TASK-018](../.pm/tasks/TASK-018.md) | OAuth Consent Screen configurado | Tech Lead | 🟡 IN_REVIEW | ☐ |
| [TASK-019](../.pm/tasks/TASK-019.md) | Credenciais OAuth (staging + prod) criadas | DevOps | 🟡 IN_REVIEW | ☐ |
| [TASK-020](../.pm/tasks/TASK-020.md) | Consumo de quota YouTube documentado e ajuste solicitado | Backend | 🟡 IN_REVIEW | ☐ |

Saída esperada do bloco:
- [`gcp-project-setup.md`](./gcp-project-setup.md) + [`oauth-consent-screen-setup.md`](./oauth-consent-screen-setup.md) preenchidos.
- E2E `youtube-oauth-sync.e2e-spec.ts` verde no CI (ver [TASK-038](../.pm/tasks/TASK-038.md)).
- Quota mensal estimada + upgrade request enviado, se necessário.

### 2.5 Legal & Privacidade

| Task | Item | Owner sugerido | Status atual | Aprovado |
|------|------|---------------|--------------|----------|
| [TASK-021](../.pm/tasks/TASK-021.md) | `/terms` com Terms of Service versionados | Tech Lead + Legal | 🟡 IN_REVIEW | ☐ |
| [TASK-022](../.pm/tasks/TASK-022.md) | `/privacy` com Privacy Policy LGPD/GDPR | Tech Lead + Legal | 🟡 IN_REVIEW | ☐ |
| [TASK-023](../.pm/tasks/TASK-023.md) | `acceptedTermsAt` registrado no onboarding | Frontend + Backend | ✅ DONE | ☐ |

Saída esperada do bloco:
- Páginas `/terms` e `/privacy` acessíveis sem login.
- Aceite registrado em DB para todo novo cadastro (campo `acceptedTermsAt`).
- Versão do ToS aceito armazenada (caso de re-aceite após mudança).

## 3. Sumário do gate (último snapshot)

> Atualize após cada mudança de status. Data: **2026-05-15**.

| Bloco | Total | DONE ✅ | IN_REVIEW 🟡 | Pendente |
|-------|------:|--------:|-------------:|---------:|
| Infra & Observabilidade | 7 | 4 | 3 | 0 |
| Stripe | 4 | 0 | 4 | 0 |
| Segurança | 5 | 3 | 2 | 0 |
| YouTube / Google | 4 | 0 | 4 | 0 |
| Legal & Privacidade | 3 | 1 | 2 | 0 |
| **TOTAL** | **23** | **8** | **15** | **0** |

**Gate atual: 🔴 FECHADO** — 15 itens ainda precisam sair de `IN_REVIEW` para `DONE` antes do go-live.

## 4. Como atualizar este runbook

1. Quando uma TASK do Sprint 7-PRE mudar de status, edite a tabela correspondente em [§2](#2-itens-do-gate).
2. Atualize a contagem em [§3](#3-sumário-do-gate-último-snapshot) e a data do snapshot.
3. Faça commit `docs: update production readiness gate status`.
4. Se uma task crítica reabrir (regressão), volte para `IN_REVIEW`, desmarque a aprovação e abra um item de remediação.

## 5. Aprovação do gate

| Função | Nome | Data | Assinatura (commit/PR) |
|--------|------|------|------------------------|
| Tech Lead | _____________ | _____________ | _____________ |
| Backend Lead | _____________ | _____________ | _____________ |
| DevOps Lead | _____________ | _____________ | _____________ |
| Frontend Lead | _____________ | _____________ | _____________ |

Critério de sign-off (Tech Lead):

- [ ] Todas as 23 caixas de "Aprovado" da seção §2 estão marcadas.
- [ ] Sumário §3 mostra **23/23 DONE**.
- [ ] CI passou no commit a ser promovido (`lint-and-types` + `e2e-youtube` + load test smoke).
- [ ] Restore de backup foi executado nos últimos 7 dias (anexar link do log).
- [ ] Sentry recebeu eventos de teste nos últimos 24h (API, worker, web).
- [ ] Stripe live mode validado com 1 transação real de R$ 1,00 (refund posterior).

Após o sign-off, registre o commit que promoveu o ambiente em produção e anexe abaixo:

```
Go-live commit:  __________________
Data:            __________________
Tech Lead:       __________________
```

## 6. Reabertura do gate

Caso ocorra qualquer um dos eventos abaixo após o go-live, **o gate é reaberto**
e o tráfego deve ser revertido (feature flag global ou rollback de deploy) até
nova aprovação:

- Incidente de severidade P0/P1 que causou indisponibilidade > 15 min.
- Vazamento de dados ou credenciais.
- Falha de cobrança Stripe não-idempotente (cliente cobrado em duplicidade).
- Descumprimento de LGPD/GDPR identificado por auditoria.
- Quota YouTube esgotada antes do esperado (consumo > 110% do estimado).

## 7. Referências

- Sprint 7-PRE: [`.pm/sprints/SPRINT-07-PRE.md`](../.pm/sprints/SPRINT-07-PRE.md)
- Stripe: [`stripe-go-live-checklist.md`](./stripe-go-live-checklist.md), [`stripe-e2e-test-playbook.md`](./stripe-e2e-test-playbook.md), [`stripe-webhook-idempotency.md`](./stripe-webhook-idempotency.md), [`stripe-webhook-rotation.md`](./stripe-webhook-rotation.md), [`stripe-webhook-load-test.md`](./stripe-webhook-load-test.md)
- Infra: [`uptime-monitoring-setup.md`](./uptime-monitoring-setup.md), [`disaster-recovery.md`](./disaster-recovery.md)
- Segurança: [`cors-whitelist.md`](./cors-whitelist.md), [`helmet-csp.md`](./helmet-csp.md)
- Google: [`gcp-project-setup.md`](./gcp-project-setup.md), [`oauth-consent-screen-setup.md`](./oauth-consent-screen-setup.md)
