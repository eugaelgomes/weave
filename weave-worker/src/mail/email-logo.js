/**
 * Email Logo Resolver
 * Returns a public static URL for the email header logo.
 */

const { env } = require("../config/enviroment");

const DEFAULT_LOGO_URL = "https://theweave.tech/logo.png";

/**
 * @returns {string}
 */
function getEmailLogoSrc() {
  return env.email.logoUrl || DEFAULT_LOGO_URL;
}

module.exports = { getEmailLogoSrc };

