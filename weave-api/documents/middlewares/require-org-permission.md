# Require Org Permission (`src/middlewares/auth/require-org-permission.js`)

## What it does

Ensures the authenticated user has an active organization membership with a required permission.

## Inputs and outputs

- Input: required permission string (from org permission policy)
- Output: allows request or returns authorization error

## Important rules

- Must run after `verifyToken` (depends on `req.user.userId`).
- Loads active organization membership from repository.
- Uses role policy to validate permission.
- On success, attaches `req.organizationContext`.

## Typical usage

Used on organization-sensitive endpoints (admin, governance, settings, role-restricted actions).
