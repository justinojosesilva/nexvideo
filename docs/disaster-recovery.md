# Disaster Recovery Runbook — NexVideo Postgres

> **Scope:** Backup automático diário do banco Postgres e procedimentos de restore para os ambientes staging e produção do NexVideo (hospedados no Render).

---

## Arquitetura de backup

```
Render Cron (02:00 UTC diário)
  └─ nexvideo-db-backup service
       └─ scripts/backup-postgres.sh
            ├─ pg_dump --format=custom --compress=9 → /tmp/nexvideo-<timestamp>.dump
            ├─ aws s3 cp → s3://<BACKUP_S3_BUCKET>/backups/daily/
            └─ Prune backups > BACKUP_RETENTION_DAYS (padrão: 7 dias)
```

**Tecnologias:** Render Cron Job · `pg_dump` (PostgreSQL 16) · AWS CLI · S3 / Cloudflare R2

---

## Configuração inicial (primeira vez)

### 1. Criar bucket S3 / Cloudflare R2

**AWS S3:**
1. Crie um bucket `nexvideo-backups` (região `us-east-1`).
2. Ative **Versioning** e configure **Lifecycle rules** com expiração de 30 dias como segurança adicional.
3. Crie um IAM User com política mínima:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["s3:PutObject", "s3:GetObject", "s3:ListBucket", "s3:DeleteObject"],
      "Resource": [
        "arn:aws:s3:::nexvideo-backups",
        "arn:aws:s3:::nexvideo-backups/*"
      ]
    }
  ]
}
```

**Cloudflare R2 (alternativa sem custo de egress):**
1. Crie um bucket `nexvideo-backups` no Cloudflare R2.
2. Gere um API Token com permissão `Object Read & Write` no bucket.
3. Use `BACKUP_S3_ENDPOINT=https://<account_id>.r2.cloudflarestorage.com` e `AWS_DEFAULT_REGION=auto`.

### 2. Configurar env vars no Render

No Render Dashboard → `nexvideo-db-backup` → Environment:

| Variável | Valor |
|---|---|
| `BACKUP_S3_BUCKET` | `nexvideo-backups` |
| `BACKUP_S3_ENDPOINT` | URL do R2 (omitir para AWS S3) |
| `AWS_ACCESS_KEY_ID` | Chave de acesso |
| `AWS_SECRET_ACCESS_KEY` | Chave secreta |
| `AWS_DEFAULT_REGION` | `us-east-1` (AWS) ou `auto` (R2) |
| `BACKUP_RETENTION_DAYS` | `7` |

### 3. Validar primeira execução

1. No Render Dashboard → `nexvideo-db-backup` → **Trigger Run**.
2. Verifique os logs: deve terminar com `[backup] Done. Backup stored at s3://...`.
3. Confirme o arquivo no bucket S3/R2.

---

## Restore — passo a passo

> ⚠️ Nunca execute o restore direto em produção sem aprovação. Sempre teste em ambiente isolado primeiro.

### Pré-requisitos locais

```bash
# macOS
brew install postgresql awscli

# Ubuntu/Debian
apt-get install -y postgresql-client awscli
```

### 1. Listar backups disponíveis

```bash
export AWS_ACCESS_KEY_ID="..."
export AWS_SECRET_ACCESS_KEY="..."
export AWS_DEFAULT_REGION="us-east-1"
# Para R2: export BACKUP_S3_ENDPOINT="https://<account>.r2.cloudflarestorage.com"

aws s3 ls s3://nexvideo-backups/backups/daily/ \
  ${BACKUP_S3_ENDPOINT:+--endpoint-url "$BACKUP_S3_ENDPOINT"} \
  | sort -r | head -10
```

### 2. Restore em ambiente isolado (teste obrigatório)

```bash
# Suba um Postgres local isolado
docker run -d --name pg-restore-test \
  -e POSTGRES_PASSWORD=restore \
  -e POSTGRES_DB=nexvideo_restore \
  -p 5433:5432 \
  postgres:16

export DATABASE_URL="postgresql://postgres:restore@localhost:5433/nexvideo_restore"
export BACKUP_S3_BUCKET="nexvideo-backups"

# Execute o restore
./scripts/restore-postgres.sh nexvideo-20260419T020000Z.dump

# Valide
psql "${DATABASE_URL}" -c "SELECT COUNT(*) FROM users;"
psql "${DATABASE_URL}" -c "SELECT COUNT(*) FROM organizations;"
psql "${DATABASE_URL}" -c "SELECT COUNT(*) FROM content_projects;"

# Limpeza
docker rm -f pg-restore-test
```

### 3. Restore em produção (somente após aprovação)

```bash
export DATABASE_URL="<connection-string-de-producao>"
export BACKUP_S3_BUCKET="nexvideo-backups"

./scripts/restore-postgres.sh nexvideo-<TIMESTAMP>.dump
```

O script solicita confirmação explícita (`yes`) antes de executar.

---

## Procedimento de Disaster Recovery

### Cenário 1 — Corrupção de dados (partial loss)

1. Identificar o último backup íntegro listando o S3.
2. Restore em ambiente isolado e validar.
3. Abrir incidente no canal de operações.
4. Com aprovação de 2 membros sêniors: restore em produção.
5. Validar aplicação pós-restore (health check, smoke tests).
6. Post-mortem em até 48h.

### Cenário 2 — Perda total do banco (Render outage)

1. Criar novo banco Render Postgres via `render.yaml` ou dashboard.
2. Atualizar `DATABASE_URL` nos serviços `nexvideo-api` e `nexvideo-worker`.
3. Executar restore do último backup.
4. Executar `pnpm --filter @nexvideo/database exec prisma migrate deploy` para garantir schema atualizado.
5. Reiniciar todos os serviços.

### Cenário 3 — Backup corrompido

1. Testar restore do arquivo em questão localmente.
2. Se falhar, usar o backup do dia anterior.
3. Verificar logs do cron job `nexvideo-db-backup` para identificar causa.

---

## Monitoramento e alertas

| O que monitorar | Como |
|---|---|
| Cron job falhou | Render notifica via email na conta de billing. Configure também Render Alerting → `nexvideo-db-backup` → failure alert |
| Backup não aparece no S3 | CloudWatch/R2 Analytics: verifique PUT requests diários |
| Tamanho do dump < 1KB | Indica dump vazio; checar variável `DATABASE_URL` |

---

## RTO / RPO

| Métrica | Valor |
|---|---|
| **RPO** (Recovery Point Objective) | 24 horas (1 backup/dia) |
| **RTO** (Recovery Time Objective) | ~30 minutos (download + restore + validação) |
| **Retenção** | 7 dias de backups diários |

---

## Teste periódico obrigatório

Execute o procedimento de restore em ambiente isolado pelo menos **uma vez por mês**. Documente o resultado abaixo:

| Data | Backup usado | Resultado | Executado por |
|---|---|---|---|
| — | — | — | — |
