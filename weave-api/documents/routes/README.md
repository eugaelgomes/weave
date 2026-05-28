# API Routes

Simple and direct documentation for route composition and route modules in `weave-api`.

## Core Router Composition

- `src/routes/index.js` -> `routes-index.md`
- `src/routes/internal.routes.js` -> `internal-routes.md`
- `src/routes/public.routes.js` -> `public-routes.md`

## Module Route Files

- `src/modules/authentication/auth.routes.js` -> `auth-routes.md`
- `src/modules/users/users.routes.js` -> `users-routes.md`
- `src/modules/password/password.routes.js` -> `password-routes.md`
- `src/modules/notes/notes.routes.js` -> `notes-routes.md`
- `src/modules/projects/projects.routes.js` -> `projects-routes.md`
- `src/modules/organizations/organizations.routes.js` -> `organizations-routes.md`
- `src/modules/plans/plans.routes.js` -> `plans-routes.md`
- `src/modules/backup/backup.routes.js` -> `backup-routes.md`
- `src/modules/notifications/notifications.routes.js` -> `notifications-routes.md`
- `src/modules/calendar-events/calendar-events.routes.js` -> `calendar-events-routes.md`
- `src/modules/webhooks/webhooks.routes.js` -> `webhooks-routes.md`
- Slack setup -> `slack-integration.md`
- `src/modules/api-tokens/api-tokens.routes.js` -> `api-tokens-routes.md`
- `src/modules/tags/tags.routes.js` -> `tags-routes.md`
- `src/modulestask-prioritiestask-priorities.routes.js` -> `task-priorities-routes.md`
- `src/modules/weave-ai/weave-ai.routes.js` -> `weave-ai-routes.md`

## Standard Structure

Each document follows:

- What it does
- Base path
- Main endpoints
- Middleware and security notes
