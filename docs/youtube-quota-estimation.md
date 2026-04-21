# YouTube Data API v3 — Estimativa de Quota

> Quota padrão: **10.000 unidades/dia** por projeto GCP.
> Reset: **00:00 Pacific Time** (08:00 UTC).
> Referência oficial: [Determining quota cost](https://developers.google.com/youtube/v3/determine_quota_cost)

---

## Custo por operação

| Operação | Endpoint | Custo (units) | Onde é chamado |
|---|---|---|---|
| Busca de vídeos | `search.list` (part=snippet) | **100** | `searchVideos()` em `YouTubeDataAdapter` |
| Detalhes de vídeo | `videos.list` (part=snippet,contentDetails,statistics,status) | **1** | `getVideoStats()` em `YouTubeDataAdapter` |
| Lista de canais | `channels.list` | 1 | (futuro — analytics) |
| Upload de vídeo | `videos.insert` | 1600 | (futuro — upload flow) |

---

## Custo por fluxo de geração de script

Cada chamada ao endpoint `POST /scripts` dispara os 3 scorers em sequência:

| Scorer | Chamadas YouTube | Custo |
|---|---|---|
| `SaturationScorer` | `search.list` × 1 + `videos.list` × 20 | 100 + 20 = **120 units** |
| `DemandScorer` | `search.list` × 1 + `videos.list` × 5 | 100 + 5 = **105 units** |
| `QualityGapScorer` | `search.list` × 1 + `videos.list` × 10 | 100 + 10 = **110 units** |
| **Total por script** | | **335 units** |

> **Nota:** `searchVideos` faz N chamadas individuais a `videos.list` (uma por vídeo). Batching via IDs separados por vírgula reduziria N chamadas para 1, economizando (N-1) units — otimização futura.

---

## Projeção de consumo

### Com quota padrão (10.000 units/dia)

| Métrica | Valor |
|---|---|
| Scripts por dia (quota padrão) | 10.000 ÷ 335 ≈ **29 scripts/dia** |
| Usuários ativos (1 script/dia) | ~**29 usuários** |

### Escala: 100 usuários ativos (1 script/dia cada)

| | |
|---|---|
| Consumo diário | 100 × 335 = **33.500 units** |
| Aumento necessário | 3,35× (≈ **50.000 units/dia**) |
| Status | ⚠️ Solicitar aumento de quota no GCP |

### Escala: 1.000 usuários ativos (1 script/dia cada)

| | |
|---|---|
| Consumo diário | 1.000 × 335 = **335.000 units** |
| Aumento necessário | 33,5× (≈ **500.000 units/dia**) |
| Status | 🔴 Requer aumento significativo + cache agressivo |

### Escala: 1.000 usuários ativos com cache (TTL 1h por query)

Com o `RedisCacheAdapter` reduzindo chamadas repetidas ao mesmo topic/keyword:

- Assumindo 30% de cache hit rate: consumo ≈ 234.500 units/dia
- Assumindo 60% de cache hit rate: consumo ≈ 134.000 units/dia

---

## Estratégias de redução de consumo

| Estratégia | Economia estimada | Já implementada? |
|---|---|---|
| Cache Redis de resultados por keyword (TTL 1h) | 20-60% dependendo da sobreposição de tópicos | ✅ (`youtube:` prefix no `RedisCacheAdapter`) |
| Batch `videos.list` (múltiplos IDs por call) | (N-1) units por `searchVideos` | ❌ Otimização futura |
| Reduzir `maxResults` no `SaturationScorer` (20 → 10) | 10 units por chamada | ❌ Trade-off com precisão |
| Limitar scorers por plano (free users = sem YouTube) | Até 100% para free tier | ❌ Decisão de produto |

---

## Monitor de quota

A quota é rastreada automaticamente via Redis pela `YoutubeQuotaService`:

- **Chave Redis:** `youtube:quota:<YYYY-MM-DD>` (alinhada ao dia Pacific Time)
- **Incrementos:** `search.list` = +100, `videos.list` = +1 a cada chamada bem-sucedida
- **Endpoint admin:** `GET /admin/youtube-quota` (requer `X-Admin-Key`)

### Consultando o status

```bash
curl -H "X-Admin-Key: $ADMIN_API_KEY" \
     https://nexvideo-api.onrender.com/admin/youtube-quota
```

Resposta esperada:

```json
{
  "date": "2026-04-19",
  "usedUnits": 2350,
  "dailyLimit": 10000,
  "remainingUnits": 7650,
  "usagePercent": 24,
  "resetAtUtc": "2026-04-20T08:00:00.000Z"
}
```

### Alerta de quota esgotada

O `YouTubeDataAdapter` detecta o erro `quotaExceeded` (HTTP 403 + reason `quotaExceeded`) e lança `YouTubeApiError` com `isRateLimited=true`. Os scorers retornam `FALLBACK_SCORE` ao detectar esse erro — a geração de script continua sem travar.

---

## Pedido de aumento de quota

Para solicitar aumento no Google Cloud Console:

1. Acesse **APIs & Services → YouTube Data API v3 → Quotas**.
2. Clique em **Edit Quotas → Request additional quota**.
3. Justifique o uso (plataforma SaaS de criação de conteúdo, N usuários ativos, N scripts/dia).
4. O processo de aprovação leva de 2 a 7 dias úteis.

> Solicitar aumento quando `usagePercent > 70%` em dias de pico.
