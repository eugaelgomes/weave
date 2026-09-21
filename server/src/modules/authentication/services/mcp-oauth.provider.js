const crypto = require("crypto");
const jwt = require("jsonwebtoken");
const {
  AccessDeniedError,
  InvalidGrantError,
  InvalidClientMetadataError,
  InvalidScopeError,
  InvalidTargetError,
  InvalidTokenError,
} = require("@modelcontextprotocol/sdk/server/auth/errors.js");
const { getMcpOAuthConfig } = require("../config/mcp-oauth.config");
const repository = require("../repositories/mcp-oauth.repository");

const randomToken = () => crypto.randomBytes(32).toString("base64url");
const escapeHtml = (value) =>
  String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");

function sameUrl(left, right) {
  return left && right && left.href.replace(/\/$/, "") === right.href.replace(/\/$/, "");
}

class McpOAuthProvider {
  constructor() {
    this.clientsStore = {
      getClient: (clientId) => repository.getClient(clientId),
      registerClient: (client) => {
        if (client.token_endpoint_auth_method !== "none") {
          throw new InvalidClientMetadataError(
            "Weave MCP supports public clients using token_endpoint_auth_method=none."
          );
        }
        return repository.registerClient(client);
      },
    };
  }

  _config() {
    const config = getMcpOAuthConfig();
    if (!config.signingSecret) {
      throw new Error("MCP_OAUTH_JWT_SECRET must be configured before issuing OAuth tokens.");
    }
    return config;
  }

  _validateScopes(scopes, config) {
    const requested = scopes?.length ? [...new Set(scopes)] : ["profile:read"];
    if (requested.some((scope) => !config.scopes.includes(scope))) {
      throw new InvalidScopeError("One or more requested scopes are not supported by Weave MCP.");
    }
    return requested;
  }

  _validateResource(resource, config) {
    if (resource && !sameUrl(resource, config.mcpUrl)) {
      throw new InvalidTargetError("The requested resource is not the Weave MCP server.");
    }
    return config.mcpUrl;
  }

  _authorizeRedirect(client, params, res) {
    const redirectUrl = new URL(params.redirectUri);
    redirectUrl.searchParams.set("code", params.code);
    if (params.state) redirectUrl.searchParams.set("state", params.state);
    redirectUrl.searchParams.set("iss", this._config().issuerUrl.href);
    res.redirect(302, redirectUrl.href);
  }

  _renderConsent(client, params, req, res, scopes) {
    const nonce = randomToken();
    req.session.mcpOAuthConsent = {
      clientId: client.client_id,
      codeChallenge: params.codeChallenge,
      nonce,
      redirectUri: params.redirectUri,
      resource: params.resource?.href || null,
      scopes,
      state: params.state || null,
    };

    const requestedScopes = scopes.map((scope) => `<li>${escapeHtml(scope)}</li>`).join("");
    const clientName = client.client_name || client.client_id;
    const fields = [
      ["client_id", client.client_id],
      ["redirect_uri", params.redirectUri],
      ["response_type", "code"],
      ["code_challenge", params.codeChallenge],
      ["code_challenge_method", "S256"],
      ["scope", scopes.join(" ")],
      ["state", params.state || ""],
      ["resource", params.resource?.href || ""],
      ["consent_nonce", nonce],
    ]
      .map(([name, value]) => `<input type="hidden" name="${name}" value="${escapeHtml(value)}">`)
      .join("");

    res.status(200).type("html").send(`<!doctype html>
      <html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
      <title>Authorize Weave MCP</title>
      <style>body{font-family:system-ui,sans-serif;background:#f7f7f5;color:#171717;margin:0;display:grid;min-height:100vh;place-items:center}.card{background:#fff;border:1px solid #ddd;border-radius:12px;max-width:480px;padding:32px;box-shadow:0 12px 30px #0001}button{font:inherit;border-radius:7px;padding:10px 14px;cursor:pointer}.allow{background:#171717;color:#fff;border:0}.deny{background:#fff;border:1px solid #aaa;margin-left:8px}</style>
      </head><body><main class="card"><h1>Connect ${escapeHtml(clientName)} to Weave</h1>
      <p>This application requests access to your Weave account.</p><p><strong>Permissions</strong></p><ul>${requestedScopes}</ul>
      <form method="post">${fields}<button class="allow" name="decision" value="allow" type="submit">Allow</button><button class="deny" name="decision" value="deny" type="submit">Deny</button></form>
      </main></body></html>`);
  }

  async authorize(client, params, res) {
    const req = res.req;
    const config = this._config();
    const scopes = this._validateScopes(params.scopes, config);
    const resource = this._validateResource(params.resource, config);
    const sessionUser = req.session?.user;

    if (!sessionUser?.userId) {
      const loginUrl = new URL("/auth", process.env.FRONTEND_URL || "http://localhost:3000");
      loginUrl.searchParams.set("return_to", new URL(req.originalUrl, config.issuerUrl).href);
      return res.redirect(302, loginUrl.href);
    }

    if (req.method !== "POST") {
      return this._renderConsent(client, params, req, res, scopes);
    }

    const consent = req.session.mcpOAuthConsent;
    const validConsent =
      consent &&
      consent.nonce === req.body.consent_nonce &&
      consent.clientId === client.client_id &&
      consent.redirectUri === params.redirectUri &&
      consent.codeChallenge === params.codeChallenge &&
      consent.resource === (params.resource?.href || null) &&
      consent.state === (params.state || null) &&
      consent.scopes.join(" ") === scopes.join(" ");

    delete req.session.mcpOAuthConsent;
    if (!validConsent || req.body.decision !== "allow") {
      throw new AccessDeniedError("The user did not approve this MCP connection.");
    }

    const code = randomToken();
    await repository.createAuthorizationCode({
      clientId: client.client_id,
      code,
      codeChallenge: params.codeChallenge,
      expiresAt: new Date(Date.now() + config.authorizationCodeTtlSeconds * 1000),
      redirectUri: params.redirectUri,
      resource: resource.href,
      scopes,
      userId: sessionUser.userId,
      workspaceId: sessionUser.workspace_id,
    });

    return this._authorizeRedirect(client, { ...params, code }, res);
  }

