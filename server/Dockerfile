# syntax=docker/dockerfile:1
#
# BuildKit cache mounts speed up repeated `npm ci` / builds.
# Pair with `.dockerignore` at root to keep the build context small.

# ============================
# STAGE 1: Build
# ============================
FROM node:24-alpine AS builder

RUN apk add --no-cache libc6-compat

WORKDIR /app

# Copy root configs
COPY package*.json ./

# Copy packages and API definition
COPY packages ./packages
COPY weave-api/package.json ./weave-api/

# Install all dependencies (with workspaces)
RUN --mount=type=cache,target=/root/.npm \
    npm ci --no-audit --no-fund

# Copy API source
COPY weave-api ./weave-api

# Build
WORKDIR /app/weave-api
RUN npm run build

# Prune dev dependencies at root
WORKDIR /app
RUN npm prune --omit=dev --no-audit

# ============================
# STAGE 2: Production
# ============================
FROM node:24-alpine

WORKDIR /app

RUN apk add --no-cache ca-certificates curl gnupg \
  && curl -fsSL --tlsv1.2 --proto '=https' --retry 3 https://cli.doppler.com/install.sh | sh \
  && apk del curl gnupg \
  && rm -rf /var/cache/apk/*

ENV DOPPLER_CONFIG_DIR=/tmp/.doppler

# Copy node_modules from builder
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/packages ./packages

# Copy the built api
COPY --from=builder /app/weave-api/package*.json ./weave-api/
COPY --from=builder /app/weave-api/dist ./weave-api/dist

# Entrypoint
COPY weave-api/docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

WORKDIR /app/weave-api
EXPOSE 8080
ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["doppler", "run", "--project", "theweave", "--config", "prd", "--", "npm", "start"]
