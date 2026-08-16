#!/bin/sh
set -e

# When the app directory is bind-mounted from the host, image `node_modules` is hidden.
# If the host tree is empty or stale, `npm ci` restores packages from `package-lock.json`
# (no need to run npm on the host for Docker-only workflows).
if [ "${WEAVE_APP_AUTO_DEPS:-0}" = "1" ] && [ -f package-lock.json ]; then
  if ! npm ls --depth=0 >/dev/null 2>&1; then
    echo "weave-app: node_modules out of sync with lockfile — running npm ci..."
    npm ci --no-audit --no-fund
  fi
fi

# CMD is wrapped with `doppler run --` in the Dockerfile; avoid double-wrapping here.
exec "$@"
