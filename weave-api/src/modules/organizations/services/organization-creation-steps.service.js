const {
  normalizeOrganizationName,
} = require("@/modules/organizations/normalizer");

const STEP_ONE = "step_1";
const ORGANIZATION_BUSINESS_ROLES = Object.freeze([
  "TECHNOLOGY",
  "MARKETING",
  "BUSINESS",
  "FINANCE",
  "HEALTHCARE",
  "EDUCATION",
  "RETAIL",
  "INDUSTRY",
  "OTHER",
]);
const LOCALE_PATTERN = /^[a-z]{2}-[A-Z]{2}$/;
const COUNTRY_PATTERN = /^[A-Z]{2}$/;

/**
 * @typedef {Object} StepOnePayload
 * @property {string} org_name
 * @property {string} unique_name
 * @property {string} [description]
 * @property {string|null} [logo_url]
 * @property {string} organization_role
 * @property {string|null} [default_locale]
 * @property {string|null} [country]
 * @property {string|null} [language]
 */

class OrganizationCreationStepsService {
  /**
   * @param {{ organizationsRepository: any }} dependencies
   */
  constructor({ organizationsRepository }) {
    this.organizationsRepository = organizationsRepository;
  }

  /**
   * @returns {{step: string, required_fields: string[], optional_fields: string[], available_roles: string[], role_options: string[]}}
   */
  getStepOneMetadata() {
    return {
      available_roles: [...ORGANIZATION_BUSINESS_ROLES],
      optional_fields: ["description", "logo_url"],
      planned_optional_steps: [
        "branding_properties",
        "users",
        "integrations",
        "domains",
      ],
      required_fields: [
        "org_name",
        "unique_name",
        "organization_role",
        "default_locale",
        "country",
        "language",
      ],
      role_options: [...ORGANIZATION_BUSINESS_ROLES],
      step: STEP_ONE,
    };
  }

  _normalizeRole(rawRole) {
    if (!rawRole || typeof rawRole !== "string") return null;
    return rawRole.trim().toUpperCase();
  }

  _sanitizeSettings(settings) {
    if (!settings || typeof settings !== "object" || Array.isArray(settings)) {
      return {};
    }
    return settings;
  }

  /**
   * @param {unknown} locale
   * @returns {string}
   */
  _normalizeLocale(locale) {
    if (typeof locale !== "string" || !locale.trim()) {
      return "en-US";
    }
    const normalizedLocale = locale.trim();
    if (!LOCALE_PATTERN.test(normalizedLocale)) {
      throw new Error("default_locale must use format ll-CC (example: en-US)");
    }
    return normalizedLocale;
  }

  /**
   * @param {unknown} country
   * @returns {string|null}
   */
  _normalizeCountry(country) {
    if (country === undefined || country === null || country === "") {
      return null;
    }
    if (typeof country !== "string") {
      throw new Error("country must be a string");
    }
    const normalizedCountry = country.trim().toUpperCase();
    if (!COUNTRY_PATTERN.test(normalizedCountry)) {
      throw new Error("country must use 2-letter ISO code (example: US, BR)");
    }
    return normalizedCountry;
  }

  /**
   * @param {unknown} language
   * @returns {string}
   */
  _normalizeLanguage(language) {
    if (typeof language !== "string" || !language.trim()) {
      return "en";
    }
    return language.trim().toLowerCase();
  }

  _buildCreationStepState(completed) {
    return {
      completed_steps: completed ? [STEP_ONE] : [],
      current_step: STEP_ONE,
      is_completed: Boolean(completed),
      planned_steps: [
        "step_1_basic",
        "step_2_branding_properties",
        "step_3_users",
        "step_4_integrations",
        "step_5_domains",
      ],
      updated_at: new Date().toISOString(),
    };
  }

  /**
   * @param {string} uniqueName
   * @param {string|null} [currentUniqueName]
   * @returns {Promise<string>}
   */
  async _assertUniqueNameAvailable(uniqueName, currentUniqueName = null) {
    const normalized = normalizeOrganizationName(uniqueName);
    if (!normalized) {
      throw new Error("unique_name is invalid after normalization");
    }
    const existingNames =
      await this.organizationsRepository.getAvailableOrgNames(normalized);
    const normalizedCurrent = currentUniqueName
      ? normalizeOrganizationName(currentUniqueName)
      : null;
    if (
      existingNames.includes(normalized) &&
      normalizedCurrent !== normalized
    ) {
      throw new Error("Unique name is already in use");
    }
    return normalized;
  }

  /**
   * @param {StepOnePayload} payload
   * @param {{ unique_name?: string }|null} [currentOrganization]
   * @returns {Promise<{
   *  org_name: string,
   *  unique_name: string,
   *  logo_url: string|null,
   *  banner_url: string|null,
   *  description: string,
   *  organization_role: string
   * }>}
   */
  async validateStepOnePayload(payload, currentOrganization = null) {
    const orgName =
      typeof payload.org_name === "string" ? payload.org_name.trim() : "";
    const uniqueNameSource =
      typeof payload.unique_name === "string" ? payload.unique_name.trim() : "";
    const normalizedRole = this._normalizeRole(payload.organization_role);

    if (!orgName) throw new Error("org_name is required");
    if (!uniqueNameSource) throw new Error("unique_name is required");
    if (!normalizedRole) throw new Error("organization_role is required");
    if (!ORGANIZATION_BUSINESS_ROLES.includes(normalizedRole)) {
      throw new Error(
        `organization_role must be one of: ${ORGANIZATION_BUSINESS_ROLES.join(", ")}`
      );
    }

    const uniqueName = await this._assertUniqueNameAvailable(
      uniqueNameSource,
      currentOrganization?.unique_name || null
    );
    const defaultLocale = this._normalizeLocale(payload.default_locale);
    const country = this._normalizeCountry(payload.country);
    const language = this._normalizeLanguage(payload.language);

    const normalizedDescription =
      payload.description !== undefined && payload.description !== null
        ? String(payload.description).trim()
        : "";

    return {
      country,
      default_locale: defaultLocale,
      description: normalizedDescription || "Type description here...",
      language,
      logo_url: payload.logo_url !== undefined ? payload.logo_url : null,
      org_name: orgName,
      organization_role: normalizedRole,
      unique_name: uniqueName,
    };
  }

  /**
   * @param {Record<string, any>} currentProperties
   * @param {{org_name: string, unique_name: string, description: string, logo_url: string|null, banner_url: string|null, organization_role: string}} stepData
   * @param {boolean} completed
   * @returns {Record<string, any>}
   */
  buildStepOneSettings(currentSettings, stepData, completed) {
    const baseSettings = this._sanitizeSettings(currentSettings);
    return {
      ...baseSettings,
      creation_step_1: {
        country: stepData.country,
        default_locale: stepData.default_locale,
        description: stepData.description,
        language: stepData.language,
        logo_url: stepData.logo_url,
        org_name: stepData.org_name,
        organization_role: stepData.organization_role,
        unique_name: stepData.unique_name,
      },
      creation_steps: this._buildCreationStepState(completed),
      language: stepData.language,
      organization_role: stepData.organization_role,
    };
  }
}

module.exports = {
  ORGANIZATION_BUSINESS_ROLES,
  OrganizationCreationStepsService,
  STEP_ONE,
};
