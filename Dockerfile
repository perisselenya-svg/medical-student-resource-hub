# syntax=docker/dockerfile:1.7
# Multi-stage build:
#   deps    – install all dependencies (also runs prisma generate + pdf.js asset copy)
#   builder – compile the Next.js standalone server
#   tools   – full toolchain for migrations, seeding and admin scripts (one-off containers)
#   runner  – minimal production image (default target)

FROM node:22-bookworm-slim AS base
ENV NEXT_TELEMETRY_DISABLED=1
WORKDIR /app
# Upload storage lives OUTSIDE the app/web root and is owned by the unprivileged
# "node" user, so a named volume mounted here inherits safe ownership.
RUN mkdir -p /data/uploads && chown -R node:node /data && chmod 750 /data/uploads

FROM base AS deps
COPY package.json package-lock.json prisma.config.ts ./
COPY prisma ./prisma
COPY scripts/copy-pdf-assets.mjs ./scripts/copy-pdf-assets.mjs
RUN npm ci

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate && node scripts/copy-pdf-assets.mjs && npm run build

FROM base AS tools
ENV NODE_ENV=production
COPY --from=builder --chown=node:node /app ./
USER node
CMD ["npx", "prisma", "migrate", "deploy"]

FROM base AS runner
ENV NODE_ENV=production \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    UPLOAD_DIR=/data/uploads
COPY --from=builder --chown=node:node /app/public ./public
COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static
# Never run as root.
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "server.js"]
