# Organizations Routes (`src/modules/organizations/organizations.routes.js`)

## What it does

Handles organization profile lifecycle, members, invites, domains/SSO settings, areas, and organization assets.

## Base path

`/organizations`

## Main endpoint groups

- Public invite flow: preview/accept invite
- Organization lifecycle: get/create/update/delete/restore
- Members: list/update role/remove
- Invites: create/list/cancel
- Domains: list/create/verify/update SSO/delete
- Areas: CRUD + member management
- Assets: upload logo/banner
- Organization projects listing
- Slack integration: status, default channel, disconnect (`/integrations/slack/*`)

### Slack and organization scope

Slack settings use the **active organization** resolved from the authenticated user (`getActiveOrganizationWithMembership`), consistent with `GET /organizations/` and other org routes. Paths are **`/organizations/integrations/slack`** — there is **no** `organizationId` (or `:orgId`) in the URL. For the full contract and setup, see the canonical doc [slack-integration.md](slack-integration.md).

## Middleware and security notes

- Invite preview/accept is available before `verifyToken`.
- Most routes run after global `verifyToken`.
- Uses request limiters (`highTraffic`, `standard`, `structural`) by operation type.
- Uses image upload validation for invite profile images and org assets.

## Observations

- The route file currently contains duplicated domain verify/delete registrations.
