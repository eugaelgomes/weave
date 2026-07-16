const {
  getCookieDomain,
  detectSameSitePolicy,
} = require("@/config/allowed-origins");

/**
 * Configurações padronizadas para cookies de autenticação
 * @param {Object} req - Request do Express
 * @param {Object} options - Opções adicionais
 * @param {number} options.maxAge - Tempo de expiração em milissegundos
 * @returns {Object} Configurações do cookie
 */
function getAuthCookieOptions(req, options = {}) {
  const isProduction = process.env.NODE_ENV === "production";
  const maxAge = options.maxAge || 12 * 60 * 60 * 1000; // 12h padrão
  const hostname = req?.hostname || "";
  const forwardedProto = req?.headers?.["x-forwarded-proto"];
  const isHttps = req?.secure || forwardedProto === "https";
  const isLocalhost = hostname === "localhost" || hostname === "127.0.0.1";

  // Obter domínio do cookie
  const domain = getCookieDomain(req.hostname);

  // Auto-detect cross-site scenario (e.g. theweave.tech → apis.weavenotes.app)
  const sameSite =
    isProduction && !isLocalhost ? detectSameSitePolicy() : "lax";
  // SameSite=None requires Secure flag
  const secure =
    isProduction && !isLocalhost ? isHttps || sameSite === "none" : false;

  const cookieOptions = {
    httpOnly: true,
    maxAge: maxAge,
    path: "/",
    sameSite: sameSite,
    secure,
  };

  // Só adiciona domain se estiver definido
  if (domain) {
    cookieOptions.domain = domain;
  }

  // Log para debug em produção
  if (isProduction) {
    console.info("[Cookie Config]", {
      domain: domain || "undefined",
      hostname: req.hostname,
      origin: req.headers.origin,
      sameSite: cookieOptions.sameSite,
      secure: cookieOptions.secure,
    });
  }

  return cookieOptions;
}

/**
 * Define o cookie de autenticação com configurações padronizadas
 * @param {Object} res - Response do Express
 * @param {Object} req - Request do Express
 * @param {string} token - Token JWT
 * @param {Object} options - Opções adicionais
 */
function setAuthCookie(res, req, token, options = {}) {
  const cookieOptions = getAuthCookieOptions(req, options);
  res.cookie("token", token, cookieOptions);
}

/**
 * Remove o cookie de autenticação
 * @param {Object} res - Response do Express
 * @param {Object} req - Request do Express
 */
function clearAuthCookie(res, req) {
  const isProduction = process.env.NODE_ENV === "production";
  const hostname = req?.hostname || "";
  const forwardedProto = req?.headers?.["x-forwarded-proto"];
  const isHttps = req?.secure || forwardedProto === "https";
  const isLocalhost = hostname === "localhost" || hostname === "127.0.0.1";
  const domain = getCookieDomain(req.hostname);
  const sameSite =
    isProduction && !isLocalhost ? detectSameSitePolicy() : "lax";
  const secure =
    isProduction && !isLocalhost ? isHttps || sameSite === "none" : false;

  const clearOptions = {
    httpOnly: true,
    path: "/",
    sameSite: sameSite,
    secure,
  };

  if (domain) {
    clearOptions.domain = domain;
  }

  res.clearCookie("token", clearOptions);
}

module.exports = {
  clearAuthCookie,
  getAuthCookieOptions,
  setAuthCookie,
};
