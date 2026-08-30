const crypto = require("crypto");
const { enqueueDomainVerificationJob } = require("@theweave/database");
const { AppError, fromUnknown } = require("@/errors");
const WorkspacesBaseController = require("./base-controller");
const settingsRepository = require("@/modules/workspaces/repositories/settings.repository");
const {
  WorkspaceCreationStepsService,
} = require("@/modules/workspaces/utils/workspace-creation-steps.util");
const baseRepository = require("@/modules/workspaces/repositories/base.repository");
const { domainResponseSchema } = require("../schemas/settings.schema");

class WorkspaceSettingsController extends WorkspacesBaseController {
  constructor() {
    super();
    this.settingsRepository = settingsRepository;
    this.creationStepsService = new WorkspaceCreationStepsService({
      workspacesRepository: baseRepository, // Need to make sure this matches what creationStepsService expects
    });
  }

  // --- SYSTEM SETTINGS ---
  async getSystemSettings(req, res, next) {
    try {
      const settings = await this.settingsRepository.getSystemSettings();
      res.status(200).json({ data: settings, success: true });
    } catch (error) {
      next(fromUnknown(error));
    }
  }

  async updateSystemSettings(req, res, next) {
    try {
      // Typically, you'd verify if the user is a SUPER_ADMIN of the system, not just an workspace
      // For now, we trust the route middleware
      const updates = req.body;
      const updated = await this.settingsRepository.updateSystemSettings(updates);
      res.status(200).json({ data: updated, message: "System settings updated", success: true });
    } catch (error) {
      next(fromUnknown(error));
    }
  }

  // --- CREATION STEPS ---
  async getStepOne(req, res, next) {
    try {
      const userId = this._validateAuthentication(req, res);
      if (!userId) return;
      const workspace = await this._getUserWorkspace(userId);
      return res.status(200).json({
        data: {
          ...this.creationStepsService.getStepOneMetadata(),
          workspace: workspace || null,
        },
        success: true,
      });
    } catch (error) {
      return next(fromUnknown(error));
    }
  }

