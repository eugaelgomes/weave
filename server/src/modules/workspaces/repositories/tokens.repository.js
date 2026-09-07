const BaseRepository = require("./base.repository");
const { prisma } = require("@theweave/database");

/**
 * Repository for API tokens domain (creation, lookup, mutation, logging).
 */
class WorkspaceTokensRepository extends BaseRepository {
  /**
   * @param {Object} params
   * @param {string} params.name
   * @param {string} params.keyPrefix
   * @param {string} params.tokenHash
   * @param {string} params.userId
   * @param {string} [params.workspaceId]
   * @param {string[]} [params.scopes]
   * @param {Date|string} [params.expiresAt]
   * @param {import('@prisma/client').PrismaClient} [client=prisma]
   * @returns {Promise<Record<string, unknown>>}
   */
  async createToken(
    { name, keyPrefix, tokenHash, userId, workspaceId, scopes, expiresAt },
    client = prisma
  ) {
    return await client.api_tokens.create({
      data: {
        expires_at: expiresAt ? new Date(expiresAt) : null,
        key_prefix: keyPrefix,
        name,
        scopes: scopes || ["read"],
        token_hash: tokenHash,
        user_id: userId,
        workspace_id: workspaceId || null,
      },
      select: {
        created_at: true,
        expires_at: true,
        id: true,
        key_prefix: true,
        name: true,
        scopes: true,
      },
    });
  }

  /**
   * @param {string} userId
   * @param {string} workspaceId
   * @param {import('@prisma/client').PrismaClient} [client=prisma]
   * @returns {Promise<string | null>}
   */
  async getUserWorkspaceRole(userId, workspaceId, client = prisma) {
    const member = await client.workspace_members.findFirst({
      include: {
        workspace_member_roles: {
          include: {
            workspace_roles: true,
          },
        },
      },
      where: {
        deleted: false,
        user_id: userId,
        workspace_id: workspaceId,
      },
    });

    if (!member || !member.workspace_member_roles?.length) {
      return null;
    }

    return member.workspace_member_roles[0].workspace_roles?.name || null;
  }

  /**
   * @param {string} userId
   * @param {import('@prisma/client').PrismaClient} [client=prisma]
   * @returns {Promise<Record<string, unknown>[]>}
   */
  async getTokensByUserId(userId, client = prisma) {
    return await client.api_tokens.findMany({
      orderBy: {
        created_at: "desc",
      },
      select: {
        created_at: true,
        expires_at: true,
        id: true,
        key_prefix: true,
        name: true,
        revoked_at: true,
        scopes: true,
        updated_at: true,
        workspace_id: true,
      },
      where: {
        deleted: false,
        user_id: userId,
      },
    });
  }

  /**
   * @param {string} keyPrefix
   * @param {import('@prisma/client').PrismaClient} [client=prisma]
   * @returns {Promise<Record<string, unknown> | null>}
   */
  async getTokenByKeyPrefix(keyPrefix, client = prisma) {
    return await client.api_tokens.findFirst({
      where: {
        deleted: false,
        key_prefix: keyPrefix,
      },
    });
  }

  /**
   * @param {string} id
   * @param {string} userId
   * @param {import('@prisma/client').PrismaClient} [client=prisma]
   * @returns {Promise<Record<string, unknown> | undefined>}
   */
  async revokeToken(id, userId, client = prisma) {
    const updated = await client.api_tokens.updateMany({
      data: {
        revoked_at: new Date(),
        updated_at: new Date(),
      },
      where: {
        deleted: false,
        id,
        user_id: userId,
      },
    });

    if (updated.count > 0) {
      return await client.api_tokens.findUnique({
        select: {
          id: true,
          name: true,
          revoked_at: true,
        },
        where: { id },
      });
    }

    return undefined;
  }

  /**
   * @param {string} id
   * @param {string} userId
   * @param {import('@prisma/client').PrismaClient} [client=prisma]
   * @returns {Promise<boolean>}
   */
  async deleteToken(id, userId, client = prisma) {
    const result = await client.api_tokens.updateMany({
      data: {
        deleted: true,
        deleted_at: new Date(),
      },
      where: {
        id,
        user_id: userId,
      },
    });

    return result.count > 0;
  }

  /**
   * Inserts one audit row for a Public API request.
   * Designed for fire-and-forget inserts — never throws to callers.
   *
   * @param {object} params
   * @param {string}   params.apiTokenId
   * @param {string}   params.userId
   * @param {string|null} params.workspaceId
   * @param {string}   params.httpMethod
   * @param {string}   params.path
   * @param {string}   params.apiVersion
   * @param {string[]|null} params.scopesRequired
   * @param {number}   params.statusCode
   * @param {number|null} params.durationMs
   * @param {string|null} params.errorCode
   * @param {string|null} params.requestId
   * @param {string|null} params.ipAddress
   * @param {string|null} params.userAgent
   * @param {string|null} params.originHeader
   * @param {string|null} params.refererHeader
   * @param {import('@prisma/client').PrismaClient} [client=prisma]
   * @returns {Promise<void>}
   */
  async insertLog(
    {
      apiTokenId,
      userId,
      workspaceId,
      httpMethod,
      path,
      apiVersion,
      scopesRequired,
      statusCode,
      durationMs,
      errorCode,
      requestId,
      ipAddress,
      userAgent,
      originHeader,
      refererHeader,
    },
    client = prisma
  ) {
    try {
      await client.public_api_request_logs.create({
        data: {
          api_token_id: apiTokenId,
          api_version: apiVersion || "v1",
          duration_ms: durationMs || null,
          error_code: errorCode || null,
          http_method: httpMethod.toUpperCase(),
          ip_address: ipAddress || null,
          // guard against huge UA strings
          origin_header: originHeader || null,

          path,

          referer_header: refererHeader || null,

          request_id: requestId || null,

          scopes_required: scopesRequired || [],

          status_code: statusCode,

          user_agent: userAgent ? userAgent.substring(0, 512) : null,
          user_id: userId,
          workspace_id: workspaceId || null,
        },
      });
    } catch (error) {
      // Intentionally swallow errors for fire-and-forget logging
      console.error("Failed to insert public API request log", error);
    }
  }
}

module.exports = new WorkspaceTokensRepository();
