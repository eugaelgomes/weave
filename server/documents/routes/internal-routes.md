# Internal Routes (`src/routes/internal.routes.js`)

## What it does

Builds the main internal API router and mounts all module route handlers.

## Base path

Mounted by index under `/api/v1`.

## Main responsibilities

- Injects `req.apiVersion`.
- Applies origin guard (with skip rules for webhooks/SSO paths).
- Exposes `GET /_internal/challenge`.
- Applies `verifyInternalWebChallenge` for protected internal traffic.
- Mounts all module routes (auth, users, notes, projects, workspaces, etc.).

## Security notes

- In production, origin validation uses `PRODUCTION_ALLOWED_ORIGINS` / `ALLOWED_ORIGINS`.
- Supports wildcard matching for allowed origins.
