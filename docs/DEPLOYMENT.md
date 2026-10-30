# Deploying to an Ubuntu VPS (DigitalOcean, Hetzner or similar)

This guide runs the whole stack on one Ubuntu 24.04 server with Docker Compose: **Nginx → Next.js app → PostgreSQL**. Certbot runs on the host to provide HTTPS.

```
Internet ──80/443──► nginx container ── TLS, rate limits, body-size cap
                        │  internal Docker network only
                        ▼
                     app container :3000 (non-root) ──► "uploads" volume (/data/uploads)
                        │
                        ▼
                     db container :5432 (PostgreSQL 16) ──► "pgdata" volume
Host: certbot ── writes /var/www/certbot (challenges) and /etc/letsencrypt (certificates), both mounted read-only into nginx
```

Only ports **22, 80 and 443** are reachable from outside. The app and the database are never published to the host.

Commands are shown for the user `deploy` and the directory `/srv/resource-hub`, with `hub.example.org` as an example domain.

---

## 1. Ubuntu VPS preparation

**Create the server:**

| Provider | Suggested size |
| --- | --- |
| Hetzner Cloud | CX22 (2 vCPU, 4 GB RAM) |
| DigitalOcean | Basic Droplet, 2 GB RAM / 1 vCPU or larger |

- Image: Ubuntu 24.04 LTS, with **SSH key authentication only**.
- Add a block-storage volume if you expect more than about 30 GB of uploads (optional; see the note in step 2).

**Point DNS at the server:** create an `A` record (plus an `AAAA` record for IPv6) for `hub.example.org`. Check that it resolves:

```bash
dig +short hub.example.org
```

**Create a deploy user and harden SSH.** Run these as root on first login:

```bash
adduser --disabled-password --gecos "" deploy
```

```bash
usermod -aG sudo deploy
```

```bash
rsync --archive --chown=deploy:deploy ~/.ssh /home/deploy
```

```bash
passwd deploy
```

This password is used for sudo only, not for SSH.

```bash
sed -i -E 's/^#?PermitRootLogin .*/PermitRootLogin no/; s/^#?PasswordAuthentication .*/PasswordAuthentication no/' /etc/ssh/sshd_config
```

```bash
systemctl restart ssh
```

Confirm that `ssh deploy@SERVER_IP` works in a **new** terminal before you close the root session.

**Updates, automatic security patches, fail2ban, UTC clock:**

```bash
sudo apt update && sudo apt -y upgrade
```

```bash
sudo apt -y install unattended-upgrades fail2ban
```

```bash
sudo dpkg-reconfigure --priority=low unattended-upgrades
```

```bash
sudo timedatectl set-timezone UTC
```

**Firewall (UFW):**

```bash
sudo ufw default deny incoming && sudo ufw default allow outgoing
```

```bash
sudo ufw allow OpenSSH && sudo ufw allow 80/tcp && sudo ufw allow 443/tcp
```

```bash
sudo ufw enable
```

> **Docker and UFW:** ports that Docker publishes bypass UFW. That is why `docker-compose.yml` publishes only Nginx (80/443) and never the app or PostgreSQL. Keep it that way. For database access from your laptop, use an SSH tunnel. Also add the same three inbound rules (22, 80, 443) in the provider's cloud firewall.

## 2. Install Docker, Docker Compose, Git and Certbot

