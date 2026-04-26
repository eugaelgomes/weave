const crypto = require("crypto");
const jwt = require("jsonwebtoken");

const cookieHelper = require("@/utils/cookie-helper");
const secretsService = require("@/services/secrets");

const OAUTH_STATE_TTL_MS = 10 * 60 * 1000;
const OAUTH_STATE_COOKIE_PREFIX = "oauth_state_";

const getAuthCookieOptions = cookieHelper.getAuthCookieOptions;
const secretsManager = secretsService.secretsManager;

/**
 * @param {"google"|"github"} provider
 * @returns {string}
 */
function getOauthStateCookieName(provider) {
  return `${OAUTH_STATE_COOKIE_PREFIX}${provider}`;
}

/**
 * Creates a signed OAuth state token and stores it in a short-lived cookie.
 *
 * @param {object} params
 * @param {"google"|"github"} params.provider
 * @param {import("express").Request} params.req
 * @param {import("express").Response} params.res
 * @returns {string}
 */
function issueOauthState({ provider, req, res }) {
  const stateToken = jwt.sign(
    {
      nonce: crypto.randomBytes(24).toString("hex"),
      provider,
    },
    secretsManager(),
    {
      algorithm: "HS256",
      expiresIn: Math.floor(OAUTH_STATE_TTL_MS / 1000),
    }
  );

  const cookieOptions = getAuthCookieOptions(req, {
    maxAge: OAUTH_STATE_TTL_MS,
  });
  res.cookie(getOauthStateCookieName(provider), stateToken, cookieOptions);

  return stateToken;
}

/**
 * Validates and consumes OAuth state (double-submit cookie strategy).
 *
 * @param {object} params
 * @param {"google"|"github"} params.provider
 * @param {import("express").Request} params.req
 * @param {import("express").Response} params.res
 * @param {string} params.state
 * @returns {boolean}
 */
function consumeAndValidateOauthState({ provider, req, res, state }) {
  const cookieName = getOauthStateCookieName(provider);
  const cookieOptions = getAuthCookieOptions(req, {
    maxAge: OAUTH_STATE_TTL_MS,
  });
  const clearOptions = { ...cookieOptions };
  delete clearOptions.maxAge;

  const expectedState = req.cookies?.[cookieName];
  res.clearCookie(cookieName, clearOptions);

  if (!state || !expectedState || expectedState !== state) {
    return false;
  }

  try {
    const decoded = jwt.verify(state, secretsManager(), {
      algorithms: ["HS256"],
    });
    return decoded?.provider === provider && Boolean(decoded?.nonce);
  } catch {
    return false;
  }
}

module.exports = {
  consumeAndValidateOauthState,
  issueOauthState,
};
