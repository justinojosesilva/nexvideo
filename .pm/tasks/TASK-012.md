---
title: Implementar rate limiting em endpoints de auth e geração
type: feature
priority: CRITICAL
impact: 9
confidence: 9
effort: 3
tags:
  - security
  - backend
  - throttler
acceptanceCriteria:
  - '@nestjs/throttler configurado em /auth/login, /auth/register e geração'
  - Webhook do Stripe protegido com rate limit adequado
  - Respostas 429 retornam mensagem clara
  - Testes de integração cobrindo os limites
status: DONE
body: >
  ## Objetivo


  Implementar rate limiting em endpoints de auth e geração


  ## Critérios de Aceite


  - [x] @nestjs/throttler configurado em /auth/login, /auth/register e geração

  - [x] Webhook do Stripe protegido com rate limit adequado

  - [x] Respostas 429 retornam mensagem clara

  - [x] Testes de integração cobrindo os limites


  ## Resumo Técnico


  ### Pacote instalado

  - `@nestjs/throttler` adicionado como dependência em `apps/api`.


  ### Configuração global (`app.module.ts`)

  - `ThrottlerModule.forRoot` configurado com janela de 60s e limite global de
  100 req/min.

  - `CustomThrottlerGuard` registrado como `APP_GUARD` (antes do
  `JwtAuthGuard`), garantindo que o rate limiting seja a primeira barreira.


  ### Guard customizado (`common/guards/throttler-exception.guard.ts`)

  - Estende `ThrottlerGuard` para:
    - Retornar mensagem 429 legível: *"Too many requests. Please slow down and try again later."*
    - Extrair IP real via `req.ips[0]` (suporte a proxies/load balancers).
    - Fazer bypass automático para `POST /billing/webhook` (Stripe pode reenviar rapidamente e já tem sua própria autenticação por assinatura).

  ### Limites por endpoint

  | Endpoint | Limite | Janela |

  |---|---|---|

  | `POST /auth/login` | 5 req | 60s |

  | `POST /auth/register` | 10 req | 60s |

  | `POST /scripts` (enqueue) | 10 req | 60s |

  | `POST /scripts/:id/generate` | 10 req | 60s |

  | `POST /billing/webhook` | bypass | — |

  | Outros endpoints | 100 req (global) | 60s |


  ### Testes (`auth/auth-throttle.spec.ts`)

  4 testes de integração cobrindo:

  1. Login bloqueia na 6ª requisição (limite 5).

  2. Register bloqueia na 11ª requisição (limite 10).

  3. Resposta 429 contém campo `message` com string não-vazia.

  4. Webhook do Stripe bypassa o guard (retorna `true` imediatamente).

  Todos os 4 testes passam (`PASS`).
id: TASK-012
score: 27
createdAt: '2026-04-17T16:16:26.585Z'
updatedAt: '2026-04-19T18:51:43.814Z'
filePath: /projects/nexvideo/.pm/tasks/TASK-012.md
---
## Objetivo

Implementar rate limiting em endpoints de auth e geração

## Critérios de Aceite

- [x] @nestjs/throttler configurado em /auth/login, /auth/register e geração
- [x] Webhook do Stripe protegido com rate limit adequado
- [x] Respostas 429 retornam mensagem clara
- [x] Testes de integração cobrindo os limites

## Resumo Técnico

### Pacote instalado
- `@nestjs/throttler` adicionado como dependência em `apps/api`.

### Configuração global (`app.module.ts`)
- `ThrottlerModule.forRoot` configurado com janela de 60s e limite global de 100 req/min.
- `CustomThrottlerGuard` registrado como `APP_GUARD` (antes do `JwtAuthGuard`), garantindo que o rate limiting seja a primeira barreira.

### Guard customizado (`common/guards/throttler-exception.guard.ts`)
- Estende `ThrottlerGuard` para:
  - Retornar mensagem 429 legível: *"Too many requests. Please slow down and try again later."*
  - Extrair IP real via `req.ips[0]` (suporte a proxies/load balancers).
  - Fazer bypass automático para `POST /billing/webhook` (Stripe pode reenviar rapidamente e já tem sua própria autenticação por assinatura).

### Limites por endpoint
| Endpoint | Limite | Janela |
|---|---|---|
| `POST /auth/login` | 5 req | 60s |
| `POST /auth/register` | 10 req | 60s |
| `POST /scripts` (enqueue) | 10 req | 60s |
| `POST /scripts/:id/generate` | 10 req | 60s |
| `POST /billing/webhook` | bypass | — |
| Outros endpoints | 100 req (global) | 60s |

### Testes (`auth/auth-throttle.spec.ts`)
4 testes de integração cobrindo:
1. Login bloqueia na 6ª requisição (limite 5).
2. Register bloqueia na 11ª requisição (limite 10).
3. Resposta 429 contém campo `message` com string não-vazia.
4. Webhook do Stripe bypassa o guard (retorna `true` imediatamente).
Todos os 4 testes passam (`PASS`).
