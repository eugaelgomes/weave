# Tags Routes (`src/modules/tags/tags.routes.js`)

## What it does

Manages tag CRUD for project-scoped tags with backward-compatible org-scoped endpoints.

## Base paths

Mounted in internal router under both `/projects` and `/workspaces` contexts.

## Main endpoints

- Project scope: `/:project_id/tags` and `/:project_id/tags/:tag_id`
- Legacy org scope: `/:workspace_id/tags` and `/:workspace_id/tags/:tag_id`

## Middleware and security notes

- Global `verifyToken`.
- Write operations require `requireOrgPermission(MANAGE_TAGS)`.
- Router uses `mergeParams: true` to support nested mounting.
