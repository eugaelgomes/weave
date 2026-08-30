const { SAML } = require("@node-saml/node-saml");
const { getBackendUrl } = require("@/utils/url.util");

/**
 * Service responsible for SAML SP operations: instance creation,
 * authorize URL generation, and assertion validation.
 */
class SamlService {
  /**
   * Creates a SAML SP instance from workspace settings.
   * @param {{ saml: { ssoUrl: string, certificate: string } }} orgSettings
   * @returns {SAML}
   */
  createInstance(orgSettings) {
    if (!orgSettings.saml?.ssoUrl || !orgSettings.saml?.certificate) {
      throw new Error("SAML configuration is incomplete for this workspace.");
    }

    const cert = orgSettings.saml.certificate.replace(/\\n/g, "\n");

    return new SAML({
      acceptedClockSkewMs: 120000,
      callbackUrl: `${getBackendUrl()}/api/v1/auth/sso/saml/acs`,
      cert,
      entryPoint: orgSettings.saml.ssoUrl,
      identifierFormat: null,
      issuer: "weave-notes",
      signatureAlgorithm: "sha256",
    });
  }

  /**
   * Generates the IdP redirect URL.
   * @param {SAML} samlInstance
   * @param {string} relayState
   * @returns {Promise<string>}
   */
  async getAuthorizeUrl(samlInstance, relayState) {
    return samlInstance.getAuthorizeUrlAsync(relayState, null, {});
  }

  /**
   * Validates a SAML POST response and returns the user profile.
   * @param {SAML} samlInstance
   * @param {string} samlResponse
   * @returns {Promise<{ profile: object }>}
   */
  async validateResponse(samlInstance, samlResponse) {
    return samlInstance.validatePostResponseAsync({ SAMLResponse: samlResponse });
  }
}

module.exports = new SamlService();
