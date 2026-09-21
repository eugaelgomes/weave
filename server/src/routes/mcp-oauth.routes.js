const { mcpAuthRouter } = require("@modelcontextprotocol/sdk/server/auth/router.js");
const { getMcpOAuthConfig } = require("@/modules/authentication/config/mcp-oauth.config");
const mcpOAuthProvider = require("@/modules/authentication/services/mcp-oauth.provider");

/**
 * OAuth 2.1 discovery and authorization-server endpoints for the public MCP
 * resource. This router is deliberately mounted at the application root:
 * RFC 8414 and RFC 9728 require well-known URLs at that level.
 */
function createMcpOAuthRouter() {
  const config = getMcpOAuthConfig();
  return mcpAuthRouter({
    issuerUrl: config.issuerUrl,
    provider: mcpOAuthProvider,
    resourceName: "Weave MCP",
    resourceServerUrl: config.mcpUrl,
    scopesSupported: config.scopes,
  });
}

module.exports = { createMcpOAuthRouter };
