const crypto = require("crypto");
const { enqueueDomainVerificationJob } = require("@theweave/database");
const { fromUnknown } = require("@/errors");
const OrganizationsBaseController = require("./base-controller");
const settingsRepository = require("@/modules/workspaces/repositories/settings.repository");
const { OrganizationCreationStepsService } = require("@/modules/workspaces/utils/workspace-creation-steps.util");
const { normalizeOrganizationName } = require("@/modules/workspaces/normalizer");
const baseRepository = require("@/modules/workspaces/repositories/base.repository");

class WorkspaceSettingsController extends OrganizationsBaseController {
  constructor() {
    super();
    this.settingsRepository = settingsRepository;
    this.creationStepsService = new OrganizationCreationStepsService({
      organizationsRepository: baseRepository, // Need to make sure this matches what creationStepsService expects
    });
  }

  // --- SYSTEM SETTINGS ---
  async getSystemSettings(req, res, next) {
    try {
      const settings = await this.settingsRepository.getSystemSettings();
      res.status(200).json({ data: settings, status: "OK" });
    } catch (error) {
      next(fromUnknown(error));
    }
  }

  async updateSystemSettings(req, res, next) {
    try {
      // Typically, you'd verify if the user is a SUPER_ADMIN of the system, not just an org
      // For now, we trust the route middleware
      const updates = req.body;
      const updated = await this.settingsRepository.updateSystemSettings(updates);
      res.status(200).json({ data: updated, status: "OK", message: "System settings updated" });
    } catch (error) {
      next(fromUnknown(error));
    }
  }

  // --- CREATION STEPS ---
  async getStepOne(req, res) {
    try {
      const userId = this._validateAuthentication(req, res);
      if (!userId) return;
      const workspace = await this._getUserOrganization(userId);
      return res.status(200).json({
        data: {
          ...this.creationStepsService.getStepOneMetadata(),
          workspace: workspace || null,
        },
        status: "OK",
        success: true,
      });
    } catch {
      return res.status(500).json({
        error: "Error loading workspace creation step 1",
        success: false,
      });
    }
  }

  async saveStepOne(req, res, next) {
    try {
      const userId = this._validateAuthentication(req, res);
      if (!userId) return;
      let workspace = await this._getUserOrganization(userId);
      const validated = await this.creationStepsService.validateStepOnePayload(
        req.body || {},
        workspace
      );

      if (!workspace) {
        const settingsWithStep = this.creationStepsService.buildStepOneSettings(
          workspace?.settings || {},
          validated,
          false
        );
        const newOrg = await baseRepository.createOrgs(
          userId,
          validated.org_name,
          validated.unique_name,
          validated.logo_url,
          workspace?.banner_url || null,
          validated.description,
          workspace?.default_timezone || "America/Sao_Paulo",
          validated.default_locale,
          validated.country,
          settingsWithStep,
          null
        );
        
        workspace = await this._getUserOrganization(userId);
      } else {
        const settingsWithStep = this.creationStepsService.buildStepOneSettings(
          workspace.settings,
          validated,
          false
        );
        workspace = await this.settingsRepository.updateCreationIdentityStep(
          workspace.id,
          userId,
          {
            banner_url: workspace.banner_url,
            country: validated.country,
            default_locale: validated.default_locale,
            default_timezone: workspace.default_timezone || "America/Sao_Paulo",
            description: validated.description,
            logo_url: validated.logo_url !== null ? validated.logo_url : workspace.logo_url,
            org_name: validated.org_name,
            settings: settingsWithStep,
            unique_name: validated.unique_name,
          }
        );
      }

      return res.status(200).json({
        data: {
          ...this.creationStepsService.getStepOneMetadata(),
          workspace,
        },
        message: "Workspace creation step 1 saved",
        status: "OK",
        success: true,
      });
    } catch (error) {
      return next(fromUnknown(error));
    }
  }

