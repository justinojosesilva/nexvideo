---
title: Ativar Helmet e configurar CSRF em rotas de formulário
type: feature
priority: HIGH
impact: 7
confidence: 8
effort: 3
tags:
  - security
  - backend
acceptanceCriteria:
  - Helmet habilitado com CSP configurado
  - CSRF ativo em rotas de formulário relevantes
  - Testes validam headers de segurança
  - Docs de exceções de CSP publicadas
status: IN_REVIEW
body: |
  ## Objetivo

  Ativar Helmet e configurar CSRF em rotas de formulário

  ## Critérios de Aceite

  - [x] Helmet habilitado com CSP configurado
  - [x] CSRF ativo em rotas de formulário relevantes
  - [x] Testes validam headers de segurança
  - [x] Docs de exceções de CSP publicadas
id: TASK-014
score: 19
createdAt: '2026-04-17T16:16:26.590Z'
updatedAt: '2026-04-19T00:00:00.000Z'
filePath: /projects/nexvideo/.pm/tasks/TASK-014.md
---
## Objetivo

Ativar Helmet e configurar CSRF em rotas de formulário

## Critérios de Aceite

- [x] Helmet habilitado com CSP configurado
- [x] CSRF ativo em rotas de formulário relevantes
- [x] Testes validam headers de segurança
- [x] Docs de exceções de CSP publicadas

## Resumo Técnico

### Pacote instalado
- `helmet` adicionado como dependência em `apps/api`.

### Helmet + CSP (`apps/api/src/main.ts`)
- `helmet()` aplicado como middleware global **antes** do CORS.
- CSP configurada com diretivas restritivas (`default-src 'self'`, `object-src 'none'`, `frame-src 'none'`).
- Exceções documentadas:
  - `style-src 'unsafe-inline'` — Swagger UI injeta estilos inline
  - `crossOriginEmbedderPolicy: false` — Swagger UI carrega assets cross-origin
  - `img-src data: https:` — thumbnails externos
- HSTS configurado: `max-age=31536000; includeSubDomains; preload`.

### CSRF Protection (`common/middleware/content-type-csrf.middleware.ts`)
- Esta API usa **JWT Bearer tokens em headers** — não cookies de sessão — portanto `csurf` (cookie-based) não se aplica e seria ineficaz.
- Proteção implementada: `ContentTypeCsrfMiddleware` rejeita com `400 Bad Request` qualquer requisição de mutação (`POST/PUT/PATCH/DELETE`) cujo `Content-Type` não seja `application/json`.
  - Formulários HTML enviados via CSRF usam `application/x-www-form-urlencoded` ou `multipart/form-data` → bloqueados.
- Middleware registrado globalmente em `AppModule.configure()`.
- Exceção: `POST /billing/webhook` (Stripe — verificação via assinatura `stripe-signature`).

### Testes
- `common/middleware/content-type-csrf.middleware.spec.ts` — 8 testes (GET bypass, JSON pass, form block, webhook exempt, etc.)
- `common/middleware/helmet-headers.spec.ts` — 7 testes (x-content-type-options, x-frame-options, HSTS, CSP default-src, CSP object-src, dns-prefetch, x-powered-by removido)
- Total: **15 testes passando**.

### Documentação
- `docs/helmet-csp.md` — tabela completa de diretivas, justificativas de exceções, HSTS, e guia para adição futura de csurf se a API migrar para session cookies.
