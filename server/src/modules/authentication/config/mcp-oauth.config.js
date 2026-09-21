const { API_SCOPES } = require("@/config/api-scopes");

const ACCESS_TOKEN_TTL_SECONDS = 15 * 60;
const AUTHORIZATION_CODE_TTL_SECONDS = 5 * 60;
const REFRESH_TOKEN_TTL_SECONDS = 30 * 24 * 60 * 60;

const MCP_SCOPES = Object.freeze(Object.values(API_SCOPES));

function asUrl(value, name) {
  try {
    return new URL(value);
  } catch {
    throw new Error(`${name} must be an absolute URL.`);
  }
}

/**
 * Returns the public resource and authorization-server addresses.
 *
 * MCP clients discover these URLs, so they must be configured explicitly in
 * production rather than inferred from a request Host header.
 */
function getMcpOAuthConfig() {
  const isProduction = process.env.NODE_ENV === "production";
  if (isProduction && !process.env.API_URL) {
    throw new Error("API_URL is required in production to publish the MCP OAuth endpoints.");
  }

  // API_URL carries the public API domain in deployed environments. Local
  // development is the only mode that may fall back to localhost.
  const apiUrl = asUrl(process.env.API_URL || "http://localhost:8080", "API_URL");
  const mcpUrl = asUrl(
    process.env.MCP_PUBLIC_URL || new URL("/api/v1/mcp", apiUrl).href,
    "MCP_PUBLIC_URL"
  );
  const issuerUrl = asUrl(process.env.MCP_OAUTH_ISSUER || apiUrl.origin, "MCP_OAUTH_ISSUER");

  if (isProduction) {
    if (mcpUrl.protocol !== "https:" || issuerUrl.protocol !== "https:") {
      throw new Error("MCP_PUBLIC_URL and MCP_OAUTH_ISSUER must use HTTPS in production.");
    }
    if (!process.env.MCP_OAUTH_JWT_SECRET) {
      throw new Error("MCP_OAUTH_JWT_SECRET is required in production.");
    }
  }

  return {
    accessTokenTtlSeconds: ACCESS_TOKEN_TTL_SECONDS,
    authorizationCodeTtlSeconds: AUTHORIZATION_CODE_TTL_SECONDS,
    issuerUrl,
    mcpUrl,
    refreshTokenTtlSeconds: REFRESH_TOKEN_TTL_SECONDS,
    scopes: MCP_SCOPES,
    // Keeping this separate from the session secret permits independent key
    // rotation. The development fallback makes the local flow usable without
    // a second secret while production always requires the dedicated value.
    signingSecret: process.env.MCP_OAUTH_JWT_SECRET || process.env.SESSION_SECRET,
  };
}

module.exports = {
  getMcpOAuthConfig,
};
