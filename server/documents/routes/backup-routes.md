# Backup Routes (`src/modules/backup/backup.routes.js`)

## What it does

Handles backup export requests, job tracking, summary, and token-based backup download.

## Base path

`/backup`

## Main endpoints

- `GET /download/:token`
- `POST /request`
- `GET /status/:jobId`
- `GET /jobs`
- `GET /summary`

## Middleware and security notes

- Download endpoint is public token-based access.
- Remaining backup endpoints require `verifyToken`.
