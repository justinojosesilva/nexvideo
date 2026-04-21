---
title: Implementar notificação de uso ao atingir 80% do limite
type: feature
priority: MEDIUM
impact: 7
confidence: 8
effort: 4
tags:
  - billing
  - notifications
  - backend
acceptanceCriteria:
  - Job detecta quando organização atinge 80% do uso
  - Email via Resend enviado apenas uma vez por ciclo
  - Banner in-app exibido no dashboard
  - Testes cobrem threshold e deduplicação
status: DONE
body: |
  ## Objetivo

  Implementar notificação de uso ao atingir 80% do limite

  ## Critérios de Aceite

  - [ ] Job detecta quando organização atinge 80% do uso
  - [ ] Email via Resend enviado apenas uma vez por ciclo
  - [ ] Banner in-app exibido no dashboard
  - [ ] Testes cobrem threshold e deduplicação
id: TASK-024
score: 14
createdAt: '2026-04-17T16:16:26.630Z'
updatedAt: '2026-04-20T03:03:30.127Z'
filePath: /projects/nexvideo/.pm/tasks/TASK-024.md
---
## Objetivo

Implementar notificação de uso ao atingir 80% do limite

## Critérios de Aceite

- [x] Job detecta quando organização atinge 80% do uso
- [x] Email via Resend enviado apenas uma vez por ciclo
- [x] Banner in-app exibido no dashboard
- [x] Testes cobrem threshold e deduplicação

---

## Resumo Técnico

### 1. `CheckUsageThresholdUseCase` — `apps/api/src/billing/use-cases/check-usage-threshold.use-case.ts`

Use-case principal que:
- Recebe `{ organizationId }`
- Consulta `UsageLog` + `Plan` do mês corrente
- Calcula `maxPercent` entre scripts/narrações/exports
- Ignora planos com limites `null` (unlimited)
- **Deduplicação via `BillingNotification`**: chave `invoiceId = "usage:${orgId}:${YYYY-MM}"`, `type = "usage_warning_80"` — reutiliza a constraint `@@unique([invoiceId, type])` existente
- Cria o registro **antes** de enviar o email para prevenir double-send em race condition
- Se `create` lança (unique violation) → skipa silenciosamente

### 2. `SendUsageWarningEmailUseCase` — `apps/api/src/email/use-cases/send-usage-warning-email.use-case.ts`

Email via Resend com:
- Template HTML responsivo em `apps/api/src/email/templates/usage-warning-email.ts`
- Subject dinâmico com percentual (`⚡ Você usou X% do seu limite mensal — nexvideo`)
- CTA para `${APP_URL}/plans`
- Falhas de envio logadas com `warn` sem propagar (não bloqueia o usuário)

### 3. Trigger: `PlanLimitsGuard` — `apps/api/src/auth/guards/plan-limits.guard.ts`

Após incrementar o contador de uso (scripts, narrações, exports), dispara fire-and-forget:
```ts
void this.checkUsageThreshold?.execute({ organizationId });
```
`@Optional()` injection garante retrocompatibilidade com testes existentes que não provisionam o serviço.

### 4. Banner in-app — `apps/web/app/dashboard/page.tsx`

O `UpgradeBanner` já existia no dashboard. Ajuste: removida restrição `isFree &&` para exibir para **todos os planos** ao atingir 80%:
```ts
const showBanner = maxPercent >= 80 && !bannerDismissed;
```
O `UsageWidget` também exibe CTA de upgrade em `maxPercent >= 80` para todos os planos.

### 5. Módulos atualizados

| Módulo | Alteração |
|---|---|
| `email.module.ts` | Adicionado `SendUsageWarningEmailUseCase` em providers + exports |
| `billing.module.ts` | Adicionado `CheckUsageThresholdUseCase` em providers + exports |
| `auth.module.ts` | Importado `BillingModule` para injetar `CheckUsageThresholdUseCase` no guard |

### 6. Testes — `check-usage-threshold.use-case.spec.ts`

6 casos cobertos:
- ✅ 80% → envia email + cria BillingNotification
- ✅ 60% → não envia
- ✅ Notificação já existe → não envia (dedup)
- ✅ Race condition (create throw) → não envia, não propaga erro
- ✅ UsageLog ausente → skip graceful
- ✅ Plano unlimited (null limits) → skip graceful
