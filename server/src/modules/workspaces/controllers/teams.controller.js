const teamsRepository = require("@/modules/workspaces/repositories/teams.repository");
const { AppError, fromUnknown } = require("@/errors");
const WorkspacesBaseController = require("./base-controller");

const SearchUsersRepository = require("@/modules/users/repositories/users.repository");
const { normalizeWorkspaceName } = require("../utils/normalizer");
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
    return member?.workspace_roles?.permissions?.includes("manage_teams") ?? false;
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
    throw AppError.forbidden(
      "Insufficient permissions. Workspace administrator or team manager required."
    );
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
      throw AppError.badRequest("properties deve ser um objeto");
    }
    return properties;
  }

  async _getParentTeam(workspaceId, parentTeamId) {
    if (!parentTeamId) return null;
    const parent = await this.teamsRepository.getTeamById(parentTeamId, workspaceId);
    if (!parent) {
      throw AppError.notFound("Parent team not found");
    }
    return parent;
  }

  async listTeams(req, res, next) {
    try {
      const userId = this._validateAuthentication(req, res);
      if (!userId) return;

      const workspace = await this._getUserWorkspace(userId);
      if (!workspace) {
        throw AppError.notFound("Workspace not found");
      }

      const teams = await this.teamsRepository.listWorkspaceTeams(workspace.id);
      const parsedTeams = z.array(teamResponseSchema).parse(teams);

      res.status(200).json({
        areas: parsedTeams,
        count: teams.length,
        data: parsedTeams,
        status: "OK",
        success: true,
        teams: parsedTeams,
        workspace_id: workspace.id,
      });
    } catch (error) {
      console.error("Error listing teams:", error);
      return next(fromUnknown(error));
    }
  }

  async getTeam(req, res, next) {
    try {
      const userId = this._validateAuthentication(req, res);
      if (!userId) return;

      const workspace = await this._getUserWorkspace(userId);
      if (!workspace) {
        throw AppError.notFound("Workspace not found");
      }

      const { teamId } = req.params;
      const team = await this.teamsRepository.getTeamById(teamId, workspace.id);

      if (!team) {
        throw AppError.notFound("Team not found");
      }

      const parsed = teamResponseSchema.parse(team);
      res.status(200).json({
        area: parsed,
        data: parsed,
        status: "OK",
        success: true,
        team: parsed,
      });
    } catch (error) {
      console.error("Error fetching team:", error);
      return next(fromUnknown(error));
    }
  }

  async createTeam(req, res, next) {
    try {
      const userId = this._validateAuthentication(req, res);
      if (!userId) return;

      const workspace = await this._getUserWorkspace(userId);
      if (!workspace) {
        throw AppError.notFound("Workspace not found");
      }

      const rawName = req.body.team_name || req.body.area_name || req.body.name;
      const parent_team_id = req.body.parent_team_id ?? req.body.parent_area_id ?? null;
      const { slug, description, properties } = req.body;

      const isSubArea = parent_team_id !== null && parent_team_id !== undefined;
      const canWorkspaceStructure = this._canManageWorkspaceStructure(workspace);

      if (!isSubArea && !canWorkspaceStructure) {
        throw AppError.forbidden("Only workspace administrators can create root teams");
      }

      if (isSubArea) {
        await this._getParentTeam(workspace.id, parent_team_id);

        if (!canWorkspaceStructure) {
          const member = await this.teamsRepository.getTeamMember(
            parent_team_id,
            workspace.id,
            userId
          );

          if (!member || !member.workspace_roles?.permissions?.includes("manage_teams")) {
            throw AppError.forbidden("Only team admins of the parent team can create sub-teams");
          }
        }
      }

      const normalizedSlug = this._normalizeSlug(rawName, slug);
      if (!normalizedSlug) {
        throw AppError.badRequest("Invalid team slug");
      }

      const uniqueSlug = await this._ensureUniqueSlug(workspace.id, normalizedSlug);

      const normalizedProperties = this._ensurePropertiesShape(properties) || {};

      const newTeam = await this.teamsRepository.createTeam({
        createdBy: userId,
        description: description?.trim() || "Team description here",
        name: rawName.trim(),
        parentTeamId: parent_team_id || null,
        properties: normalizedProperties,
        slug: uniqueSlug,
        workspaceId: workspace.id,
      });

      const parsedNewTeam = teamResponseSchema.parse(newTeam);
      res.status(201).json({
        area: parsedNewTeam,
        data: parsedNewTeam,
        message: "Team created successfully",
        status: "OK",
        success: true,
        team: parsedNewTeam,
      });
    } catch (error) {
      console.error("Error creating team:", error);
      return next(fromUnknown(error));
    }
  }

  async updateTeam(req, res, next) {
    try {
      const userId = this._validateAuthentication(req, res);
      if (!userId) return;

      const workspace = await this._getUserWorkspace(userId);
      if (!workspace) {
        throw AppError.notFound("Workspace not found");
      }

      const { teamId } = req.params;
      const existingTeam = await this.teamsRepository.getTeamById(teamId, workspace.id);
      if (!existingTeam) {
        throw AppError.notFound("Team not found");
      }

      // Block structural changes in root team
      if (existingTeam.parent_team_id === null && req.body.parent_team_id !== undefined) {
        throw AppError.badRequest("The root team cannot be moved to another parent team.");
      }

      if (!(await this._requireTeamWriteAccess(res, workspace, teamId, userId))) {
        return;
      }

      const rawName = req.body.team_name || req.body.area_name || req.body.name;
      const parent_team_id = req.body.parent_team_id ?? req.body.parent_area_id;
      const { slug, description, properties, active } = req.body;

      const updates = {};

      if (rawName !== undefined) {
        updates.name = rawName.trim();
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
          throw AppError.badRequest("An team cannot be its own parent");
        }
        if (parent_team_id) {
          await this._getParentTeam(workspace.id, parent_team_id);
        }
        updates.parent_team_id = parent_team_id || null;
      }

      if (slug !== undefined || rawName !== undefined) {
        const baseSlug = this._normalizeSlug(rawName || existingTeam.name, slug);
        if (!baseSlug) {
          throw AppError.badRequest("Invalid slug");
        }

        const finalSlug = await this._ensureUniqueSlug(workspace.id, baseSlug, existingTeam.slug);
        updates.slug = finalSlug;
      }

      const updatedTeam = await this.teamsRepository.updateTeam(teamId, workspace.id, updates);
      const parsedUpdatedTeam = teamResponseSchema.parse(updatedTeam);

      res.status(200).json({
        area: parsedUpdatedTeam,
        data: parsedUpdatedTeam,
        message: "Team updated successfully",
        status: "OK",
        success: true,
        team: parsedUpdatedTeam,
      });
    } catch (error) {
      console.error("Error updating team:", error);
      return next(fromUnknown(error));
    }
  }

  async deleteTeam(req, res, next) {
    try {
      const userId = this._validateAuthentication(req, res);
      if (!userId) return;

      const workspace = await this._getUserWorkspace(userId);
      if (!workspace) {
        throw AppError.notFound("Workspace not found");
      }

      const { teamId } = req.params;
      const team = await this.teamsRepository.getTeamById(teamId, workspace.id);
      if (!team) {
        throw AppError.notFound("Team not found");
      }

      if (team.parent_team_id === null) {
        throw AppError.badRequest("The root team cannot be removed.");
      }

      if (!(await this._requireTeamWriteAccess(res, workspace, teamId, userId))) {
        return;
      }

      const deletedTeam = await this.teamsRepository.softDeleteTeam(teamId, workspace.id);

      res.status(200).json({
        data: teamResponseSchema.parse(deletedTeam),
        message: "Team removed successfully",
        success: true,
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
        throw AppError.notFound("Workspace not found");
      }

      const { teamId } = req.params;
      const team = await this.teamsRepository.getTeamById(teamId, workspace.id);
      if (!team) {
        throw AppError.notFound("Team not found");
      }

      const members = await this.teamsRepository.listTeamMembers(teamId, workspace.id);

      res.status(200).json({
        data: {
          members,
          members_count: members.length,
        },
        members,
        status: "OK",
        success: true,
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
        throw AppError.notFound("Workspace not found");
      }

      const { teamId } = req.params;
      const team = await this.teamsRepository.getTeamById(teamId, workspace.id);
      if (!team) {
        throw AppError.notFound("Team not found");
      }

      if (!(await this._requireTeamWriteAccess(res, workspace, teamId, userId))) {
        return;
      }

      const { user_id, role } = req.body;
      const normalizedRole = role.trim().toUpperCase();

      const targetUser = await SearchUsersRepository.findById(user_id);
      if (!targetUser) {
        throw AppError.notFound("User not found");
      }

      const isMember = await this.workspacesRepository.isMember(workspace.id, user_id);
      if (!isMember) {
        throw AppError.badRequest("User must be an workspace member");
      }

      const existingMember = await this.teamsRepository.getTeamMember(
        teamId,
        workspace.id,
        user_id
      );
      if (existingMember) {
        throw AppError.badRequest("User is already associated with this team");
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
        success: true,
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
        throw AppError.notFound("Workspace not found");
      }

      const { teamId, memberId } = req.params;
      const { role } = req.body;
      const normalizedRole = role.trim().toUpperCase();

      const team = await this.teamsRepository.getTeamById(teamId, workspace.id);
      if (!team) {
        throw AppError.notFound("Team not found");
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
        throw AppError.notFound("Team member not found");
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
        success: true,
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
        throw AppError.notFound("Workspace not found");
      }

      const { teamId, memberId } = req.params;

      const team = await this.teamsRepository.getTeamById(teamId, workspace.id);
      if (!team) {
        throw AppError.notFound("Team not found");
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
        throw AppError.notFound("Member not found");
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
        success: true,
      });
    } catch (error) {
      console.error("Error removing team member:", error);
      return next(fromUnknown(error));
    }
  }
}

module.exports = new WorkspaceTeamsController();