**Git and Certbot** (from Ubuntu's repositories):

```bash
sudo apt -y install git certbot ca-certificates curl
```

**Docker Engine with the Compose plugin** (from Docker's official repository):

```bash
sudo install -m 0755 -d /etc/apt/keyrings
```

```bash
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
```

```bash
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
```

```bash
sudo apt update && sudo apt -y install docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
```

```bash
sudo usermod -aG docker deploy
```

```bash
sudo systemctl enable docker containerd
```

Docker now starts on boot, so the containers come back after a reboot.

Rotate container logs so they cannot fill the disk:

```bash
echo '{ "log-driver": "json-file", "log-opts": { "max-size": "10m", "max-file": "5" } }' | sudo tee /etc/docker/daemon.json
```

```bash
sudo systemctl restart docker
```

Log out and back in so the `docker` group applies, then verify:

```bash
docker run --rm hello-world && docker compose version && git --version && certbot --version
```

> **Optional data volume:** if you attached block storage, mount it (for example at `/mnt/data`), add `"data-root": "/mnt/data/docker"` to `/etc/docker/daemon.json` and restart Docker **before** step 6. The database and uploads then live on the volume.

## 3. Clone the project

```bash
sudo mkdir -p /srv/resource-hub && sudo chown deploy:deploy /srv/resource-hub
```

```bash
git clone <your-repo-url> /srv/resource-hub
```

```bash
cd /srv/resource-hub
```

Create the directories that Certbot and Nginx share:

```bash
sudo mkdir -p /var/www/certbot /etc/letsencrypt
```

## 4. Create the `.env` file

```bash
cp .env.example .env && chmod 600 .env
```

Generate the secrets:

```bash
openssl rand -base64 48
```

Use the output for `AUTH_SECRET`.

```bash
openssl rand -hex 24
```

Use the output for `POSTGRES_PASSWORD`.

Edit `.env` (`nano .env`) and set at least these values:

```ini
APP_URL="https://hub.example.org"   # exact public origin, https, no trailing slash
DOMAIN="hub.example.org"
CERTBOT_EMAIL="you@example.org"
AUTH_SECRET="<openssl rand -base64 48>"

POSTGRES_USER="resource_hub"
POSTGRES_PASSWORD="<openssl rand -hex 24>"
POSTGRES_DB="resource_hub"

MAX_UPLOAD_SIZE_MB=25
NGINX_CLIENT_MAX_BODY_SIZE="30m"

SEED_ADMIN_EMAIL="you@example.org"
SEED_ADMIN_PASSWORD="<12+ chars, upper/lower/digit>"
SEED_ADMIN_NAME="Your Name"
SEED_DEMO_CONTENT=false
```

Every variable is explained in `.env.example`. Compose refuses to start if a required one is missing.

**PostgreSQL credentials:** the `db` container creates the role and database from `POSTGRES_*` the **first** time its volume is initialised, and Compose builds the app's `DATABASE_URL` from the same values. To change the password later, run the command below, then update `.env` and run `docker compose up -d`:

```bash
docker compose exec db psql -U resource_hub -d resource_hub -c "ALTER USER resource_hub WITH PASSWORD 'new-password';"
```

## 5. Run database migrations

Migrations run **automatically**: the one-off `migrate` service runs `prisma migrate deploy` before the app starts, on every `docker compose up`. To run them explicitly (for example, to check before starting):

```bash
docker compose build
```

```bash
docker compose up -d db
```

```bash
docker compose run --rm migrate
```

```bash
docker compose run --rm migrate npx prisma migrate status
```

## 6. Start the Docker containers

```bash
docker compose up -d --build
```

Create the admin account (from the `SEED_ADMIN_*` values) and the subject categories:

```bash
docker compose run --rm migrate npm run db:seed
```

Then remove `SEED_ADMIN_PASSWORD` from `.env`.

Check that everything is running:

```bash
docker compose ps
```

You should see `db`, `app` and `nginx` as `Up (healthy)`, and `migrate` as `Exited (0)`.

```bash
docker compose logs --tail=50 app nginx
```

```bash
curl -I http://hub.example.org/api/health
```

**Restart policy:** every long-running service uses `restart: unless-stopped`, and the Docker service is enabled at boot, so containers recover from crashes and reboots without intervention. The app and database also have healthchecks. Test it with `sudo reboot`, then `docker compose ps`.

## 7. Configure Nginx

Nginx runs as a container and is configured from `docker/nginx/templates/`:

| File | Purpose |
| --- | --- |
| `http-only.conf.template` | Bootstrap mode, used until a certificate exists. Serves the ACME challenge and proxies the app over HTTP. |
| `https.conf.template` | Production mode: HTTP→HTTPS redirect, TLS 1.2/1.3, HSTS, rate limits, upload streaming. |
| `15-select-site.sh` | Runs at container start and picks the HTTPS template if `/etc/letsencrypt/live/$DOMAIN/fullchain.pem` exists. |

Both templates include:
- `limit_req` zones: login 5 requests/min per IP, uploads 10/min, API 20 requests/s.
- A request-body cap of `NGINX_CLIENT_MAX_BODY_SIZE`.
- Forwarding headers that are overwritten, never appended, so clients cannot spoof their IP.
- Unbuffered upload proxying with 300-second timeouts.

To change a setting, edit the template and run `docker compose restart nginx`. Check the config with:

```bash
docker compose exec nginx nginx -t
```

Right after step 6, `docker compose logs nginx` shows `serving HTTP only`. That is expected until step 8.

## 8. Enable HTTPS (Certbot on the host)

Nginx already serves `/.well-known/acme-challenge/` from `/var/www/certbot`. Request the certificate using the webroot method:

```bash
set -a; . ./.env; set +a
```

```bash
sudo certbot certonly --webroot -w /var/www/certbot -d "$DOMAIN" --email "$CERTBOT_EMAIL" --agree-tos --no-eff-email
```

Restart Nginx. It detects the certificate and switches to HTTPS:

```bash
docker compose restart nginx
```

```bash
docker compose logs nginx | grep resource-hub
```

The log should say `certificate found … serving HTTPS`. Verify both URLs:

```bash
curl -I https://hub.example.org
```

Expect `200` with a `strict-transport-security` header.

```bash
curl -I http://hub.example.org
```

Expect a `301` redirect to HTTPS.

**Automatic renewal.** The Ubuntu `certbot` package installs a systemd timer that renews certificates twice a day. Add a deploy hook so Nginx reloads after each renewal:

```bash
echo -e '#!/bin/sh\ncd /srv/resource-hub && docker compose exec -T nginx nginx -s reload' | sudo tee /etc/letsencrypt/renewal-hooks/deploy/reload-nginx.sh
```

```bash
sudo chmod +x /etc/letsencrypt/renewal-hooks/deploy/reload-nginx.sh
```

```bash
sudo certbot renew --dry-run
```

```bash
systemctl list-timers | grep certbot
```

Optionally, check your TLS setup at <https://www.ssllabs.com/ssltest/> (aim for A or A+).

## 9. Deploy updates

Take a backup first:

```bash
cd /srv/resource-hub && ./scripts/backup.sh
```

```bash
git pull
```

```bash
docker compose up -d --build
```

This rebuilds the image, applies new migrations, and restarts the app once they succeed.

```bash
docker image prune -f
```

Periodically pick up patched PostgreSQL and Nginx images:

```bash
docker compose pull db nginx && docker compose up -d
```

To roll back: `git checkout <previous-tag>` and `docker compose up -d --build`. If a migration had already changed data, restore the backup from before the update (step 11).

## 10. Back up the database and uploaded files

Two things must be protected **together**, because rows and files must match:
- the `pgdata` volume (PostgreSQL)
- the `uploads` volume (uploaded files)

`scripts/backup.sh` writes `db-<UTC>.dump` (`pg_dump` custom format) and `uploads-<UTC>.tar.gz`, checks that both are readable, and prunes copies older than `BACKUP_RETENTION_DAYS` (default 14). It writes with `umask 077`, because backups contain password hashes.

**Nightly backups with cron:**

```bash
sudo mkdir -p /srv/backups/resource-hub && sudo chown deploy:deploy /srv/backups/resource-hub
```

```bash
crontab -e
```

```cron
30 2 * * * cd /srv/resource-hub && BACKUP_DIR=/srv/backups/resource-hub ./scripts/backup.sh >> /srv/backups/backup.log 2>&1
```

**Off-site copies are required.** A backup that lives on the same server is lost with that server. Copy backups to another provider or region every night, for example with rclone to Backblaze B2, S3, DigitalOcean Spaces or a Hetzner Storage Box:

```bash
sudo apt -y install rclone && rclone config
```

Create a remote named `offsite`, then add a second cron line:

```cron
15 3 * * * rclone copy /srv/backups/resource-hub offsite:resource-hub-backups --max-age 48h >> /srv/backups/backup.log 2>&1
```

Keep the bucket private and consider `rclone crypt` for encryption. Use bucket lifecycle rules for long-term retention, for example 30 daily and 12 monthly copies. Provider snapshots are a useful extra layer, but they are not a substitute.

**Manual one-off backups:**

```bash
docker compose exec -T db sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc' > db.dump
```

```bash
docker compose run --rm -T --no-deps --entrypoint tar app -czf - -C /data/uploads . > uploads.tar.gz
```

## 11. Restore from backup

Always use a database dump and an uploads archive from the **same** timestamp:

```bash
cd /srv/resource-hub
```

```bash
./scripts/restore.sh /srv/backups/resource-hub/db-20261030T023000Z.dump /srv/backups/resource-hub/uploads-20261030T023000Z.tar.gz
```

The script asks you to type `restore`. It then stops the app, restores the database (`pg_restore --clean --single-transaction`), replaces every uploaded file, and starts the app again.

Verify that rows and files match:

```bash
docker compose run --rm migrate npm run storage:cleanup
```

It should report `orphaned files: 0 · missing files: 0`.

**Restoring onto a new server:** follow steps 1–4 and 6 (skip the seed), copy the backup files over, run `restore.sh`, then step 8.

**Test a restore** on a throwaway server at least once a quarter.

## 12. Operations quick reference

| Task | Command |
| --- | --- |
| Status / health | `docker compose ps` |
| Logs | `docker compose logs -f --tail=200 app` |
| Add an admin or reset a password | `docker compose run --rm migrate npm run admin:create -- --email x@y.org` |
| Check file/DB consistency | `docker compose run --rm migrate npm run storage:cleanup` |
| Database shell | `docker compose exec db psql -U resource_hub -d resource_hub` |
| Stop, keeping data | `docker compose down` (**never** add `-v` in production: it deletes the volumes) |

## 13. Hardening notes

- Rate limits in the app are held in memory and apply per container. Nginx limits apply in front of them. If you scale to several app replicas, move the app limiter to Redis or PostgreSQL.
- Review the dashboard's audit log regularly for `Failed sign-in` bursts. fail2ban already protects SSH.
- Keep dependencies patched: run `npm audit` on your development machine, then rebuild and redeploy.

## 14. Go-live checklist

- [ ] DNS resolves, HTTPS works, HTTP redirects to HTTPS, and HSTS is present.
- [ ] `APP_URL` is exactly `https://<DOMAIN>`.
- [ ] UFW and the cloud firewall allow only 22, 80 and 443. SSH uses keys only.
- [ ] `AUTH_SECRET` and `POSTGRES_PASSWORD` are unique. `.env` is mode 600 and `SEED_ADMIN_PASSWORD` has been removed.
- [ ] The admin can log in, upload, publish, feature, re-upload, delete and build a quiz.
- [ ] As a logged-out user, `/admin/dashboard` redirects to login and `/api/admin/dashboard` returns 401.
- [ ] `certbot renew --dry-run` succeeds and the deploy hook is installed.
- [ ] The nightly backup and the off-site copy are scheduled, and a test restore has been done.
- [ ] A reboot brings every service back `healthy`.
- [ ] Everything in [docs/TESTING.md](TESTING.md) passes.
