---
name: Slack integration weave-api
overview: Adicionar integração Slack no `weave-api` via Slack App (OAuth bot) para postar notificações e suportar slash commands, seguindo o padrão routes/controller/repository e garantindo verificação de assinatura + isolamento multi-tenant por organização.
todos: []
isProject: false
---

## Objetivo
Criar uma integração **Slack App (OAuth bot)** no `weave-api` para:
- instalar/conectar um workspace Slack a uma **organização** do Weave
- enviar notificações do Weave para canais do Slack
- receber **slash commands** (v1) com respostas/ações básicas

## Decisões (defaults, já que você pulou as perguntas)
- **Tipo**: Slack App com OAuth (bot token), não só Incoming Webhook.
- **Escopo v1**: envio de notificações + slash commands.
- **Escopo de instalação**: **por organização** (Slack é workspace-level).

## Onde encaixa na arquitetura atual
- Reutilizar o padrão do Google Calendar em `[weave-api/src/modules/webhooks/webhooks.routes.js](weave-api/src/modules/webhooks/webhooks.routes.js)` (integrações externas)
- Persistência: hoje tokens Google ficam em `user_oauth_tokens` via `[weave-api/src/modules/webhooks/repositories/google-oauth-tokens.repository.js](weave-api/src/modules/webhooks/repositories/google-oauth-tokens.repository.js)`; para Slack vamos criar storage dedicado (evita mexer no enum `oauth_provider_enum`, que não inclui Slack)

## Design de dados (Postgres)
Criar migration SQL nova em `weave-api/db_structure_docs/migrations/`:
- Tabela sugerida: `slack_installations`
  - `id uuid PK`
  - `organization_id uuid NOT NULL` (FK)
  - `installed_by_user_id uuid NULL` (FK)
  - `team_id text NOT NULL` (workspace)
  - `team_name text NULL`
  - `enterprise_id text NULL`
  - `bot_user_id text NULL`
  - `bot_token text NOT NULL`
  - `scope text NULL`
  - `default_channel_id text NULL` (opcional para v1)
  - `deleted bool default false`, `created_at`, `updated_at`, `deleted_at` (mesmo padrão)
  - unique index: `(organization_id)` e/ou `(team_id)` conforme regra de negócio

> Observação: hoje não existe camada de criptografia de tokens; no plano v1 vamos armazenar `bot_token` no banco e restringir acesso via repos + RBAC. Se vocês quiserem, dá para adicionar criptografia simétrica com `SECRET_KEY` como hardening numa iteração seguinte.

## API design (rotas)
Adicionar rotas em `[weave-api/src/modules/webhooks/webhooks.routes.js](weave-api/src/modules/webhooks/webhooks.routes.js)`:
- **Instalação OAuth**
  - `GET /slack/auth` (com `verifyToken`): inicia install (redirect para Slack OAuth)
  - `GET /slack/callback` (sem `verifyToken`): troca `code` por tokens e associa à org do usuário (via `state`)
- **Recebimento (assinados pelo Slack)**
  - `POST /slack/events` (Event Subscriptions) — deixar preparado (mesmo que v1 use só commands)
  - `POST /slack/commands` (Slash commands)
  -