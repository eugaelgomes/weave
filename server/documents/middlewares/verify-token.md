# Verify Token (`src/middlewares/auth/verify-token.js`)

## What it does

Authenticates incoming requests using two flows:

- Session JWT (cookie/header)
- Public API token (`Authorization: Bearer wn_prefix.secret`)

## Inputs and outputs

- Input: HTTP request with cookie token or authorization header
- Output: `req.user` (and `req.apiToken` for API token flow)

## Important rules

- API token flow validates format, revocation, expiration, and secret hash.
- Session flow verifies JWT with `SECRET_KEY`.
- Returns `401` on missing/invalid credentials.
- Includes extra production logs for missing session token diagnostics.

## Typical usage

Applied to protected routes before business controllers.
