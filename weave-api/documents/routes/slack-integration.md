# Slack integration

End-to-end notes for configuring Slack and the Weave Notes API.

## Database

Apply migration:

`db_structure_docs/migrations/2026-05-09_create_organization_slack_integrations.sql`

## Environment variables (`weave-api`)

| Variable | Required | Description |
|----------|----------|-------------|
| `SLACK_CLIENT_ID` | Yes | Slack app client ID |
| `SLACK_CLIENT_SECRET` | Yes | Slack app client secret |
| `SLACK_SIGNING_SECRET` | Yes for Events/interactivity | Signing secret (verify callbacks) |
| `SLACK_REDIRECT_URI` | Optional | Defaults to `{API}/api/v1/webhooks/slack/oauth/callback` (see `slack.client.js`) |
| `SLACK_BOT_SCOPES` | Optional | Override bot scopes (comma-separated). Default includes `chat:write`, `chat:write.public`, channel/group/im/mpim read scopes |
| `FRONTEND_URL` | Recommended | Used for OAuth redirect back to the app (e.g. `/app/settings/integrations`) |
| `SECRET_KEY` | Yes | JWT signing secret for OAuth `state` tokens |

## Slack app configuration

1. Create a Slack app at [Slack API](https://api.slack.com/apps).
2. **OAuth & Permissions**
   - Redirect URLs: match `SLACK_REDIRECT_URI` or the default  
     `http://localhost:8080/api/v1/webhooks/slack/oauth/callback` (dev)  
     `https://apis.weavenotes.app/api/v1/webhooks/slack/oauth/callback` (prod).
   - Bot token scopes: align with `SLACK_BOT_SCOPES` / defaults in `src/services/slack/slack.client.js`.
3. **Event Subscriptions** (optional for URL verification)
   - Request URL: `{API_BASE}/api/v1/webhooks/slack/events`
   - The API responds to `url_verification` when `SLACK_SIGNING_SECRET` is set.
4. Install the app to a workspace via Weave: authenticated user opens  
   `GET /api/v1/webhooks/slack/install` (browser/API client with JWT).

## API surface

### OAuth (under `/webhooks`)

- `GET /webhooks/slack/install` — authenticated; requires org permission `MANAGE_GLOBAL_INTEGRATIONS`; redirects to Slack.
- `GET /webhooks/slack/oauth/callback` — public; exchanges code; persists bot token per **active** organization.
- `POST /webhooks/slack/events` — public; Slack Events API (signature required).
- `POST /webhooks/slack/interactivity` — public; reserved for Block Kit (signature required).

### Organization settings (under `/organizations`, after `verifyToken`)

Requires same org permission via controller checks:

- `GET /organizations/integrations/slack` — connection status (no secrets returned).
- `PUT /organizations/integrations/slack/default-channel` — JSON body `{ "channel_id": "C..." }`.
- `DELETE /organizations/integrations/slack` — disconnect + best-effort `auth.revoke`.

## Notifications

When a note collaborator is added and the note resolves to an organization (`scope_organization_id`), the API may post a short message to the configured default Slack channel (`slack-notify.service`).
