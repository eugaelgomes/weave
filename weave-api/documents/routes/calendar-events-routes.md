# Calendar Events Routes (`src/modules/calendar-events/calendar-events.routes.js`)

## What it does

Handles calendar event CRUD, event invites, and Google calendar integration utilities.

## Base path

`/calendar-events`

## Main endpoints

- Event CRUD: `GET /`, `GET /:eventId`, `POST /`, `PATCH /:eventId`, `DELETE /:eventId`
- Invite CRUD: `GET/POST /:eventId/invites`, `PATCH/DELETE /:eventId/invites/:inviteId`
- Google integration: `GET /google/settings`, `GET /google/calendars`, `POST /google/freebusy`

## Middleware and security notes

- Global `verifyToken`.
- Uses `highTrafficLimiter` for reads and selected Google checks.
- Uses `standardTrafficLimiter` for create/update/delete operations.
