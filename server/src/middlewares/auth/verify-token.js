const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const LookupApiTokensRepository = require("@/modules/api-tokens/repositories/lookup-api-tokens.repository");

const APPLICATION_SECRET_KEY = process.env.SECRET_KEY;

/**
 * Middleware unificado para verificar a autenticação da requisição.
 * Suporta dois fluxos:
 * 1. Sessão de Usuário Web: Tokens JWT vindos dos cookies.
 * 2. Autenticação de API (Pública): Tokens via header 'Authorization: Bearer wn_prefix.secret'.
 *
 * Em produção, inclui logs detalhados para problemas de autenticação.
 *
 * @param {import('express').Request} req O objeto de requisição do Express
 * @param {import('express').Response} res O objeto de resposta do Express
 * @param {import('express').NextFunction} next O callback para passar ao próximo middleware
 */
const verifyToken = async (req, res, next) => {
  const isProduction = process.env.NODE_ENV === "production";

  // ====== 1. TENTATIVA VIA TOKEN DE API (BEARER) ======
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer wn_")) {
    try {
      const apiTokenRaw = authHeader.split(" ")[1]; // wn_prefix123.secret456
      const tokenParts = apiTokenRaw.split(".");

      if (tokenParts.length !== 2) {
        return res
          .status(401)
          .json({ error: "Token de API inválido ou mal formatado." });
      }

      const prefixPart = tokenParts[0]; // wn_abc123
      const secretPart = tokenParts[1]; // def456...
      const keyPrefix = prefixPart.replace("wn_", "");

      // Busca e valida as regras de negócio do API Token
      const tokenRecord =
        await LookupApiTokensRepository.getTokenByKeyPrefix(keyPrefix);

      if (!tokenRecord) {
        return res
          .status(401)
          .json({ error: "Token de API não encontrado ou inativo." });
      }

      if (tokenRecord.revoked_at) {
        return res
          .status(401)
          .json({ error: "Este token de API foi revogado." });
      }

      if (
        tokenRecord.expires_at &&
        new Date() > new Date(tokenRecord.expires_at)
      ) {
        return res.status(401).json({ error: "Este token de API expirou." });
      }

      const isValid = await bcrypt.compare(secretPart, tokenRecord.token_hash);
      if (!isValid) {
        return res
          .status(401)
          .json({ error: "Token de API inválido (Secret incorreto)." });
      }

      // Preenche os dados da requisição com o proprietário do Token
      req.apiToken = {
        id: tokenRecord.id,
        scopes: tokenRecord.scopes || ["read"],
      };

      req.user = {
        userId: tokenRecord.user_id,
        organizationId: tokenRecord.organization_id,
        isApiCall: true,
      };

      return next(); // Segue fluxo da API Pública
    } catch (error) {
      console.error(
        "[Auth Error] Erro ao validar token de API pública:",
        error.message
      );
      return res
        .status(500)
        .json({ error: "Erro interno ao validar o token de API." });
    }
  }

  // ====== 2. TENTATIVA VIA SESSÃO WEB (COOKIES/JWT Padrão) ======
  let token = req.cookies?.token;

  // Como fallback alternativo, verifica no Header se for JWT comum sem ser prefixado "wn_"
  if (!token && authHeader && !authHeader.startsWith("Bearer wn_")) {
    token = authHeader.split(" ")[1];
  }

  // Debug em produção para identificar o problema de requisições perdidas
  if (isProduction && !token) {
    console.error("[Auth Error] Token de sessão não encontrado", {
      hasCookies: !!req.cookies,
      cookieKeys: req.cookies ? Object.keys(req.cookies) : [],
      hasAuthHeader: !!req.headers.authorization,
      origin: req.headers.origin,
      referer: req.headers.referer,
      userAgent: req.headers["user-agent"]?.substring(0, 50),
      path: req.path,
    });
  }

  if (!token) {
    return res.status(401).json({
      message: "Acesso negado. Token de sessão ou API não fornecido.",
    });
  }

  try {
    const decoded = jwt.verify(token, APPLICATION_SECRET_KEY, {
      algorithms: ["HS256"],
    });

    // Anexa as credenciais web normais à request
    req.user = decoded;

    return next();
  } catch {
    return res.status(401).json({
      message: "Sessão inválida ou expirada.",
    });
  }
};

module.exports = {
  verifyToken,
};
