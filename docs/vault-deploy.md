# Vault-backed Environment Management

This repository supports fetching runtime `.env` files from HashiCorp Vault during deploy.

## Expected Vault Layout (KV v2)

- `kv/data/weave/prod/server`
- `kv/data/weave/prod/worker`
- `kv/data/weave/prod/engine`

Each path should contain flat key/value pairs:

```json
{
  "DATABASE_HOST_URL": "10.0.0.5",
  "DATABASE_NAME": "weave_notes",
  "NODE_ENV": "production"
}
```

## GitHub Secrets

### Required for SSH deploy

- `SERVER_REMOTE_HOST`, `SERVER_REMOTE_USER`, `SERVER_SSH_PRIVATE_KEY`, `SERVER_APP_DIR`
- `WORKER_REMOTE_HOST`, `WORKER_REMOTE_USER`, `WORKER_SSH_PRIVATE_KEY`, `WORKER_APP_DIR`
- `ENGINE_REMOTE_HOST`, `ENGINE_REMOTE_USER`, `ENGINE_SSH_PRIVATE_KEY`, `ENGINE_APP_DIR`

### Optional (enable a single Vault)

Use one shared Vault authentication set for all services:

- `VAULT_ADDR` (example: `https://vault.example.com`)
- `VAULT_ROLE_ID`
- `VAULT_SECRET_ID`

Then configure only the secret path per service:

- `SERVER_VAULT_SECRET_PATH` (example: `kv/data/weave/prod/server`)
- `WORKER_VAULT_SECRET_PATH` (example: `kv/data/weave/prod/worker`)
- `ENGINE_VAULT_SECRET_PATH` (example: `kv/data/weave/prod/engine`)

If Vault secrets are not configured, deploy keeps using the existing `.env` file in the VM.

## Security Notes

- Use one AppRole per service with least-privilege policy.
- Keep `secret_id` rotated.
- Enable Vault audit logs.
- Store only runtime secrets in Vault, not build artifacts.

## Running Vault on the Engine VM

`compose.engine.yml` now includes a `vault` service with Raft storage (`vault_data` volume).

### Important

- Current config starts Vault with HTTP (`tls_disable = 1`) on port `8200`.
- For production, place Vault behind TLS (for example, Caddy/Nginx) and set `VAULT_ADDR` to `https://...`.

### First-time bootstrap (on engine VM)

After deploy:

```bash
docker compose -f compose.engine.yml ps
docker compose -f compose.engine.yml logs vault
```

Initialize Vault once:

```bash
docker compose -f compose.engine.yml exec vault vault operator init
```

Save unseal keys and root token in a secure manager.

Unseal Vault (repeat with 3 keys):

```bash
docker compose -f compose.engine.yml exec vault vault operator unseal
```

Login and prepare mounts/auth:

```bash
docker compose -f compose.engine.yml exec vault vault login
docker compose -f compose.engine.yml exec vault vault secrets enable -path=kv kv-v2
docker compose -f compose.engine.yml exec vault vault auth enable approle
```

Create expected secrets:

```bash
docker compose -f compose.engine.yml exec vault vault kv put kv/weave/prod/server NODE_ENV=production
docker compose -f compose.engine.yml exec vault vault kv put kv/weave/prod/worker NODE_ENV=production
docker compose -f compose.engine.yml exec vault vault kv put kv/weave/prod/engine NODE_ENV=production
```
