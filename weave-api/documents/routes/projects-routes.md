# Projects Routes (`src/modules/projects/projects.routes.js`)

## What it does

Manages project CRUD, stages, collaborators, associated notes, and stage assignment.

## Base path

`/projects`

## Main endpoints

- `GET /`, `GET /stats`, `GET /:id`
- `POST /`, `PATCH /:projectId`, `PUT /:id`, `DELETE /:projectId`, `DELETE /:id`
- `GET /:id/stages`, `PATCH /:id/stages/:stageId`, `DELETE /:id/stages/:stageId`
- `GET/PUT /:projectId/collaborators`
- `GET/PUT /:projectId/notes`
- `PUT /:projectId/notes/:noteId/stage`

## Middleware and security notes

- Global `verifyToken`.
- Permission gate for write operations: `requireOrgPermission(MANAGE_PROJECTS)`.
- Uses `highTrafficLimiter` for reads and `standardTrafficLimiter` for write/update operations.
- Uses multipart upload middleware on project update with files/icon.
