# syntax=docker/dockerfile:1
#
# BuildKit cache mounts speed up dependency installs.
# Pair with `weave-app/.dockerignore` to keep the build context small.

# ===================================================================================
# STAGE 1: Builder
# ===================================================================================
FROM node:24-alpine AS builder

WORKDIR /app

COPY package*.json ./

RUN --mount=type=cache,target=/root/.npm \
    npm ci --no-audit --no-fund

COPY . .

RUN npm run build

# ===================================================================================
# STAGE 2: Production (Next.js)
# ===================================================================================
FROM node:24-alpine AS production

WORKDIR /app

RUN apk add --no-cache ca-certificates curl gnupg \
  && curl -fsSL --tlsv1.2 --proto '=https' --retry 3 https://cli.doppler.com/install.sh | sh \
  && apk del curl gnupg \
  && rm -rf /var/cache/apk/*

ENV DOPPLER_CONFIG_DIR=/tmp/.doppler

COPY package*.json ./
RUN --mount=type=cache,target=/root/.npm \
    npm ci --omit=dev --no-audit --no-fund \
    && npm cache clean --force

COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/next.config.ts ./next.config.ts
COPY --from=builder /app/package.json ./package.json

COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs \
  && chown -R nextjs:nodejs /app

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME=0.0.0.0

ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["doppler", "run", "--project", "theweave", "--config", "prd", "--", "npm", "start"]
