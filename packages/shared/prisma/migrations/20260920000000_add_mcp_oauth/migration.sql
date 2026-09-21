CREATE TABLE "mcp_oauth_clients" (
    "client_id" VARCHAR(255) NOT NULL,
    "client_id_issued_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "client_metadata" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "mcp_oauth_clients_pkey" PRIMARY KEY ("client_id")
);

CREATE TABLE "mcp_oauth_authorization_codes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "code_hash" VARCHAR(64) NOT NULL,
    "client_id" VARCHAR(255) NOT NULL,
    "user_id" UUID NOT NULL,
    "workspace_id" UUID,
    "scopes" TEXT[] NOT NULL,
    "code_challenge" VARCHAR(255) NOT NULL,
    "redirect_uri" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "consumed_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "mcp_oauth_authorization_codes_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "mcp_oauth_authorization_codes_code_hash_key" ON "mcp_oauth_authorization_codes"("code_hash");
CREATE INDEX "idx_mcp_oauth_authorization_codes_client" ON "mcp_oauth_authorization_codes"("client_id", "expires_at");

CREATE TABLE "mcp_oauth_access_tokens" (
    "token_id" UUID NOT NULL,
    "client_id" VARCHAR(255) NOT NULL,
    "user_id" UUID NOT NULL,
    "workspace_id" UUID,
    "scopes" TEXT[] NOT NULL,
    "resource" TEXT NOT NULL,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "revoked_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "mcp_oauth_access_tokens_pkey" PRIMARY KEY ("token_id")
);

CREATE INDEX "idx_mcp_oauth_access_tokens_user" ON "mcp_oauth_access_tokens"("user_id", "expires_at");

CREATE TABLE "mcp_oauth_refresh_tokens" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "token_hash" VARCHAR(64) NOT NULL,
    "client_id" VARCHAR(255) NOT NULL,
    "user_id" UUID NOT NULL,
    "workspace_id" UUID,
    "scopes" TEXT[] NOT NULL,
    "resource" TEXT NOT NULL,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "used_at" TIMESTAMPTZ(6),
    "revoked_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "mcp_oauth_refresh_tokens_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "mcp_oauth_refresh_tokens_token_hash_key" ON "mcp_oauth_refresh_tokens"("token_hash");
CREATE INDEX "idx_mcp_oauth_refresh_tokens_client" ON "mcp_oauth_refresh_tokens"("client_id", "expires_at");

ALTER TABLE "mcp_oauth_authorization_codes" ADD CONSTRAINT "fk_mcp_oauth_authorization_codes_client" FOREIGN KEY ("client_id") REFERENCES "mcp_oauth_clients"("client_id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "mcp_oauth_authorization_codes" ADD CONSTRAINT "fk_mcp_oauth_authorization_codes_user" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE "mcp_oauth_authorization_codes" ADD CONSTRAINT "fk_mcp_oauth_authorization_codes_workspace" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
ALTER TABLE "mcp_oauth_access_tokens" ADD CONSTRAINT "fk_mcp_oauth_access_tokens_client" FOREIGN KEY ("client_id") REFERENCES "mcp_oauth_clients"("client_id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "mcp_oauth_access_tokens" ADD CONSTRAINT "fk_mcp_oauth_access_tokens_user" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE "mcp_oauth_access_tokens" ADD CONSTRAINT "fk_mcp_oauth_access_tokens_workspace" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
ALTER TABLE "mcp_oauth_refresh_tokens" ADD CONSTRAINT "fk_mcp_oauth_refresh_tokens_client" FOREIGN KEY ("client_id") REFERENCES "mcp_oauth_clients"("client_id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "mcp_oauth_refresh_tokens" ADD CONSTRAINT "fk_mcp_oauth_refresh_tokens_user" FOREIGN KEY ("user_id") REFERENCES "users"("user_id") ON DELETE CASCADE ON UPDATE NO ACTION;
ALTER TABLE "mcp_oauth_refresh_tokens" ADD CONSTRAINT "fk_mcp_oauth_refresh_tokens_workspace" FOREIGN KEY ("workspace_id") REFERENCES "workspaces"("id") ON DELETE SET NULL ON UPDATE NO ACTION;
