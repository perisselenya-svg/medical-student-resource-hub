# Testing checklist

Run the automated checks first, then go through the manual checklist against a seeded environment. For local runs, set `SEED_DEMO_CONTENT=true` and run `npm run db:seed` beforehand.

## Automated

| Check | Command | Expected |
| --- | --- | --- |
| Types | `npm run typecheck` | no errors |
| Lint (incl. React Compiler rules) | `npm run lint` | no errors or warnings |
| Unit tests | `npm test` | all pass (upload validation, storage keys, rate limiter, query parsing, quiz rules) |
| Production build | `npm run build` | succeeds; every route listed |
| Migrations | `npx prisma migrate status` | "Database schema is up to date" |
| Storage consistency | `npm run storage:cleanup` | `orphaned files: 0 · missing files: 0` |

## Authentication and authorization

- [ ] `/admin/dashboard` while logged out redirects to `/admin/login?next=/admin/dashboard`, and after login you land on the requested page.
- [ ] `curl -i <url>/api/admin/dashboard` with no cookie returns **401 JSON**. A forged `authjs.session-token` cookie also returns 401.
- [ ] A wrong password shows "Invalid email or password". An unknown email shows the same message.
- [ ] The 6th failed login within 15 minutes from one IP returns **429** with `Retry-After`. The same happens when posting directly to `/api/authjs/callback/credentials`.
- [ ] Over HTTPS, the session cookie is `HttpOnly`, `Secure`, `SameSite=Lax` and named `__Secure-authjs.session-token`.
- [ ] A POST/PATCH/DELETE to an admin API with `Origin: https://evil.example` returns **403**.
- [ ] Logging out clears the session (`GET /api/auth/session` returns `{ user: null }`).
- [ ] Deleting an admin's database row revokes that admin's access on their next request.

## Uploads and files

- [ ] PDF, PNG, JPG, JPEG, WEBP and Markdown files upload successfully.
- [ ] These are rejected with **415**: a `.docx`, an `.exe`, an SVG, an HTML file renamed to `.pdf`, a PDF renamed to `.png`, and a binary renamed to `.md`.
- [ ] A file larger than `MAX_UPLOAD_SIZE_MB` (default 25 MB) is rejected with **413**, with a friendly message in the UI.
- [ ] The 31st upload within 10 minutes is rejected with **429**.
- [ ] The stored filename is `YYYY/MM/<uuid>.<ext>` under `UPLOAD_DIR`, and the original filename is shown in the admin view.
- [ ] A draft file at `/api/files/<id>` returns **404** when logged out. When logged in it shows inline, and `?download=1` returns **403**.
- [ ] A published file shows inline (PDF and images) and downloads with `?download=1`. Responses include `X-Content-Type-Options: nosniff`.
- [ ] Re-uploading replaces the file and removes the old one from disk.
- [ ] Deleting a material removes the database record **and** the physical file, and `/api/files/<id>` then returns 404.
- [ ] A Markdown file containing `<script>` or a `javascript:` link renders as plain content, with no script and no live link.

## Admin features

- [ ] The dashboard shows totals for materials, published, drafts, categories, tags, views, downloads and quizzes, plus the recent uploads table and the audit log tab (keyboard: arrow keys switch tabs).
- [ ] Upload page:
  - [ ] Drag-and-drop and click-to-browse both work.
  - [ ] The preview appears (image thumbnail, rendered PDF, rendered Markdown).
  - [ ] The title is prefilled from the filename and the slug follows it.
  - [ ] Validation errors appear for a missing title, category or file.
  - [ ] The progress bar moves, the success screen appears, and "Upload another file" resets the form.
- [ ] Inline tag creation: typing a new tag and pressing Enter creates it once. Typing it again with different case reuses the existing tag.
- [ ] Materials table:
  - [ ] Search and the category, status and type filters work, along with pagination.
  - [ ] Publish/unpublish and feature/unfeature update instantly.
  - [ ] Edit and re-upload work, and delete asks for confirmation.
