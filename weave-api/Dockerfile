# syntax=docker/dockerfile:1
#
# BuildKit cache mounts speed up repeated `npm ci` / builds.
# Pair with `weave-api/.dockerignore` to keep the build context small.

# ============================
# STAGE 1: Build
# ============================
FROM node:24-alpine AS builder

RUN apk add --no-cache libc6-compat

WORKDIR /app

COPY package*.json ./
RUN --mount=type=cache,target=/root/.npm \
    npm ci --no-audit --no-fund

COPY . .
RUN npm run build

# Prune devDependencies to keep the production node_modules minimal
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
ENV DOPPLER_CONFIG=prd

COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist

COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh

EXPOSE 8080
ENTRYPOINT ["docker-entrypoint.sh"]
CMD ["doppler", "run", "--project", "weave-api", "--config", "prd", "--", "npm", "start"]
