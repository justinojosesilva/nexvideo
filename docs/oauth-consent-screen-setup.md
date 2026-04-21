# OAuth Consent Screen — Runbook de Configuração

> **Scope:** Configuração da tela de consentimento OAuth 2.0 no Google Cloud Console para os scopes de YouTube usados pelo NexVideo. Cobre o fluxo completo desde o modo Testing até a submissão para verificação pelo Google.

---

## Visão geral dos scopes solicitados

| Scope | URI | Classificação | Finalidade |
|---|---|---|---|
| YouTube Read-Only | `https://www.googleapis.com/auth/youtube.readonly` | Restricted | Leitura de dados do canal e vídeos do usuário |
| YouTube Upload | `https://www.googleapis.com/auth/youtube.upload` | Restricted | Upload de vídeos para o canal conectado |
| YouTube Analytics | `https://www.googleapis.com/auth/yt-analytics.readonly` | Restricted | Leitura de métricas (views, watch time, receita) |

> ⚠️ **Todos os três scopes são classificados como "Restricted"** pelo Google — exigem processo de verificação completo com Privacy Policy URL, demonstração em vídeo e análise manual. Ver §6.

---

## 1. Pré-requisitos

- Projeto GCP criado (`nexvideo-prod` / `nexvideo-staging`) — ver `docs/gcp-project-setup.md`
- YouTube Data API v3 e YouTube Analytics API habilitadas no projeto
- Domínio verificado (necessário para produção): `nexvideo.com`
- URL de Privacy Policy publicada: `https://nexvideo.com/privacy`
- URL de Terms of Service publicada: `https://nexvideo.com/terms`

---

## 2. Configurar a tela de consentimento

