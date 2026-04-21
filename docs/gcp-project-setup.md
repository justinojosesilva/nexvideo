# GCP Project Setup — NexVideo

> **Scope:** Criação do projeto Google Cloud Platform, habilitação das APIs YouTube e configuração de billing para os ambientes staging e produção do NexVideo.

---

## Pré-requisitos

- Conta Google com permissão de criação de projetos GCP
- Cartão de crédito/débito para ativar o billing (Google oferece crédito gratuito de $300 para novos projetos)
- Acesso de `Owner` ou `Editor` na organização GCP (se existir)

---

## 1. Criar o projeto GCP

1. Acesse [console.cloud.google.com](https://console.cloud.google.com).
2. No menu superior, clique em **Select a project → New Project**.
3. Preencha:
   - **Project name:** `nexvideo-prod` (produção) / `nexvideo-staging` (staging)
   - **Organization:** selecione a organização, se houver
   - **Location:** selecione a pasta adequada
4. Clique em **Create** e aguarde.
5. Anote o **Project ID** gerado (ex: `nexvideo-prod-123456`) — será necessário nas próximas etapas.

> Recomendação: use projetos separados para staging e produção. Isso garante isolamento de quotas, billing e credenciais.

---

## 2. Configurar billing

> Sem billing ativado, as APIs YouTube não funcionam além da quota gratuita muito limitada.

1. No menu lateral, vá em **Billing**.
2. Clique em **Link a billing account** (ou crie uma nova conta de faturamento).
3. Selecione ou cadastre um método de pagamento.
4. Confirme a vinculação ao projeto.

---

## 3. Habilitar YouTube Data API v3

1. Acesse **APIs & Services → Library**.
2. Pesquise por `YouTube Data API v3`.
3. Clique no resultado e depois em **Enable**.
4. Aguarde a ativação (geralmente < 1 minuto).

Esta API é usada pelo `YouTubeDataAdapter` (`apps/api/src/adapters/implementations/youtube-data.adapter.ts`) para buscar vídeos e estatísticas via `YOUTUBE_API_KEY`.

---

## 4. Habilitar YouTube Analytics API

1. Ainda em **APIs & Services → Library**.
2. Pesquise por `YouTube Analytics API`.
3. Clique no resultado e depois em **Enable**.

Esta API será usada para consultar métricas de canais conectados via OAuth (fluxo implementado em `apps/api/src/auth/services/youtube-oauth.service.ts`).

---

## 5. Criar API Key para YouTube Data API v3

1. Vá em **APIs & Services → Credentials → Create Credentials → API Key**.
2. Copie a chave gerada.
3. Clique em **Restrict Key**:
   - **Application restrictions:** HTTP referrers (or IP addresses for server-side)
   - **API restrictions:** Selecione `YouTube Data API v3`
4. Salve a chave no secret manager do ambiente correspondente como `YOUTUBE_API_KEY`.

> Para criar credenciais OAuth (Client ID + Secret) necessárias para o fluxo de upload, siga o runbook em `docs/youtube-oauth-rotation.md`.

---

## 6. Configurar quotas (opcional, mas recomendado)

O YouTube Data API v3 tem quota padrão de **10.000 unidades/dia**. Para produção, é comum solicitar aumento:

1. Acesse **APIs & Services → YouTube Data API v3 → Quotas**.
2. Clique em **Edit Quotas** ou **Request additional quota**.
3. Preencha o formulário de uso justificando o caso de uso do NexVideo.

> Referência de custo de unidades: search.list = 100 unidades; videos.list = 1 unidade.

---

## 7. Verificação final

Após concluir todos os passos, confirme o checklist:

| Item | Como verificar |
|---|---|
| Projeto criado e nomeado | Console → lista de projetos mostra `nexvideo-prod` / `nexvideo-staging` |
| YouTube Data API v3 habilitada | APIs & Services → Enabled APIs mostra `YouTube Data API v3` |
| YouTube Analytics API habilitada | APIs & Services → Enabled APIs mostra `YouTube Analytics API` |
| Billing configurado | Billing → projeto vinculado a uma conta de faturamento ativa |
| API Key criada e restrita | Credentials → lista mostra a API key com restrições |

---

## 8. Popule as variáveis de ambiente

Após criar as credenciais, preencha os valores nos ambientes:

```bash
# .env (local) ou secret manager (staging/prod)
YOUTUBE_API_KEY="AIza..."
GOOGLE_CLIENT_ID="....apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="GOCSPX-..."
GOOGLE_REDIRECT_URI="https://nexvideo.com/auth/youtube/callback"
```

Consulte `apps/api/.env.example` para a lista completa de variáveis esperadas.
