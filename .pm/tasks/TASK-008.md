---
title: Validar fluxo Stripe test mode end-to-end em staging
type: chore
priority: CRITICAL
impact: 10
confidence: 8
effort: 5
tags:
  - stripe
  - billing
  - qa
acceptanceCriteria:
  - Fluxo cadastro → plano → checkout → webhook executado com cartões de teste
  - 'Portal do Stripe valida upgrade, downgrade e cancelamento'
  - Resultados documentados em playbook com screenshots
  - Zero erros em logs durante o fluxo
status: IN_REVIEW
body: |
  ## Objetivo

  Validar fluxo Stripe test mode end-to-end em staging

  ## Critérios de Aceite

  - [ ] Fluxo cadastro → plano → checkout → webhook executado com cartões de teste (requer execução manual em staging)
  - [ ] Portal do Stripe valida upgrade, downgrade e cancelamento (requer execução manual em staging)
  - [ ] Resultados documentados em playbook com screenshots (playbook criado; screenshots requerem execução manual)
  - [ ] Zero erros em logs durante o fluxo (verificação manual)

  ## Implementação

  ### O que foi feito

  Esta task é de validação manual em ambiente de staging — não há código a implementar.

  **`docs/stripe-e2e-test-playbook.md`** — playbook completo criado com:

  - **Pré-requisitos**: checklist de ambiente (Render deploy, env vars, webhook registrado no Stripe Dashboard)
  - **Tabela de cartões de teste Stripe**: aprovado, recusado por fundos, expirado, 3DS, falha pós-trial
  - **7 Test Cases estruturados** com passos detalhados, esperados e verificações de banco/log:
    - TC-001: Cadastro → checkout → webhook → plano ativo
    - TC-002: Idempotência de webhook (reenvio do mesmo evento)
    - TC-003: Portal — downgrade de plano
    - TC-004: Portal — cancelamento de assinatura
    - TC-005: Pagamento recusado — sem efeito colateral
    - TC-006: E-mail de falha de pagamento com idempotência
    - TC-007: E-mail de aviso de cancelamento com idempotência
  - **Tabela de registro de resultados** para preenchimento após execução
  - Referências cruzadas com `stripe-webhook-rotation.md` e `stripe-webhook-idempotency.md`

  ### Passo manual restante

  Executar os 7 TCs em staging com o ambiente configurado, capturar screenshots e preencher a tabela de resultados em `docs/stripe-e2e-test-playbook.md`.
id: TASK-008
score: 16
createdAt: '2026-04-17T16:16:26.570Z'
updatedAt: '2026-04-18T20:09:06.532Z'
filePath: /projects/nexvideo/.pm/tasks/TASK-008.md
---
## Objetivo

Validar fluxo Stripe test mode end-to-end em staging

## Critérios de Aceite

- [ ] Fluxo cadastro → plano → checkout → webhook executado com cartões de teste (execução manual)
- [ ] Portal do Stripe valida upgrade, downgrade e cancelamento (execução manual)
- [ ] Resultados documentados em playbook com screenshots (playbook criado; screenshots pós-execução)
- [ ] Zero erros em logs durante o fluxo (verificação manual)

## Implementação

### O que foi feito

Esta task é de validação manual em ambiente de staging — não há código a implementar.

**`docs/stripe-e2e-test-playbook.md`** criado com:
- Pré-requisitos de ambiente (deploy, env vars, webhook no Stripe Dashboard)
- Tabela de cartões de teste Stripe (aprovado, recusado, 3DS, falha pós-trial)
- 7 Test Cases com passos, resultados esperados e verificações de banco/log:
  - TC-001: Cadastro → checkout → webhook → plano ativo
  - TC-002: Idempotência de webhook (reenvio)
  - TC-003: Portal — downgrade de plano
  - TC-004: Portal — cancelamento
  - TC-005: Pagamento recusado — sem efeito colateral
  - TC-006: E-mail de falha com idempotência
  - TC-007: E-mail de aviso de cancelamento com idempotência
- Tabela de registro de resultados para preenchimento pós-execução

### Passo manual restante

Executar os 7 TCs em staging, capturar screenshots e preencher a tabela em `docs/stripe-e2e-test-playbook.md`.
