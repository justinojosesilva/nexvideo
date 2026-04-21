# Stripe Test Mode — E2E Validation Playbook

**Ambiente:** Staging (`https://nexvideo-web.onrender.com`)  
**API:** `https://nexvideo-api.onrender.com`  
**Stripe Dashboard:** `https://dashboard.stripe.com/test` (modo teste)

---

## Pré-requisitos

- [ ] Staging deployado e acessível (`GET /health` retorna `{ status: "ok" }`)
- [ ] Variáveis de ambiente configuradas no Render: `STRIPE_SECRET_KEY=sk_test_...`, `STRIPE_WEBHOOK_SECRET=whsec_...`
- [ ] Webhook de staging registrado no Stripe Dashboard → Developers → Webhooks → endpoint apontando para `https://nexvideo-api.onrender.com/billing/webhook`
- [ ] Planos criados no banco de staging (`free`, `starter`, `pro` ou equivalentes)
- [ ] Stripe CLI instalada localmente (opcional, para inspecionar eventos)

## Cartões de Teste Stripe

| Cenário | Número | Validade | CVV |
|---|---|---|---|
| Pagamento aprovado | `4242 4242 4242 4242` | Qualquer data futura | Qualquer |
| Recusado (fundos insuficientes) | `4000 0000 0000 9995` | Qualquer data futura | Qualquer |
| Recusado (cartão expirado) | `4000 0000 0000 0069` | Qualquer data futura | Qualquer |
| Autenticação 3D Secure necessária | `4000 0025 0000 3155` | Qualquer data futura | Qualquer |
| Pagamento falha após trial | `4000 0000 0000 0341` | Qualquer data futura | Qualquer |

---

## TC-001: Cadastro + Seleção de Plano + Checkout

**Prioridade:** P0 (crítico)  
**Tempo estimado:** 5 min  
**Pré-condição:** Usuário não existe no sistema

### Passos

1. Acessar `https://nexvideo-web.onrender.com`  
   **Esperado:** Landing page carrega sem erros de console

2. Clicar em "Criar conta" / "Começar grátis"  
   **Esperado:** Formulário de cadastro exibe campos: nome, email, senha

3. Preencher dados válidos e submeter  
   **Esperado:** Usuário autenticado e redirecionado para o dashboard (plano `free` ativo)

4. Navegar para Configurações → Planos / Billing  
   **Esperado:** Plano atual ("Free") exibido; botões de upgrade para planos pagos visíveis

5. Clicar em "Fazer upgrade" no plano **Starter**  
   **Esperado:** Requisição `POST /billing/checkout` retorna `{ checkoutUrl: "https://checkout.stripe.com/pay/cs_test_..." }` e o navegador redireciona

6. Na página de checkout do Stripe, preencher com o cartão `4242 4242 4242 4242`  
   **Esperado:** Formulário de checkout aceita o cartão

7. Clicar em "Assinar" / "Pagar"  
   **Esperado:** Redirecionamento para `STRIPE_SUCCESS_URL` (ex: `/billing/success`) com mensagem de confirmação

8. Verificar no dashboard que o plano foi atualizado para **Starter**  
   **Esperado:** Badge / label exibe "Starter"; limites de uso refletem o novo plano

### Verificações adicionais

- [ ] No Stripe Dashboard → Customers: cliente criado com email correto
- [ ] No Stripe Dashboard → Subscriptions: assinatura `active` para o cliente
- [ ] Nos logs da API (Render → Logs): nenhum erro 5xx; evento `checkout.session.completed` processado
- [ ] Banco de dados: registro em `subscriptions` com `status = 'active'`; `organizations` com `plan = 'starter'`

---

## TC-002: Webhook — checkout.session.completed (idempotência)

**Prioridade:** P0 (crítico)  
**Tempo estimado:** 3 min  
**Pré-condição:** TC-001 concluído com sucesso

### Passos

1. No Stripe Dashboard → Developers → Webhooks → selecionar o endpoint de staging  
   **Esperado:** Lista de eventos recentes exibida

2. Localizar o evento `checkout.session.completed` do TC-001 e clicar em "Reenviar"  
   **Esperado:** Resposta do endpoint: `200 OK`

3. Verificar nos logs da API que o evento foi recebido com "Skipping duplicate Stripe event"  
   **Esperado:** Log de skip; **nenhum** novo registro criado em `subscriptions`

4. Verificar no banco que ainda há apenas 1 `Subscription` para a organização  
   **Esperado:** Idempotência confirmada — sem duplicação

---

## TC-003: Portal do Stripe — Downgrade de Plano

**Prioridade:** P1 (alto)  
**Tempo estimado:** 5 min  
**Pré-condição:** Usuário com assinatura `Starter` ativa (TC-001)

### Passos

1. No dashboard da aplicação, clicar em "Gerenciar assinatura" / "Portal de faturamento"  
   **Esperado:** Requisição `POST /billing/portal` retorna URL do Stripe Customer Portal; navegador redireciona

2. No Customer Portal, localizar a opção de alterar plano e selecionar um plano de valor menor (downgrade)  
   **Esperado:** Stripe confirma a mudança para o próximo ciclo de faturamento

3. Retornar ao dashboard da aplicação  
   **Esperado:** Badge do plano atualizado (ou agendado para atualizar no próximo ciclo conforme configuração do Stripe)

