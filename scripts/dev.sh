#!/bin/bash
# Usage: ./scripts/dev.sh <service> [port]
# Example: ./scripts/dev.sh weave-api 8080

SERVICE=$1
PORT=$2

if [ -z "$SERVICE" ]; then
  echo "Usage: $0 <service> [port]"
  exit 1
fi

echo "Stopping $SERVICE..."

if [ -n "$PORT" ]; then
  fuser -k "$PORT/tcp" 2>/dev/null && echo "Killed port $PORT" || true
fi

pkill -f "$SERVICE" 2>/dev/null && echo "Killed $SERVICE processes" || true

sleep 0.5

echo "Starting $SERVICE..."
cd "$SERVICE" && npm run dev:doppler
