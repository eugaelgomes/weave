const { fromUnknown } = require("@/errors");
const OrganizationsBaseController = require("./base-controller");
const areasRepository = require("@/modules/organizations/repositories/areas.repository");
const SearchUsersRepository = require("@/modules/users/repositories/search-users.repository");
const { normalizeOrganizationName } = require("../normalizer");
const {
  ORG_ROLES,
} = require("@/modules/organizations/organization-role-policy");

class OrganizationAreasController extends OrganizationsBaseController {
  constructor() {
    super();
    this.areasRepository = areasRepository;
  }

  /** Role in `organization_members` (aligned with permission engine). */
  _canManageOrgStructure(organization) {
    return this._orgRoleHasPermission(
      organization,
      this._orgPermissions.MANAGE_AREAS
    );
  }

  async _userIsAreaManager(organization, areaId, userId) {
    const member = await this.areasRepository.getAreaMember(
      areaId,
      organization.id,
      userId
    );
    return member?.role === ORG_ROLES.ADMIN;
  }

  /**
   * Admin/super_admin with MANAGE_AREAS or area manager.
   * @returns {Promise<boolean>}
   */
  async _requireAreaWriteAccess(res, organization, areaId, userId) {
    if (this._canManageOrgStructure(organization)) return true;
    if (await this._userIsAreaManager(organization, areaId, userId)) {
      return true;
    }
    res.status(403).json({
      error:
        "Insufficient permissions. Organization administrator or area manager required.",
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
    const existing = await this.areasRepository.getMatchingSlugs(
      organizationId,
      slug
    );

    const filtered = currentSlug
      ? existing.filter((value) => value !== currentSlug)
      : existing;

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
    const parent = await this.areasRepository.getAreaById(
      parentAreaId,
      organizationId
    );
    if (!parent) {
      throw new Error("Parent area not found");
    }
    return parent;
  }

  async listAreas(req, res, next) {
    try {
      const userId = this._validateAuthentication(req, res);
      if (!userId) return;

      const organization = await this._getUserOrganization(userId);
      if (!organization) {
        return res
          .status(404)
          .json({ error: "Organization not found", success: false });
      }

      const areas = await this.areasRepository.listOrganizationAreas(
        organization.id
      );

      res.status(200).json({
        count: areas.length,
        data: areas,
        organization_id: organization.id,
        status: "OK",
      });
    } catch (error) {
      console.error("Error listing areas:", error);
      return next(fromUnknown(error));
    }
  }

  async getArea(req, res, next) {
    try {
      const userId = this._validateAuthentication(req, res);
      if (!userId) return;

      const organization = await this._getUserOrganization(userId);
      if (!organization) {
        return res
          .status(404)
          .json({ error: "Organization not found", success: false });
      }

      const { areaId } = req.params;
      const area = await this.areasRepository.getAreaById(
        areaId,
        organization.id
      );

      if (!area) {
        return res
          .status(404)
          .json({ error: "Area not found", success: false });
      }

      res.status(200).json({ data: area, status: "OK" });
    } catch (error) {
      console.error("Error fetching area:", error);
      return next(fromUnknown(error));
    }
  }

  async createArea(req, res, next) {
    try {
      const userId = this._validateAuthentication(req, res);
      if (!userId) return;

      const organization = await this._getUserOrganization(userId);
      if (!organization) {
        return res
          .status(404)
          .json({ error: "Organization not found", success: false });
      }

      const {
        area_name,
        parent_area_id = null,
        slug,
        description,
        properties,
      } = req.body;

      const isSubArea = parent_area_id !== null && parent_area_id !== undefined;
      const canOrgStructure = this._canManageOrgStructure(organization);

      if (!isSubArea && !canOrgStructure) {
        return res.status(403).json({
          error: "Only organization administrators can create root areas",
          success: false,
        });
      }

      if (isSubArea) {
        await this._getParentArea(organization.id, parent_area_id);

        if (!canOrgStructure) {
          const member = await this.areasRepository.getAreaMember(
            parent_area_id,
            organization.id,
            userId
          );

          if (!member || member.role !== ORG_ROLES.ADMIN) {
            return res.status(403).json({
              error: "Only area admins of the parent area can create sub-areas",
              success: false,
            });
          }
        }
      }

      const normalizedSlug = this._normalizeSlug(area_name, slug);
      if (!normalizedSlug) {
        return res
          .status(400)
          .json({ error: "Invalid area slug", success: false });
      }

      const uniqueSlug = await this._ensureUniqueSlug(
        organization.id,
        normalizedSlug
      );

      const normalizedProperties =
        this._ensurePropertiesShape(properties) || {};

      const newArea = await this.areasRepository.createArea({
        areaName: area_name.trim(),
        createdBy: userId,
        description: description?.trim() || "Area description here",
        organizationId: organization.id,
        parentAreaId: parent_area_id || null,
        properties: normalizedProperties,
        slug: uniqueSlug,
      });

      res.status(201).json({
        data: newArea,
        message: "Area created successfully",
        status: "OK",
      });
    } catch (error) {
      console.error("Error creating area:", error);
      return next(fromUnknown(error));
    }
  }

  async updateArea(req, res, next) {
    try {
      const userId = this._validateAuthentication(req, res);
      if (!userId) return;

      const organization = await this._getUserOrganization(userId);
      if (!organization) {
        return res
          .status(404)
          .json({ error: "Organization not found", success: false });
      }

      const { areaId } = req.params;
      const existingArea = await this.areasRepository.getAreaById(
        areaId,
        organization.id
      );

      if (!existingArea) {
        return res
          .status(404)
          .json({ error: "Area not found", success: false });
      }

      // Block structural changes in root area
      if (existingArea.is_root_area && req.body.parent_area_id !== undefined) {
        return res.status(400).json({
          error: "The root area cannot be moved to another parent area.",
          success: false,
        });
      }

      if (
        !(await this._requireAreaWriteAccess(res, organization, areaId, userId))
      ) {
        return;
      }

      const {
        area_name,
        slug,
        description,
        properties,
        active,
        parent_area_id,
      } = req.body;

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
            error: "An area cannot be its own parent",
            success: false,
          });
        }
        if (parent_area_id) {
          await this._getParentArea(organization.id, parent_area_id);
        }
        updates.parent_area_id = parent_area_id || null;
      }

