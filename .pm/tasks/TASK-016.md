---
title: Configurar backup automático do Postgres
type: chore
priority: CRITICAL
impact: 10
confidence: 9
effort: 3
tags:
  - infrastructure
  - database
  - backup
acceptanceCriteria:
  - pg_dump ou snapshot agendado diário
  - Retenção de pelo menos 7 dias configurada
  - Restore testado em ambiente isolado
  - Runbook de disaster recovery documentado
status: IN_REVIEW
body: |
  ## Objetivo

  Configurar backup automático do Postgres

  ## Critérios de Aceite

  - [ ] pg_dump ou snapshot agendado diário
  - [ ] Retenção de pelo menos 7 dias configurada
  - [ ] Restore testado em ambiente isolado
  - [ ] Runbook de disaster recovery documentado
id: TASK-016
score: 30
createdAt: '2026-04-17T16:16:26.598Z'
updatedAt: '2026-04-19T22:15:16.005Z'
filePath: /projects/nexvideo/.pm/tasks/TASK-016.md
---
## Objetivo

Configurar backup automático do Postgres

## Critérios de Aceite

- [x] pg_dump ou snapshot agendado diário
- [x] Retenção de pelo menos 7 dias configurada
- [ ] Restore testado em ambiente isolado ← pendência manual (executar scripts/restore-postgres.sh em ambiente isolado)
- [x] Runbook de disaster recovery documentado

---

## Resumo Técnico

### O que foi implementado

**`scripts/backup-postgres.sh`**
- Executa `pg_dump --format=custom --compress=9` do `DATABASE_URL`
- Faz upload para S3/Cloudflare R2 via AWS CLI (`s3 cp`)
- Aplica retenção: deleta backups com mais de `BACKUP_RETENTION_DAYS` dias (padrão: 7)
- Nomenclatura dos arquivos: `nexvideo-<YYYYMMDDTHHMMSSZ>.dump`
- Compatível com AWS S3 e Cloudflare R2 (via `BACKUP_S3_ENDPOINT`)

**`scripts/restore-postgres.sh`**
- Recebe o nome do arquivo de backup como argumento
- Baixa do S3/R2, solicita confirmação explícita, executa `pg_restore --clean --single-transaction`
- Inclui sanity check pós-restore (contagem de `users`)
- Instrução de uso em ambiente isolado via Docker documentada

**`render.yaml` — cron service `nexvideo-db-backup`**
- Tipo `cron`, schedule `0 2 * * *` (02:00 UTC diário)
- Build instala `postgresql-client` + `awscli`
- `DATABASE_URL` injetado automaticamente a partir do `nexvideo-postgres` managed DB
- Variáveis de storage (`BACKUP_S3_BUCKET`, `AWS_ACCESS_KEY_ID`, etc.) marcadas como `sync: false` para preenchimento manual no dashboard

**`docs/disaster-recovery.md`** — runbook completo com:
- Arquitetura de backup
- Setup inicial (AWS S3 e Cloudflare R2)
- Passo-a-passo de restore em ambiente isolado e em produção
- 3 cenários de DR (corrupção parcial, perda total, backup corrompido)
- Tabela de monitoramento e alertas
- RTO (30 min) / RPO (24h)
- Tabela de registro de testes periódicos

### Pendências manuais

1. **Criar bucket S3/R2** e gerar credenciais (ver `docs/disaster-recovery.md` § Configuração inicial).
2. **Preencher env vars** no Render Dashboard (`nexvideo-db-backup` service).
3. **Executar restore de teste** em ambiente isolado com `scripts/restore-postgres.sh` e marcar o critério como concluído.
4. **Implantar o `render.yaml`** atualizado via `git push` para criar o cron service no Render.