4. Verificar nos logs da API: evento `customer.subscription.updated` processado  
   **Esperado:** Sem erros; `subscriptions.status` atualizado conforme necessário

---

## TC-004: Portal do Stripe — Cancelamento de Assinatura

**Prioridade:** P0 (crítico)  
**Tempo estimado:** 5 min  
**Pré-condição:** Usuário com assinatura ativa

### Passos

1. Acessar o Customer Portal via dashboard → "Gerenciar assinatura"  
   **Esperado:** Portal do Stripe abre corretamente

2. Selecionar "Cancelar assinatura" e confirmar  
   **Esperado:** Stripe agenda o cancelamento para o fim do período (ou cancela imediatamente, conforme configuração)

3. Retornar ao dashboard  
   **Esperado:** Status da assinatura indica cancelamento agendado ou plano `free` restaurado

4. Verificar nos logs da API: evento `customer.subscription.updated` ou `customer.subscription.deleted` processado  
   **Esperado:** Sem erros; organização rebaixada para `free` se deleção imediata

5. Verificar no banco: `organizations.plan = 'free'` e `subscriptionId = null` (se cancelamento imediato)  
   **Esperado:** Dados consistentes com o estado do Stripe

---

## TC-005: Pagamento Recusado

**Prioridade:** P1 (alto)  
**Tempo estimado:** 5 min  
**Pré-condição:** Nenhuma (novo usuário ou usuário free)

### Passos

1. Repetir TC-001 passos 1–5 (até o checkout do Stripe)

2. Na página de checkout do Stripe, usar o cartão `4000 0000 0000 9995` (fundos insuficientes)  
   **Esperado:** Stripe exibe mensagem de erro no checkout; usuário não é redirecionado para success URL

3. Verificar que o usuário permanece no plano `free`  
   **Esperado:** Dashboard mostra "Free"; banco não tem subscription `active` para este email

4. Verificar que nenhum evento de cobrança bem-sucedida foi registrado  
   **Esperado:** Stripe Dashboard → Events: apenas `payment_intent.payment_failed`, sem `checkout.session.completed`

---

## TC-006: E-mail de Falha de Pagamento (invoice.payment_failed)

**Prioridade:** P1 (alto)  
**Tempo estimado:** 10 min  
**Pré-condição:** Usuário com assinatura ativa; Resend configurado

### Passos

1. No Stripe Dashboard → Developers → Webhooks → "Send test webhook"  
   Selecionar evento: `invoice.payment_failed` e enviar para o endpoint de staging

2. Verificar nos logs da API: evento processado e email disparado  
   **Esperado:** Log indica `sendPaymentFailedEmail.execute` chamado; sem erros

3. Verificar inbox do email do admin da organização  
   **Esperado:** Email de falha de pagamento recebido com dados corretos (organização, valor, próxima tentativa)

4. Reenviar o mesmo evento (mesma `invoiceId`)  
   **Esperado:** Log indica "already notified"; **nenhum** segundo email enviado — idempotência confirmada

---

## TC-007: E-mail de Aviso de Cancelamento

**Prioridade:** P2 (médio)  
**Tempo estimado:** 5 min

### Passos

1. No Stripe Dashboard → Developers → Webhooks → "Send test webhook"  
   Selecionar evento: `customer.subscription.updated`, incluindo payload com `cancel_at_period_end: true` e `cancel_at` = timestamp nas próximas 48h

2. Verificar inbox do admin  
   **Esperado:** Email de aviso de cancelamento recebido

3. Reenviar o mesmo evento  
   **Esperado:** Segundo email **não** enviado — idempotência confirmada

---

## Checklist de Encerramento

Após execução de todos os TCs:

- [ ] TC-001: Checkout com cartão aprovado ✅
- [ ] TC-002: Idempotência de webhook ✅
- [ ] TC-003: Downgrade via Portal ✅
- [ ] TC-004: Cancelamento via Portal ✅
- [ ] TC-005: Pagamento recusado — sem efeito colateral ✅
- [ ] TC-006: E-mail de falha com idempotência ✅
- [ ] TC-007: E-mail de aviso de cancelamento com idempotência ✅
- [ ] Zero erros 5xx nos logs do Render durante toda a execução ✅
- [ ] Screenshots capturados para cada TC (arquivar em pasta `/docs/qa-screenshots/TASK-008/`)

## Registro de Resultados

| TC | Status | Bugs encontrados | Observações |
|---|---|---|---|
| TC-001 | ⬜ Não executado | - | |
| TC-002 | ⬜ Não executado | - | |
| TC-003 | ⬜ Não executado | - | |
| TC-004 | ⬜ Não executado | - | |
| TC-005 | ⬜ Não executado | - | |
| TC-006 | ⬜ Não executado | - | |
| TC-007 | ⬜ Não executado | - | |

> Preencher com ✅ Passou / ❌ Falhou / ⚠️ Parcial após execução manual em staging.

## Referências

- [Stripe Test Cards](https://stripe.com/docs/testing#cards)
- [Stripe Webhook Test Events](https://stripe.com/docs/cli/trigger)
- [Rotação de Webhook Secret](./stripe-webhook-rotation.md)
- [Mecanismo de Idempotência](./stripe-webhook-idempotency.md)
