# Users Routes (`src/modules/users/users.routes.js`)

## What it does

Manages account creation/activation, profile data, profile image, user search, and account deletion flow.

## Base path

`/users`

## Main endpoints

- `POST /create-account`
- `POST /activate-account`
- `GET /me`
- `PUT /me/update-profile`
- `GET /search`
- `GET /my-profile-image`
- `GET /my-profile-image-info`
- `DELETE /delete-my-account`
- `POST /confirm-delete-account`

## Middleware and security notes

- Uses `verifyToken` on authenticated profile/search/delete endpoints.
- Uses traffic limiters (`structural`, `standard`, `highTraffic`) by route purpose.
- Uses multipart upload + image validation for profile pictures.
