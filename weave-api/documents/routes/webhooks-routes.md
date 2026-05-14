# Webhooks Routes (`src/modules/webhooks/webhooks.routes.js`)

## What it does

Handles Google OAuth webhook-related flow, Google Calendar webhook processing, and Slack OAuth / Slack callbacks.

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

### Slack

- `GET /slack/install`
- `GET /slack/oauth/callback`
- `POST /slack/events`
- `POST /slack/interactivity`

See also: `slack-integration.md`.

## Middleware and security notes

- Uses `verifyToken` for user-authenticated Google actions.
- Webhook callback endpoint (`POST /google/calendar`) is intentionally unauthenticated for provider delivery.
- Slack OAuth callback and Slack Events/interactivity endpoints are unauthenticated; OAuth uses signed JWT `state`; Events/interactivity require Slack signing secret validation and `req.rawBody` (see global JSON/urlencoded `verify` in `apply-http-middleware.js`).
