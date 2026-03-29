const crypto = require("crypto");
const bcrypt = require("bcrypt");
const ApiTokensRepository = require("./api-tokens.repository");
const ApiTokensNormalizer = require("./normalizer");

const TOKEN_PREFIX = "wn_";
const SALT_ROUNDS = parseInt(process.env.SALT_ROUNDS, 10) || 12;

class ApiTokensController {

  /**
   * Retorna ao frontend a lista padronizada de escopos de API disponíveis
   * para alimentar o menu suspenso ou formulário de marcação.
   * 
   * @param {import('express').Request} req - Objeto da requisição.
   * @param {import('express').Response} res - Objeto da resposta.
   */
  async getScopesInfo(req, res) {
    res.json(ApiTokensNormalizer.getAvailableScopes());
  }

  /**
   * Cria um novo token de API para o usuário autenticado.
   * O secret é gerado aleatoriamente usando criptografia nativa (crypto)
   * e armazenado no banco de dados apenas em formato de hash (bcrypt).
   * O token em texto plano é retornado APENAS nesta resposta (run once).
   * 
   * @param {import('express').Request} req - Objeto da requisição (body requer 'name', 'scopes', etc).
   * @param {import('express').Response} res - Objeto da resposta.
   * @param {import('express').NextFunction} next - Middleware para repassar exceções.
   * @returns {Promise<void>} JSON contendo mensagem de sucesso, o 'token' plano e o registro gerado.
   */
  async createToken(req, res, next) {
    try {
      const { name, organizationId, scopes, expiresAt } = req.body;
      const { userId } = req.user;

      if (!name || name.trim() === "") {
        return res.status(400).json({ error: "O nome do token é obrigatório." });
      }

      // Generate the unhashed token components
      const rawPrefix = crypto.randomBytes(6).toString("hex"); // e.g. 12 chars
      const rawSecret = crypto.randomBytes(32).toString("hex"); // e.g. 64 chars

      // The full token the user will see, just once
      const plainToken = `${TOKEN_PREFIX}${rawPrefix}.${rawSecret}`;

      // Hash the secret part
      const tokenHash = await bcrypt.hash(rawSecret, SALT_ROUNDS);

      // Ensure scopes are at least valid formats or provide a fallback read scope
      let cleanScopes = scopes;
      if (!scopes || scopes.length === 0) {
        cleanScopes = ["profile:read", "notes:read"]; // Padrão seguro mínimo
      } else if (!ApiTokensNormalizer.areScopesValid(scopes)) {
        return res.status(400).json({ error: "Um ou mais escopos fornecidos são inválidos." });
      }

      // Validação de Segurança para Organizações
      const isOrgScope = cleanScopes.some(s => s.startsWith("organizations:") || s.startsWith("projects:") || s.startsWith("calendar:"));

      if (organizationId || isOrgScope) {
        if (!organizationId) {
          return res.status(400).json({ error: "O ID da organização é obrigatório para gerar tokens que interagem com dados da organização (Organizações, Projetos ou Calendários)." });
        }

        const role = await ApiTokensRepository.getUserOrgRole(userId, organizationId);
        
        if (role !== "super_admin") {
          return res.status(403).json({ error: "Apenas super administradores podem criar tokens de API com permissões organizacionais." });
        }
      }

      const tokenRecord = await ApiTokensRepository.createToken({
        name,
        keyPrefix: rawPrefix,
        tokenHash,
        userId,
        organizationId,
        scopes: cleanScopes,
        expiresAt
      });

      // ONLY time we return the plain token!
      res.status(201).json({
        message: "Token gerado com sucesso.",
        token: plainToken,
        record: tokenRecord
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Lista todos os tokens de API do usuário atual (autenticado) que não foram marcados como deletados.
   * Não retorna o `token_hash` por questões de segurança, apenas os metadados (ID, scopes, validade).
   * 
   * @param {import('express').Request} req - Objeto da requisição contendo `req.user`.
   * @param {import('express').Response} res - Objeto da resposta.
   * @param {import('express').NextFunction} next - Middleware para repassar exceções.
   * @returns {Promise<void>} Array com os registros encontrados.
   */
  async listTokens(req, res, next) {
    try {
      const { userId } = req.user;
      
      const tokens = await ApiTokensRepository.getTokensByUserId(userId);
      
      res.status(200).json(tokens);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Revoga a chave de API instantaneamente sem deletar o seu histórico.
   * Modifica a propriedade 'revoked_at' indicando que o token já não é mais válido 
   * e não poderá realizar novas autenticações no sistema.
   * 
   * @param {import('express').Request} req - Objeto da requisição contendo o param 'id'.
   * @param {import('express').Response} res - Objeto da resposta.
   * @param {import('express').NextFunction} next - Middleware para repassar exceções.
   * @returns {Promise<void>} 200 JSON com a data de revogação. Error (404) caso não seja encontrado.
   */
  async revokeToken(req, res, next) {
    try {
      const { id } = req.params;
      const { userId } = req.user;

      const revoked = await ApiTokensRepository.revokeToken(id, userId);

      if (!revoked) {
        return res.status(404).json({ error: "Token não encontrado ou já deletado." });
      }

      res.status(200).json({ message: "Token revogado com sucesso.", record: revoked });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Remove o Token logicamente (Soft Delete).
   * Ele passará a ser ignorado em todas as buscas de validação e não listará como ativo.
   * Utiliza 'deleted_at' e a flag 'deleted'.
   * 
   * @param {import('express').Request} req - Objeto da requisição contendo o param 'id'.
   * @param {import('express').Response} res - Objeto da resposta.
   * @param {import('express').NextFunction} next - Middleware para repassar exceções.
   * @returns {Promise<void>} 200 de sucesso ou 404 em caso de erro ao encontrar.
   */
  async deleteToken(req, res, next) {
    try {
      const { id } = req.params;
      const { userId } = req.user;

      const deleted = await ApiTokensRepository.deleteToken(id, userId);

      if (!deleted) {
        return res.status(404).json({ error: "Token não encontrado." });
      }

      res.status(200).json({ message: "Token deletado com sucesso." });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new ApiTokensController();