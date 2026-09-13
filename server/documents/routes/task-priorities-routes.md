# Task Priorities Routes (`src/modulestask-prioritiestask-priorities.routes.js`)

## What it does

Manages task priority CRUD for project scope and legacy org scope.

## Base paths

Mounted in internal router under both `/projects`, `/workspaces`, and `/task-priorities` contexts.

## Main endpoints

- Project scope: `/:project_id/create-priority`, `/:project_id/task-priorities`, `/:project_id/task-priorities/:priority_id`
- Legacy org scope: `/:workspace_id/task-priorities`, `/:workspace_id/task-priorities/:priority_id`

## Middleware and security notes

- Global `verifyToken`.
- Write operations require `requireOrgPermission(MANAGE_TASK_PRIORITIES)`.
- Router uses `mergeParams: true` to support nested route mounting.
