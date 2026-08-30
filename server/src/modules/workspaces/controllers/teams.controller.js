const teamsRepository = require("@/modules/workspaces/repositories/teams.repository");
const { fromUnknown } = require("@/errors");
const OrganizationsBaseController = require("./base-controller");

const SearchUsersRepository = require("@/modules/users/repositories/search-users.repository");
const { normalizeOrganizationName } = require("../normalizer");
const { ORG_ROLES } = require("@/modules/workspaces/workspace-role-policy");

class OrganizationAreasController extends OrganizationsBaseController {
  constructor() {
    super();
    this.areasRepository = areasRepository;
  }

  /** Role in `organization_members` (aligned with permission engine). */
  _canManageOrgStructure(workspace) {
    return this._orgRoleHasPermission(workspace, this._orgPermissions.MANAGE_AREAS);
  }

  async _userIsAreaManager(workspace, areaId, userId) {
    const member = await this.teamsRepository.getAreaMember(areaId, workspace.id, userId);
    return member?.role === ORG_ROLES.ADMIN;
  }

  /**
   * Admin/super_admin with MANAGE_AREAS or team manager.
   * @returns {Promise<boolean>}
   */
  async _requireAreaWriteAccess(res, workspace, areaId, userId) {
    if (this._canManageOrgStructure(workspace)) return true;
    if (await this._userIsAreaManager(workspace, areaId, userId)) {
      return true;
    }
    res.status(403).json({
      error: "Insufficient permissions. Workspace administrator or team manager required.",
      success: false,
    });
    return false;
  }

  _normalizeSlug(areaName, providedSlug) {
    const baseValue = providedSlug?.trim() || areaName?.trim();
    if (!baseValue) {
      return null;
    }

    return normalizeOrganizationName(baseValue);
  }

