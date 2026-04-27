# API Tokens Routes (`src/modules/api-tokens/api-tokens.routes.js`)

## What it does

Provides API token scope discovery and full token lifecycle operations for authenticated users.

## Base path

`/api-tokens`

## Main endpoints

- `GET /scopes`
- `GET /get-tokens`
- `POST /create-token`
- `POST /:id/revoke`
- `DELETE /:id`

## Middleware and security notes

- Global `verifyToken` across all endpoints.
