# Session Middleware (`src/middlewares/http/session.js`)

## What it does

Creates Express session middleware backed by PostgreSQL (`connect-pg-simple`).

## Inputs and outputs

- Input: session env config (`SESSION_SECRET`, `NODE_ENV`, `COOKIE_SAME_SITE`)
- Output: configured `sessionMiddleware`

## Important rules

- Persists sessions in `sessions` table (auto-create enabled).
- Uses secure cookie in production.
- Session cookie name is `auth.sid`.
- Rolling sessions refresh expiration on activity.

## Typical usage

Mounted globally before authentication-sensitive routes.
