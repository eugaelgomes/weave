# CORS Options (`src/middlewares/http/cors.js`)

## What it does

Builds dynamic CORS configuration using an origin whitelist with support for wildcard patterns.

## Inputs and outputs

- Input: environment (`NODE_ENV`) and configured allowed origins
- Output: CORS options object consumed by `cors()`

## Important rules

- In development, all origins are allowed.
- In production, headless requests without `Origin` are blocked.
- Supports wildcard matching (e.g., `*.domain.com`).
- Exposes/accepts headers required by auth/session/internal challenge.

## Typical usage

Used by global HTTP setup to control cross-origin browser requests.
