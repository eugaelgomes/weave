#!/bin/sh
set -e

if [ "${WEAVE_APP_AUTO_DEPS:-0}" = "1" ] && [ -f package-lock.json ]; then
  if ! npm ls --depth=0 >/dev/null 2>&1; then
    echo "weave-app: node_modules out of sync with lockfile — running npm ci..."
    npm ci --no-audit --no-fund
  fi
fi

USE_DOPPLER_FLAG="${USE_DOPPLER:-${DOPPLER_ENABLE:-true}}"

if [ "$USE_DOPPLER_FLAG" = "false" ] || [ "$USE_DOPPLER_FLAG" = "0" ] || [ -z "$DOPPLER_TOKEN" ]; then
  echo "[docker-entrypoint] Running without Doppler..."
  exec "$@"
fi

PROJECT="${DOPPLER_PROJECT:-weave}"
CONFIG="${DOPPLER_CONFIG:-prd}"

echo "[docker-entrypoint] Running command with Doppler (project: $PROJECT, config: $CONFIG)..."
exec doppler run --project "$PROJECT" --config "$CONFIG" -- "$@"
