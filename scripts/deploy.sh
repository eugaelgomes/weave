#!/bin/bash
set -e

# Local deploy script for The Weave services
# Auto-fetches deployment environment variables from Doppler (prd)

SERVICE=${1:-all}
HOST=$2
USER=$3

# Load .env.deploy if present locally
if [ -f .env.deploy ]; then
  set -a
  source .env.deploy
  set +a
fi

# Fetch from Doppler (prd) if Doppler CLI is installed
fetch_doppler_sec() {
  local prj=$1
  local secret_name=$2
  if command -v doppler >/dev/null 2>&1; then
    doppler secrets get "$secret_name" --project "$prj" --config prd --plain 2>/dev/null || true
  fi
}

if [ "$SERVICE" = "all" ]; then
  echo "🚀 Deploying ALL services to production..."
  "$0" engine "$HOST" "$USER"
  "$0" server "$HOST" "$USER"
  "$0" worker "$HOST" "$USER"
  echo "🎉 All services deployed successfully!"
  exit 0
fi

case "$SERVICE" in
  engine)
    IMAGE_TAG="ghcr.io/eugaelgomes/weave-engine:latest"
    DIR="weave-engine"
    COMPOSE="compose.engine.yml"
    TARGET_HOST=${HOST:-${ENGINE_REMOTE_HOST:-$(fetch_doppler_sec weave-engine ENGINE_REMOTE_HOST)}}
    TARGET_USER=${USER:-${ENGINE_REMOTE_USER:-$(fetch_doppler_sec weave-engine ENGINE_REMOTE_USER)}}
    TARGET_USER=${TARGET_USER:-ubuntu}
    APP_DIR=${ENGINE_APP_DIR:-"/home/$TARGET_USER/weave-engine"}
    DOPPLER_TOKEN_VAL=${ENGINE_DOPPLER_TOKEN:-$DOPPLER_TOKEN}
    ADDITIONAL_FILES=""
    ;;
  server|api)
    SERVICE="server"
    IMAGE_TAG="ghcr.io/eugaelgomes/weave-api:latest"
    DIR="weave-api"
    COMPOSE="compose.server.yml"
    TARGET_HOST=${HOST:-${SERVER_REMOTE_HOST:-$(fetch_doppler_sec weave-api SERVER_REMOTE_HOST)}}
    TARGET_USER=${USER:-${SERVER_REMOTE_USER:-$(fetch_doppler_sec weave-api SERVER_REMOTE_USER)}}
    TARGET_USER=${TARGET_USER:-ubuntu}
    APP_DIR=${SERVER_APP_DIR:-"/home/$TARGET_USER/weave-server"}
    DOPPLER_TOKEN_VAL=${SERVER_DOPPLER_TOKEN:-$DOPPLER_TOKEN}
    ADDITIONAL_FILES="Caddyfile"
    ;;
  worker)
    IMAGE_TAG="ghcr.io/eugaelgomes/weave-worker:latest"
    DIR="weave-worker"
    COMPOSE="compose.worker.yml"
    TARGET_HOST=${HOST:-${WORKER_REMOTE_HOST:-$(fetch_doppler_sec weave-worker WORKER_REMOTE_HOST)}}
    TARGET_USER=${USER:-${WORKER_REMOTE_USER:-$(fetch_doppler_sec weave-worker WORKER_REMOTE_USER)}}
    TARGET_USER=${TARGET_USER:-ubuntu}
    APP_DIR=${WORKER_APP_DIR:-"/home/$TARGET_USER/weave-worker"}
    DOPPLER_TOKEN_VAL=${WORKER_DOPPLER_TOKEN:-$DOPPLER_TOKEN}
    ADDITIONAL_FILES=""
    ;;
  *)
    echo "Unknown service: $SERVICE. Valid options: all, engine, server, worker"
    exit 1
    ;;
esac

if [ -z "$TARGET_HOST" ]; then
  echo "Error: Remote host not found for $SERVICE."
  echo "Make sure Doppler is configured or set ${SERVICE^^}_REMOTE_HOST in .env.deploy."
  exit 1
fi

echo "=================================================="
echo "▶ Deploying $SERVICE to $TARGET_USER@$TARGET_HOST ($APP_DIR)"
echo "=================================================="

echo "▶ 1/5 Building $SERVICE image locally (linux/amd64)..."
docker build --platform linux/amd64 -t "$IMAGE_TAG" "./$DIR"

echo "▶ 2/5 Pushing image to GHCR..."
docker push "$IMAGE_TAG"

echo "▶ 3/5 Creating remote directory..."
ssh "$TARGET_USER@$TARGET_HOST" "mkdir -p $APP_DIR"

echo "▶ 4/5 Copying compose file(s)..."
scp $COMPOSE $ADDITIONAL_FILES "$TARGET_USER@$TARGET_HOST:$APP_DIR/"

echo "▶ 5/5 Deploying container on server..."
ssh "$TARGET_USER@$TARGET_HOST" "bash -s" <<EOF
set -e
cd "$APP_DIR"
if [ -n "$DOPPLER_TOKEN_VAL" ]; then
  echo "DOPPLER_TOKEN=$DOPPLER_TOKEN_VAL" > .env
fi

[ -f /etc/profile ] && . /etc/profile
[ -f "\$HOME/.profile" ] && . "\$HOME/.profile"
export PATH="/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:/snap/bin:\$PATH"

if command -v docker >/dev/null 2>&1 && docker compose version >/dev/null 2>&1; then
  COMPOSE_CMD="docker compose"
else
  COMPOSE_CMD="docker-compose"
fi

\$COMPOSE_CMD -f $COMPOSE pull
\$COMPOSE_CMD -f $COMPOSE up -d
docker image prune -f || true
EOF

echo "✔ Service '$SERVICE' deployed successfully to $TARGET_USER@$TARGET_HOST!"
