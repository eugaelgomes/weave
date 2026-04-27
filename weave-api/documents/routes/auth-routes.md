# Authentication Routes (`src/modules/authentication/auth.routes.js`)

## What it does

Handles local sign-in, SSO entrypoints/callbacks, and logout.

## Base path

`/auth`

## Main endpoints

- `POST /signin`
- `GET /signin/sso/google`
- `GET /signin/sso/google/callback`
- `GET /signin/sso/github`
- `GET /signin/sso/github/callback`
- `POST /logout`

## Middleware and security notes

- Uses `authLimiter` on sign-in and OAuth callback routes.
- Uses payload validation middleware before auth controllers.
- Uses `verifyToken` on logout.