  async challengeForAuthorizationCode(client, authorizationCode) {
    const record = await repository.consumeAuthorizationCode(authorizationCode, client.client_id);
    if (!record) throw new InvalidGrantError("The authorization code is invalid, expired, or was already used.");
    // The SDK calls this before exchangeAuthorizationCode. Keep the consumed
    // record only for this request, indexed by code to prevent a second use.
    this.pendingAuthorizationCodes ||= new Map();
    this.pendingAuthorizationCodes.set(authorizationCode, record);
    return record.code_challenge;
  }

  async _issueTokens({ clientId, userId, workspaceId, scopes, resource }) {
    const config = this._config();
    const tokenId = crypto.randomUUID();
    const expiresAt = new Date(Date.now() + config.accessTokenTtlSeconds * 1000);
    const accessToken = jwt.sign(
      {
        client_id: clientId,
        jti: tokenId,
        scope: scopes.join(" "),
        workspace_id: workspaceId || undefined,
      },
      config.signingSecret,
      {
        algorithm: "HS256",
        audience: resource,
        expiresIn: config.accessTokenTtlSeconds,
        issuer: config.issuerUrl.href,
        subject: userId,
      }
    );
    const refreshToken = randomToken();

    await Promise.all([
      repository.createAccessToken({ clientId, expiresAt, resource, scopes, tokenId, userId, workspaceId }),
      repository.createRefreshToken({
        clientId,
        expiresAt: new Date(Date.now() + config.refreshTokenTtlSeconds * 1000),
        resource,
        scopes,
        token: refreshToken,
        userId,
        workspaceId,
      }),
    ]);

    return {
      access_token: accessToken,
      expires_in: config.accessTokenTtlSeconds,
      refresh_token: refreshToken,
      scope: scopes.join(" "),
      token_type: "Bearer",
    };
  }

  async exchangeAuthorizationCode(client, authorizationCode, _codeVerifier, redirectUri, resource) {
    const record = this.pendingAuthorizationCodes?.get(authorizationCode);
    this.pendingAuthorizationCodes?.delete(authorizationCode);
    if (!record || record.client_id !== client.client_id || record.redirect_uri !== redirectUri) {
      throw new InvalidGrantError("The authorization code does not match this client or redirect URI.");
    }
    if (resource && !sameUrl(resource, new URL(record.resource))) {
      throw new InvalidTargetError("The requested resource does not match the authorization grant.");
    }
    return this._issueTokens({
      clientId: record.client_id,
      resource: record.resource,
      scopes: record.scopes,
      userId: record.user_id,
      workspaceId: record.workspace_id,
    });
  }

  async exchangeRefreshToken(client, refreshToken, scopes, resource) {
    const record = await repository.rotateRefreshToken(refreshToken, client.client_id);
    if (!record) throw new InvalidGrantError("The refresh token is invalid, expired, or was already used.");
    if (resource && !sameUrl(resource, new URL(record.resource))) {
      throw new InvalidTargetError("The requested resource does not match the refresh token.");
    }
    const grantedScopes = scopes?.length ? scopes : record.scopes;
    if (grantedScopes.some((scope) => !record.scopes.includes(scope))) {
      throw new InvalidScopeError("A refresh token cannot grant additional scopes.");
    }
    return this._issueTokens({
      clientId: client.client_id,
      resource: record.resource,
      scopes: grantedScopes,
      userId: record.user_id,
      workspaceId: record.workspace_id,
    });
  }

  async verifyAccessToken(token) {
    const config = this._config();
    try {
      const payload = jwt.verify(token, config.signingSecret, {
        algorithms: ["HS256"],
        audience: config.mcpUrl.href,
        issuer: config.issuerUrl.href,
      });
      if (!payload || typeof payload === "string" || !payload.sub || !payload.jti || !payload.client_id) {
        throw new Error("Missing required access-token claims.");
      }
      const active = await repository.isAccessTokenActive(payload.jti, payload.client_id, payload.sub);
      if (!active) throw new Error("Access token has been revoked.");

      return {
        clientId: payload.client_id,
        expiresAt: payload.exp,
        extra: { userId: payload.sub, workspaceId: payload.workspace_id || null },
        resource: config.mcpUrl,
        scopes: typeof payload.scope === "string" ? payload.scope.split(" ").filter(Boolean) : [],
        token,
      };
    } catch {
      throw new InvalidTokenError("The OAuth access token is invalid, expired, or revoked.");
    }
  }

  async revokeToken(_client, request) {
    try {
      const config = this._config();
      const payload = jwt.verify(request.token, config.signingSecret, {
        algorithms: ["HS256"],
        audience: config.mcpUrl.href,
        issuer: config.issuerUrl.href,
      });
      if (payload && typeof payload !== "string" && payload.jti) {
        if (payload.client_id === _client.client_id) {
          await repository.revokeAccessToken(payload.jti, _client.client_id);
        }
        return;
      }
    } catch {
      // RFC 7009 requires a successful response for unknown tokens. It may be a refresh token.
    }
    await repository.revokeToken(request.token, _client.client_id);
  }
}

module.exports = new McpOAuthProvider();
