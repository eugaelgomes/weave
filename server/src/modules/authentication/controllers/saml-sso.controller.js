const { SAML } = require("@node-saml/node-saml");
const { z } = require("zod");
const AuthBaseController = require("./base.controller");
const OrganizationDomainsRepository = require("@/modules/organizations/repositories/domains.repository");
const FindUserRepository = require("@/modules/authentication/repositories/find-user.repository");
const SamlSsoRepository = require("@/modules/authentication/repositories/saml-sso.repository");
const { buildJwtPayload } = require("@/modules/authentication/schemas/jwt-payload.schema");
const { getFrontendUrl, getBackendUrl } = require("@/utils/url.util");

class SamlSsoController extends AuthBaseController {
  /**
   * Generates a dynamic SAML instance based on the domain's metadata
   */
  _getSamlInstance(domain) {
    if (!domain.sso_metadata || !domain.sso_metadata.ssoUrl || !domain.sso_metadata.certificate) {
      throw new Error("SAML configuration is incomplete for this domain.");
    }

    const cert = domain.sso_metadata.certificate.replace(/\\n/g, "\n");

    return new SAML({
      acceptedClockSkewMs: 120000,

callbackUrl: `${getBackendUrl()}/api/v1/auth/sso/saml/acs`,

// Weave SP Entity ID
cert: cert,

entryPoint: domain.sso_metadata.ssoUrl,
      // IdP Public Certificate
identifierFormat: null,
      issuer: "weave-notes",
      signatureAlgorithm: "sha256",
    });
  }

  /**
   * POST /api/v1/auth/sso/discover
   * Checks if an email belongs to a domain with SSO enabled.
   */
  async discoverSso(req, res) {
    try {
      const discoverSchema = z.object({
        email: z.string().email("Invalid email format"),
      });

      const parsed = discoverSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.errors[0].message, success: false });
      }

      const { email } = parsed.data;
      const emailParts = email.split("@");

      const domainName = emailParts[1];
      const domain = await OrganizationDomainsRepository.findActiveByDomain(domainName);

      if (domain && domain.status === "VERIFIED" && domain.sso_enabled) {
        return res.status(200).json({
          domain_id: domain.id,
          provider: domain.sso_provider,
          requires_sso: true,
          success: true,
        });
      }

      return res.status(200).json({
        requires_sso: false,
        success: true,
      });
    } catch (error) {
      console.error("SSO Discovery error:", error);
      return res.status(500).json({ error: "Internal server error", success: false });
    }
  }

  /**
   * GET /api/v1/auth/sso/saml/:domainId/login
   * Initiates SAML login by redirecting the user to the IdP.
   */
  async samlLogin(req, res) {
    try {
      const { domainId } = req.params;
      const domain = await OrganizationDomainsRepository.findById(domainId);
      const frontendURL = getFrontendUrl();

      if (!domain || !domain.sso_enabled || domain.status !== "VERIFIED") {
        return res.redirect(`${frontendURL}/auth?error=invalid_sso_domain`);
      }

      const saml = this._getSamlInstance(domain);

      // RelayState helps us remember which domain this login belongs to when the IdP posts back to ACS
      const relayState = domainId;

      const authUrl = await saml.getAuthorizeUrlAsync(relayState, null, {});
      return res.redirect(authUrl);
    } catch (error) {
      const frontendURL = getFrontendUrl();
      console.error("SAML Initiation error:", error);
      return res.redirect(`${frontendURL}/auth?error=sso_initiation_failed`);
    }
  }

  /**
   * POST /api/v1/auth/sso/saml/acs
   * Assertion Consumer Service: receives the SAML response from the IdP.
   */
  async samlCallback(req, res) {
    const frontendURL = getFrontendUrl();
    try {
      const { SAMLResponse, RelayState } = req.body;
      const domainId = RelayState;

      if (!SAMLResponse || !domainId) {
        console.error("Missing SAMLResponse or RelayState (domainId)");
        return res.redirect(`${frontendURL}/auth?error=sso_invalid_response`);
      }

      const domain = await OrganizationDomainsRepository.findById(domainId);
      if (!domain || !domain.sso_enabled) {
        return res.redirect(`${frontendURL}/auth?error=invalid_sso_domain`);
      }

      const saml = this._getSamlInstance(domain);

      // Validate the SAML assertion
      const { profile } = await saml.validatePostResponseAsync({ SAMLResponse });

      if (!profile || (!profile.email && !profile.nameID)) {
        throw new Error("SAML profile did not contain an email or NameID.");
      }

      const userEmail = profile.email || profile.nameID;
      const emailDomain = userEmail.split("@")[1];

      // Security check: ensure the asserted email matches the verified domain
      if (emailDomain.toLowerCase() !== domain.domain_name.toLowerCase()) {
        console.error(`SAML email domain mismatch: ${emailDomain} != ${domain.domain_name}`);
        return res.redirect(`${frontendURL}/auth?error=sso_domain_mismatch`);
      }

      // Find or provision user
      let user = await FindUserRepository.findUserByEmail(userEmail);

      if (!user) {
        // Create user automatically for SAML SSO (Just in Time Provisioning)
        const displayName = profile.displayName || profile.firstName || userEmail.split("@")[0];

        await SamlSsoRepository.createUserWithSaml(
          `saml-${profile.nameID || userEmail}`,
          displayName,
          userEmail
        );
        user = await FindUserRepository.findUserByEmail(userEmail);
      }

      if (!user) {
        throw new Error("Failed to provision SSO user.");
      }

      // Issue session
      const organization = this._normalizeOrganization(user.organization);
      const defaultArea = this._normalizeDefaultArea(user.default_area);

      const payload = buildJwtPayload(user, organization, defaultArea);
      req.session.user = payload;
      req.session.userId = user.user_id;

      req.session.save((err) => {
        if (err) {
          console.error("Session save error during SAML OAuth:", err);
          return res.redirect(`${frontendURL}/auth/?error=auth_failed`);
        }
        return res.redirect(`${frontendURL}/home/?auth=success`);
      });

    } catch (error) {
      console.error("SAML ACS Callback error:", error);
      return res.redirect(`${frontendURL}/auth?error=sso_validation_failed`);
    }
  }
}

module.exports = new SamlSsoController();
