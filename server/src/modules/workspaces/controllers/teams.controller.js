const teamsRepository = require("@/modules/workspaces/repositories/teams.repository");
const { fromUnknown } = require("@/errors");
const WorkspacesBaseController = require("./base-controller");

const SearchUsersRepository = require("@/modules/users/repositories/search-users.repository");
const { normalizeWorkspaceName } = require("../normalizer");
const { teamResponseSchema } = require("../schemas/teams.schema");
const { z } = require("zod");

class WorkspaceTeamsController extends WorkspacesBaseController {
  constructor() {
    super();
    this.teamsRepository = teamsRepository;
  }

  /** Role in `workspace_members` (aligned with permission engine). */
  _canManageWorkspaceStructure(workspace) {
    return this._workspaceRoleHasPermission(workspace, this._workspacePermissions.MANAGE_AREAS);
  }

  async _userIsTeamManager(workspace, teamId, userId) {
    const member = await this.teamsRepository.getTeamMember(teamId, workspace.id, userId);
    return member?.workspace_roles?.name === "admin";
  }

  /**
   * Admin/super_admin with MANAGE_AREAS or team manager.
   * @returns {Promise<boolean>}
   */
  async _requireTeamWriteAccess(res, workspace, teamId, userId) {
    if (this._canManageWorkspaceStructure(workspace)) return true;
    if (await this._userIsTeamManager(workspace, teamId, userId)) {
      return true;
    }
    res.status(403).json({
      error: "Insufficient permissions. Workspace administrator or team manager required.",
      success: false,
    });
    return false;
  }

  _normalizeSlug(teamName, providedSlug) {
    const baseValue = providedSlug?.trim() || teamName?.trim();
    if (!baseValue) {
      return null;
    }

    return normalizeWorkspaceName(baseValue);
  }

  async _ensureUniqueSlug(workspaceId, slug, currentSlug = null) {
    const existing = await this.teamsRepository.getMatchingSlugs(workspaceId, slug);

    const filtered = currentSlug ? existing.filter((value) => value !== currentSlug) : existing;

    if (!filtered.includes(slug)) {
      return slug;
    }

    let counter = 1;
    let candidate = `${slug}-${counter}`;
    while (filtered.includes(candidate)) {
      counter += 1;
      candidate = `${slug}-${counter}`;
    }
    return candidate;
  }

  _ensurePropertiesShape(properties) {
    if (properties === undefined) return undefined;
    if (properties === null) return {};
    if (typeof properties !== "object" || Array.isArray(properties)) {
      throw new Error("properties deve ser um objeto");
    }
    return properties;
  }

  async _getParentArea(workspaceId, parentTeamId) {
    if (!parentTeamId) return null;
    const parent = await this.teamsRepository.getTeamById(parentTeamId, workspaceId);
    if (!parent) {
      throw new Error("Parent team not found");
    }
    return parent;
  }

  async listTeams(req, res, next) {
    try {
      const userId = this._validateAuthentication(req, res);
      if (!userId) return;

      const workspace = await this._getUserWorkspace(userId);
      if (!workspace) {
        return res.status(404).json({ error: "Workspace not found", success: false });
      }

      const teams = await this.teamsRepository.listWorkspaceTeams(workspace.id);

      res.status(200).json({
        count: teams.length,
        data: z.array(teamResponseSchema).parse(teams),
        status: "OK",
        workspace_id: workspace.id,
      });
    } catch (error) {
      console.error("Error listing teams:", error);
      return next(fromUnknown(error));
    }
  }

  async getArea(req, res, next) {
    try {
      const userId = this._validateAuthentication(req, res);
      if (!userId) return;

      const workspace = await this._getUserWorkspace(userId);
      if (!workspace) {
        return res.status(404).json({ error: "Workspace not found", success: false });
      }

      const { teamId } = req.params;
      const team = await this.teamsRepository.getTeamById(teamId, workspace.id);

      if (!team) {
        return res.status(404).json({ error: "Team not found", success: false });
      }

      res.status(200).json({ data: teamResponseSchema.parse(team), status: "OK" });
    } catch (error) {
      console.error("Error fetching team:", error);
      return next(fromUnknown(error));
    }
  }

