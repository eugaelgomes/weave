# Slack integration

**Canonical reference** for Slack OAuth, database migration, environment variables, and REST paths. Organization Slack settings use the **active organization** (no `:orgId` in the path); see [organizations-routes.md](organizations-routes.md#slack-and-organization-scope).

## Database

Migration file (run **once per environment**):

`db_structure_docs/migrations/2026-05-09_create_organization_slack_integrations.sql`

There is no `npm run migrate` in this repo; apply SQL manually (same pattern as other files under `db_structure_docs/migrations/`).

### Example: `psql`

From the monorepo root (adjust connection string or host/user/db to match your `DATABASE_*` in `.env`):

```bash
# If you use a single URL:
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f weave-api/db_structure_docs/migrations/2026-05-09_create_organization_slack_integrations.sql
```

Or with discrete variables:

```bash
export PGHOST="$DATABASE_HOST_URL"
export PGPORT="${DATABASE_SERVICE_PORT:-5432}"
export PGUSER="$DATABASE_USERNAME"
export PGPASSWORD="$DATABASE_PASSWORD"
export PGDATABASE="$DATABASE_NAME"
psql -v ON_ERROR_STOP=1 -f weave-api/db_structure_docs/migrations/2026-05-09_create_organization_slack_integrations.sql
```

For a **from-scratch** bootstrap you may also fold this table into `new_structure_db.sql` later; incremental installs only need the migration file above.

## Environment variables (`weave-api`)

| Variable               | Required                     | Description                                                                                                                  |
| ---------------------- | ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `SLACK_CLIENT_ID`      | Yes                          | Slack app client ID                                                                                                          |
| `SLACK_CLIENT_SECRET`  | Yes                          | Slack app client secret                                                                                                      |
| `SLACK_SIGNING_SECRET` | Yes for Events/interactivity | Signing secret (verify callbacks)                                                                                            |
| `SLACK_REDIRECT_URI`   | Optional                     | Defaults to `{API}/api/v1/integrations/slack/oauth/callback` (see `slack.client.js`)                                             |
| `SLACK_BOT_SCOPES`     | Optional                     | Override bot scopes (comma-separated). Default includes `chat:write`, `chat:write.public`, channel/group/im/mpim read scopes |
| `FRONTEND_URL`         | Recommended                  | Used for OAuth redirect back to the app (e.g. `/app/settings/integrations`)                                                  |
| `SECRET_KEY`           | Yes                          | JWT signing secret for OAuth `state` tokens                                                                                  |

### Where to set variables

- **Local:** copy [`weave-api/.env.example`](../../.env.example) to `weave-api/.env` and fill values; do not commit secrets.
- **Docker Compose:** the `server` service loads `./.env` (repo root) then `./weave-api/.env` ([`docker-compose.yml`](../../../docker-compose.yml) `env_file`). Avoid defining the same key twice with different values; pick one file as the source of truth for the API.
- **Doppler / other secret manager:** inject the same names in the runtime environment used by the API process.

**Slack App redirect URL** must match exactly what the API sends to Slack: either your `SLACK_REDIRECT_URI` or, if unset, the default in `src/services/slack/slack.client.js` (dev: `http://localhost:8080/api/v1/integrations/slack/oauth/callback`; prod: `https://apis.weavenotes.app/api/v1/integrations/slack/oauth/callback`).

## Slack app configuration

1. Create a Slack app at [Slack API](https://api.slack.com/apps).
2. **OAuth & Permissions**
   - Redirect URLs: match `SLACK_REDIRECT_URI` or the default  
     `http://localhost:8080/api/v1/integrations/slack/oauth/callback` (dev)  
     `https://apis.weavenotes.app/api/v1/integrations/slack/oauth/callback` (prod).
   - Bot token scopes: align with `SLACK_BOT_SCOPES` / defaults in `src/services/slack/slack.client.js`.
3. **Event Subscriptions** (optional for URL verification)
   - Request URL: `{API_BASE}/api/v1/integrations/slack/events`
   - The API responds to `url_verification` when `SLACK_SIGNING_SECRET` is set.
4. Install the app to a workspace via Weave: authenticated user opens  
   `GET /api/v1/integrations/slack/install` (browser/API client with JWT).

## API surface

### OAuth & Events (under `/integrations/slack`)

- `GET /integrations/slack/install` — authenticated; requires workspace permission `MANAGE_ORG_LIFECYCLE`; redirects to Slack.
- `GET /integrations/slack/oauth/callback` — public; exchanges code; persists bot token per **active** workspace.
- `POST /integrations/slack/events` — public; Slack Events API (signature required).
- `POST /integrations/slack/interactivity` — public; reserved for Block Kit (signature required).

### Workspace Integrations Settings (under `/integrations/slack`)

Requires same workspace permission via controller checks:

- `GET /integrations/slack/integrations` — connection status (no secrets returned).
- `PUT /integrations/slack/integrations/default-channel` — JSON body `{ "channel_id": "C..." }`.
- `DELETE /integrations/slack/integrations` — disconnect + best-effort `auth.revoke`.

## Notifications

When a note collaborator is added and the note resolves to an organization (`scope_organization_id`), the API may post a short message to the configured default Slack channel (`slack-notify.service`).
