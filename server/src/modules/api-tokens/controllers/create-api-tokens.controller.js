const crypto = require("crypto");
const bcrypt = require("bcrypt");

const { fromUnknown } = require("@/errors");
const CreateApiTokensRepository = require("@/modules/api-tokens/repositories/create-api-tokens.repository");
const ApiTokensNormalizer = require("@/modules/api-tokens/normalizer");
const rolesRepository = require("@/modules/workspaces/repositories/roles.repository");

const TOKEN_PREFIX = "wn_";
const SALT_ROUNDS = parseInt(process.env.SALT_ROUNDS, 10) || 12;

/**
 * API tokens creation (secret shown only once).
 */
class CreateApiTokensController {
  /**
   * @param {import('express').Request} req
   * @param {import('express').Response} res
   * @param {import('express').NextFunction} next
   * @returns {Promise<void>}
   */
  async createToken(req, res, next) {
    try {
      const { name, organizationId, scopes, expiresAt } = req.body;
      const { userId } = req.user;

      const rawPrefix = crypto.randomBytes(6).toString("hex");
      const rawSecret = crypto.randomBytes(32).toString("hex");

      const plainToken = `${TOKEN_PREFIX}${rawPrefix}.${rawSecret}`;

      const tokenHash = await bcrypt.hash(rawSecret, SALT_ROUNDS);

      let cleanScopes = scopes;
      if (!scopes || scopes.length === 0) {
        cleanScopes = ["profile:read", "notes:read"];
      } else if (!ApiTokensNormalizer.areScopesValid(scopes)) {
        return res.status(400).json({ error: "One or more provided scopes are invalid." });
      }

      const isOrgScope = cleanScopes.some(
        (s) => s.startsWith("workspaces:") || s.startsWith("projects:") || s.startsWith("calendar:")
      );

      if (organizationId || isOrgScope) {
        if (!organizationId) {
          return res.status(400).json({
            error:
              "Workspace ID is required for tokens that access workspace, project, or calendar data.",
          });
        }

        const permissions = await rolesRepository.getUserEffectivePermissions(
          organizationId,
          userId
        );

        if (!permissions.includes("manage_workspace")) {
          return res.status(403).json({
            error:
              "Only administrators with manage_workspace permission can create API tokens with workspace-level permissions.",
          });
        }
      }

      const tokenRecord = await CreateApiTokensRepository.createToken({
        expiresAt,
        keyPrefix: rawPrefix,
        name,
        organizationId,
        scopes: cleanScopes,
        tokenHash,
        userId,
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
}

module.exports = new CreateApiTokensController();