  async saveStepOne(req, res, next) {
    try {
      const userId = this._validateAuthentication(req, res);
      if (!userId) return;
      let workspace = await this._getUserWorkspace(userId);
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
        await baseRepository.createWorkspaces(
          userId,
          validated.workspace_name,
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

        workspace = await this._getUserWorkspace(userId);
      } else {
        const settingsWithStep = this.creationStepsService.buildStepOneSettings(
          workspace.settings,
          validated,
          false
        );
        workspace = await this.settingsRepository.updateCreationIdentityStep(workspace.id, userId, {
          banner_url: workspace.banner_url,
          country: validated.country,
          default_locale: validated.default_locale,
          default_timezone: workspace.default_timezone || "America/Sao_Paulo",
          description: validated.description,
          logo_url: validated.logo_url !== null ? validated.logo_url : workspace.logo_url,
          settings: settingsWithStep,
          unique_name: validated.unique_name,
          workspace_name: validated.workspace_name,
        });
      }

      return res.status(200).json({
        data: {
          ...this.creationStepsService.getStepOneMetadata(),
          workspace,
        },
        message: "Workspace creation step 1 saved",
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
      const workspace = await this._getUserWorkspace(userId);
      if (!workspace) {
        throw AppError.notFound("Workspace not found");
      }

      const role = workspace?.settings?.workspace_role || null;
      if (!role) {
        throw AppError.badRequest("workspace_role must be defined before completing step 1");
      }

      const currentStepData = {
        country: workspace.country,
        default_locale: workspace.default_locale,
        description: workspace.description,
        language: workspace?.settings?.language || "en",
        logo_url: workspace.logo_url,
        unique_name: workspace.unique_name,
        workspace_name: workspace.workspace_name,
        workspace_role: role,
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
          settings: settingsWithStep,
          unique_name: workspace.unique_name,
          workspace_name: workspace.workspace_name,
        }
      );

      return res.status(200).json({
        data: {
          ...this.creationStepsService.getStepOneMetadata(),
          workspace: updated,
        },
        message: "Workspace creation step 1 completed",
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

  async listDomains(req, res, next) {
    try {
      const userId = this._validateAuthentication(req, res);
      if (!userId) return;

      const workspace = await this._getUserWorkspace(userId);
      if (!workspace) throw AppError.notFound("Workspace not found");

      const settings = await this.settingsRepository.getSettings(workspace.id);
      const domains = settings?.domains || [];

      res.status(200).json({
        data: domains.map((domain) =>
          domainResponseSchema.parse({ domain, workspaceSettings: settings })
        ),
        success: true,
      });
    } catch (error) {
      return next(fromUnknown(error));
    }
  }

  async createDomain(req, res, next) {
    try {
      const userId = this._validateAuthentication(req, res);
      if (!userId) return;

      const workspace = await this._getUserWorkspace(userId);
      if (!workspace) throw AppError.notFound("Workspace not found");

      // TODO: replace with workspaceRoleHasPermission when RBAC is active
      if (
        !this._ensureWorkspacePermission(workspace, this._workspacePermissions.MANAGE_DOMAINS, res)
      )
        return;

      const { domain_name: domainName } = req.body;
      const normalizedDomain = this._validateDomainName(domainName);

      const settings = await this.settingsRepository.getSettings(workspace.id);
      const domains = settings?.domains || [];

      if (domains.find((d) => d.domain_name === normalizedDomain)) {
        throw AppError.badRequest("Domain already registered for this workspace");
      }

      if (existingWorkspace && existingWorkspace.workspace_id !== workspace.id) {
        throw AppError.conflict("Domain is already in use by another workspace");
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
        data: domainResponseSchema.parse({ domain: newDomain, workspaceSettings: settings }),
        message: "Domain registered. Configure the TXT record and click verify.",
        success: true,
      });
    } catch (error) {
      return next(fromUnknown(error));
    }
  }

  async verifyDomain(req, res, next) {
    try {
      const userId = this._validateAuthentication(req, res);
      if (!userId) return;

      const workspace = await this._getUserWorkspace(userId);
      if (!workspace) throw AppError.notFound("Workspace not found");

      if (
        !this._ensureWorkspacePermission(workspace, this._workspacePermissions.MANAGE_DOMAINS, res)
      )
        return;

      const { domainId: domainName } = req.params;
      const settings = await this.settingsRepository.getSettings(workspace.id);
      const domains = settings?.domains || [];
      const domain = domains.find((d) => d.domain_name === domainName);

      if (!domain) {
        throw AppError.notFound("Domain not found");
      }

      await enqueueDomainVerificationJob({
        domainName: domain.domain_name,
        requestedByUserId: userId,
        workspaceId: workspace.id,
      });

      res.status(200).json({
        data: domainResponseSchema.parse({ domain, workspaceSettings: settings }),
        message:
          "Domain verification queued. Worker will retry DNS every 30 minutes until verified.",
        success: true,
      });
    } catch (error) {
      return next(fromUnknown(error));
    }
  }

  async deleteDomain(req, res, next) {
    try {
      const userId = this._validateAuthentication(req, res);
      if (!userId) return;

      const workspace = await this._getUserWorkspace(userId);
      if (!workspace) throw AppError.notFound("Workspace not found");

      if (
        !this._ensureWorkspacePermission(workspace, this._workspacePermissions.MANAGE_DOMAINS, res)
      )
        return;

      const { domainId: domainName } = req.params;
      const settings = await this.settingsRepository.getSettings(workspace.id);
      const domains = settings?.domains || [];
      const domainIndex = domains.findIndex((d) => d.domain_name === domainName);

      if (domainIndex === -1) {
        throw AppError.notFound("Domain not found");
      }

      if (settings.saml?.enabled) {
        throw AppError.badRequest("Disable SSO for the workspace before removing its domains");
      }

      domains.splice(domainIndex, 1);
      await this.settingsRepository.updateDomains(workspace.id, domains);

      res.status(200).json({ message: "Domain removed successfully", success: true });
    } catch (error) {
      return next(fromUnknown(error));
    }
  }

  async updateSsoSettings(req, res, next) {
    try {
      const userId = this._validateAuthentication(req, res);
      if (!userId) return;

      const workspace = await this._getUserWorkspace(userId);
      if (!workspace) throw AppError.notFound("Workspace not found");

      if (
        !this._ensureWorkspacePermission(workspace, this._workspacePermissions.MANAGE_DOMAINS, res)
      )
        return;

      const { domainId: domainName } = req.params;
      const settings = await this.settingsRepository.getSettings(workspace.id);
      const domains = settings?.domains || [];
      const domain = domains.find((d) => d.domain_name === domainName);

      if (!domain || domain.status !== "VERIFIED") {
        throw AppError.badRequest("Enable SSO only after domain is verified");
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
        data: domainResponseSchema.parse({ domain, workspaceSettings: updatedSettings }),
        message: shouldEnable
          ? "SAML settings saved. Users of this domain will be redirected to the IdP."
          : "SSO disabled for this domain",
        success: true,
      });
    } catch (error) {
      return next(fromUnknown(error));
    }
  }
}

module.exports = new WorkspaceSettingsController();
