# syntax=docker/dockerfile:1
#
# Pair with `weave-engine/.dockerignore` for a smaller build context.

FROM node:24-alpine

WORKDIR /app

RUN apk add --no-cache ca-certificates curl gnupg \
  && curl -fsSL --tlsv1.2 --proto '=https' --retry 3 https://cli.doppler.com/install.sh | sh \
  && apk del curl gnupg \
  && rm -rf /var/cache/apk/*

ENV DOPPLER_CONFIG_DIR=/tmp/.doppler
ENV DOPPLER_CONFIG=prd

COPY package*.json ./
RUN --mount=type=cache,target=/root/.npm \
    npm ci --omit=dev --no-audit --no-fund

COPY . .

RUN chmod +x /app/docker-entrypoint.sh

EXPOSE 8082
ENTRYPOINT ["/app/docker-entrypoint.sh"]
CMD ["doppler", "run", "--project", "weave-engine", "--config", "prd", "--", "npm", "start"]
