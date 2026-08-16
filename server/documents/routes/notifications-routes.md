# Notifications Routes (`src/modules/notifications/notifications.routes.js`)

## What it does

Provides notification listing, creation, state updates (read/trash), and deletion.

## Base path

`/notifications`

## Main endpoints

- `GET /`
- `POST /`
- `PATCH /mark-all-read`
- `PATCH /:notificationId/read`
- `PATCH /:notificationId/trash`
- `DELETE /:notificationId`

## Middleware and security notes

- Global `verifyToken`.
- Uses `highTrafficLimiter` for listing and `standardTrafficLimiter` for mutations.
