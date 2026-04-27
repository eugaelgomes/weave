# Weave AI Routes (`src/modules/weave-ai/weave-ai.routes.js`)

## What it does

Handles AI chat endpoints and user agent management (CRUD + sharing + provider/model listing).

## Base path

`/weave-ai`

## Main endpoints

- Chat: `POST /chat`, `GET /chat/history`, `DELETE /chat/:sessionId`
- Models: `GET /models`
- Agents: `GET /agents`, `GET /agents/providers`, `GET /agents/:id`, `POST /agents`, `PUT /agents/:id`, `DELETE /agents/:id`, `POST /agents/:id/share`

## Middleware and security notes

- Global `verifyToken` + `strictLimiter`.
- Agent write routes require `requireOrgPermission(MANAGE_WEAVE_AI)`.
- Chat route validates upload constraints (file types, MIME, per-type size limits).
- Knowledge upload uses multipart middleware (`knowledge_files`, up to 5 files).