  async _ensureUniqueSlug(organizationId, slug, currentSlug = null) {
    const existing = await this.teamsRepository.getMatchingSlugs(organizationId, slug);

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

  async _getParentArea(organizationId, parentAreaId) {
    if (!parentAreaId) return null;
    const parent = await this.teamsRepository.getAreaById(parentAreaId, organizationId);
    if (!parent) {
      throw new Error("Parent team not found");
    }
    return parent;
  }

  async listAreas(req, res, next) {
    try {
      const userId = this._validateAuthentication(req, res);
      if (!userId) return;

      const workspace = await this._getUserOrganization(userId);
      if (!workspace) {
        return res.status(404).json({ error: "Workspace not found", success: false });
      }

      const teams = await this.teamsRepository.listOrganizationAreas(workspace.id);

      res.status(200).json({
        count: teams.length,
        data: teams,
        organization_id: workspace.id,
        status: "OK",
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

      const workspace = await this._getUserOrganization(userId);
      if (!workspace) {
        return res.status(404).json({ error: "Workspace not found", success: false });
      }

      const { areaId } = req.params;
      const team = await this.teamsRepository.getAreaById(areaId, workspace.id);

      if (!team) {
        return res.status(404).json({ error: "Team not found", success: false });
      }

      res.status(200).json({ data: team, status: "OK" });
    } catch (error) {
      console.error("Error fetching team:", error);
      return next(fromUnknown(error));
    }
  }

  async createArea(req, res, next) {
    try {
      const userId = this._validateAuthentication(req, res);
      if (!userId) return;

      const workspace = await this._getUserOrganization(userId);
      if (!workspace) {
        return res.status(404).json({ error: "Workspace not found", success: false });
      }

      const { area_name, parent_area_id = null, slug, description, properties } = req.body;

      const isSubArea = parent_area_id !== null && parent_area_id !== undefined;
      const canOrgStructure = this._canManageOrgStructure(workspace);

      if (!isSubArea && !canOrgStructure) {
        return res.status(403).json({
          error: "Only workspace administrators can create root teams",
          success: false,
        });
      }

      if (isSubArea) {
        await this._getParentArea(workspace.id, parent_area_id);

        if (!canOrgStructure) {
          const member = await this.teamsRepository.getAreaMember(
            parent_area_id,
            workspace.id,
            userId
          );

          if (!member || member.role !== ORG_ROLES.ADMIN) {
            return res.status(403).json({
              error: "Only team admins of the parent team can create sub-teams",
              success: false,
            });
          }
        }
      }

      const normalizedSlug = this._normalizeSlug(area_name, slug);
      if (!normalizedSlug) {
        return res.status(400).json({ error: "Invalid team slug", success: false });
      }

      const uniqueSlug = await this._ensureUniqueSlug(workspace.id, normalizedSlug);

      const normalizedProperties = this._ensurePropertiesShape(properties) || {};

      const newArea = await this.teamsRepository.createArea({
        areaName: area_name.trim(),
        createdBy: userId,
        description: description?.trim() || "Team description here",
        organizationId: workspace.id,
        parentAreaId: parent_area_id || null,
        properties: normalizedProperties,
        slug: uniqueSlug,
      });

      res.status(201).json({
        data: newArea,
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

      const workspace = await this._getUserOrganization(userId);
      if (!workspace) {
        return res.status(404).json({ error: "Workspace not found", success: false });
      }

      const { areaId } = req.params;
      const existingArea = await this.teamsRepository.getAreaById(areaId, workspace.id);

      if (!existingArea) {
        return res.status(404).json({ error: "Team not found", success: false });
      }

      // Block structural changes in root team
      if (existingArea.is_root_area && req.body.parent_area_id !== undefined) {
        return res.status(400).json({
          error: "The root team cannot be moved to another parent team.",
          success: false,
        });
      }

      if (!(await this._requireAreaWriteAccess(res, workspace, areaId, userId))) {
        return;
      }

      const { area_name, slug, description, properties, active, parent_area_id } = req.body;

      const updates = {};

      if (area_name !== undefined) {
        updates.area_name = area_name.trim();
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

      if (parent_area_id !== undefined) {
        if (parent_area_id === existingArea.id) {
          return res.status(400).json({
            error: "An team cannot be its own parent",
            success: false,
          });
        }
        if (parent_area_id) {
          await this._getParentArea(workspace.id, parent_area_id);
        }
        updates.parent_area_id = parent_area_id || null;
      }

      if (slug !== undefined || updates.area_name) {
        const baseSlug = this._normalizeSlug(updates.area_name || existingArea.area_name, slug);
        if (!baseSlug) {
          return res.status(400).json({ error: "Invalid slug", success: false });
        }

        const finalSlug = await this._ensureUniqueSlug(
          workspace.id,
          baseSlug,
          existingArea.slug
        );
        updates.slug = finalSlug;
      }

      const updatedArea = await this.teamsRepository.updateArea(areaId, workspace.id, updates);

      res.status(200).json({
        data: updatedArea,
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

      const workspace = await this._getUserOrganization(userId);
      if (!workspace) {
        return res.status(404).json({ error: "Workspace not found", success: false });
      }

      const { areaId } = req.params;
      const team = await this.teamsRepository.getAreaById(areaId, workspace.id);
      if (!team) {
        return res.status(404).json({ error: "Team not found", success: false });
      }

      if (team.is_root_area) {
        return res.status(400).json({
          error: "The root team cannot be removed.",
          success: false,
        });
      }

      if (!(await this._requireAreaWriteAccess(res, workspace, areaId, userId))) {
        return;
      }

      const deletedArea = await this.teamsRepository.softDeleteArea(areaId, workspace.id);

      res.status(200).json({
        data: deletedArea,
        message: "Team removed successfully",
        status: "OK",
      });
    } catch (error) {
      console.error("Error deleting team:", error);
      return next(fromUnknown(error));
    }
  }

  async listAreaMembers(req, res, next) {
    try {
      const userId = this._validateAuthentication(req, res);
      if (!userId) return;

      const workspace = await this._getUserOrganization(userId);
      if (!workspace) {
        return res.status(404).json({ error: "Workspace not found", success: false });
      }

      const { areaId } = req.params;
      const team = await this.teamsRepository.getAreaById(areaId, workspace.id);
      if (!team) {
        return res.status(404).json({ error: "Team not found", success: false });
      }

      const members = await this.teamsRepository.listAreaMembers(areaId, workspace.id);

      res.status(200).json({
        area_id: areaId,
        members,
        members_count: members.length,
        status: "OK",
      });
    } catch (error) {
      console.error("Error listing team members:", error);
      return next(fromUnknown(error));
    }
  }

  async addAreaMember(req, res, next) {
    try {
      const userId = this._validateAuthentication(req, res);
      if (!userId) return;

      const workspace = await this._getUserOrganization(userId);
      if (!workspace) {
        return res.status(404).json({ error: "Workspace not found", success: false });
      }

      const { areaId } = req.params;
      const team = await this.teamsRepository.getAreaById(areaId, workspace.id);
      if (!team) {
        return res.status(404).json({ error: "Team not found", success: false });
      }

      if (!(await this._requireAreaWriteAccess(res, workspace, areaId, userId))) {
        return;
      }

      const { user_id, role = ORG_ROLES.MEMBER } = req.body;
      const normalizedRole = role.trim().toUpperCase();

      const targetUser = await SearchUsersRepository.findById(user_id);
      if (!targetUser) {
        return res.status(404).json({ error: "User not found", success: false });
      }

      const isMember = await this.organizationsRepository.isMember(workspace.id, user_id);
      if (!isMember) {
        return res.status(400).json({
          error: "User must be an workspace member",
          success: false,
        });
      }

      const existingMember = await this.teamsRepository.getAreaMember(
        areaId,
        workspace.id,
        user_id
      );
      if (existingMember) {
        return res.status(400).json({
          error: "User is already associated with this team",
          success: false,
        });
      }

      const member = await this.teamsRepository.addAreaMember(
        areaId,
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

  async updateAreaMember(req, res, next) {
    try {
      const userId = this._validateAuthentication(req, res);
      if (!userId) return;

      const workspace = await this._getUserOrganization(userId);
      if (!workspace) {
        return res.status(404).json({ error: "Workspace not found", success: false });
      }

      const { areaId, memberId } = req.params;
      const { role } = req.body;
      const normalizedRole = role.trim().toUpperCase();

      const team = await this.teamsRepository.getAreaById(areaId, workspace.id);
      if (!team) {
        return res.status(404).json({ error: "Team not found", success: false });
      }

      if (!(await this._requireAreaWriteAccess(res, workspace, areaId, userId))) {
        return;
      }

      const existingMember = await this.teamsRepository.getAreaMember(
        areaId,
        workspace.id,
        memberId
      );
      if (!existingMember) {
        return res.status(404).json({ error: "Team member not found", success: false });
      }

      const updated = await this.teamsRepository.updateAreaMemberRole(
        areaId,
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

  async removeAreaMember(req, res, next) {
    try {
      const userId = this._validateAuthentication(req, res);
      if (!userId) return;

      const workspace = await this._getUserOrganization(userId);
      if (!workspace) {
        return res.status(404).json({ error: "Workspace not found", success: false });
      }

      const { areaId, memberId } = req.params;

      const team = await this.teamsRepository.getAreaById(areaId, workspace.id);
      if (!team) {
        return res.status(404).json({ error: "Team not found", success: false });
      }

      if (!(await this._requireAreaWriteAccess(res, workspace, areaId, userId))) {
        return;
      }

      const existingMember = await this.teamsRepository.getAreaMember(
        areaId,
        workspace.id,
        memberId
      );
      if (!existingMember) {
        return res.status(404).json({ error: "Member not found", success: false });
      }

      const removed = await this.teamsRepository.removeAreaMember(
        areaId,
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

module.exports = new OrganizationAreasController();
