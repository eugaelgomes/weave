#!/bin/sh
set -e

USE_DOPPLER_FLAG="${USE_DOPPLER:-${DOPPLER_ENABLE:-true}}"

if [ "$USE_DOPPLER_FLAG" = "false" ] || [ "$USE_DOPPLER_FLAG" = "0" ] || [ -z "$DOPPLER_TOKEN" ]; then
  echo "[docker-entrypoint] Running without Doppler..."
  exec "$@"
fi

PROJECT="${DOPPLER_PROJECT:-weave}"
CONFIG="${DOPPLER_CONFIG:-prd}"

echo "[docker-entrypoint] Running command with Doppler (project: $PROJECT, config: $CONFIG)..."
exec doppler run --project "$PROJECT" --config "$CONFIG" -- "$@"
