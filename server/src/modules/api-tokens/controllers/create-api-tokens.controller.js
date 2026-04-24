const crypto = require("crypto");
const bcrypt = require("bcrypt");

const CreateApiTokensRepository = require("@/modules/api-tokens/repositories/create-api-tokens.repository");
const ApiTokensNormalizer = require("@/modules/api-tokens/normalizer");
const {
  ORG_ROLES,
} = require("@/modules/organizations/organization-role-policy");

const TOKEN_PREFIX = "wn_";
const SALT_ROUNDS = parseInt(process.env.SALT_ROUNDS, 10) || 12;

/**
 * Criação de API tokens (secret mostrado uma vez).
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

      if (!name || name.trim() === "") {
        return res
          .status(400)
          .json({ error: "O nome do token é obrigatório." });
      }

      const rawPrefix = crypto.randomBytes(6).toString("hex");
      const rawSecret = crypto.randomBytes(32).toString("hex");

      const plainToken = `${TOKEN_PREFIX}${rawPrefix}.${rawSecret}`;

      const tokenHash = await bcrypt.hash(rawSecret, SALT_ROUNDS);

      let cleanScopes = scopes;
      if (!scopes || scopes.length === 0) {
        cleanScopes = ["profile:read", "notes:read"];
      } else if (!ApiTokensNormalizer.areScopesValid(scopes)) {
        return res
          .status(400)
          .json({ error: "Um ou mais escopos fornecidos são inválidos." });
      }

      const isOrgScope = cleanScopes.some(
        (s) =>
          s.startsWith("organizations:") ||
          s.startsWith("projects:") ||
          s.startsWith("calendar:")
      );

      if (organizationId || isOrgScope) {
        if (!organizationId) {
          return res.status(400).json({
            error:
              "O ID da organização é obrigatório para gerar tokens que interagem com dados da organização (Organizações, Projetos ou Calendários).",
          });
        }

        const role = await CreateApiTokensRepository.getUserOrgRole(
          userId,
          organizationId
        );

        if (role !== ORG_ROLES.SUPER_ADMIN) {
          return res.status(403).json({
            error:
              "Apenas super administradores podem criar tokens de API com permissões organizacionais.",
          });
        }
      }

      const tokenRecord = await CreateApiTokensRepository.createToken({
        name,
        keyPrefix: rawPrefix,
        tokenHash,
        userId,
        organizationId,
        scopes: cleanScopes,
        expiresAt,
      });

      res.status(201).json({
        message: "Token gerado com sucesso.",
        token: plainToken,
        record: tokenRecord,
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new CreateApiTokensController();
