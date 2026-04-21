---
title: Adicionar edição de role de membros
type: feature
priority: MEDIUM
impact: 6
confidence: 9
effort: 3
tags:
  - members
  - frontend
  - backend
acceptanceCriteria:
  - 'Endpoint PATCH /members/:id/role com validação de roles'
  - UI permite trocar entre roles permitidos
  - Auditoria de mudança de role registrada
  - Testes cobrem permissões e validações
status: DONE
body: |
  ## Objetivo

  Adicionar edição de role de membros

  ## Critérios de Aceite

  - [ ] Endpoint PATCH /members/:id/role com validação de roles
  - [ ] UI permite trocar entre roles permitidos
  - [ ] Auditoria de mudança de role registrada
  - [ ] Testes cobrem permissões e validações
id: TASK-026
score: 18
createdAt: '2026-04-17T16:16:26.637Z'
updatedAt: '2026-04-20T03:03:41.180Z'
filePath: /projects/nexvideo/.pm/tasks/TASK-026.md
---
## Objetivo

Adicionar edição de role de membros

## Critérios de Aceite

- [x] Endpoint PATCH /members/:id/role com validação de roles
- [x] UI permite trocar entre roles permitidos
- [x] Auditoria de mudança de role registrada
- [x] Testes cobrem permissões e validações

## Resumo Técnico

### Database

`MemberRoleAudit` adicionado ao schema Prisma (`packages/database/prisma/schema.prisma`):
- `organizationId`, `changedByUserId`, `targetUserId`, `previousRole`, `newRole`, `changedAt`
- Índices em `organizationId`, `targetUserId` e `changedAt`
- Migration aplicada: `20260420194732_add_member_role_audit`
- `Role` e `MemberRoleAudit` exportados de `packages/database/src/index.ts`

### Backend (`apps/api`)

**`UpdateMemberRoleUseCase`** (`organizations/use-cases/update-member-role.use-case.ts`):
- Valida `newRole` contra lista `ALLOWED_ROLES` (`admin | manager | creator | viewer | member`) — `BadRequestException` em role inválido
- Verifica tenant isolation: `targetUser.organizationId !== organizationId` → `ForbiddenException`
- Bloqueia demoção do último admin (`admin count <= 1`) → `BadRequestException`
- Retorna sem escrever se role já é igual ao atual (idempotente)
- Usa `$transaction([user.update, memberRoleAudit.create])` para atomicidade

**`PATCH /organizations/members/:id/role`** registrado em `OrganizationsController` + `OrganizationsModule`, protegido pelo JWT global.

### Frontend (`apps/web`)

- `updateMemberRole(memberId, role)` adicionado em `lib/organizations-client.ts`
- `ROLE_LABELS` e `ASSIGNABLE_ROLES` exportados para uso na UI
- **`RoleSelector`**: `<select>` nativo semântico com `appearance-none`, chevron SVG inline, hover roxo `#7C3AED/10`, `focus-visible:ring-2` (a11y), `aria-label` descritivo, spinner Loader2 inline durante loading (sem CLS)
- `RoleBadge` atualizado para usar `ROLE_LABELS` (exibe label PT-BR)
- `MemberRow` recebe `onRoleChange` e `isChangingRole`; próprio usuário vê badge read-only
- `doUpdateRole` mutation com `onMutate`/`onSettled` para tracking de loading por membro individual + toast de sucesso/erro

### Testes

**Unit** (`update-member-role.use-case.spec.ts`): 7 casos — sucesso, role inalterado, role inválido, not found, cross-org, último admin, múltiplos admins. Todos ✓.

**E2E** (`saas.e2e-spec.ts`, `AC-8`): 5 casos — alteração bem-sucedida + validação do audit log, role inválido (400), último admin (400), tenant isolation (403), sem token (401).
