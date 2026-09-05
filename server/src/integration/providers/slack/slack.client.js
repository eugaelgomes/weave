const crypto = require("crypto");
const axios = require("axios");
const { AppError } = require("@/errors/app-error");

const SLACK_API = "https://slack.com/api";
const DEFAULT_SLACK_BOT_SCOPES = [
  "chat:write",
  "chat:write.public",
  "channels:read",
  "groups:read",
  "im:read",
  "mpim:read",
].join(",");

/**
 * Client adapter for Slack APIs.
 */
class SlackClient {
  constructor(credentials = {}) {
    this.accessToken = credentials.accessToken || credentials.botAccessToken || null;
  }

  /**
   * Validates access token / credentials header.
   */
  validateAuth() {
    if (!this.accessToken) {
      throw AppError.unauthorized("Slack integration requires a valid accessToken in credentials");
    }
  }

  /**
   * Posts a message to a channel.
   *
   * @param {object} params
   * @param {string} params.channel Channel ID
   * @param {string} params.text Message text
   * @param {object[]} [params.blocks] Optional Block Kit blocks
   * @returns {Promise<{ ok: boolean, error?: string }>}
   */
  async chatPostMessage({ channel, text, blocks }) {
    this.validateAuth();
    if (!channel || !text) {
      throw AppError.badRequest("chatPostMessage requires 'channel' and 'text' parameters");
    }

    const { data } = await axios.post(
      `${SLACK_API}/chat.postMessage`,
      {
        channel,
        text,
        ...(blocks && blocks.length ? { blocks } : {}),
      },
      {
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
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
   * @returns {Promise<{ ok: boolean, channel?: { name?: string }, error?: string }>}
   */
  async conversationsInfo({ channel }) {
    this.validateAuth();
    if (!channel) {
      throw AppError.badRequest("conversationsInfo requires 'channel' parameter");
    }

    const { data } = await axios.get(`${SLACK_API}/conversations.info`, {
      headers: { Authorization: `Bearer ${this.accessToken}` },
      params: { channel },
      timeout: 20000,
      validateStatus: () => true,
    });
    return data;
  }

  /**
   * Static helper to build OAuth authorize URL
   */
  static buildAuthorizeUrl({ state, redirectUri }) {
    const clientId = process.env.SLACK_CLIENT_ID;
    if (!clientId) {
      throw new Error("SLACK_CLIENT_ID is not configured");
    }
    const scope = (process.env.SLACK_BOT_SCOPES || DEFAULT_SLACK_BOT_SCOPES).trim();
    const qs = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      scope,
      state,
    });
    return `https://slack.com/oauth/v2/authorize?${qs.toString()}`;
  }

  /**
   * Static helper to exchange OAuth code for tokens
   */
  static async exchangeOAuthCode(code, redirectUri) {
    const clientId = process.env.SLACK_CLIENT_ID;
    const clientSecret = process.env.SLACK_CLIENT_SECRET;
    if (!clientId || !clientSecret) {
      throw new Error("Slack OAuth client credentials are not configured");
    }

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

    return data;
  }

  /**
   * Static helper to revoke token
   */
  static async authRevoke(token) {
    const { data } = await axios.post(`${SLACK_API}/auth.revoke`, new URLSearchParams({ token }), {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      timeout: 20000,
      validateStatus: () => true,
    });
    return data;
  }

  /**
   * Verifies `X-Slack-Signature` for incoming webhooks
   */
  static verifySlackSignature({ rawBody, signingSecret, slackSignature, slackTimestamp }) {
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
    if (Math.abs(now - ts) > 60 * 5) return false;

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
}

module.exports = { SlackClient };
