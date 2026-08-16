# IP Address (`src/middlewares/http/ip-address.js`)

## What it does

Extracts client IP from proxy/network headers and stores it on `req.clientIp`.

## Inputs and outputs

- Input: request headers and socket connection metadata
- Output: normalized `req.clientIp`

## Important rules

- Checks `x-forwarded-for`, `x-real-ip`, and socket fallback fields.
- Removes IPv6 mapped IPv4 prefix (`::ffff:`) when present.
- Falls back to `127.0.0.1` when no source is available.

## Typical usage

Applied globally for logging, security checks, and abuse/rate-limit context.
