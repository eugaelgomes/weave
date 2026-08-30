/**
 * Base controller for the authentication module: workspace and default team normalization.
 */
class AuthBaseController {
  /**
   * @param {object | null | undefined} defaultTeamData
   * @returns {{
   *   id: string | null,
   *   name: string | null,
   *   slug: string | null,
   *   description: string | null,
   *   properties: Record<string, unknown>
   * } | null}
   */
  _normalizeDefaultTeam(defaultTeamData) {
    if (!defaultTeamData) {
      return null;
    }

    return {
      description: defaultTeamData.workspace_default_team_description,
      id: defaultTeamData.workspace_default_team_id,
      name: defaultTeamData.workspace_default_team_name,
      properties: defaultTeamData.workspace_default_team_properties || {},
      slug: defaultTeamData.workspace_default_team_slug,
    };
  }

  /**
   * @param {object | null | undefined} workspaceData
   * @returns {{
   *   id: string | null,
   *   public_id: string | null,
   *   unique_name: string | null,
   *   name: string | null,
   *   logo_url: string | null,
   *   member_role_id: string | null,
   *   member_since: string | Date | null
   * } | null}
   */
  _normalizeWorkspace(workspaceData) {
    if (!workspaceData) {
      return null;
    }

    return {
      id: workspaceData.workspace_id,
      logo_url: workspaceData.workspace_logo_url,
      member_role_id: workspaceData.workspace_member_role_id,
      member_since: workspaceData.workspace_member_since,
      name: workspaceData.workspace_name,
      public_id: workspaceData.workspace_public_id,
      unique_name: workspaceData.workspace_unique_name,
    };
  }
}

module.exports = AuthBaseController;