  async completeStepOne(req, res, next) {
    try {
      const userId = this._validateAuthentication(req, res);
      if (!userId) return;
      const workspace = await this._getUserOrganization(userId);
      if (!workspace) {
        return res.status(404).json({ error: "Workspace not found", success: false });
      }

      const role = workspace?.settings?.organization_role || null;
      if (!role) {
        return res.status(400).json({ error: "organization_role must be defined before completing step 1", success: false });
      }

      const currentStepData = {
        country: workspace.country,
        default_locale: workspace.default_locale,
        description: workspace.description,
        language: workspace?.settings?.language || "en",
        logo_url: workspace.logo_url,
        org_name: workspace.org_name,
        organization_role: role,
        unique_name: workspace.unique_name,
      };

      const settingsWithStep = this.creationStepsService.buildStepOneSettings(
        workspace.settings,
        currentStepData,
        true
      );

      const updated = await this.settingsRepository.updateCreationIdentityStep(
        workspace.id,
        userId,
        {
          banner_url: workspace.banner_url,
          country: workspace.country,
          default_locale: workspace.default_locale,
          default_timezone: workspace.default_timezone,
          description: workspace.description,
          logo_url: workspace.logo_url,
          org_name: workspace.org_name,
          settings: settingsWithStep,
          unique_name: workspace.unique_name,
        }
      );

      return res.status(200).json({
        data: {
          ...this.creationStepsService.getStepOneMetadata(),
          workspace: updated,
        },
        message: "Workspace creation step 1 completed",
        status: "OK",
        success: true,
      });
    } catch (error) {
      return next(fromUnknown(error));
    }
  }

  // --- DOMAINS & SSO ---
  _generateVerificationToken() {
    const randomSeed = crypto.randomBytes(24).toString("hex");
    return `weave-domain-verification=${randomSeed}`;
  }

  _serializeDomain(domain, orgSettings) {
    if (!domain) return null;
    return {
      created_at: domain.created_at,
      deleted: false,
      domain_name: domain.domain_name,
      id: domain.domain_name,
      instructions: {
        description: "Create a TXT record for _weave-challenge.<domain> with the provided value to complete verification.",
        host: `_weave-challenge.${domain.domain_name}`,
        type: "TXT",
        value: domain.verification_token,
      },
      organization_id: orgSettings.organization_id,
      sso_enabled: orgSettings.saml?.enabled || false,
      sso_metadata: orgSettings.saml?.metadata || null,
      sso_provider: orgSettings.saml?.provider || null,
      status: domain.status,
      updated_at: domain.updated_at || domain.created_at,
      verification_token: domain.verification_token,
      verified_at: domain.verified_at,
    };
  }

  async listDomains(req, res) {
    try {
      const userId = this._validateAuthentication(req, res);
      if (!userId) return;

      const workspace = await this._getUserOrganization(userId);
      if (!workspace) return res.status(404).json({ error: "Workspace not found", success: false });

      const settings = await this.settingsRepository.getSettings(workspace.id);
      const domains = settings?.domains || [];

      res.status(200).json({
        domains: domains.map((domain) => this._serializeDomain(domain, settings)),
        status: "OK",
      });
    } catch (error) {
      console.error("Error listing workspace domains:", error);
      res.status(500).json({ error: "Error listing workspace domains", success: false });
    }
  }

  async createDomain(req, res) {
    try {
      const userId = this._validateAuthentication(req, res);
      if (!userId) return;

      const workspace = await this._getUserOrganization(userId);
      if (!workspace) return res.status(404).json({ error: "Workspace not found", success: false });

      // TODO: replace with orgRoleHasPermission when RBAC is active
      if (!this._ensureOrgPermission(workspace, this._orgPermissions.MANAGE_DOMAINS, res)) return;

      const { domain_name: domainName } = req.body;
      const normalizedDomain = this._validateDomainName(domainName);

      const settings = await this.settingsRepository.getSettings(workspace.id);
      const domains = settings?.domains || [];

      if (domains.find((d) => d.domain_name === normalizedDomain)) {
        return res.status(400).json({ error: "Domain already registered for this workspace", success: false });
      }

      const existingOrg = await this.settingsRepository.findByDomain(normalizedDomain);
      if (existingOrg && existingOrg.organization_id !== workspace.id) {
        return res.status(409).json({ error: "Domain is already in use by another workspace", success: false });
      }

      const verificationToken = this._generateVerificationToken();
      const newDomain = {
        created_at: new Date().toISOString(),
        domain_name: normalizedDomain,
        status: "PENDING",
        verification_token: verificationToken,
      };

      domains.push(newDomain);
      await this.settingsRepository.updateDomains(workspace.id, domains);

      res.status(201).json({
        data: this._serializeDomain(newDomain, settings),
        message: "Domain registered. Configure the TXT record and click verify.",
        status: "OK",
      });
    } catch (error) {
      console.error("Error registering domain:", error);
      res.status(500).json({ error: "Error registering domain", success: false });
    }
  }

