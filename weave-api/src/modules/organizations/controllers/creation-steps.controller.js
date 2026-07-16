const { fromUnknown } = require("@/errors");
const OrganizationsBaseController = require("./base-controller");
const areasRepository = require("@/modules/organizations/repositories/areas.repository");
const {
  ORG_ROLES,
} = require("@/modules/organizations/organization-role-policy");
const {
  normalizeOrganizationName,
} = require("@/modules/organizations/normalizer");
const {
  OrganizationCreationStepsService,
} = require("@/modules/organizations/services/organization-creation-steps.service");

/**
 * @typedef {import('express').Request} Request
 * @typedef {import('express').Response} Response
 * @typedef {import('./base-controller').AuthenticatedRequest} AuthenticatedRequest
 */

class OrganizationCreationStepsController extends OrganizationsBaseController {
  /**
   * Initialize creation steps controller dependencies.
   */
  constructor() {
    super();
    this.areasRepository = areasRepository;
    this.creationStepsService = new OrganizationCreationStepsService({
      organizationsRepository: this.organizationsRepository,
    });
  }

  /**
   * Build a unique slug for the default area.
   * @param {string} organizationId
   * @param {string} slugBase
   * @returns {Promise<string|null>}
   */
  async _generateUniqueAreaSlug(organizationId, slugBase) {
    if (!slugBase) return null;
    const existingSlugs = await this.areasRepository.getMatchingSlugs(
      organizationId,
      slugBase
    );
    if (!existingSlugs.includes(slugBase)) return slugBase;
    let counter = 1;
    let candidate = `${slugBase}-${counter}`;
    while (existingSlugs.includes(candidate)) {
      counter += 1;
      candidate = `${slugBase}-${counter}`;
    }
    return candidate;
  }

  /**
   * Create the default area and assign creator as area admin.
   * @param {{id: string, unique_name: string, org_name: string}} organization
   * @param {string} createdBy
   * @returns {Promise<void>}
   */
  async _createDefaultOrganizationArea(organization, createdBy) {
    const defaultName = "Central Area";
    const slugBase =
      organization.unique_name || normalizeOrganizationName(defaultName);
    const uniqueSlug = await this._generateUniqueAreaSlug(
      organization.id,
      slugBase
    );
    const newArea = await this.areasRepository.createArea({
      areaName: defaultName,
      createdBy,
      description: `Main area for organization ${organization.org_name}`,
      organizationId: organization.id,
      parentAreaId: null,
      properties: { system: true },
      slug: uniqueSlug || `${slugBase}-${organization.id}`,
    });
    await this.areasRepository.addAreaMember(
      newArea.id,
      organization.id,
      createdBy,
      ORG_ROLES.ADMIN,
      createdBy
    );
  }

  /**
   * Load metadata and current state for organization creation step 1.
   * @param {Request & AuthenticatedRequest} req
   * @param {Response} res
   * @returns {Promise<void|Response>}
   */
  async getStepOne(req, res) {
    try {
      const userId = this._validateAuthentication(req, res);
      if (!userId) return;
      const organization = await this._getUserOrganization(userId);
      return res.status(200).json({
        data: {
          ...this.creationStepsService.getStepOneMetadata(),
          organization: organization || null,
        },
        status: "OK",
        success: true,
      });
    } catch {
      return res.status(500).json({
        error: "Error loading organization creation step 1",
        success: false,
      });
    }
  }

  /**
   * Save organization creation step 1 payload.
   * Creates the organization when it does not exist yet.
   * @param {Request & AuthenticatedRequest} req
   * @param {Response} res
   * @returns {Promise<void|Response>}
   */
  async saveStepOne(req, res, next) {
    try {
      const userId = this._validateAuthentication(req, res);
      if (!userId) return;
      let organization = await this._getUserOrganization(userId);
      const validated = await this.creationStepsService.validateStepOnePayload(
        req.body || {},
        organization
      );

      if (!organization) {
        const settingsWithStep = this.creationStepsService.buildStepOneSettings(
          organization?.settings || {},
          validated,
          false
        );
        const newOrg = await this.organizationsRepository.createOrgs(
          userId,
          validated.org_name,
          validated.unique_name,
          validated.logo_url,
          organization?.banner_url || null,
          validated.description,
          organization?.default_timezone || "America/Sao_Paulo",
          validated.default_locale,
          validated.country,
          settingsWithStep,
          null
        );
        await this._createDefaultOrganizationArea(newOrg, userId);
        organization = await this._getUserOrganization(userId);
      } else {
        const settingsWithStep = this.creationStepsService.buildStepOneSettings(
          organization.settings,
          validated,
          false
        );
        organization =
          await this.organizationsRepository.updateCreationIdentityStep(
            organization.id,
            userId,
            {
              banner_url: organization.banner_url,
              country: validated.country,
              default_locale: validated.default_locale,
              default_timezone:
                organization.default_timezone || "America/Sao_Paulo",
              description: validated.description,
              logo_url:
                validated.logo_url !== null
                  ? validated.logo_url
                  : organization.logo_url,
              org_name: validated.org_name,
              settings: settingsWithStep,
              unique_name: validated.unique_name,
            }
          );
      }

      return res.status(200).json({
        data: {
          ...this.creationStepsService.getStepOneMetadata(),
          organization,
        },
        message: "Organization creation step 1 saved",
        status: "OK",
        success: true,
      });
    } catch (error) {
      return next(fromUnknown(error));
    }
  }

  /**
   * Mark organization creation step 1 as completed.
   * @param {Request & AuthenticatedRequest} req
   * @param {Response} res
   * @returns {Promise<void|Response>}
   */
  async completeStepOne(req, res, next) {
    try {
      const userId = this._validateAuthentication(req, res);
      if (!userId) return;
      const organization = await this._getUserOrganization(userId);
      if (!organization) {
        return res.status(404).json({
          error: "Organization not found",
          success: false,
        });
      }

      const role = organization?.settings?.organization_role || null;
      if (!role) {
        return res.status(400).json({
          error: "organization_role must be defined before completing step 1",
          success: false,
        });
      }

      const currentStepData = {
        country: organization.country,
        default_locale: organization.default_locale,
        description: organization.description,
        language: organization?.settings?.language || "en",
        logo_url: organization.logo_url,
        org_name: organization.org_name,
        organization_role: role,
        unique_name: organization.unique_name,
      };

      const settingsWithStep = this.creationStepsService.buildStepOneSettings(
        organization.settings,
        currentStepData,
        true
      );

      const updated =
        await this.organizationsRepository.updateCreationIdentityStep(
          organization.id,
          userId,
          {
            banner_url: organization.banner_url,
            country: organization.country,
            default_locale: organization.default_locale,
            default_timezone: organization.default_timezone,
            description: organization.description,
            logo_url: organization.logo_url,
            org_name: organization.org_name,
            settings: settingsWithStep,
            unique_name: organization.unique_name,
          }
        );

      return res.status(200).json({
        data: {
          ...this.creationStepsService.getStepOneMetadata(),
          organization: updated,
        },
        message: "Organization creation step 1 completed",
        status: "OK",
        success: true,
      });
    } catch (error) {
      return next(fromUnknown(error));
    }
  }
}

module.exports = new OrganizationCreationStepsController();
