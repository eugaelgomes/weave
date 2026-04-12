/**
 * Controller base do módulo de autenticação: normalização de organização e área padrão.
 */
class AuthBaseController {
  /**
   * @param {object | null | undefined} defaultAreaData
   * @returns {{
   *   id: string | null,
   *   name: string | null,
   *   slug: string | null,
   *   role: string | null,
   *   member_since: string | Date | null,
   *   description: string | null,
   *   properties: Record<string, unknown>
   * } | null}
   */
  _normalizeDefaultArea(defaultAreaData) {
    if (!defaultAreaData) {
      return null;
    }

    return {
      id: defaultAreaData.org_default_area_id,
      name: defaultAreaData.org_default_area_name,
      slug: defaultAreaData.org_default_area_slug,
      role: defaultAreaData.org_default_area_role,
      member_since: defaultAreaData.org_default_area_member_since,
      description: defaultAreaData.org_default_area_description,
      properties: defaultAreaData.org_default_area_properties || {},
    };
  }

  /**
   * @param {object | null | undefined} organizationData
   * @returns {{
   *   id: string | null,
   *   unique_name: string | null,
   *   name: string | null,
   *   logo_url: string | null,
   *   member_role: string | null,
   *   member_since: string | Date | null
   * } | null}
   */
  _normalizeOrganization(organizationData) {
    if (!organizationData) {
      return null;
    }

    return {
      id: organizationData.org_id,
      unique_name: organizationData.org_unique_name,
      name: organizationData.org_name,
      logo_url: organizationData.org_logo_url,
      member_role: organizationData.org_member_role,
      member_since: organizationData.org_member_since,
    };
  }
}

module.exports = AuthBaseController;
