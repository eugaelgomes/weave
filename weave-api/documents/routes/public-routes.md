# Public Routes (`src/routes/public.routes.js`)

## What it does

Builds the public API router for token-based integrations.

## Base path

Mounted under `/api/public/v1`.

## Main endpoints

- `GET /me` (requires `verifyToken`)

## Important notes

- Injects `req.apiVersion`.
- Public routes are declared from a centralized array for easy expansion.
