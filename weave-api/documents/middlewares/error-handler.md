# Error Handler (`src/middlewares/errors/error-handler.js`)

## Overview

Centralizes API error responses for the weave-api HTTP layer. All client-facing error messages are in **English**. Technical details (Postgres, stack traces, internal failures) are logged server-side and must not be returned to clients in production.

## Request correlation

`requestIdMiddleware` (`src/middlewares/request-id.js`) runs early in the global middleware stack and sets:

- `req.requestId` — from `x-request-id` header or a generated UUID
- Response header `x-request-id`

Error logs include `requestId`, `method`, `path`, and `userId` when available.

## Error taxonomy

Use `AppError` (`src/errors/app-error.js`) for operational failures:

| Type | `isOperational` | Client sees |
|------|-----------------|-------------|
| Validation, auth, not found, conflict | `true` | `code` + safe `message` |
| Postgres / bugs / unknown | `false` | Generic `INTERNAL_ERROR` |

Normalize unknown errors with `fromUnknown(error)` before `next(error)`.

## Response shape (canonical)

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid request. Please review your input.",
    "status": 400
  }
}
```

Some endpoints still return legacy shapes (`{ error: "string" }`, `{ code, message }` at top level) during migration. New code should use the canonical nested `error` object.

## Handlers

| Handler | Behavior |
|---------|----------|
| `notFoundHandler` | `404` with `ROUTE_NOT_FOUND` (no raw route path in production) |
| `globalErrorHandler` | Maps `AppError` / `fromUnknown`, logs 5xx and non-operational errors |

## Development vs production

- **Production:** Internal errors always return generic `INTERNAL_ERROR` message.
- **Development:** Non-operational errors may include `error.details` with `originalMessage`, `pgCode`, `constraint`, and `stack`.

## Controller guidelines

```js
const { AppError, fromUnknown } = require("@/errors");

// Prefer throwing operational errors
throw AppError.notFound("Note not found", ERROR_CODES.NOTE_NOT_FOUND);

// In catch blocks
catch (err) {
  return next(fromUnknown(err));
}
```

**Do not** return `error.message` from Postgres or unhandled exceptions in HTTP JSON.

## Related modules

- `src/errors/codes.js` — stable error codes and default messages
- `src/errors/pg-error-mapper.js` — Postgres → safe operational mapping
- `src/middlewares/async-handler.js` — wrap async route handlers

## Audit script

```bash
npm run audit:errors
```

Reports `error.message` leaks in controller responses and common Portuguese error strings.
