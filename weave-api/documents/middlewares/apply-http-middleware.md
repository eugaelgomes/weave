# Apply HTTP Middleware (`src/middlewares/http/apply-http-middleware.js`)

## What it does

Configures global HTTP middleware stack for the Express app.

## Inputs and outputs

- Input: Express app instance
- Output: app configured with parsing, session, IP resolution, CORS, and security headers

## Important rules

- Enables cookies, sessions, JSON/body parsing, and `trust proxy`.
- Applies custom CORS middleware from `makeCorsOptions()`.
- Bypasses CORS in specific webhook/SSO callback routes.
- Applies Helmet with HSTS, CSP, frameguard, noSniff, and referrer policy.

## Typical usage

Called once during server bootstrap before API routes.
