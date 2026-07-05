# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Monorepo Structure

**pnpm + Turborepo** monorepo. Package manager `pnpm@10.19.0`, Node.js ≥20.9 (exigido pelo Next.js 16 em `apps/web`).

```
apps/
  web/       — Next.js 16 frontend (port 3001), React 19, Tailwind v4, TanStack Query, Zustand, react-hook-form + zod
  api/       — NestJS 11 backend (port 3002), JWT auth, BullMQ, Swagger
  worker/    — BullMQ worker (tsx), processa filas do Redis e chama OpenAI

packages/
  database/          — Prisma schema + PrismaClient singleton (@nexvideo/database)
  shared/            — Tipos, interfaces, enums e utils compartilhados (@nexvideo/shared)
  prompts/           — Prompts tipados para OpenAI, organizados por categoria (@nexvideo/prompts)
  ui/                — Biblioteca de componentes React compartilhada (@nexvideo/ui)
  eslint-config/     — Configuração ESLint compartilhada (@nexvideo/eslint-config)
  tailwind-config/   — Configuração Tailwind compartilhada (@nexvideo/tailwind-config)
  typescript-config/ — tsconfigs base, nextjs e react-library (@nexvideo/typescript-config)
```

## Commands

### Root — executa todos os workspaces via Turbo

```bash
pnpm dev          # inicia todos os apps em paralelo
pnpm build        # build respeitando ordem de dependência
pnpm lint         # lint em todos os pacotes
pnpm check-types  # type-check em todos os pacotes
pnpm format       # prettier em todos os arquivos TS/TSX/MD
```

### Por workspace

```bash
pnpm --filter api dev           # NestJS watch mode
pnpm --filter web dev           # Next.js na porta 3001
pnpm --filter worker dev        # tsx watch

# Testes
pnpm --filter api test          # unit tests (jest, *.spec.ts)
pnpm --filter api test:e2e      # e2e (jest-e2e.json)
pnpm --filter api test:cov      # coverage

# Database
pnpm --filter @nexvideo/database generate   # prisma generate
pnpm --filter @nexvideo/database migrate    # prisma migrate dev
pnpm --filter @nexvideo/database studio     # prisma studio
```

### Infraestrutura

```bash
docker compose up -d   # Postgres (5432), Redis (6379), pgAdmin (5050)
```

## packages/prompts

Prompts organizados por categoria, cada um exportado como **função tipada** que recebe variáveis de contexto:

```
src/
  scripts/    — finance-script, ai-script, productivity-script
  titles/     — youtube-title, shorts-title
  thumbnails/ — thumbnail-copy
  seo/        — youtube-description
  scoring/    — monetization-risk (retorna JSON estruturado)
  narration/  — narration (adapta roteiro para TTS)
  index.ts    — re-exporta tudo
```

Uso no worker:

```typescript
import { financeScriptPrompt } from "@nexvideo/prompts";
const prompt = financeScriptPrompt({
  topic: "como sair das dívidas",
  durationMinutes: 12,
});
```

Para adicionar novos prompts: criar o arquivo na categoria correspondente, exportar a função tipada com interface de input, e adicionar o re-export no `index.ts`.

## Architecture Notes

- **`packages/database`** é o único dono do schema Prisma e exporta um singleton `prisma` (evita múltiplas conexões em dev). Todo código server-side importa de `@nexvideo/database`, não de `@prisma/client` diretamente.
- **`packages/shared`** e **`packages/prompts`** precisam ser buildados antes dos apps que os consomem (`^build` no Turbo resolve isso automaticamente).
- **`packages/ui`** é compilado para `dist/` — não consumido direto do source. CSS classes usam prefixo `ui-` para não colidir com Tailwind das apps.
- **`apps/worker`** é um processo Node.js mínimo (sem framework). Recebe jobs via BullMQ, chama OpenAI e pode chamar a API via HTTP quando necessário.
- **`apps/api`** ainda tem `@prisma/client` como dependência direta (scaffold inicial) — ao criar os primeiros módulos NestJS, migrar para importar de `@nexvideo/database`.
- Turbo task graph: `build` depende de `^build`; `dev` é persistente e sem cache; `test` e `test:e2e` dependem de `^build`.
