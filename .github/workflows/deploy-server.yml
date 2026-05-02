name: Deploy Server

on:
  push:
    branches:
      - main
    paths:
      - "weave-api/**"
      - "compose.server.yml"
      - ".github/workflows/deploy-server.yml"
  workflow_dispatch:

permissions:
  contents: read

concurrency:
  group: deploy-server-${{ github.ref }}
  cancel-in-progress: true

jobs:
  validate-server:
    name: Validate server
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: weave-api

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
          cache-dependency-path: weave-api/package-lock.json

      - name: Install dependencies
        run: npm ci
        
      - name: Build
        run: npm run build

  deploy-server:
    name: Deploy server
    runs-on: ubuntu-latest
    needs: validate-server
    if: github.ref == 'refs/heads/main'

    steps:
      - name: Validate deploy secrets
        env:
          SERVER_REMOTE_HOST: ${{ secrets.SERVER_REMOTE_HOST }}
          SERVER_REMOTE_USER: ${{ secrets.SERVER_REMOTE_USER }}
          SERVER_SSH_PRIVATE_KEY: ${{ secrets.SERVER_SSH_PRIVATE_KEY }}
          SERVER_APP_DIR: ${{ secrets.SERVER_APP_DIR }}
        run: |
          set -e
          [ -n "$SERVER_REMOTE_HOST" ] || { echo "Missing secret: SERVER_REMOTE_HOST" >&2; exit 1; }
          [ -n "$SERVER_REMOTE_USER" ] || { echo "Missing secret: SERVER_REMOTE_USER" >&2; exit 1; }
          [ -n "$SERVER_SSH_PRIVATE_KEY" ] || { echo "Missing secret: SERVER_SSH_PRIVATE_KEY" >&2; exit 1; }
          [ -n "$SERVER_APP_DIR" ] || { echo "Missing secret: SERVER_APP_DIR" >&2; exit 1; }

      - name: Deploy via SSH
        uses: appleboy/ssh-action@v1.0.3
        with:
          host: ${{ secrets.SERVER_REMOTE_HOST }}
          username: ${{ secrets.SERVER_REMOTE_USER }}
          key: ${{ secrets.SERVER_SSH_PRIVATE_KEY }}
          script: |
            set -e

            APP_DIR="${{ secrets.SERVER_APP_DIR }}"
            if [ -z "$APP_DIR" ]; then
              echo "SERVER_APP_DIR is not set" >&2
              exit 1
            fi

            REPO_URL="https://${{ github.actor }}:${{ secrets.GITHUB_TOKEN }}@github.com/${{ github.repository }}.git"

            mkdir -p "$APP_DIR"
            cd "$APP_DIR"
            if [ -d ".git" ]; then
              git remote set-url origin "$REPO_URL"
            else
              git init
              git remote add origin "$REPO_URL"
            fi
            git fetch origin
            git checkout -B main origin/main
            git reset --hard origin/main

            # Non-interactive SSH often skips login PATH (e.g. Docker in /usr/local or snap).
            [ -f /etc/profile ] && . /etc/profile
            [ -f "$HOME/.profile" ] && . "$HOME/.profile"
            export PATH="/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:/snap/bin:$PATH"

            if [ ! -f .env ] && [ ! -f weave-api/.env ]; then
              echo "Need .env or weave-api/.env on VM (DOPPLER_TOKEN / runtime secrets)." >&2
              exit 1
            fi

            # Clean stale build cache and dangling images before each deploy.
            docker builder prune -af || true
            docker image prune -af || true

            if command -v docker >/dev/null 2>&1 && docker compose version >/dev/null 2>&1; then
              docker compose -f compose.server.yml up -d --build
            elif command -v docker-compose >/dev/null 2>&1; then
              docker-compose -f compose.server.yml up -d --build
            else
              echo "Docker not found or Compose plugin missing. On the server, install Docker Engine" >&2
              echo "and ensure 'docker compose' works for this SSH user (same as in an interactive shell)." >&2
              exit 127
            fi