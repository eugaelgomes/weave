const { getMcpOAuthConfig } = require("../config/mcp-oauth.config");

const SESSION_KEY = "mcpOAuthPostLoginReturnTo";

function getSafeMcpAuthorizationUrl(value) {
  if (typeof value !== "string" || !value) return null;

  try {
    const candidate = new URL(value);
    const { issuerUrl } = getMcpOAuthConfig();
    if (candidate.origin !== issuerUrl.origin || candidate.pathname !== "/authorize") return null;
    if (!candidate.searchParams.get("client_id") || !candidate.searchParams.get("code_challenge")) {
      return null;
    }
    return candidate.href;
  } catch {
    return null;
  }
}

function rememberMcpAuthorization(req, value) {
  const url = getSafeMcpAuthorizationUrl(value);
  if (url && req.session) req.session[SESSION_KEY] = url;
}

function consumeMcpAuthorization(req) {
  const url = getSafeMcpAuthorizationUrl(req.session?.[SESSION_KEY]);
  if (req.session) delete req.session[SESSION_KEY];
  return url;
}

module.exports = {
  consumeMcpAuthorization,
  getSafeMcpAuthorizationUrl,
  rememberMcpAuthorization,
};
