---
title: Adicionar remoção de membros em /settings/members
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
  - 'Endpoint DELETE /members/:id respeita TenantGuard'
  - UI confirma ação com modal
  - Último admin não pode ser removido
  - Teste E2E valida fluxo completo
status: DONE
body: |
  ## Objetivo

  Adicionar remoção de membros em /settings/members

  ## Critérios de Aceite

  - [ ] Endpoint DELETE /members/:id respeita TenantGuard
  - [ ] UI confirma ação com modal
  - [ ] Último admin não pode ser removido
  - [ ] Teste E2E valida fluxo completo
id: TASK-025
score: 18
createdAt: '2026-04-17T16:16:26.634Z'
updatedAt: '2026-04-20T03:03:36.066Z'
filePath: /projects/nexvideo/.pm/tasks/TASK-025.md
---
## Objetivo

Adicionar remoção de membros em /settings/members

## Critérios de Aceite

- [x] Endpoint DELETE /members/:id respeita TenantGuard
- [x] UI confirma ação com modal
- [x] Último admin não pode ser removido
- [x] Teste E2E valida fluxo completo

## Resumo Técnico

### Backend (`apps/api`)

**`RemoveMemberUseCase`** (`organizations/use-cases/remove-member.use-case.ts`):
- Valida que o solicitante não está removendo a si mesmo (`BadRequestException`)
- Verifica que o target pertence à mesma organização via `organizationId` — isolamento de tenant sem `TenantGuard` (que não suporta `User` diretamente), feito inline com `ForbiddenException`
- Conta admins: se o target é `admin` e é o único, lança `BadRequestException('Cannot remove the last admin...')`
- Deleta com `prisma.user.delete`

**Controller**: `DELETE /organizations/members/:id` adicionado em `OrganizationsController`, protegido pelo `JwtAuthGuard` global (requer JWT válido). Registrado no `OrganizationsModule`.

### Frontend (`apps/web`)

- `removeMember(memberId)` adicionado em `lib/organizations-client.ts`
- `getCurrentUserId()` adicionado em `lib/auth-client.ts` — decodifica o `sub` do JWT para identificar o usuário logado e ocultar o botão de remoção na própria linha
- **`ConfirmRemoveModal`**: dark theme `#1a1a1a`, ícone `AlertTriangle` vermelho, botão destrutivo `bg-red-600`, loading state, aria-modal + aria-labelledby + aria-describedby, backdrop não clicável durante loading, mensagem de erro inline
- **`MemberRow`**: botão `Trash2` com `hover:bg-red-500/10` + `focus-visible:ring-2` (a11y), oculto na linha do próprio usuário
- Mutations com `useMutation` + `invalidateQueries` + toast de feedback

### E2E (`apps/api/test/saas.e2e-spec.ts`)

4 casos adicionados no describe `AC-7`:
- 7.1 — Remoção bem-sucedida por admin
- 7.2 — Último admin não pode ser removido (400)
- 7.3 — Tenant isolation: 403 ao tentar remover membro de outra org
- 7.4 — Sem token retorna 401
