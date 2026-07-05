---
title: Publicar página /privacy com Privacy Policy LGPD/GDPR
type: feature
priority: CRITICAL
impact: 9
confidence: 9
effort: 3
tags:
  - legal
  - frontend
  - compliance
acceptanceCriteria:
  - 'Página /privacy cobre coleta, cookies, retenção e direitos'
  - Conformidade com LGPD e GDPR revisada
  - Links acessíveis em todas as páginas
  - Data de última atualização exibida
status: IN_REVIEW
body: |
  ## Objetivo

  Publicar página /privacy com Privacy Policy LGPD/GDPR

  ## Critérios de Aceite

  - [ ] Página /privacy cobre coleta, cookies, retenção e direitos
  - [ ] Conformidade com LGPD e GDPR revisada
  - [ ] Links acessíveis em todas as páginas
  - [ ] Data de última atualização exibida
id: TASK-022
score: 27
createdAt: '2026-04-17T16:16:26.622Z'
updatedAt: '2026-07-05T02:31:02.000Z'
filePath: /projects/nexvideo/.pm/tasks/TASK-022.md
---
## Objetivo

Publicar página /privacy com Privacy Policy LGPD/GDPR

## Critérios de Aceite

- [x] Página /privacy cobre coleta, cookies, retenção e direitos
- [ ] Conformidade com LGPD e GDPR revisada ← pendência manual (revisar com advogado antes do launch, ver "Pendência jurídica" abaixo)
- [x] Links acessíveis em todas as páginas
- [x] Data de última atualização exibida

---

## Resumo Técnico

### Página criada: `app/privacy/page.tsx`

Página SSR estática (sem `"use client"`) em `apps/web/app/privacy/page.tsx`, acessível em `/privacy`.

**Design System:** dark (#0E0E0E), Electric Purple (#7C3AED), fonte headline Syne, body Space Grotesk/DM Sans — consistente com a landing page e páginas de auth.

**Estrutura da página (12 seções):**

| # | Seção | Cobertura |
|---|---|---|
| 1 | Controlador dos Dados | Responsável pelo tratamento |
| 2 | Dados que Coletamos | Tabela: categoria, exemplos, base legal |
| 3 | Como Usamos seus Dados | 7 finalidades explícitas |
| 4 | Cookies e Tecnologias | Essenciais, funcionais, analytics |
| 5 | Compartilhamento com Terceiros | Stripe, OpenAI, Render, Resend, Sentry, Google |
| 6 | Retenção de Dados | Tabela com prazos por categoria (incl. obrigação fiscal 7 anos) |
| 7 | Seus Direitos (LGPD + GDPR) | 8 direitos com badges LGPD/GDPR por direito |
| 8 | Transferências Internacionais | SCCs, art. 33 LGPD |
| 9 | Segurança | 7 medidas técnicas listadas |
| 10 | Crianças e Adolescentes | Proibição para menores de 18 anos |
| 11 | Alterações | Aviso 15 dias antes de mudanças materiais |
| 12 | Contato | E-mail DPO, ANPD link, prazo 15 dias úteis |

**Componentes internos:**
- `SectionHeading` — heading numerado com badge roxo acessível
- `DataTable` — tabela responsiva com colunas ocultas no mobile (`hidden sm:table-cell`)
- Sumário navegável (âncoras `#id` para cada seção)

**Acessibilidade:**
- `<main id="main-content">`, `<header>`, `<nav aria-label="Sumário">`, `<section id="...">`
- `<time dateTime="2026-04-19">` para data de última atualização
- `aria-hidden="true"` em ícones decorativos
- `role="table"` nas tabelas de dados
- Contraste: texto cinza sobre fundo dark ≥ 4.5:1

### Links de acesso atualizados

| Página | Local do link | Status |
|---|---|---|
| Landing page (`/`) | Footer coluna "Legal" | ✅ Atualizado de `href="#"` para `href="/privacy"` |
| Login (`/(auth)/login`) | Footer pequeno no rodapé do form | ✅ Já existia |
| Register (`/(auth)/register`) | Footer pequeno no rodapé do form | ✅ Já existia |

### Pendência jurídica

O conteúdo da política foi redigido com base nas melhores práticas LGPD/GDPR e nas integrações conhecidas da plataforma. **Recomenda-se revisão por advogado especializado em proteção de dados** antes do launch em produção, especialmente para validar a base legal de cada tratamento e adequar os prazos de retenção à realidade operacional.