  async createArea(req, res, next) {
    try {
      const userId = this._validateAuthentication(req, res);
      if (!userId) return;

      const workspace = await this._getUserWorkspace(userId);
      if (!workspace) {
        return res.status(404).json({ error: "Workspace not found", success: false });
      }

      const { team_name, parent_team_id = null, slug, description, properties } = req.body;

      const isSubArea = parent_team_id !== null && parent_team_id !== undefined;
      const canWorkspaceStructure = this._canManageWorkspaceStructure(workspace);

      if (!isSubArea && !canWorkspaceStructure) {
        return res.status(403).json({
          error: "Only workspace administrators can create root teams",
          success: false,
        });
      }

      if (isSubArea) {
        await this._getParentArea(workspace.id, parent_team_id);

        if (!canWorkspaceStructure) {
          const member = await this.teamsRepository.getTeamMember(
            parent_team_id,
            workspace.id,
            userId
          );

          if (!member || member.workspace_roles?.name !== "admin") {
            return res.status(403).json({
              error: "Only team admins of the parent team can create sub-teams",
              success: false,
            });
          }
        }
      }

      const normalizedSlug = this._normalizeSlug(team_name, slug);
      if (!normalizedSlug) {
        return res.status(400).json({ error: "Invalid team slug", success: false });
      }

      const uniqueSlug = await this._ensureUniqueSlug(workspace.id, normalizedSlug);

      const normalizedProperties = this._ensurePropertiesShape(properties) || {};

      const newTeam = await this.teamsRepository.createTeam({
        createdBy: userId,
        description: description?.trim() || "Team description here",
        name: team_name.trim(),
        parentTeamId: parent_team_id || null,
        properties: normalizedProperties,
        slug: uniqueSlug,
        workspaceId: workspace.id,
      });

      res.status(201).json({
        data: teamResponseSchema.parse(newTeam),
        message: "Team created successfully",
        status: "OK",
      });
    } catch (error) {
      console.error("Error creating team:", error);
      return next(fromUnknown(error));
    }
  }

  async updateArea(req, res, next) {
    try {
      const userId = this._validateAuthentication(req, res);
      if (!userId) return;

      const workspace = await this._getUserWorkspace(userId);
      if (!workspace) {
        return res.status(404).json({ error: "Workspace not found", success: false });
      }

      const { teamId } = req.params;
      const existingTeam = await this.teamsRepository.getTeamById(teamId, workspace.id);

      if (!existingTeam) {
        return res.status(404).json({ error: "Team not found", success: false });
      }

      // Block structural changes in root team
      if (existingTeam.parent_team_id === null && req.body.parent_team_id !== undefined) {
        return res.status(400).json({
          error: "The root team cannot be moved to another parent team.",
          success: false,
        });
      }

      if (!(await this._requireTeamWriteAccess(res, workspace, teamId, userId))) {
        return;
      }

      const { team_name, slug, description, properties, active, parent_team_id } = req.body;

      const updates = {};

      if (team_name !== undefined) {
        updates.team_name = team_name.trim();
      }

      if (description !== undefined) {
        updates.description = description?.trim() || null;
      }

      if (properties !== undefined) {
        updates.properties = this._ensurePropertiesShape(properties);
      }

      if (active !== undefined) {
        updates.active = active;
      }

      if (parent_team_id !== undefined) {
        if (parent_team_id === existingTeam.id) {
          return res.status(400).json({
            error: "An team cannot be its own parent",
            success: false,
          });
        }
        if (parent_team_id) {
          await this._getParentArea(workspace.id, parent_team_id);
        }
        updates.parent_team_id = parent_team_id || null;
      }

      if (slug !== undefined || updates.team_name) {
        const baseSlug = this._normalizeSlug(updates.team_name || existingTeam.team_name, slug);
        if (!baseSlug) {
          return res.status(400).json({ error: "Invalid slug", success: false });
        }

        const finalSlug = await this._ensureUniqueSlug(workspace.id, baseSlug, existingTeam.slug);
        updates.slug = finalSlug;
      }

      const updatedTeam = await this.teamsRepository.updateTeam(teamId, workspace.id, updates);

      res.status(200).json({
        data: teamResponseSchema.parse(updatedTeam),
        message: "Team updated successfully",
        status: "OK",
      });
    } catch (error) {
      console.error("Error updating team:", error);
      return next(fromUnknown(error));
    }
  }

  async deleteArea(req, res, next) {
    try {
      const userId = this._validateAuthentication(req, res);
      if (!userId) return;

      const workspace = await this._getUserWorkspace(userId);
      if (!workspace) {
        return res.status(404).json({ error: "Workspace not found", success: false });
      }

      const { teamId } = req.params;
      const team = await this.teamsRepository.getTeamById(teamId, workspace.id);
      if (!team) {
        return res.status(404).json({ error: "Team not found", success: false });
      }

      if (team.parent_team_id === null) {
        return res.status(400).json({
          error: "The root team cannot be removed.",
          success: false,
        });
      }

      if (!(await this._requireTeamWriteAccess(res, workspace, teamId, userId))) {
        return;
      }

      const deletedTeam = await this.teamsRepository.softDeleteTeam(teamId, workspace.id);

      res.status(200).json({
        data: teamResponseSchema.parse(deletedTeam),
        message: "Team removed successfully",
        status: "OK",
      });
    } catch (error) {
      console.error("Error deleting team:", error);
      return next(fromUnknown(error));
    }
  }

