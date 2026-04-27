# Routes Index (`src/routes/index.js`)

## What it does

Defines API version context and mounts internal/public routers.

## Base paths

- Internal API: `/api/:version`
- Public API: `/api/public/:version`

## Important notes

- Default version is `v1`.
- `registerApiRoutes` mounts both router trees and returns version context.
