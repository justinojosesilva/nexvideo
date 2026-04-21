---
title: Auditoria de secrets no repositório
type: chore
priority: CRITICAL
impact: 9
confidence: 9
effort: 2
tags:
  - security
  - devops
acceptanceCriteria:
  - Ferramenta de scan (gitleaks/trufflehog) executada no histórico
  - Nenhum token ou chave real em .env.example
  - Secrets expostos rotacionados se encontrados
  - Pre-commit hook de secret scan configurado
status: DONE
body: >
  ## Objetivo


  Auditoria de secrets no repositório


  ## Critérios de Aceite


  - [x] Ferramenta de scan (gitleaks/trufflehog) executada no histórico

  - [x] Nenhum token ou chave real em .env.example

  - [x] Secrets expostos rotacionados se encontrados (nenhum real encontrado)

  - [x] Pre-commit hook de secret scan configurado


  ## Implementação


  ### Scan do histórico


  gitleaks v8.30.1 escaneou 36 commits. Resultado bruto: 12 findings. Após
  análise, todos são **falsos positivos**:


  | Finding | Arquivo | Veredicto |

  |---|---|---|

  | `sk_live_1234567890abcdefghij` | `structured-logger.service.spec.ts` | Fake
  — teste de redação de log |

  | JWT `eyJhbGci...` | `auth/dto/*.ts` | Exemplo jwt.io em decorator Swagger |

  | `abc123def456` | `README.md` | Placeholder óbvio |


  Nenhum secret real foi encontrado. Rotação de chaves não necessária.


  ### `.env.example` validados


  - `apps/api/.env.example` — placeholders `your-xxx-here` em todas as chaves ✅

  - `apps/web/.env.example` — valores em branco ou placeholder ✅

  - `apps/worker/.env.example` — localhost defaults apenas ✅


  ### Arquivos criados/modificados


  **`.gitleaks.toml`** — config v8 com allowlists para os 3 tipos de falsos
  positivos. Re-scan: 0 leaks ✅


  **`.githooks/pre-commit`** — hook que executa `gitleaks git --staged --redact`
  em cada commit. Soft fail se gitleaks não instalado.


  **`package.json`** — `"prepare": "git config core.hooksPath .githooks"` ativa
  o hook após `pnpm install`.
id: TASK-015
score: 41
createdAt: '2026-04-17T16:16:26.593Z'
updatedAt: '2026-04-19T18:50:46.888Z'
filePath: /projects/nexvideo/.pm/tasks/TASK-015.md
---
## Objetivo

Auditoria de secrets no repositório

## Critérios de Aceite

- [x] Ferramenta de scan (gitleaks/trufflehog) executada no histórico
- [x] Nenhum token ou chave real em .env.example
- [x] Secrets expostos rotacionados se encontrados (nenhum real encontrado)
- [x] Pre-commit hook de secret scan configurado

## Implementação

### Scan do histórico

gitleaks v8.30.1 escaneou 36 commits. Resultado bruto: 12 findings. Após análise, todos são **falsos positivos**:

| Finding | Arquivo | Veredicto |
|---|---|---|
| `sk_live_1234567890abcdefghij` | `structured-logger.service.spec.ts` | Fake — teste de redação de log |
| JWT `eyJhbGci...` | `auth/dto/*.ts` | Exemplo jwt.io em decorator Swagger |
| `abc123def456` | `README.md` | Placeholder óbvio |

Nenhum secret real foi encontrado. Rotação de chaves não necessária.

### `.env.example` validados

- `apps/api/.env.example` — placeholders `your-xxx-here` em todas as chaves ✅
- `apps/web/.env.example` — valores em branco ou placeholder ✅
- `apps/worker/.env.example` — localhost defaults apenas ✅

### Arquivos criados/modificados

**`.gitleaks.toml`** — config v8 com allowlists para os 3 tipos de falsos positivos. Re-scan: 0 leaks ✅

**`.githooks/pre-commit`** — hook que executa `gitleaks git --staged --redact` em cada commit. Soft fail se gitleaks não instalado.

**`package.json`** — `"prepare": "git config core.hooksPath .githooks"` ativa o hook após `pnpm install`.
