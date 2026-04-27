# Error Handler (`src/middlewares/errors/error-handler.js`)

## What it does

Handles unknown routes and centralizes API error responses.

## Inputs and outputs

- Input: request context and raised errors
- Output: normalized JSON error response

## Main handlers

- `notFoundHandler`: creates a `404` error for non-existing routes
- `globalErrorHandler`: returns standard error payload with status/message/timestamp/path/method

## Important rules

- Logs stack traces in development and server errors (`>=500`).
- Uses `err.statusCode` when available, otherwise defaults to `500`.

## Typical usage

Registered after all routes as the last middleware layer.
