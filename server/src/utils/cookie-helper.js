const { getCookieDomain } = require("@/config/allowed-origins");

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

  // Obter domínio do cookie
  const domain = getCookieDomain(req.hostname);

  const cookieOptions = {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax",
    maxAge: maxAge,
    path: "/",
  };

  // Só adiciona domain se estiver definido
  if (domain) {
    cookieOptions.domain = domain;
  }

  // Log para debug em produção
  if (isProduction) {
    console.log("[Cookie Config]", {
      hostname: req.hostname,
      domain: domain || "undefined",
      secure: cookieOptions.secure,
      sameSite: cookieOptions.sameSite,
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
  const domain = getCookieDomain(req.hostname);
  const clearOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    path: "/",
  };

  if (domain) {
    clearOptions.domain = domain;
  }

  res.clearCookie("token", clearOptions);
}

module.exports = {
  getAuthCookieOptions,
  setAuthCookie,
  clearAuthCookie,
};
