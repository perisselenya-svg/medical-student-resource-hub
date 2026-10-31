# Medical Student Resource Hub

A database-backed medical education platform. **Admins** upload, organise, publish and manage study materials (PDF notes, images, diagrams, Markdown notes) and build quizzes. **Students** search, filter, preview, read and download published materials, and take quizzes, without registering or logging in.

> **For educational purposes only. Not a substitute for clinical judgment.** The platform gives no medical advice and offers no clinical decision support.

| Student home | Resource page (embedded PDF) | Admin dashboard |
| --- | --- | --- |
| ![Student home](docs/screenshots/student-home.png) | ![Resource page](docs/screenshots/student-resource-pdf.png) | ![Admin dashboard](docs/screenshots/admin-dashboard.png) |

More screenshots: [docs/screenshots](docs/screenshots).

## Contents

1. [Features](#features)
2. [Tech stack](#tech-stack)
3. [Project structure](#project-structure)
4. [Local development](#local-development)
5. [Database: schema, migrations, seed](#database-schema-migrations-seed)
6. [File storage](#file-storage)
7. [API reference](#api-reference)
8. [Security](#security)
9. [Backup & restore](#backup--restore)
10. [Deployment](#deployment)
11. [Testing](#testing)
12. [Troubleshooting](#troubleshooting)

---

## Features

**Student side (no account required)**
- A home page with the headline, a search bar, and sections for featured resources, popular resources, subject shortcuts and the latest uploads.
- A **Subjects** page with a grid of medical subjects showing their published material and quiz counts. Each subject has its own page (for example *"Anatomy Notes | Medical Student Resource Hub"*).
- The **Library**: server-side keyword search; filters for subject, tag, file type and upload date; sorting by newest, most viewed, most downloaded or A–Z; pagination; and state kept in the URL. It includes loading skeletons, empty states and error states.
- **Resource pages** with an embedded PDF viewer (pdf.js, no plugins, mobile-friendly, selectable text), an embedded image viewer (zoom with buttons, keys and double-tap), and safely rendered Markdown notes. Each page also has a download button, view and download counts, related resources and the disclaimer.
- **Quizzes**: a list with a subject filter. Students answer one question at a time with a progress bar, submit each answer, then see the correct answer and explanation. At the end they get a final score, can review their answers, and can retake the quiz. Grading happens on the server, so answers are never sent to the browser in advance.

**Admin side (`/admin`)**
- A secure login with brute-force protection, and logout.
- A **dashboard** with totals (materials, published, drafts, categories, tags, views, downloads, quizzes), a recent uploads table, the audit log and quick links.
- **Upload**: a drag-and-drop area with a preview of the file (PDF, image or Markdown), title, auto-generated slug, description, category, multi-select tags with inline creation, featured and publish toggles, a progress bar, validation errors, a success state and "upload another".
- **Materials**: a responsive table (title, category, tags, type, size, status, views, downloads, upload date) with search, filters for category, status and type, and pagination. Admins can edit metadata, change category and tags, publish or unpublish, feature or unfeature, re-upload the file, and delete with confirmation.
- **Categories and tags**: create, edit and delete, with usage counts. Deleting an item that is in use requires confirmation. For a category, you choose where its materials and quizzes move to. For a tag, it is detached from its materials.
- **Quizzes**: create and edit a quiz with its title, description, category and publish status, plus multiple-choice questions, options, the correct answer and an explanation. Questions can be reordered.
- **Audit log** entries for every create, update, delete and login event.

## Tech stack

| Layer | Choice |
| --- | --- |
| Framework | **Next.js 16** (App Router), React 19, TypeScript (strict) |
| Styling | Tailwind CSS 4: navy primary, teal accents, system sans-serif type |
| Backend | Next.js **Route Handlers** only (no Express, FastAPI or Django) |
| Database | **PostgreSQL 16** with **Prisma 7** (`@prisma/adapter-pg`) |
| Auth | **Auth.js** (next-auth v5) Credentials provider, encrypted JWT in an HTTP-only cookie, bcrypt cost 12 |
| Validation | **Zod 4** on every API request, with **React Hook Form** (+ zod resolver) for admin forms |
| Viewers | react-pdf (pdf.js 6), a custom zoomable image viewer, react-markdown (raw HTML disabled) |
| Storage | Local VPS disk outside the web root, behind a `StorageService` interface (S3/MinIO-ready) |
| Ops | Docker multi-stage image, Docker Compose (app, PostgreSQL, Nginx), Certbot on the host |

## Project structure

```
├── Dockerfile                    # deps → builder → tools (migrations/seed) | runner (production)
├── docker-compose.yml            # db, migrate (one-off), app, nginx
├── docker/nginx/                 # site templates (HTTP bootstrap + HTTPS) and the selector script
├── docs/                         # DEPLOYMENT.md (VPS), TESTING.md (checklist), RENDER.md (optional)
├── prisma/
│   ├── schema.prisma             # User, Category, Tag, Material, MaterialTag, Quiz, Question, AnswerOption, AuditLog
│   ├── migrations/               # SQL migrations (incl. pg_trgm search indexes)
│   └── seed.ts                   # ONE admin from env + subject categories (+ optional demo content)
├── public/                       # static assets (pdf.js runtime copied into public/pdfjs on install)
├── uploads/                      # local-dev upload directory (git-ignored, outside public/)
├── scripts/                      # backup.sh, restore.sh, create-admin.ts, cleanup-orphans.ts, …
├── tests/                        # unit tests (node:test)
└── src/
    ├── app/
    │   ├── (student)/            # /, /subjects, /subjects/[slug], /library, /materials/[slug],
    │   │                         #   /quizzes, /quizzes/[slug], /disclaimer
    │   ├── admin/                # /admin/login, dashboard, upload, materials, materials/[id],
    │   │                         #   categories, tags, quizzes, quizzes/new, quizzes/[id]
    │   ├── api/                  # auth/, materials/, categories/, tags/, quizzes/, files/, admin/
    │   ├── sitemap.ts, robots.ts
    │   └── layout.tsx            # global metadata + "%s | Medical Student Resource Hub" titles
    ├── components/
    │   ├── ui/                   # Button, Input/Textarea/Select (Field), MultiSelect, Switch, Badge, Card,
    │   │                         #   Modal, Drawer, Table, Pagination, Tabs, Toast, Skeleton, EmptyState,
    │   │                         #   ErrorState, FileUploadArea, FileTypeIcon, Breadcrumbs, Logo
    │   ├── student/              # SearchBar, FilterSidebar, CategoryFilter, TagFilter, MaterialCard,
    │   │                         #   ResourceGallery, PdfViewer, ImageViewer, MarkdownViewer, QuizPlayer, …
    │   ├── admin/                # AdminMaterialsTable, AdminQuizzesTable, CategoryManager, TagManager, …
    │   ├── forms/                # LoginForm, MaterialUploadForm, MaterialEditForm, CategoryForm, TagForm, QuizForm
    │   └── layout/               # StudentNavbar, Footer, AdminSidebar, AdminShell, MobileMenu
    ├── lib/
    │   ├── auth/                 # Auth.js config, password hashing, guards
    │   ├── db/                   # Prisma client
    │   ├── validation/           # Zod schemas (auth, material, taxonomy, quiz)
    │   ├── files/                # type rules, signature validation, storage service (local driver)
    │   ├── services/             # material, taxonomy, quiz, stats, audit (business logic)
    │   ├── http/                 # JSON envelope/errors, CSRF origin check, upload helpers, client fetch
    │   ├── seo/                  # site config, metadata + JSON-LD helpers
    │   ├── utils/                # slugify, formatting, rate limiter
    │   └── env.ts                # Zod-validated environment
    ├── hooks/                    # useFileDrop, useElementWidth
    ├── types/                    # DTOs + Auth.js type augmentation
    ├── styles/globals.css
    └── proxy.ts                  # middleware: /admin + /api/admin protection, CSP nonce
```

## Local development

**Requirements:** Node.js 22.12 or newer, npm 10, and PostgreSQL 14 or newer.

```bash
git clone <your-repo-url> resource-hub
```

```bash
cd resource-hub
```

```bash
npm install
```

`npm install` also runs `prisma generate` and copies the pdf.js assets.

```bash
cp .env.example .env
```

Edit `.env` and set `DATABASE_URL`, `AUTH_SECRET` (`openssl rand -base64 48`), `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD`. Optionally set `SEED_DEMO_CONTENT=true` for sample content.

**PostgreSQL**, if you don't have one running:

```bash
docker run -d --name hub-pg -e POSTGRES_USER=resource_hub -e POSTGRES_PASSWORD=devpass -e POSTGRES_DB=resource_hub -p 127.0.0.1:5432:5432 postgres:16-alpine
```

…with `DATABASE_URL="postgresql://resource_hub:devpass@localhost:5432/resource_hub?schema=public"`.

**Migrate, seed, run:**

```bash
npm run db:migrate
```

```bash
npm run db:seed
```

```bash
npm run dev
```

Then open the student site at <http://localhost:3000> and the admin area at <http://localhost:3000/admin>.

## Database: schema, migrations, seed

| Model | Key fields |
| --- | --- |
| `User` | email, passwordHash (bcrypt), name, role (`ADMIN` only), timestamps |
| `Category` | name, slug, description, displayOrder, timestamps → materials, quizzes |
| `Tag` | name, slug, timestamps → materials |
| `Material` | title, slug, description, **fileUrl** (`/api/files/<id>`), **storedFileName** (private storage key), **originalFileName**, fileType (`PDF`/`IMAGE`/`MARKDOWN`), fileSize, mimeType, **isPublished**, **isFeatured**, viewCount, downloadCount, categoryId, uploadedById, timestamps |
| `MaterialTag` | materialId + tagId (composite primary key) |
| `Quiz` | title, slug, description, categoryId, isPublished, timestamps → questions |
| `Question` | quizId, questionText, explanation, order, timestamps → options |
| `AnswerOption` | questionId, optionText, isCorrect, order |
| `AuditLog` | adminId, action, entityType, entityId, metadata (JSON), createdAt |

**Migration commands**

| Task | Command |
| --- | --- |
| Create a migration after changing the schema (development) | `npm run db:migrate -- --name describe_change` |
| Apply migrations (production / CI) | `npm run db:deploy` |
| Check migration status | `npx prisma migrate status` |
| Regenerate the client | `npx prisma generate` |

In Docker, the `migrate` service runs `prisma migrate deploy` on every `docker compose up`, and the app starts only after it succeeds.

**Seed (`npm run db:seed`)**
- Creates **one** admin from `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD` and `SEED_ADMIN_NAME`. Nothing is hard-coded. The password must be 12–72 characters with upper case, lower case and a digit.
- Never modifies an existing admin. Also creates the 12 standard subject categories.
- `SEED_DEMO_CONTENT=true` adds sample materials and a 5-question quiz, but only to an empty library.

**More admins or a password reset** (the password is prompted with hidden input, or read from `ADMIN_PASSWORD`):

```bash
npm run admin:create -- --email someone@example.org --name "Dr Someone"
```

## File storage

| Variable | Default | Meaning |
| --- | --- | --- |
| `UPLOAD_DIR` | `./uploads` (Docker: `/data/uploads`) | Storage root, **outside `public/`** |
| `MAX_UPLOAD_SIZE_MB` | `25` | Per-file limit (1–1024) |
| `NGINX_CLIENT_MAX_BODY_SIZE` | `30m` | Nginx hard cap. Keep it slightly above the app limit. |
| `UPLOAD_RATE_LIMIT_MAX` / `_WINDOW_MINUTES` | `30` / `10` | Uploads per admin per window |

**Supported types:** PDF, PNG, JPG/JPEG, WEBP and Markdown. Anything else is rejected.

How files are stored and served:
- **Stored filenames** look like `YYYY/MM/<uuid>.<ext>`. They are generated on the server and unguessable. The original filename is kept only for display and for download names.
- **Writes are atomic** (a temp file, then rename). Files have mode `0640` and are owned by the non-root `node` user in Docker.
- **Serving:** files leave the server only through `GET /api/files/:id`.
  - Published materials can be viewed inline (PDF and images) or downloaded.
  - Drafts are visible only to signed-in admins, as an inline preview. Downloads require the material to be published.
  - Anything else returns 404.
- **Deleting** a material removes the database row and then the physical file. Re-uploading writes the new file first and deletes the old one afterwards.
- **Checking consistency:** `npm run storage:cleanup` reports orphaned files and missing files, and deletes orphans when you add `-- --delete`.
- **S3 or MinIO later:** implement `StorageService` (`src/lib/files/storage/types.ts`) and register it in `src/lib/files/storage/index.ts`. Nothing else changes.

## API reference

Responses use one envelope: `{ "data": …, "meta"?: … }` on success, or `{ "error": { "code", "message", "details"? } }` on failure. Status codes: 400, 401, 403, 404, 409, 413 (too large), 415 (unsupported type), 422 (Zod field errors), 429 (with `Retry-After`) and 500 (with a reference id; details are logged on the server only).

**Public**

| Method & path | Description |
| --- | --- |
| `GET /api/materials` | Published only. Query: `q`, `category`, `tag` (repeatable, AND), `type` (`pdf`/`image`/`markdown`), `since` (`7d`/`30d`/`90d`/`365d`), `featured=true`, `sort` (`newest`/`views`/`downloads`/`title`), `page`, `pageSize` ≤ 50 |
| `GET /api/materials/:slug` | One published material |
| `POST /api/materials/:id/view` | Counts a view (deduplicated per IP for 30 minutes) |
| `POST /api/materials/:id/download` | Counts a download (deduplicated per IP for 30 minutes) |
| `GET /api/categories` | Categories with published material and quiz counts |
| `GET /api/tags` | Tags used by published materials |
| `GET /api/quizzes?category=` | Published quizzes |
| `GET /api/quizzes/:slug` | Questions and options, **without** correct answers or explanations |
| `POST /api/quizzes/:slug/submit` | `{ answers: [{ questionId, optionId }] }` returns correctness, the correct option and the explanation for each answer. Rate-limited. |
| `GET /api/files/:id[?download=1]` | Access-controlled file streaming (supports Range and ETag) |
| `GET /api/health` | Liveness and database check |

**Auth**

| Method & path | Description |
| --- | --- |
| `POST /api/auth/login` | `{ email, password }`. Sets the session cookie. Rate-limited. |
| `POST /api/auth/logout` | Clears the session |
| `GET /api/auth/session` | `{ user }`, or `{ user: null }` |

**Admin** (protected by the middleware **and** by `requireAdmin()` in every handler: valid session, ADMIN role, same-origin check, Zod validation, audit log)

| Method & path | Description |
| --- | --- |
| `GET /api/admin/dashboard` | Totals, recent uploads, recent activity |
| `POST /api/admin/materials/upload` | multipart: `file`, `title`, `slug?`, `description`, `categoryId`, `tagIds` (repeatable), `isPublished`, `isFeatured` |
| `GET /api/admin/materials` | Includes drafts. Query as for the public list, plus `status=published\|draft` |
| `GET` / `PATCH` / `DELETE /api/admin/materials/:id` | Read, update (any subset of metadata and flags), or delete (record and file) |
| `PUT /api/admin/materials/:id/file` | Re-upload the file |
| `GET` / `POST /api/admin/categories`, `PATCH` / `DELETE /api/admin/categories/:id[?moveTo=<id>]` | A non-empty category needs `moveTo` |
| `GET` / `POST /api/admin/tags`, `PATCH` / `DELETE /api/admin/tags/:id[?confirm=true]` | A tag in use needs `confirm=true`. POST is idempotent. |
| `GET` / `POST /api/admin/quizzes`, `GET` / `PATCH` / `DELETE /api/admin/quizzes/:id` | Sending `questions` in a PATCH replaces them all, in the given order |

Auth.js's internal endpoints live at `/api/authjs/*`.

## Security

| Area | Implementation |
| --- | --- |
| **Passwords** | bcrypt (cost 12). A dummy hash is compared for unknown emails so response timing doesn't reveal which accounts exist. Login errors are generic. |
| **Session cookie** | An encrypted JWT in an `HttpOnly`, `SameSite=Lax` cookie. With an `https://` `APP_URL` it is also `Secure` and `__Secure-` prefixed. Lifetime is 8 hours by default. |
| **Middleware** | `src/proxy.ts` verifies the session token on every `/admin/*` page (redirecting to login) and every `/api/admin/*` route (JSON 401) before any route code runs. |
| **Authorization** | `requireAdmin()` in every admin handler re-checks the database, so a deleted account stops working immediately. Only the `ADMIN` role exists, and only ADMIN accounts can sign in. |
| **CSRF** | SameSite cookies, plus a check that the `Origin` of every mutating request matches `APP_URL`. |
| **Rate limiting** | Login is limited per email+IP and per IP. That check runs inside `authorize()`, so Auth.js's own endpoint can't bypass it. Uploads are limited per admin, quiz submissions per IP, and view/download counters are deduplicated. Nginx adds `limit_req` zones for login, uploads and the API. |
| **Upload validation** | The file must pass the extension allow-list, the MIME allow-list and a magic-byte signature check, and all three must agree. The size limit is checked on `Content-Length`, on the actual file, and by Nginx. SVG, HTML, Office files and anything unrecognised are rejected. |
| **Path traversal** | Storage keys are generated on the server, must match a strict pattern, and must resolve inside the storage root. They never come from the URL. |
| **File access** | Files are served only through `/api/files/:id`. Drafts return 404 to anyone who isn't an admin. Responses carry `nosniff`, a safe `Content-Disposition`, and a sandboxed CSP for images and text. Markdown is rendered with raw HTML disabled, and `javascript:` links are neutralised. |
| **Headers** | A per-request nonce CSP with `strict-dynamic` (no `unsafe-inline` scripts), `X-Frame-Options: DENY`, `Referrer-Policy`, `Permissions-Policy` and COOP. HSTS is set by Nginx. Admin pages are `no-store` and `noindex`. |
| **Errors** | Unexpected errors return a reference id only. Stack traces and SQL are logged on the server and never sent to the client. |
| **Secrets** | All secrets come from environment variables, which are validated at startup and never exposed to client code. |
| **Infrastructure** | Containers run as non-root. PostgreSQL and the app are not published to the host; only Nginx (80/443) is. Containers use `restart: unless-stopped` and have healthchecks. |

Before going live, work through the go-live checklist in [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md#14-go-live-checklist).

## Backup & restore

Back up **both** the PostgreSQL database and the uploaded files, taken from the same moment:

```bash
./scripts/backup.sh
```

This writes `backups/db-<UTC>.dump` and `backups/uploads-<UTC>.tar.gz`, checks that both are readable, and prunes old backups.

```bash
./scripts/restore.sh backups/db-<UTC>.dump backups/uploads-<UTC>.tar.gz
```

The restore replaces the database and all files, after you confirm.

[docs/DEPLOYMENT.md](docs/DEPLOYMENT.md#11-backups) covers scheduling, off-site copies and restore testing.

## Deployment

- **Ubuntu VPS** (DigitalOcean, Hetzner or similar) with Docker Compose, Nginx and Certbot: follow [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).
- **Render (optional):** see [docs/RENDER.md](docs/RENDER.md). Its local disk is ephemeral, so you need object storage or a persistent disk.

## Testing

```bash
npm run typecheck
```

```bash
npm run lint
```

```bash
npm test
```

`npm test` runs unit tests for upload validation, storage keys, rate limiting, query parsing and quiz rules.

```bash
npm run build
```

[docs/TESTING.md](docs/TESTING.md) has the full manual and functional testing checklist covering security, admin, student, accessibility, SEO and deployment.

## Troubleshooting

| Symptom | Fix |
| --- | --- |
| `Invalid server environment configuration` | A required variable is missing; the message names it. Compare with `.env.example`. |
| Login says "Too many failed attempts" | Wait for the window to pass, or restart the app (the limiter is in memory). |
| Login fails only behind Nginx | `APP_URL` must exactly match the public origin (scheme and host). |
| HTML 413 page from Nginx on upload | Raise `NGINX_CLIENT_MAX_BODY_SIZE` above `MAX_UPLOAD_SIZE_MB`, then `docker compose restart nginx`. |
| "File content … does not match its extension" | The file really is a different type from its name. |
| PDF viewer stays blank | Check that `public/pdfjs/` exists (`npm install` creates it), then look in the browser console. |
| Nginx serves HTTP only | No certificate found for `$DOMAIN` yet. Run the Certbot step, then `docker compose restart nginx`. |