      if (slug !== undefined || updates.area_name) {
        const baseSlug = this._normalizeSlug(
          updates.area_name || existingArea.area_name,
          slug
        );
        if (!baseSlug) {
          return res
            .status(400)
            .json({ error: "Invalid slug", success: false });
        }

        const finalSlug = await this._ensureUniqueSlug(
          organization.id,
          baseSlug,
          existingArea.slug
        );
        updates.slug = finalSlug;
      }

      const updatedArea = await this.areasRepository.updateArea(
        areaId,
        organization.id,
        updates
      );

      res.status(200).json({
        data: updatedArea,
        message: "Area updated successfully",
        status: "OK",
      });
    } catch (error) {
      console.error("Error updating area:", error);
      return next(fromUnknown(error));
    }
  }

  async deleteArea(req, res, next) {
    try {
      const userId = this._validateAuthentication(req, res);
      if (!userId) return;

      const organization = await this._getUserOrganization(userId);
      if (!organization) {
        return res
          .status(404)
          .json({ error: "Organization not found", success: false });
      }

      const { areaId } = req.params;
      const area = await this.areasRepository.getAreaById(
        areaId,
        organization.id
      );
      if (!area) {
        return res
          .status(404)
          .json({ error: "Area not found", success: false });
      }

      if (area.is_root_area) {
        return res.status(400).json({
          error: "The root area cannot be removed.",
          success: false,
        });
      }

      if (
        !(await this._requireAreaWriteAccess(res, organization, areaId, userId))
      ) {
        return;
      }

      const deletedArea = await this.areasRepository.softDeleteArea(
        areaId,
        organization.id
      );

      res.status(200).json({
        data: deletedArea,
        message: "Area removed successfully",
        status: "OK",
      });
    } catch (error) {
      console.error("Error deleting area:", error);
      return next(fromUnknown(error));
    }
  }

  async listAreaMembers(req, res, next) {
    try {
      const userId = this._validateAuthentication(req, res);
      if (!userId) return;

      const organization = await this._getUserOrganization(userId);
      if (!organization) {
        return res
          .status(404)
          .json({ error: "Organization not found", success: false });
      }

      const { areaId } = req.params;
      const area = await this.areasRepository.getAreaById(
        areaId,
        organization.id
      );
      if (!area) {
        return res
          .status(404)
          .json({ error: "Area not found", success: false });
      }

      const members = await this.areasRepository.listAreaMembers(
        areaId,
        organization.id
      );

      res.status(200).json({
        area_id: areaId,
        members,
        members_count: members.length,
        status: "OK",
      });
    } catch (error) {
      console.error("Error listing area members:", error);
      return next(fromUnknown(error));
    }
  }

  async addAreaMember(req, res, next) {
    try {
      const userId = this._validateAuthentication(req, res);
      if (!userId) return;

      const organization = await this._getUserOrganization(userId);
      if (!organization) {
        return res
          .status(404)
          .json({ error: "Organization not found", success: false });
      }

      const { areaId } = req.params;
      const area = await this.areasRepository.getAreaById(
        areaId,
        organization.id
      );
      if (!area) {
        return res
          .status(404)
          .json({ error: "Area not found", success: false });
      }

      if (
        !(await this._requireAreaWriteAccess(res, organization, areaId, userId))
      ) {
        return;
      }

      const { user_id, role = ORG_ROLES.MEMBER } = req.body;
      const normalizedRole = role.trim().toUpperCase();

      const targetUser = await SearchUsersRepository.findById(user_id);
      if (!targetUser) {
        return res
          .status(404)
          .json({ error: "User not found", success: false });
      }

      const isMember = await this.organizationsRepository.isMember(
        organization.id,
        user_id
      );
      if (!isMember) {
        return res.status(400).json({
          error: "User must be an organization member",
          success: false,
        });
      }

      const existingMember = await this.areasRepository.getAreaMember(
        areaId,
        organization.id,
        user_id
      );
      if (existingMember) {
        return res.status(400).json({
          error: "User is already associated with this area",
          success: false,
        });
      }

      const member = await this.areasRepository.addAreaMember(
        areaId,
        organization.id,
        user_id,
        normalizedRole,
        userId
      );

      res.status(201).json({
        data: member,
        message: "Member added to area",
        status: "OK",
      });
    } catch (error) {
      console.error("Error adding area member:", error);
      return next(fromUnknown(error));
    }
  }

  async updateAreaMember(req, res, next) {
    try {
      const userId = this._validateAuthentication(req, res);
      if (!userId) return;

      const organization = await this._getUserOrganization(userId);
      if (!organization) {
        return res
          .status(404)
          .json({ error: "Organization not found", success: false });
      }

      const { areaId, memberId } = req.params;
      const { role } = req.body;
      const normalizedRole = role.trim().toUpperCase();

      const area = await this.areasRepository.getAreaById(
        areaId,
        organization.id
      );
      if (!area) {
        return res
          .status(404)
          .json({ error: "Area not found", success: false });
      }

      if (
        !(await this._requireAreaWriteAccess(res, organization, areaId, userId))
      ) {
        return;
      }

      const existingMember = await this.areasRepository.getAreaMember(
        areaId,
        organization.id,
        memberId
      );
      if (!existingMember) {
        return res
          .status(404)
          .json({ error: "Area member not found", success: false });
      }

      const updated = await this.areasRepository.updateAreaMemberRole(
        areaId,
        organization.id,
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
      console.error("Error updating area member:", error);
      return next(fromUnknown(error));
    }
  }

  async removeAreaMember(req, res, next) {
    try {
      const userId = this._validateAuthentication(req, res);
      if (!userId) return;

      const organization = await this._getUserOrganization(userId);
      if (!organization) {
        return res
          .status(404)
          .json({ error: "Organization not found", success: false });
      }

      const { areaId, memberId } = req.params;

      const area = await this.areasRepository.getAreaById(
        areaId,
        organization.id
      );
      if (!area) {
        return res
          .status(404)
          .json({ error: "Area not found", success: false });
      }

      if (
        !(await this._requireAreaWriteAccess(res, organization, areaId, userId))
      ) {
        return;
      }

      const existingMember = await this.areasRepository.getAreaMember(
        areaId,
        organization.id,
        memberId
      );
      if (!existingMember) {
        return res
          .status(404)
          .json({ error: "Member not found", success: false });
      }

      const removed = await this.areasRepository.removeAreaMember(
        areaId,
        organization.id,
        memberId,
        userId
      );

      res.status(200).json({
        data: removed,
        message: "Member removed from area",
        status: "OK",
      });
    } catch (error) {
      console.error("Error removing area member:", error);
      return next(fromUnknown(error));
    }
  }
}

module.exports = new OrganizationAreasController();