1. Acesse [console.cloud.google.com](https://console.cloud.google.com) → selecione o projeto.
2. Vá em **APIs & Services → OAuth Consent Screen**.
3. Escolha o tipo de usuário:
   - **External** — para usuários de qualquer conta Google (casos de uso SaaS)
4. Clique em **Create**.

### Preencha as informações do app

| Campo | Valor |
|---|---|
| **App name** | NexVideo |
| **User support email** | suporte@nexvideo.com (ou email do projeto) |
| **App logo** | Upload do logo NexVideo (120×120px, PNG) |
| **App home page** | `https://nexvideo.com` |
| **App privacy policy link** | `https://nexvideo.com/privacy` |
| **App terms of service link** | `https://nexvideo.com/terms` |
| **Authorized domains** | `nexvideo.com` |
| **Developer contact email** | email do responsável técnico |

Clique em **Save and Continue**.

---

## 3. Adicionar scopes

1. Na seção **Scopes**, clique em **Add or Remove Scopes**.
2. Pesquise e adicione cada scope:

| # | Scope URI |
|---|---|
| 1 | `https://www.googleapis.com/auth/youtube.readonly` |
| 2 | `https://www.googleapis.com/auth/youtube.upload` |
| 3 | `https://www.googleapis.com/auth/yt-analytics.readonly` |

> Esses scopes aparecerão como "Sensitive" ou "Restricted" — Google exibirá um aviso. Confirme a adição.

3. Clique em **Update** e depois em **Save and Continue**.

---

## 4. Modo Testing — adicionar usuários de teste

Enquanto o app está em modo **Testing**, apenas os e-mails listados podem concluir o fluxo OAuth.

1. Na seção **Test users**, clique em **+ Add Users**.
2. Adicione os e-mails da equipe que precisam testar o fluxo:
   - Desenvolvedor(es) do backend
   - QA
   - Usuário de staging para testes de integração

> **Limite:** até 100 usuários de teste no modo Testing.

3. Clique em **Save and Continue** → **Back to Dashboard**.

### Verificando o modo Testing

No dashboard do Consent Screen, o status deve mostrar **Testing**. O app ficará em Testing até que a verificação seja aprovada ou até 1 ano (após isso, os tokens expiram).

---

## 5. Testar o fluxo OAuth localmente

Com o Consent Screen em modo Testing e credenciais criadas (ver `docs/youtube-oauth-rotation.md`):

```bash
# 1. Configure as variáveis locais
export GOOGLE_CLIENT_ID="seu-client-id.apps.googleusercontent.com"
export GOOGLE_CLIENT_SECRET="seu-client-secret"
export GOOGLE_REDIRECT_URI="http://localhost:3002/auth/youtube/callback"

# 2. Inicie a API
pnpm --filter api dev

# 3. Acesse o endpoint de autorização (requer JWT do usuário logado)
# GET http://localhost:3002/auth/youtube
# → Redireciona para a tela de consentimento do Google

# 4. Após consentir, o callback é chamado:
# GET http://localhost:3002/auth/youtube/callback?code=...&state=<orgId>

# 5. Verifique o status
curl -H "Authorization: Bearer <jwt>" http://localhost:3002/auth/youtube/status
```

**Resposta esperada do consent screen em Testing:**
- Google exibe aviso "Google hasn't verified this app" — normal para apps em Testing
- Clique em **Advanced → Go to NexVideo (unsafe)** para prosseguir durante o desenvolvimento

---

## 6. Submeter para verificação (produção)

> **Quando submeter:** antes do launch em produção, quando o app tiver usuários reais fora da lista de teste.

### Requisitos para verificação de scopes Restricted

O Google exige, para cada scope Restricted:

1. **Demonstração em vídeo** (YouTube não-listado):
   - Mostre o fluxo OAuth completo da perspectiva do usuário
   - Mostre como o app usa os dados retornados (upload, leitura de analytics)
   - Duração: 2-5 minutos

2. **Privacy Policy atualizada** explicando explicitamente:
   - Quais dados do YouTube são coletados (`youtube.readonly`, `youtube.upload`, `yt-analytics.readonly`)
   - Como os dados são armazenados (tokens criptografados no banco)
   - Retenção e exclusão de dados

3. **Justificativa escrita** para cada scope (campo no formulário de verificação):

| Scope | Justificativa sugerida |
|---|---|
| `youtube.readonly` | "NexVideo lê os metadados dos vídeos publicados pelo usuário para exibir métricas de desempenho no dashboard e enriquecer análises de conteúdo." |
| `youtube.upload` | "NexVideo faz upload de vídeos gerados pela plataforma diretamente no canal YouTube do usuário, eliminando a necessidade de download e re-upload manual." |
| `yt-analytics.readonly` | "NexVideo lê métricas de analytics (views, watch time, CTR) para fornecer insights sobre o desempenho do conteúdo publicado." |

### Processo de submissão

1. No Consent Screen Dashboard, clique em **Publish App** → **Confirm**.
2. O status muda de **Testing** para **In Production** (mas scopes Restricted ficam pendentes de verificação).
3. Clique em **Prepare for Verification** (aparece para scopes Restricted).
4. Preencha o formulário:
   - Link do vídeo de demonstração
   - Justificativas por scope
   - Confirme a Privacy Policy
5. Submeta. O Google leva **4-6 semanas** para revisar scopes Restricted.

> Durante a revisão, o app continua funcionando em Testing para usuários da lista. Novos usuários recebem aviso "Google hasn't verified this app" mas podem prosseguir.

---

## 7. Checklist de verificação final

| Item | Status | Onde verificar |
|---|---|---|
| App name e logo configurados | ☐ | Consent Screen → App information |
| Privacy Policy e Terms URLs definidos | ☐ | Consent Screen → App information |
| Domínio `nexvideo.com` verificado | ☐ | Consent Screen → Authorized domains |
| 3 scopes adicionados | ☐ | Consent Screen → Scopes |
| Emails de teste adicionados | ☐ | Consent Screen → Test users |
| Fluxo OAuth testado end-to-end | ☐ | `GET /auth/youtube` → callback → `/auth/youtube/status` |
| Verificação submetida ao Google | ☐ | Consent Screen → Prepare for Verification |

---

## 8. Troubleshooting comum

| Erro | Causa | Solução |
|---|---|---|
| `access_denied` durante o consent | Email não está na lista de teste | Adicionar email em Test users |
| `redirect_uri_mismatch` | URI não cadastrada nas credenciais | Adicionar URI em Credentials → Edit OAuth Client |
| `invalid_scope` | Scope não adicionado no Consent Screen | Adicionar scope em Scopes section |
| Aviso "App not verified" | Normal em Testing/pre-verificação | Ignorar em dev; submeter para verificação para produção |
| Sem `refresh_token` retornado | Usuário já autorizou sem `prompt=consent` | Revogar em [myaccount.google.com/permissions](https://myaccount.google.com/permissions) e re-autorizar |
