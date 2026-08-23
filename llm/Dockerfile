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

# Copy packages and Engine definition
COPY packages ./packages
COPY weave-engine/package.json ./weave-engine/

# Install all dependencies (with workspaces)
RUN --mount=type=cache,target=/root/.npm \
    npm ci --no-audit --no-fund

# Copy Engine source
COPY weave-engine ./weave-engine

# Build
WORKDIR /app/weave-engine
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

# Copy the built engine
COPY --from=builder /app/weave-engine/package*.json ./weave-engine/
COPY --from=builder /app/weave-engine/dist ./weave-engine/dist

# Entrypoint
COPY weave-engine/docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

WORKDIR /app/weave-engine
EXPOSE 8082
ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["npm", "start"]
