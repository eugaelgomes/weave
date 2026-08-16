# Password Routes (`src/modules/password/password.routes.js`)

## What it does

Provides password recovery and reset endpoints.

## Base path

`/password`

## Main endpoints

- `POST /forgot-password`
- `POST /reset-password`

## Middleware and security notes

- `forgot-password` validates email format with `express-validator`.