- [ ] A duplicate slug shows "Slug already in use" on the slug field.
- [ ] Categories:
  - [ ] Create, edit and reorder work.
  - [ ] Deleting an empty category works directly.
  - [ ] Deleting a non-empty category requires choosing a destination, and its content moves there.
- [ ] Tags:
  - [ ] Create and rename work, and counts are shown.
  - [ ] Deleting a tag that is in use warns first, and the materials keep everything except that tag.
- [ ] Quizzes:
  - [ ] You can create a quiz with several questions and options, mark the correct answers, add explanations, and reorder questions with ↑/↓.
  - [ ] Publishing without questions is blocked, and invalid questions show an error summary.
  - [ ] Publish/unpublish from the list works, and delete works.
- [ ] Every create, update and delete action, and every login, appears in the audit log.

## Student features

- [ ] The home page shows the exact headline *"Organized high-yield resources for medical students."*, the search bar, the featured, popular, subject and latest sections, and the disclaimer *"For educational purposes only. Not a substitute for clinical judgment."*
- [ ] Subjects shows a grid with published counts. Each subject page is titled "X Notes | Medical Student Resource Hub".
- [ ] Library:
  - [ ] Keyword search covers title, description, tags and category.
  - [ ] Filters for subject, tag (AND), file type and date work.
  - [ ] Sorting works: newest, most viewed, most downloaded, A–Z.
  - [ ] Pagination works, and the URL keeps the full state (reloading or sharing gives the same results).
  - [ ] The empty state, loading skeleton and error state all appear when appropriate.
- [ ] Cards show the title, subject, tags, file-type icon, short description, views and upload date.
- [ ] Resource page:
  - [ ] PDFs show in the embedded viewer (page navigation, zoom, works on mobile), images in the image viewer (zoom with buttons, +/- keys and double-tap), and Markdown as rendered notes.
  - [ ] The download button works and the count increases (once per 30 minutes per IP).
  - [ ] Related resources and the disclaimer appear.
- [ ] Draft materials and draft quizzes return 404 to students on every page and API.
- [ ] Quiz:
  - [ ] Questions appear one at a time with a progress bar. Submitting shows correct/incorrect with the explanation.
  - [ ] At the end you get a final score, can review answers, and can retake the quiz.
  - [ ] `GET /api/quizzes/<slug>` does not include `isCorrect` or explanations.

## Accessibility

- [ ] Every page can be used with the keyboard alone, and the "Skip to main content" link works.
- [ ] Focus is visible everywhere (teal outline).
- [ ] Modals and drawers trap focus, close with Esc, and return focus to the element that opened them.
- [ ] Form fields have visible labels, and errors are announced (`role="alert"`) and linked through `aria-describedby`.
- [ ] Images have alt text, generated from the title and description.
- [ ] Contrast passes a WCAG AA checker (for example, the axe DevTools extension).
- [ ] At 390 px width there is no horizontal scrolling on any student page.

## SEO

- [ ] Every public page has a unique `<title>` ("… | Medical Student Resource Hub"), a meta description, a canonical link, Open Graph tags and a Twitter card.
- [ ] Resource pages include `LearningResource` JSON-LD, quiz pages `Quiz` JSON-LD, and the home page `WebSite` JSON-LD with `SearchAction`.
- [ ] `/sitemap.xml` lists only published materials and quizzes. `/robots.txt` disallows `/admin` and `/api/`.

## Deployment

- [ ] `docker compose up -d --build` runs the migrations, and all services become healthy.
- [ ] HTTP redirects to HTTPS, HSTS is present, and `certbot renew --dry-run` succeeds.
- [ ] After a reboot, every service comes back on its own.
- [ ] `scripts/backup.sh`, followed by `scripts/restore.sh`, reproduces the same data and files.
