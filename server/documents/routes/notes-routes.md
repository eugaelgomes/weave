# Notes Routes (`src/modules/notes/notes.routes.js`)

## What it does

Handles notes CRUD, stats, PDF export, comments, collaborators, and note-related uploads.

## Base path

`/notes`

## Main endpoints

- `GET /`, `GET /stats`, `GET /:id`
- `POST /`, `PUT /:id`, `DELETE /`, `DELETE /:id`
- `POST /complete`
- `GET /:noteId/export/pdf`
- `POST /:id/document-images`
- Comments: list/create/update/delete + attachments
- Collaborators: list/add/remove/recuse

## Middleware and security notes

- Global `verifyToken` for all notes routes.
- Uses `highTrafficLimiter` for reads and `standardTrafficLimiter` for heavy writes/uploads.
- Uses multer-based upload middleware for note files and comment attachments.
