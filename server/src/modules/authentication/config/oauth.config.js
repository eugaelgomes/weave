const { getBackendUrl } = require("@/utils/url.util");

/**
 * Evaluates whether an authentication provider is enabled based on its env flag and credentials.
 *
 * @param {string | undefined} envValue - Flag from process.env (e.g. GOOGLE_AUTH_ENABLED)
 * @param {unknown} hasCredentials - Truthy check for client credentials
 * @returns {boolean}
 */
function isAuthFlagEnabled(envValue, hasCredentials) {
  if (envValue === undefined || envValue === null || envValue === "") {
    return Boolean(hasCredentials);
  }
  const normalized = String(envValue).trim().toLowerCase();
  if (normalized === "false" || normalized === "0") {
    return false;
  }
  return Boolean(hasCredentials);
}

/**
 * Resolves OAuth configuration strictly from environment variables (Doppler / .env).
 *
 * @returns {{
 *   github: { client_id: string, client_secret: string, redirect_uri: string, enabled: boolean },
 *   google: { client_id: string, client_secret: string, redirect_uri: string, enabled: boolean },
 *   microsoft: { client_id: string, client_secret: string, redirect_uri: string, tenant_id: string, enabled: boolean }
 * }}
 */
function getOauthConfig() {
  const backendUrl = getBackendUrl();

  const googleClientId = process.env.GOOGLE_CLIENT_ID || "";
  const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET || "";
  const googleRedirectUri =
    process.env.GOOGLE_REDIRECT_URI || `${backendUrl}/api/v1/auth/signin/sso/google/callback`;

  const githubClientId = process.env.GITHUB_CLIENT_ID || "";
  const githubClientSecret = process.env.GITHUB_CLIENT_SECRET || "";
  const githubRedirectUri =
    process.env.GITHUB_REDIRECT_URI || `${backendUrl}/api/v1/auth/signin/sso/github/callback`;

  const microsoftClientId = process.env.MICROSOFT_CLIENT_ID || "";
  const microsoftClientSecret = process.env.MICROSOFT_CLIENT_SECRET || "";
  const microsoftTenantId = process.env.MICROSOFT_TENANT_ID || "common";
  const microsoftRedirectUri =
    process.env.MICROSOFT_REDIRECT_URI || `${backendUrl}/api/v1/auth/signin/sso/microsoft/callback`;

  return {
    github: {
      client_id: githubClientId,
      client_secret: githubClientSecret,
      enabled: isAuthFlagEnabled(
        process.env.GITHUB_AUTH_ENABLED,
        githubClientId && githubClientSecret
      ),
      redirect_uri: githubRedirectUri,
    },
    google: {
      client_id: googleClientId,
      client_secret: googleClientSecret,
      enabled: isAuthFlagEnabled(
        process.env.GOOGLE_AUTH_ENABLED,
        googleClientId && googleClientSecret
      ),
      redirect_uri: googleRedirectUri,
    },
    microsoft: {
      client_id: microsoftClientId,
      client_secret: microsoftClientSecret,
      enabled: isAuthFlagEnabled(
        process.env.MICROSOFT_AUTH_ENABLED,
        microsoftClientId && microsoftClientSecret
      ),
      redirect_uri: microsoftRedirectUri,
      tenant_id: microsoftTenantId,
    },
  };
}

module.exports = {
  getOauthConfig,
  isAuthFlagEnabled,
};
