const crypto = require("crypto");
const axios = require("axios");

/**
 * @typedef {object} SlackOauthAccessResponse
 * @property {boolean} ok
 * @property {string} [error]
 * @property {string} [access_token]
 * @property {string} [token_type]
 * @property {string} [scope]
 * @property {string} [bot_user_id]
 * @property {string} [app_id]
 * @property {{ id?: string, name?: string }} [team]
 * @property {{ id?: string }} [authed_user]
 */

const SLACK_API = "https://slack.com/api";

/**
 * Default bot scopes for posting to channels and reading conversation metadata.
 */
const DEFAULT_SLACK_BOT_SCOPES = [
  "chat:write",
  "chat:write.public",
  "channels:read",
  "groups:read",
  "im:read",
  "mpim:read",
].join(",");

/**
 * OAuth redirect URI (must match Slack app settings and token exchange).
 * @returns {string}
 */
function getSlackRedirectUri() {
  if (process.env.SLACK_REDIRECT_URI) {
    return process.env.SLACK_REDIRECT_URI;
  }
  return process.env.NODE_ENV === "production"
    ? "https://apis.weavenotes.app/api/v1/webhooks/slack/oauth/callback"
    : "http://localhost:8080/api/v1/webhooks/slack/oauth/callback";
}

/**
 * Bot scopes string from env or defaults.
 * @returns {string}
 */
function getSlackBotScopes() {
  return (process.env.SLACK_BOT_SCOPES || DEFAULT_SLACK_BOT_SCOPES).trim();
}

/**
 * Builds Slack OAuth v2 authorize URL.
 *
 * @param {object} params
 * @param {string} params.state
 * @returns {string}
 */
function buildAuthorizeUrl({ state }) {
  const clientId = process.env.SLACK_CLIENT_ID;
  if (!clientId) {
    throw new Error("SLACK_CLIENT_ID is not configured");
  }
  const redirectUri = getSlackRedirectUri();
  const scope = getSlackBotScopes();
  const qs = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    scope,
    state,
  });
  return `https://slack.com/oauth/v2/authorize?${qs.toString()}`;
}

/**
 * Exchanges OAuth authorization code for tokens.
 *
 * @param {string} code
 * @returns {Promise<SlackOauthAccessResponse>}
 */
async function exchangeOAuthCode(code) {
  const clientId = process.env.SLACK_CLIENT_ID;
  const clientSecret = process.env.SLACK_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("Slack OAuth client credentials are not configured");
  }
  const redirectUri = getSlackRedirectUri();

  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    code,
    redirect_uri: redirectUri,
  });

  const { data } = await axios.post(`${SLACK_API}/oauth.v2.access`, body.toString(), {
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    timeout: 20000,
    validateStatus: () => true,
  });

  return /** @type {SlackOauthAccessResponse} */ (data);
}

/**
 * Posts a message to a channel.
 *
 * @param {object} params
 * @param {object[]} [params.blocks] Optional Block Kit blocks
 * @param {string} params.channel Channel ID
 * @param {string} params.text Fallback text
 * @param {string} params.token Bot token
 * @returns {Promise<{ ok: boolean, error?: string }>}
 */
async function chatPostMessage({ blocks, channel, text, token }) {
  const { data } = await axios.post(
    `${SLACK_API}/chat.postMessage`,
    {
      channel,
      text,
      ...(blocks && blocks.length ? { blocks } : {}),
    },
    {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json; charset=utf-8",
      },
      timeout: 20000,
      validateStatus: () => true,
    }
  );
  return data;
}

/**
 * Fetches conversation metadata (validates channel id and bot access).
 *
 * @param {object} params
 * @param {string} params.channel
 * @param {string} params.token
 * @returns {Promise<{ ok: boolean, channel?: { name?: string }, error?: string }>}
 */
async function conversationsInfo({ channel, token }) {
  const { data } = await axios.get(`${SLACK_API}/conversations.info`, {
    headers: { Authorization: `Bearer ${token}` },
    params: { channel },
    timeout: 20000,
    validateStatus: () => true,
  });
  return data;
}

/**
 * Revokes a token (best-effort).
 *
 * @param {string} token
 * @returns {Promise<{ ok: boolean }>}
 */
async function authRevoke(token) {
  const { data } = await axios.post(`${SLACK_API}/auth.revoke`, new URLSearchParams({ token }), {
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    timeout: 20000,
    validateStatus: () => true,
  });
  return data;
}

/**
 * Verifies `X-Slack-Signature` for incoming Slack HTTP callbacks.
 *
 * @param {object} params
 * @param {string} params.signingSecret
 * @param {string} params.slackSignature Header `x-slack-signature`
 * @param {string} params.slackTimestamp Header `x-slack-request-timestamp`
 * @param {Buffer|string} rawBody Raw request body as received
 * @returns {boolean}
 */
function verifySlackSignature({ rawBody, signingSecret, slackSignature, slackTimestamp }) {
  if (
    !signingSecret ||
    !slackSignature ||
    !slackTimestamp ||
    rawBody === undefined ||
    rawBody === null
  ) {
    return false;
  }
  const ts = Number(slackTimestamp);
  if (!Number.isFinite(ts)) return false;
  const now = Math.floor(Date.now() / 1000);
  if (Math.abs(now - ts) > 60 * 5) {
    return false;
  }
  const base = `v0:${slackTimestamp}:${Buffer.isBuffer(rawBody) ? rawBody.toString("utf8") : String(rawBody)}`;
  const hmac = crypto.createHmac("sha256", signingSecret).update(base).digest("hex");
  const expected = `v0=${hmac}`;
  try {
    const a = Buffer.from(expected, "utf8");
    const b = Buffer.from(slackSignature, "utf8");
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

module.exports = {
  authRevoke,
  buildAuthorizeUrl,
  chatPostMessage,
  conversationsInfo,
  DEFAULT_SLACK_BOT_SCOPES,
  exchangeOAuthCode,
  getSlackBotScopes,
  getSlackRedirectUri,
  verifySlackSignature,
};
