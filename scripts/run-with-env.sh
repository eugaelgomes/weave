#!/bin/bash
set -e

USE_DOPPLER_FLAG="${USE_DOPPLER:-${DOPPLER_ENABLE:-true}}"
DOPPLER_PROJECT="${DOPPLER_PROJECT:-weave}"
DOPPLER_CONFIG="${DOPPLER_CONFIG:-dev}"

if [ "$USE_DOPPLER_FLAG" != "false" ] && [ "$USE_DOPPLER_FLAG" != "0" ] && command -v doppler &> /dev/null && doppler secrets --project "$DOPPLER_PROJECT" --config "$DOPPLER_CONFIG" --only-names &> /dev/null; then
  exec doppler run --project "$DOPPLER_PROJECT" --config "$DOPPLER_CONFIG" -- "$@"
else
  exec "$@"
fi
