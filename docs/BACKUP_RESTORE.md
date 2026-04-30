# Backup And Restore Runbook

This project stores production state in PostgreSQL, Redis, public upload files,
private installation packages, and private order message files.

## Production Volumes

The Dockhand Compose stack defines these persistent volumes:

| Volume | Mounted Path | Purpose |
| --- | --- | --- |
| `postgres-data` | `/var/lib/postgresql/data` | PostgreSQL database |
| `redis-data` | `/data` | Redis AOF persistence |
| `uploads` | `/app/public/uploads` | Public product/category images |
| `downloads` | `/app/private/downloads` | Private admin installation packages |
| `message-uploads` | `/app/uploads/messages` | Private order chat attachments |
| `backups` | `/backups` | Generated backup artifacts |

## Create Backups

Run these from the production host or through Dockhand's stack shell with the
production Compose file.

PostgreSQL logical backup:

```bash
docker compose -f deploy/dockhand/compose.prod.yml --profile ops run --rm postgres-backup
```

File storage archive:

```bash
docker compose -f deploy/dockhand/compose.prod.yml --profile ops run --rm storage-backup
```

Copy backup artifacts out of the host or Dockhand volume after creation. Keeping
the only backup on the same server is not enough for production.

Recommended minimum schedule before public launch:

- PostgreSQL: daily, with at least 14 retained restore points.
- File storage: daily if uploads/packages change often, otherwise after every
  product/package change plus a weekly full archive.
- Redis: rely on AOF for runtime recovery, and include `redis-data` in host-level
  volume snapshots if available.

## Restore PostgreSQL

1. Stop the app and WebSocket services.
2. Ensure the target Postgres service is running and reachable.
3. Copy the chosen `.dump` file into the `backups` volume or onto the host.
4. Restore with `pg_restore`.

Example from a host with the backup file available:

```bash
cat ./magazin_prod_YYYYMMDD_HHMMSS.dump | \
  docker compose -f deploy/dockhand/compose.prod.yml exec -T postgres \
  pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" --clean --if-exists
```

After restore:

```bash
docker compose -f deploy/dockhand/compose.prod.yml run --rm migrate
docker compose -f deploy/dockhand/compose.prod.yml up -d app ws
```

## Restore File Storage

1. Stop the app service so files are not written during restore.
2. Restore the storage archive into the named volumes.

Example:

```bash
docker run --rm \
  -v magazin-my_uploads:/data/uploads \
  -v magazin-my_downloads:/data/downloads \
  -v magazin-my_message-uploads:/data/message-uploads \
  -v "$PWD:/restore:ro" \
  alpine:3.20 \
  sh -c 'cd /data && tar -xzf /restore/storage_YYYYMMDD_HHMMSS.tar.gz'
```

Adjust volume names to the actual Dockhand-generated volume names.

## Restore Validation Checklist

- App starts and `npm run build` equivalent has already passed in CI.
- Admin can view products and product images.
- Admin can see private package paths for products.
- Customer/admin order chat can access existing attachments through `/api/files/:fileId`.
- Paid orders still show licenses and installation stages.
- Redis-dependent features recover after Redis starts.
- RollyPay webhook idempotency still has `PaymentWebhookEvent` records.

## Operational Notes

- Do not store real backups in Git.
- Encrypt off-host backups when the storage provider supports it.
- Test restore before public launch, not after the first incident.
- Treat private installation packages and message uploads as sensitive data.
