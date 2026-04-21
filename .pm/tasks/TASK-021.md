---
title: Publicar página /terms com Terms of Service versionados
type: feature
priority: CRITICAL
impact: 8
confidence: 9
effort: 3
tags:
  - legal
  - frontend
  - compliance
acceptanceCriteria:
  - Página /terms renderiza documento com versão e data
  - Texto revisado juridicamente (template ajustado)
  - Links no rodapé e no onboarding
  - Histórico de versões armazenado
status: IN_REVIEW
body: |
  ## Objetivo

  Publicar página /terms com Terms of Service versionados

  ## Critérios de Aceite

  - [ ] Página /terms renderiza documento com versão e data
  - [ ] Texto revisado juridicamente (template ajustado)
  - [ ] Links no rodapé e no onboarding
  - [ ] Histórico de versões armazenado
id: TASK-021
score: 24
createdAt: '2026-04-17T16:16:26.619Z'
updatedAt: '2026-04-20T02:41:15.349Z'
filePath: /projects/nexvideo/.pm/tasks/TASK-021.md
---
## Objetivo

Publicar página /terms com Terms of Service versionados

## Critérios de Aceite

- [x] Página /terms renderiza documento com versão e data
- [ ] Texto revisado juridicamente (template ajustado) ← pendência manual (revisar com advogado antes do launch)
- [x] Links no rodapé e no onboarding
- [x] Histórico de versões armazenado

---

## Resumo Técnico

### Página criada: `apps/web/app/terms/page.tsx`

SSR estática (sem `"use client"`) em `apps/web/app/terms/page.tsx`, acessível em `/terms`.

**Design System:** 100% consistente com `/privacy` — dark (#0E0E0E), Electric Purple (#7C3AED), fontes Syne (headline) + Space Grotesk/DM Sans (body), sticky nav com ArrowLeft, `<main id="main-content">`, seções com âncoras navegáveis.

**Versão e data:** constantes `CURRENT_VERSION = "1.0"` e `LAST_UPDATED_ISO = "2026-04-19"` no topo do arquivo para atualização simples. `<time dateTime="...">` semântico.

**Estrutura da página (13 seções):**

| # | Seção | Cobertura |
|---|---|---|
| 1 | Aceitação dos Termos | Vínculo contratual, incorporação da Privacy Policy |
| 2 | Descrição do Serviço | 5 funcionalidades listadas; direito de modificar/descontinuar |
| 3 | Elegibilidade e Conta | Requisitos de idade (18+), responsabilidade de credenciais |
| 4 | Assinatura e Faturamento | Planos, plano free, cancelamento, carência de 7 dias por falha de pagamento |
| 5 | Uso Aceitável | 8 proibições em grid, penalidade de encerramento imediato |
| 6 | Conteúdo do Usuário | Propriedade retida pelo usuário; licença de processamento limitada; responsabilidade sobre IA |
| 7 | Propriedade Intelectual | Código, design e marcas da nexvideo |
| 8 | Integrações de Terceiros | Termos de terceiros; autorização YouTube OAuth; link para revogar em myaccount.google.com |
| 9 | Limitação de Responsabilidade | Cap = 12 meses de pagamento ou R$100; serviço "como está" |
| 10 | Rescisão | Encerramento por usuário ou plataforma; retenção 90 dias pós-encerramento |
| 11 | Alterações | Aviso 15 dias para mudanças materiais; link para Histórico de Versões |
| 12 | Histórico de Versões | Tabela versionada (versão, data ISO, descrição) — v1.0 inicial |
| 13 | Contato e Foro | legal@nexvideo.com, foro São Paulo/SP, nota de recomendação jurídica |

**Acessibilidade:**
- `<main id="main-content">`, `<nav aria-label="Sumário">`, `<section id="...">` em todas as seções
- `<time dateTime="2026-04-19">` em dois locais (header e histórico)
- `aria-hidden="true"` em ícones decorativos
- `role="table"` na tabela de histórico

**Links verificados:**
- Footer da landing page (`/`) já linkava `/terms` desde TASK-022
- Página de registro (`/register`) já tinha `href="/terms"` — confirmado
- Página `/privacy` footer já linkava `/terms` — confirmado

### Pendência manual

**Revisão jurídica:** o conteúdo cobre as cláusulas padrão para SaaS brasileiro, mas **deve ser revisado por advogado especializado** antes do launch em produção — especialmente as cláusulas de limitação de responsabilidade e foro.
