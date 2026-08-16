# Internal Web Challenge (`src/middlewares/security/internal-web-challenge.js`)

## What it does

Implements an internal challenge mechanism using short-lived JWT bound to request `Origin`.

## Inputs and outputs

- Input: challenge secret, request origin, challenge header token
- Output: issued challenge token or request validation result

## Main functions

- `issueInternalChallenge`: issues JWT for internal browser client
- `verifyInternalWebChallenge`: validates challenge header/token before request processing

## Important rules

- Uses `INTERNAL_WEB_CHALLENGE_SECRET`.
- In development, challenge can be bypassed when secret is missing.
- Skips verification for internal challenge endpoints, webhooks, and SSO auth paths.
- Fails with `403` for invalid/missing challenge or origin mismatch.

## Typical usage

Extra protection layer for internal web clients in production traffic.
