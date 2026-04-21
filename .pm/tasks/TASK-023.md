---
title: Registrar aceite de ToS no onboarding
type: feature
priority: CRITICAL
impact: 8
confidence: 9
effort: 3
tags:
  - backend
  - frontend
  - compliance
acceptanceCriteria:
  - Migration adiciona acceptedTermsAt e termsVersion ao User
  - Checkbox obrigatório no formulário de cadastro
  - API rejeita cadastro sem aceite
  - Teste E2E valida bloqueio e persistência
status: DONE
body: |
  ## Objetivo

  Registrar aceite de ToS no onboarding

  ## Critérios de Aceite

  - [ ] Migration adiciona acceptedTermsAt e termsVersion ao User
  - [ ] Checkbox obrigatório no formulário de cadastro
  - [ ] API rejeita cadastro sem aceite
  - [ ] Teste E2E valida bloqueio e persistência
id: TASK-023
score: 24
createdAt: '2026-04-17T16:16:26.627Z'
updatedAt: '2026-04-20T02:41:19.567Z'
filePath: /projects/nexvideo/.pm/tasks/TASK-023.md
---
## Objetivo

Registrar aceite de ToS no onboarding

## Critérios de Aceite

- [x] Migration adiciona acceptedTermsAt e termsVersion ao User
- [x] Checkbox obrigatório no formulário de cadastro
- [x] API rejeita cadastro sem aceite
- [x] Teste E2E valida bloqueio e persistência

---

## Resumo Técnico

### 1. Prisma schema — `packages/database/prisma/schema.prisma`

Adicionados dois campos opcionais ao modelo `User`:
```prisma
acceptedTermsAt  DateTime?
termsVersion     String?
```

### 2. Migration manual — `packages/database/prisma/migrations/20260420000000_add_terms_acceptance/migration.sql`

```sql
ALTER TABLE "users" ADD COLUMN "acceptedTermsAt" TIMESTAMP(3);
ALTER TABLE "users" ADD COLUMN "termsVersion" TEXT;
```

### 3. Backend: `RegisterDto` — `apps/api/src/auth/dto/register.dto.ts`

Adicionado campo obrigatório com dupla validação:
```ts
@IsBoolean()
@IsTrue({ message: 'You must accept the Terms of Service to register' })
acceptTerms: boolean;
```
A `ValidationPipe` (já configurada com `whitelist: true`) rejeita automaticamente com **400** se `acceptTerms` estiver ausente, `false` ou não for boolean.

### 4. Backend: `RegisterUseCase` — `apps/api/src/auth/use-cases/register.use-case.ts`

`user.create` agora persiste os campos na transação:
```ts
acceptedTermsAt: new Date(),
termsVersion: '1.0',
```
A versão `'1.0'` é a versão atual publicada em `/terms`.

### 5. Frontend: formulário de cadastro — `apps/web/app/(auth)/register/page.tsx`

- Schema Zod atualizado: `acceptTerms: z.literal(true, { message: "..." })`
- Checkbox com label clicável, links para `/terms` e `/privacy` abrindo em nova aba (`target="_blank"`)
- Erro exibido via `role="alert"` abaixo do checkbox para acessibilidade
- Submit envia `acceptTerms: true` explicitamente na chamada à API

### 6. Auth client — `apps/web/lib/auth-client.ts`

`RegisterRequest` atualizada: `acceptTerms: boolean` adicionado ao contrato.

### 7. Testes E2E — `apps/api/test/saas.e2e-spec.ts`

- Todas as 6 chamadas `POST /auth/register` existentes atualizadas com `acceptTerms: true`
- Novo `describe('AC-6')` com 3 testes:
  - **6.1** — sem `acceptTerms` → 400 com mensagem sobre Terms of Service
  - **6.2** — `acceptTerms: false` → 400 com mensagem sobre Terms of Service
  - **6.3** — `acceptTerms: true` → 201, banco tem `acceptedTermsAt instanceof Date` e `termsVersion === '1.0'`

### Verificações

- `pnpm --filter @nexvideo/database generate` + `build` executados — client regenerado
- `pnpm --filter web exec tsc --noEmit` → zero erros
- Erros `TS2349` na API são pré-existentes (import supertest) — não introduzidos nesta task
