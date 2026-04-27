# Webhooks Routes (`src/modules/webhooks/webhooks.routes.js`)

## What it does

Handles Google OAuth webhook-related flow and Google Calendar webhook processing.

## Base path

`/webhooks`

## Main endpoints

- `GET /google/auth`
- `GET /google/callback`
- `POST /google/calendar`
- `GET /google/calendar/events`
- `GET /google/calendar/stream`
- `GET /google/calendar/status`
- `DELETE /google/calendar/disconnect`

## Middleware and security notes

- Uses `verifyToken` for user-authenticated Google actions.
- Webhook callback endpoint (`POST /google/calendar`) is intentionally unauthenticated for provider delivery.
