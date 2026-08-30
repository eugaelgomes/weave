const baseRepository = require("@/modules/workspaces/repositories/base.repository");
const settingsRepository = require("@/modules/workspaces/repositories/settings.repository");
const AuthBaseController = require("../base.controller");

const AuthRepository = require("../../repositories/auth.repository");
const { buildJwtPayload } = require("../../schemas/session.schema");
const { getFrontendUrl } = require("@/utils/url.util");

const SamlService = require("../../services/saml.service");

class SamlController extends AuthBaseController {
  /**
   * POST /api/v1/auth/sso/discover
   * Checks if an email belongs to a domain with SSO enabled.
   */
  async discoverSso(req, res) {
    try {
      const { email } = req.body;
      const emailParts = email.split("@");
      const domainName = emailParts[1];

      const orgSettings = await settingsRepository.findByDomain(domainName);

      if (orgSettings && orgSettings.saml && orgSettings.saml.enabled) {
        return res.status(200).json({
          organization_id: orgSettings.organization_id,
          provider: orgSettings.saml.provider,
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
   * GET /api/v1/auth/sso/saml/:organizationId/login
   * Initiates SAML login by redirecting the user to the IdP.
   */
  async samlLogin(req, res) {
    try {
      const { organizationId } = req.params;
      const orgSettings = await settingsRepository.getSettings(organizationId);
      const frontendURL = getFrontendUrl();

      if (!orgSettings || !orgSettings.saml || !orgSettings.saml.enabled) {
        return res.redirect(`${frontendURL}/auth?error=invalid_sso_config`);
      }

      const saml = SamlService.createInstance(orgSettings);
      const relayState = organizationId;
      const authUrl = await SamlService.getAuthorizeUrl(saml, relayState);

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
      const organizationId = RelayState;

      if (!SAMLResponse || !organizationId) {
        console.error("Missing SAMLResponse or RelayState (organizationId)");
        return res.redirect(`${frontendURL}/auth?error=sso_invalid_response`);
      }

      const orgSettings = await settingsRepository.getSettings(organizationId);
      if (!orgSettings || !orgSettings.saml || !orgSettings.saml.enabled) {
        return res.redirect(`${frontendURL}/auth?error=invalid_sso_config`);
      }

      const saml = SamlService.createInstance(orgSettings);
      const { profile } = await SamlService.validateResponse(saml, SAMLResponse);

      if (!profile || (!profile.email && !profile.nameID)) {
        throw new Error("SAML profile did not contain an email or NameID.");
      }

      const userEmail = profile.email || profile.nameID;
      const emailDomain = userEmail.split("@")[1];

      const domains = orgSettings.domains || [];
      const isDomainVerified = domains.some(
        (d) => d.domain_name === emailDomain && d.status === "VERIFIED"
      );

      if (!isDomainVerified) {
        console.error(`SAML email domain mismatch: ${emailDomain} not in verified domains`);
        return res.redirect(`${frontendURL}/auth?error=sso_domain_mismatch`);
      }

      let user = await AuthRepository.findUserByEmail(userEmail);

      if (!user) {
        const displayName = profile.displayName || profile.firstName || userEmail.split("@")[0];

        await AuthRepository.createUserWithSaml(
          `saml-${profile.nameID || userEmail}`,
          displayName,
          userEmail
        );

        user = await AuthRepository.findUserByEmail(userEmail);
      }

      if (!user) {
        throw new Error("Failed to provision SSO user.");
      }

      if (!user.workspace) {
        const displayName = profile?.displayName || profile?.firstName || userEmail.split("@")[0];
        await baseRepository.autoProvisionPersonalWorkspace(user.user_id, displayName);
        user = await AuthRepository.findUserByEmail(userEmail);
      }

      const workspace = this._normalizeWorkspace(user.workspace);
      const defaultTeam = this._normalizeDefaultTeam(user.default_team);

      const payload = buildJwtPayload(user, workspace, defaultTeam);
      req.session.user = payload;
      req.session.userId = user.user_id;

      req.session.save((err) => {
        if (err) {
          console.error("Session save error during SAML OAuth:", err);
          return res.redirect(`${frontendURL}/auth/?error=auth_failed`);
        }
        return res.redirect(`${frontendURL}/chat/?auth=success`);
      });
    } catch (error) {
      console.error("SAML ACS Callback error:", error);
      return res.redirect(`${frontendURL}/auth?error=sso_validation_failed`);
    }
  }
}

module.exports = new SamlController();
