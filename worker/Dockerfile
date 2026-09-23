# syntax=docker/dockerfile:1
#
# Pair with `.dockerignore` at root for a smaller build context.

FROM node:24-alpine

WORKDIR /app

RUN apk add --no-cache ca-certificates curl gnupg git \
  && curl -fsSL --tlsv1.2 --proto '=https' --retry 3 https://cli.doppler.com/install.sh | sh \
  && apk del curl gnupg \
  && rm -rf /var/cache/apk/*

ENV DOPPLER_CONFIG_DIR=/tmp/.doppler

# Copy root configs
COPY package*.json ./

# Copy packages and worker definition
COPY packages ./packages
COPY worker/package.json ./worker/

# Install dependencies (with workspaces)
RUN --mount=type=cache,target=/root/.npm \
    npm ci --omit=dev --no-audit --no-fund

# Copy worker source
COPY worker ./worker

RUN chmod +x /app/worker/docker-entrypoint.sh

WORKDIR /app/worker
EXPOSE 8081
ENTRYPOINT ["/app/worker/docker-entrypoint.sh"]
CMD ["npm", "start"]
