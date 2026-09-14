const crypto = require("crypto");
const bcrypt = require("bcrypt");

const { fromUnknown } = require("@/errors");
const workspaceTokensRepository = require("../repositories/tokens.repository");
const WorkspaceTokensNormalizer = require("../utils/workspace-tokens.normalizer");
const rolesRepository = require("../repositories/roles.repository");

const TOKEN_PREFIX = "wn_";
const SALT_ROUNDS = parseInt(process.env.SALT_ROUNDS, 10) || 12;

/**
 * Controller for API Tokens domain
 */
class WorkspaceTokensController {
  /**
   * API tokens creation (secret shown only once).
   * @param {import('express').Request} req
   * @param {import('express').Response} res
   * @param {import('express').NextFunction} next
   * @returns {Promise<void>}
   */
  async createToken(req, res, next) {
    try {
      const { name, workspaceId, scopes, expiresAt } = req.body;
      const { userId } = req.user;

      const rawPrefix = crypto.randomBytes(6).toString("hex");
      const rawSecret = crypto.randomBytes(32).toString("hex");

      const plainToken = `${TOKEN_PREFIX}${rawPrefix}.${rawSecret}`;

      const tokenHash = await bcrypt.hash(rawSecret, SALT_ROUNDS);

      let cleanScopes = scopes;
      if (!scopes || scopes.length === 0) {
        cleanScopes = ["profile:read", "notes:read"];
      } else if (!WorkspaceTokensNormalizer.areScopesValid(scopes)) {
        return res.status(400).json({ error: "One or more provided scopes are invalid." });
      }

      const isWorkspaceScope = cleanScopes.some(
        (s) => s.startsWith("workspaces:") || s.startsWith("projects:") || s.startsWith("calendar:")
      );

      if (workspaceId || isWorkspaceScope) {
        if (!workspaceId) {
          return res.status(400).json({
            error:
              "Workspace ID is required for tokens that access workspace, project, or calendar data.",
          });
        }

        const permissions = await rolesRepository.getUserEffectivePermissions(workspaceId, userId);

        if (!permissions.includes("manage_workspace")) {
          return res.status(403).json({
            error:
              "Only administrators with manage_workspace permission can create API tokens with workspace-level permissions.",
          });
        }
      }

      const tokenRecord = await workspaceTokensRepository.createToken({
        expiresAt,
        keyPrefix: rawPrefix,
        name,
        scopes: cleanScopes,
        tokenHash,
        userId,
        workspaceId,
      });

      res.status(201).json({
        message: "Token created successfully.",
        record: tokenRecord,
        token: plainToken,
      });
    } catch (error) {
      next(fromUnknown(error));
    }
  }

  /**
   * Listing of API tokens for the authenticated user.
   * @param {import('express').Request} req
   * @param {import('express').Response} res
   * @param {import('express').NextFunction} next
   * @returns {Promise<void>}
   */
  async listTokens(req, res, next) {
    try {
      const { userId } = req.user;

      const tokens = await workspaceTokensRepository.getTokensByUserId(userId);

      res.status(200).json(tokens);
    } catch (error) {
      next(fromUnknown(error));
    }
  }

  /**
   * Revocation and logical deletion of API tokens.
   * @param {import('express').Request} req
   * @param {import('express').Response} res
   * @param {import('express').NextFunction} next
   * @returns {Promise<void>}
   */
  async revokeToken(req, res, next) {
    try {
      const { id } = req.params;
      const { userId } = req.user;

      const revoked = await workspaceTokensRepository.revokeToken(id, userId);

      if (!revoked) {
        return res.status(404).json({ error: "Token not found or already revoked." });
      }

      res.status(200).json({ message: "Token revoked successfully.", record: revoked });
    } catch (error) {
      next(fromUnknown(error));
    }
  }

  /**
   * Escopos disponíveis para o UI de criação de tokens.
   * @param {import('express').Request} req
   * @param {import('express').Response} res
   */
  async getScopesInfo(req, res) {
    res.json(WorkspaceTokensNormalizer.getAvailableScopes());
  }
}

module.exports = new WorkspaceTokensController();
