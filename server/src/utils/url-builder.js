/**
 * Util for building application URLs based on the unified APP_DOMAIN environment variable.
 */

/**
 * Gets the base application domain.
 * Falls back to localhost if not set.
 */
function getAppDomain() {
  return process.env.APP_DOMAIN || "localhost";
}

/**
 * Returns true if running in production mode.
 */
function isProduction() {
  return process.env.NODE_ENV === "production";
}

/**
 * Gets the Frontend URL.
 */
function getFrontendUrl() {
  if (!isProduction() || getAppDomain() === "localhost") {
    return "http://localhost:3000";
  }
  return `https://${getAppDomain()}`;
}

/**
 * Gets the Backend (API) URL.
 */
function getBackendUrl() {
  if (!isProduction() || getAppDomain() === "localhost") {
    return "http://localhost:8080";
  }
  return `https://apis.${getAppDomain()}`;
}

/**
 * Gets the MCP URL.
 */
function getMcpUrl() {
  if (!isProduction() || getAppDomain() === "localhost") {
    return "http://localhost:8081"; // Or whatever default port MCP uses
  }
  return `https://mcp.${getAppDomain()}`;
}

module.exports = {
  getAppDomain,
  isProduction,
  getFrontendUrl,
  getBackendUrl,
  getMcpUrl,
};