  async listTeamMembers(req, res, next) {
    try {
      const userId = this._validateAuthentication(req, res);
      if (!userId) return;

      const workspace = await this._getUserWorkspace(userId);
      if (!workspace) {
        return res.status(404).json({ error: "Workspace not found", success: false });
      }

      const { teamId } = req.params;
      const team = await this.teamsRepository.getTeamById(teamId, workspace.id);
      if (!team) {
        return res.status(404).json({ error: "Team not found", success: false });
      }

      const members = await this.teamsRepository.listTeamMembers(teamId, workspace.id);

      res.status(200).json({
        members,
        members_count: members.length,
        status: "OK",
        team_id: teamId,
      });
    } catch (error) {
      console.error("Error listing team members:", error);
      return next(fromUnknown(error));
    }
  }

  async addTeamMember(req, res, next) {
    try {
      const userId = this._validateAuthentication(req, res);
      if (!userId) return;

      const workspace = await this._getUserWorkspace(userId);
      if (!workspace) {
        return res.status(404).json({ error: "Workspace not found", success: false });
      }

      const { teamId } = req.params;
      const team = await this.teamsRepository.getTeamById(teamId, workspace.id);
      if (!team) {
        return res.status(404).json({ error: "Team not found", success: false });
      }

      if (!(await this._requireTeamWriteAccess(res, workspace, teamId, userId))) {
        return;
      }

      const { user_id, role } = req.body;
      const normalizedRole = role.trim().toUpperCase();

      const targetUser = await SearchUsersRepository.findById(user_id);
      if (!targetUser) {
        return res.status(404).json({ error: "User not found", success: false });
      }

      const isMember = await this.workspacesRepository.isMember(workspace.id, user_id);
      if (!isMember) {
        return res.status(400).json({
          error: "User must be an workspace member",
          success: false,
        });
      }

      const existingMember = await this.teamsRepository.getTeamMember(
        teamId,
        workspace.id,
        user_id
      );
      if (existingMember) {
        return res.status(400).json({
          error: "User is already associated with this team",
          success: false,
        });
      }

      const member = await this.teamsRepository.addTeamMember(
        teamId,
        workspace.id,
        user_id,
        normalizedRole,
        userId
      );

      res.status(201).json({
        data: member,
        message: "Member added to team",
        status: "OK",
      });
    } catch (error) {
      console.error("Error adding team member:", error);
      return next(fromUnknown(error));
    }
  }

  async updateTeamMember(req, res, next) {
    try {
      const userId = this._validateAuthentication(req, res);
      if (!userId) return;

      const workspace = await this._getUserWorkspace(userId);
      if (!workspace) {
        return res.status(404).json({ error: "Workspace not found", success: false });
      }

      const { teamId, memberId } = req.params;
      const { role } = req.body;
      const normalizedRole = role.trim().toUpperCase();

      const team = await this.teamsRepository.getTeamById(teamId, workspace.id);
      if (!team) {
        return res.status(404).json({ error: "Team not found", success: false });
      }

      if (!(await this._requireTeamWriteAccess(res, workspace, teamId, userId))) {
        return;
      }

      const existingMember = await this.teamsRepository.getTeamMember(
        teamId,
        workspace.id,
        memberId
      );
      if (!existingMember) {
        return res.status(404).json({ error: "Team member not found", success: false });
      }

      const updated = await this.teamsRepository.updateTeamMemberRole(
        teamId,
        workspace.id,
        memberId,
        normalizedRole,
        userId
      );

      res.status(200).json({
        data: updated,
        message: "Member updated successfully",
        status: "OK",
      });
    } catch (error) {
      console.error("Error updating team member:", error);
      return next(fromUnknown(error));
    }
  }

  async removeTeamMember(req, res, next) {
    try {
      const userId = this._validateAuthentication(req, res);
      if (!userId) return;

      const workspace = await this._getUserWorkspace(userId);
      if (!workspace) {
        return res.status(404).json({ error: "Workspace not found", success: false });
      }

      const { teamId, memberId } = req.params;

      const team = await this.teamsRepository.getTeamById(teamId, workspace.id);
      if (!team) {
        return res.status(404).json({ error: "Team not found", success: false });
      }

      if (!(await this._requireTeamWriteAccess(res, workspace, teamId, userId))) {
        return;
      }

      const existingMember = await this.teamsRepository.getTeamMember(
        teamId,
        workspace.id,
        memberId
      );
      if (!existingMember) {
        return res.status(404).json({ error: "Member not found", success: false });
      }

      const removed = await this.teamsRepository.removeTeamMember(
        teamId,
        workspace.id,
        memberId,
        userId
      );

      res.status(200).json({
        data: removed,
        message: "Member removed from team",
        status: "OK",
      });
    } catch (error) {
      console.error("Error removing team member:", error);
      return next(fromUnknown(error));
    }
  }
}

module.exports = new WorkspaceTeamsController();
