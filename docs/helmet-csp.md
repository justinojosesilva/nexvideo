# Helmet & CSP — Exceções e Justificativas

## Configuração aplicada em `apps/api/src/main.ts`

O Helmet é inicializado antes do CORS, com CSP restritiva por padrão.

## Diretivas CSP e Exceções

| Diretiva | Valor | Motivo |
|---|---|---|
| `default-src` | `'self'` | Permite apenas recursos da mesma origem por padrão |
| `script-src` | `'self'` | Scripts apenas do próprio servidor |
| `style-src` | `'self' 'unsafe-inline'` | **Exceção**: Swagger UI (`/docs`) injeta estilos inline; sem essa exceção o Swagger quebra |
| `img-src` | `'self' data: https:` | Imagens externas HTTPS são aceitas (avatares, thumbnails de vídeos YouTube) |
| `connect-src` | `'self'` | Fetch/XHR apenas para a própria API |
| `font-src` | `'self' https: data:` | Fontes de CDN HTTPS (ex.: Google Fonts no Swagger UI) |
| `object-src` | `'none'` | Nenhum plugin de objeto (Flash, PDF embeds) |
| `media-src` | `'self'` | Mídia apenas do servidor |
| `frame-src` | `'none'` | Nenhum iframe permitido |
| `upgrade-insecure-requests` | ativo | Força HTTPS em recursos HTTP |

## Flags Helmet desativadas

| Flag | Motivo |
|---|---|
| `crossOriginEmbedderPolicy: false` | Swagger UI carrega recursos cross-origin; COEP bloquearia os assets |

## HSTS

```
Strict-Transport-Security: max-age=31536000; includeSubDomains; preload
```

- `maxAge = 31 536 000` (1 ano) — exigido para submissão ao preload list do HSTS
- `includeSubDomains` — protege subdomínios
- `preload` — permite entrada no browser preload list

## Proteção CSRF para API JWT

Esta API usa **JWT Bearer tokens** no cabeçalho `Authorization` — não cookies de sessão. Isso significa que:

- Um browser **não envia automaticamente** o token JWT para cross-origin requests
- Portanto, ataques CSRF clássicos (exploração de cookies automáticos) **não se aplicam**

A proteção CSRF implementada é via `ContentTypeCsrfMiddleware`:
- Bloqueia requisições de mutação (`POST`, `PUT`, `PATCH`, `DELETE`) cujo `Content-Type` não seja `application/json`
- Formulários HTML enviados por CSRF usam `application/x-www-form-urlencoded` ou `multipart/form-data` — ambos rejeitados com `400 Bad Request`
- Exceção: `POST /billing/webhook` (Stripe, com verificação de assinatura própria)

## Onde ajustar no futuro

Se a API passar a emitir **cookies httpOnly** (ex.: sessão), adicionar:
- `csurf` ou double-submit cookie pattern
- `SameSite=Strict` nas cookies de sessão
