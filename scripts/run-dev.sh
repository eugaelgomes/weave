#!/bin/bash
set -e

# Support explicit toggle via environment variable USE_DOPPLER or DOPPLER_ENABLE
USE_DOPPLER_FLAG="${USE_DOPPLER:-${DOPPLER_ENABLE:-true}}"

if [ "$USE_DOPPLER_FLAG" = "false" ] || [ "$USE_DOPPLER_FLAG" = "0" ]; then
  echo "[run-dev] USE_DOPPLER=false detected. Starting dev server using local environment (.env)..."
  exec npx turbo dev --env-mode=loose "$@"
fi

if ! command -v doppler &> /dev/null; then
  echo "[run-dev] Doppler CLI not installed. Falling back to local environment (.env)..."
  exec npx turbo dev --env-mode=loose "$@"
fi

DOPPLER_PROJECT="${DOPPLER_PROJECT:-weave}"
DOPPLER_CONFIG="${DOPPLER_CONFIG:-dev}"

if doppler secrets --project "$DOPPLER_PROJECT" --config "$DOPPLER_CONFIG" --only-names &> /dev/null; then
  echo "[run-dev] Starting dev server with Doppler (project: $DOPPLER_PROJECT, config: $DOPPLER_CONFIG)..."
  exec doppler run --project "$DOPPLER_PROJECT" --config "$DOPPLER_CONFIG" -- turbo dev --env-mode=loose "$@"
else
  echo "[run-dev] Doppler authentication/config unavailable for project '$DOPPLER_PROJECT'. Falling back to local .env..."
  exec npx turbo dev --env-mode=loose "$@"
fi
