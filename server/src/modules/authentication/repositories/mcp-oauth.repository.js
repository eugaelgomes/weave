const crypto = require("crypto");
const { prisma } = require("@theweave/database");

const hash = (value) => crypto.createHash("sha256").update(value).digest("hex");

class McpOAuthRepository {
  async getClient(clientId) {
    const client = await prisma.mcp_oauth_clients.findUnique({
      where: { client_id: clientId },
    });
    if (!client) return undefined;

    return {
      ...client.client_metadata,
      client_id: client.client_id,
      client_id_issued_at: Math.floor(client.client_id_issued_at.getTime() / 1000),
    };
  }

  async registerClient(client) {
    const { client_id, client_id_issued_at } = client;
    const metadata = { ...client };
    delete metadata.client_id;
    delete metadata.client_id_issued_at;
    delete metadata.client_secret;
    delete metadata.client_secret_expires_at;

    await prisma.mcp_oauth_clients.create({
      data: {
        client_id,
        client_id_issued_at: new Date((client_id_issued_at || Math.floor(Date.now() / 1000)) * 1000),
        client_metadata: metadata,
      },
    });

    return {
      ...metadata,
      client_id,
      client_id_issued_at,
    };
  }

  async createAuthorizationCode({
    code,
    clientId,
    userId,
    workspaceId,
    scopes,
    codeChallenge,
    redirectUri,
    resource,
    expiresAt,
  }) {
    await prisma.mcp_oauth_authorization_codes.create({
      data: {
        client_id: clientId,
        code_challenge: codeChallenge,
        code_hash: hash(code),
        expires_at: expiresAt,
        redirect_uri: redirectUri,
        resource,
        scopes,
        user_id: userId,
        workspace_id: workspaceId || null,
      },
    });
  }

  /** Atomically consumes a code so concurrent token exchanges cannot both win. */
  async consumeAuthorizationCode(code, clientId) {
    return prisma.$transaction(async (transaction) => {
      const record = await transaction.mcp_oauth_authorization_codes.findFirst({
        select: {
          client_id: true,
          code_challenge: true,
          id: true,
          redirect_uri: true,
          resource: true,
          scopes: true,
          user_id: true,
          workspace_id: true,
        },
        where: {
          client_id: clientId,
          code_hash: hash(code),
          consumed_at: null,
          expires_at: { gt: new Date() },
        },
      });
      if (!record) return undefined;

      const updated = await transaction.mcp_oauth_authorization_codes.updateMany({
        data: { consumed_at: new Date() },
        where: { consumed_at: null, id: record.id },
      });
      if (updated.count !== 1) return undefined;

      delete record.id;
      return record;
    });
  }

  async createAccessToken({ tokenId, clientId, userId, workspaceId, scopes, resource, expiresAt }) {
    await prisma.mcp_oauth_access_tokens.create({
      data: {
        client_id: clientId,
        expires_at: expiresAt,
        resource,
        scopes,
        token_id: tokenId,
        user_id: userId,
        workspace_id: workspaceId || null,
      },
    });
  }

  async isAccessTokenActive(tokenId, clientId, userId) {
    const token = await prisma.mcp_oauth_access_tokens.findFirst({
      select: { token_id: true },
      where: {
        client_id: clientId,
        expires_at: { gt: new Date() },
        revoked_at: null,
        token_id: tokenId,
        user_id: userId,
      },
    });
    return Boolean(token);
  }

  async createRefreshToken({ token, clientId, userId, workspaceId, scopes, resource, expiresAt }) {
    await prisma.mcp_oauth_refresh_tokens.create({
      data: {
        client_id: clientId,
        expires_at: expiresAt,
        resource,
        scopes,
        token_hash: hash(token),
        user_id: userId,
        workspace_id: workspaceId || null,
      },
    });
  }

  /** Atomically rotates a refresh token so it cannot be reused. */
  async rotateRefreshToken(token, clientId) {
    return prisma.$transaction(async (transaction) => {
      const record = await transaction.mcp_oauth_refresh_tokens.findFirst({
        select: {
          id: true,
          resource: true,
          scopes: true,
          user_id: true,
          workspace_id: true,
        },
        where: {
          client_id: clientId,
          expires_at: { gt: new Date() },
          revoked_at: null,
          token_hash: hash(token),
        },
      });
      if (!record) return undefined;

      const now = new Date();
      const updated = await transaction.mcp_oauth_refresh_tokens.updateMany({
        data: { revoked_at: now, used_at: now },
        where: { id: record.id, revoked_at: null },
      });
      if (updated.count !== 1) return undefined;

      delete record.id;
      return record;
    });
  }

  async revokeToken(token, clientId) {
    await prisma.mcp_oauth_refresh_tokens.updateMany({
      data: { revoked_at: new Date() },
      where: {
        client_id: clientId,
        revoked_at: null,
        token_hash: hash(token),
      },
    });
  }

  async revokeAccessToken(tokenId, clientId) {
    await prisma.mcp_oauth_access_tokens.updateMany({
      data: { revoked_at: new Date() },
      where: {
        client_id: clientId,
        revoked_at: null,
        token_id: tokenId,
      },
    });
  }
}

module.exports = new McpOAuthRepository();