  async verifyDomain(req, res) {
    try {
      const userId = this._validateAuthentication(req, res);
      if (!userId) return;

      const workspace = await this._getUserOrganization(userId);
      if (!workspace) return res.status(404).json({ error: "Workspace not found", success: false });

      if (!this._ensureOrgPermission(workspace, this._orgPermissions.MANAGE_DOMAINS, res)) return;

      const { domainId: domainName } = req.params;
      const settings = await this.settingsRepository.getSettings(workspace.id);
      const domains = settings?.domains || [];
      const domain = domains.find((d) => d.domain_name === domainName);

      if (!domain) {
        return res.status(404).json({ error: "Domain not found", success: false });
      }

      await enqueueDomainVerificationJob({
        domainName: domain.domain_name,
        organizationId: workspace.id,
        requestedByUserId: userId,
      });

      res.status(200).json({
        data: this._serializeDomain(domain, settings),
        message: "Domain verification queued. Worker will retry DNS every 30 minutes until verified.",
        status: "OK",
      });
    } catch (error) {
      console.error("Error verifying domain:", error);
      res.status(500).json({ error: "Error verifying domain", success: false });
    }
  }

  async deleteDomain(req, res) {
    try {
      const userId = this._validateAuthentication(req, res);
      if (!userId) return;

      const workspace = await this._getUserOrganization(userId);
      if (!workspace) return res.status(404).json({ error: "Workspace not found", success: false });

      if (!this._ensureOrgPermission(workspace, this._orgPermissions.MANAGE_DOMAINS, res)) return;

      const { domainId: domainName } = req.params;
      const settings = await this.settingsRepository.getSettings(workspace.id);
      const domains = settings?.domains || [];
      const domainIndex = domains.findIndex((d) => d.domain_name === domainName);

      if (domainIndex === -1) {
        return res.status(404).json({ error: "Domain not found", success: false });
      }

      if (settings.saml?.enabled) {
        return res.status(400).json({
          error: "Disable SSO for the workspace before removing its domains",
          success: false,
        });
      }

      domains.splice(domainIndex, 1);
      await this.settingsRepository.updateDomains(workspace.id, domains);

      res.status(200).json({ message: "Domain removed successfully", status: "OK" });
    } catch (error) {
      console.error("Error deleting domain:", error);
      res.status(500).json({ error: "Error deleting domain", success: false });
    }
  }

  async updateSsoSettings(req, res) {
    try {
      const userId = this._validateAuthentication(req, res);
      if (!userId) return;

      const workspace = await this._getUserOrganization(userId);
      if (!workspace) return res.status(404).json({ error: "Workspace not found", success: false });

      if (!this._ensureOrgPermission(workspace, this._orgPermissions.MANAGE_DOMAINS, res)) return;

      const { domainId: domainName } = req.params;
      const settings = await this.settingsRepository.getSettings(workspace.id);
      const domains = settings?.domains || [];
      const domain = domains.find((d) => d.domain_name === domainName);

      if (!domain || domain.status !== "VERIFIED") {
        return res.status(400).json({ error: "Enable SSO only after domain is verified", success: false });
      }

      const { provider, metadata, enabled } = req.body;
      const shouldEnable = enabled === undefined ? true : enabled;
      const normalizedProvider = provider.trim().toLowerCase();
      const sanitizeString = (value) => (typeof value === "string" ? value.trim() : null);

      const samlMetadata = {
        certificate: sanitizeString(metadata.certificate),
        entityId: sanitizeString(metadata.entityId),
        sloUrl: sanitizeString(metadata.sloUrl),
        ssoUrl: sanitizeString(metadata.ssoUrl) || sanitizeString(metadata.acsUrl),
      };

      await this.settingsRepository.updateSAML(workspace.id, {
        enabled: shouldEnable,
        metadata: samlMetadata,
        provider: normalizedProvider,
      });

      const updatedSettings = await this.settingsRepository.getSettings(workspace.id);

      res.status(200).json({
        data: this._serializeDomain(domain, updatedSettings),
        message: shouldEnable ? "SAML settings saved. Users of this domain will be redirected to the IdP." : "SSO disabled for this domain",
        status: "OK",
      });
    } catch (error) {
      console.error("Error updating SSO settings for domain:", error);
      res.status(500).json({ error: "Error updating SSO settings for domain", success: false });
    }
  }
}

module.exports = new WorkspaceSettingsController();
