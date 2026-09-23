# syntax=docker/dockerfile:1
#
# BuildKit cache mounts speed up repeated `npm ci` / builds.
# Pair with `.dockerignore` at root to keep the build context small.

# ============================
# STAGE 1: Build
# ============================
FROM node:24-alpine AS builder

RUN apk add --no-cache libc6-compat git

WORKDIR /app

# Copy root configs
COPY package*.json ./

# Copy packages and web definition
COPY packages ./packages
COPY web/package.json ./web/

# Install all dependencies (with workspaces)
RUN --mount=type=cache,target=/root/.npm \
    npm ci --ignore-scripts --no-audit --no-fund

# Copy web source
COPY web ./web

# Build
WORKDIR /app/web
RUN npm run build

# Prune dev dependencies at root
WORKDIR /app
RUN npm prune --omit=dev --no-audit

# ============================
# STAGE 2: Production
# ============================
FROM node:24-alpine

WORKDIR /app

RUN apk add --no-cache ca-certificates curl gnupg git \
  && curl -fsSL --tlsv1.2 --proto '=https' --retry 3 https://cli.doppler.com/install.sh | sh \
  && apk del curl gnupg \
  && rm -rf /var/cache/apk/*

ENV DOPPLER_CONFIG_DIR=/tmp/.doppler

# Copy node_modules from builder
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/packages ./packages

# Copy the built web app
COPY --from=builder /app/web/package*.json ./web/
COPY --from=builder /app/web/next.config.ts ./web/
COPY --from=builder /app/web/public ./web/public
COPY --from=builder /app/web/.next ./web/.next

# Entrypoint
COPY web/docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

RUN addgroup --system --gid 1001 nodejs \
  && adduser --system --uid 1001 nextjs \
  && chown -R nextjs:nodejs /app

USER nextjs

WORKDIR /app/web
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["npm", "start"]
