# Request Limiters (`src/middlewares/security/request-limiters.js`)

## What it does

Provides predefined rate-limit middleware profiles for different traffic classes.

## Inputs and outputs

- Input: incoming request volume by route
- Output: allows request or returns rate-limit error response

## Available limiters

- `highTrafficLimiter`: high-volume read operations
- `standardTrafficLimiter`: common write/update operations
- `structuralLimiter`: low-frequency structural operations
- `heavyOperationLimiter`: AI/heavy operations
- `authSecurityLimiter`: failed auth/recovery attempts

## Important rules

- Built with `express-rate-limit`.
- Uses `standardHeaders` and disables legacy headers.
- Auth limiter uses `skipSuccessfulRequests`.

## Typical usage

Applied per-route based on endpoint risk/cost profile.
