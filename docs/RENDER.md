# Optional: deploying on Render

The recommended deployment is a VPS ([DEPLOYMENT.md](DEPLOYMENT.md)). Render can run Medical Student Resource Hub, but there is one hard limitation to understand first.

## ⚠️ Local disk storage is NOT persistent on Render

Render web services have an **ephemeral filesystem**. Anything written to local disk, including every file uploaded to `UPLOAD_DIR`, is **lost on every deploy, restart and instance replacement**. The database rows would survive, but their files would vanish, leaving broken links.

To run Medical Student Resource Hub on Render you must do one of the following:

1. **Use object storage (recommended).** Implement an S3-compatible `StorageService` driver (AWS S3, Cloudflare R2, Backblaze B2, DigitalOcean Spaces, or MinIO you host elsewhere) as described in the README under *File storage configuration*. The interface (`src/lib/files/storage/types.ts`) already covers what the app needs: `put`, ranged `getStream`, `stat`, `delete`, `listKeys`, `usage`. Keep the bucket **private**. Files must still be streamed through `/api/files/:id`, so the published/draft access checks keep working. Do not switch to public bucket URLs.
2. **Use a Render persistent disk (stop-gap).** Attach a disk to the service and set `UPLOAD_DIR` to its mount path, for example `/var/data/uploads`. Note that a service with a disk is limited to **one instance**, deploys incur brief downtime, and the disk is tied to one region. You are also responsible for backing the disk up.

Until one of these is in place, do not upload real content on Render.

## Setup outline

1. **Database:** create a Render PostgreSQL instance (version 16). Copy its *Internal Database URL*.
2. **Web service:** New → Web Service → connect the repository.
   - Runtime: **Docker** (uses the `Dockerfile`; Render builds the default final stage, `runner`). Alternatively use the Node runtime with:
     - Build command: `npm ci && npm run build`
     - Start command: `npx prisma migrate deploy && npm start`
   - Health check path: `/api/health`
3. **Environment variables** (Render dashboard → Environment):

   | Variable | Value |
   | --- | --- |
   | `DATABASE_URL` | Render internal database URL |
   | `AUTH_SECRET` | `openssl rand -base64 48` |
   | `APP_URL` | `https://<service>.onrender.com`, or your custom domain |
   | `UPLOAD_DIR` | the persistent disk path (option 2), or as your S3 driver requires |
   | `STORAGE_DRIVER` | `local` (disk), or your new `s3` driver |
   | `MAX_UPLOAD_SIZE_MB` | `25` |

4. **Migrations with the Docker runtime:** the `runner` image does not include the Prisma CLI. Either add a *Pre-Deploy Command* that runs a container built from the `tools` target, or use the Node runtime start command shown above, which runs `prisma migrate deploy` before starting.
5. **First admin:** open a Render Shell (Node runtime) and run:

   ```bash
   ADMIN_PASSWORD='…' npm run admin:create -- --email you@example.org
   ```

   Alternatively, run the seed once with `SEED_ADMIN_*` set.

## Differences from the VPS setup

- **TLS** is terminated by Render, which handles certificates and HTTPS for you. The Nginx container is not used.
- **Rate limiting:** without Nginx, only the app's in-memory login limiter applies. It is per instance, so with more than one instance move it to Redis or PostgreSQL. Also review Render's DDoS protections.
- **Client IP:** the app reads `X-Real-IP` / `X-Forwarded-For`. Render's proxy sets `X-Forwarded-For`; confirm that the audit log shows real client IPs.
- **Backups:** Render PostgreSQL has its own backup schedule depending on your plan. Uploaded files need a separate backup, either through bucket versioning or replication (object storage) or disk snapshots.
