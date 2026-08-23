# syntax=docker/dockerfile:1
#
# Pair with `.dockerignore` at root for a smaller build context.

FROM node:24-alpine

WORKDIR /app

RUN apk add --no-cache ca-certificates curl gnupg \
  && curl -fsSL --tlsv1.2 --proto '=https' --retry 3 https://cli.doppler.com/install.sh | sh \
  && apk del curl gnupg \
  && rm -rf /var/cache/apk/*

ENV DOPPLER_CONFIG_DIR=/tmp/.doppler

# Copy root configs
COPY package*.json ./

# Copy packages and worker definition
COPY packages ./packages
COPY weave-worker/package.json ./weave-worker/

# Install dependencies (with workspaces)
RUN --mount=type=cache,target=/root/.npm \
    npm ci --omit=dev --no-audit --no-fund

# Copy worker source
COPY weave-worker ./weave-worker

RUN chmod +x /app/weave-worker/docker-entrypoint.sh

WORKDIR /app/weave-worker
EXPOSE 8081
ENTRYPOINT ["/app/weave-worker/docker-entrypoint.sh"]
CMD ["npm", "start"]
