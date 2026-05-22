const { fromUnknown } = require("@/errors");
const OrganizationsBaseController = require("./base-controller");
const areasRepository = require("@/modules/organizations/repositories/areas.repository");
const SearchUsersRepository = require("@/modules/users/repositories/search-users.repository");
const { normalizeOrganizationName } = require("../normalizer");
const {
  ORG_ROLES,
} = require("@/modules/organizations/organization-role-policy");

const AREA_MEMBER_ROLES = [
  ORG_ROLES.ADMIN,
  ORG_ROLES.MEMBER,
  ORG_ROLES.GUEST,
];

class OrganizationAreasController extends OrganizationsBaseController {
  constructor() {
    super();
    this.areasRepository = areasRepository;
  }

  /** Papel em `organization_members` (alinhado ao motor de permissões). */
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
   * admin/super_admin com MANAGE_AREAS ou gestor da área.
   * @returns {Promise<boolean>}
   */
  async _requireAreaWriteAccess(res, organization, areaId, userId) {
    if (this._canManageOrgStructure(organization)) return true;
    if (await this._userIsAreaManager(organization, areaId, userId)) {
      return true;
    }
    res.status(403).json({
      error:
        "Permissão insuficiente. É necessário administrador da organização ou gestor da área.",
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
          .json({ success: false, error: "Organization not found" });
      }

      const areas = await this.areasRepository.listOrganizationAreas(
        organization.id
      );

      res.status(200).json({
        status: "OK",
        organization_id: organization.id,
        count: areas.length,
        data: areas,
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
          .json({ success: false, error: "Organization not found" });
      }

      const { areaId } = req.params;
      const area = await this.areasRepository.getAreaById(
        areaId,
        organization.id
      );

      if (!area) {
        return res
          .status(404)
          .json({ success: false, error: "Area not found" });
      }

      res.status(200).json({ status: "OK", data: area });
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
          .json({ success: false, error: "Organization not found" });
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
          error:
            "Somente administradores da organização podem criar áreas principais",
          success: false,
        });
      }

      if (!area_name || typeof area_name !== "string") {
        return res.status(400).json({
          success: false,
          error: "area_name is required and must be a string",
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
              success: false,
              error: "Only area admins of the parent area can create sub-areas",
            });
          }
        }
      }

      const normalizedSlug = this._normalizeSlug(area_name, slug);
      if (!normalizedSlug) {
        return res
          .status(400)
          .json({ success: false, error: "Slug inválido para a área" });
      }

      const uniqueSlug = await this._ensureUniqueSlug(
        organization.id,
        normalizedSlug
      );

      const normalizedProperties =
        this._ensurePropertiesShape(properties) || {};

      const newArea = await this.areasRepository.createArea({
        organizationId: organization.id,
        parentAreaId: parent_area_id || null,
        areaName: area_name.trim(),
        slug: uniqueSlug,
        description: description?.trim() || "Area description here",
        properties: normalizedProperties,
        createdBy: userId,
      });

      res.status(201).json({
        status: "OK",
        message: "Area created successfully",
        data: newArea,
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
          .json({ success: false, error: "Organization not found" });
      }

      const { areaId } = req.params;
      const existingArea = await this.areasRepository.getAreaById(
        areaId,
        organization.id
      );

      if (!existingArea) {
        return res
          .status(404)
          .json({ success: false, error: "Area not found" });
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
        if (!area_name || typeof area_name !== "string") {
          return res.status(400).json({
            success: false,
            error: "area_name deve ser uma string válida",
          });
        }
        updates.area_name = area_name.trim();
      }

      if (description !== undefined) {
        if (description !== null && typeof description !== "string") {
          return res.status(400).json({
            success: false,
            error: "description deve ser uma string",
          });
        }
        updates.description = description?.trim() || null;
      }

      if (properties !== undefined) {
        updates.properties = this._ensurePropertiesShape(properties);
      }

      if (active !== undefined) {
        if (typeof active !== "boolean") {
          return res
            .status(400)
            .json({ success: false, error: "active deve ser booleano" });
        }
        updates.active = active;
      }

      if (parent_area_id !== undefined) {
        if (parent_area_id === existingArea.id) {
          return res.status(400).json({
            success: false,
            error: "Área não pode ser pai de si mesma",
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
            .json({ success: false, error: "Slug inválido" });
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
        status: "OK",
        message: "Área atualizada com sucesso",
        data: updatedArea,
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
          .json({ success: false, error: "Organization not found" });
      }

      const { areaId } = req.params;
      const area = await this.areasRepository.getAreaById(
        areaId,
        organization.id
      );
      if (!area) {
        return res
          .status(404)
          .json({ success: false, error: "Area not found" });
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
        status: "OK",
        message: "Área removida com sucesso",
        data: deletedArea,
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
          .json({ success: false, error: "Organization not found" });
      }

      const { areaId } = req.params;
      const area = await this.areasRepository.getAreaById(
        areaId,
        organization.id
      );
      if (!area) {
        return res
          .status(404)
          .json({ success: false, error: "Area not found" });
      }

      const members = await this.areasRepository.listAreaMembers(
        areaId,
        organization.id
      );

      res.status(200).json({
        status: "OK",
        area_id: areaId,
        members_count: members.length,
        members,
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
          .json({ success: false, error: "Organization not found" });
      }

      const { areaId } = req.params;
      const area = await this.areasRepository.getAreaById(
        areaId,
        organization.id
      );
      if (!area) {
        return res
          .status(404)
          .json({ success: false, error: "Area not found" });
      }

      if (
        !(await this._requireAreaWriteAccess(res, organization, areaId, userId))
      ) {
        return;
      }

      const { user_id, role = ORG_ROLES.MEMBER } = req.body;
      if (!user_id) {
        return res
          .status(400)
          .json({ success: false, error: "user_id is required" });
      }
      const normalizedRole =
        typeof role === "string" ? role.trim().toUpperCase() : "";
      if (!AREA_MEMBER_ROLES.includes(normalizedRole)) {
        return res.status(400).json({
          success: false,
          error: "Invalid area member role. Use ADMIN, MEMBER or GUEST",
        });
      }

      const targetUser = await SearchUsersRepository.findById(user_id);
      if (!targetUser) {
        return res
          .status(404)
          .json({ success: false, error: "User not found" });
      }

      const isMember = await this.organizationsRepository.isMember(
        organization.id,
        user_id
      );
      if (!isMember) {
        return res.status(400).json({
          success: false,
          error: "Usuário precisa ser membro da organização",
        });
      }

      const existingMember = await this.areasRepository.getAreaMember(
        areaId,
        organization.id,
        user_id
      );
      if (existingMember) {
        return res.status(400).json({
          success: false,
          error: "Usuário já está associado a esta área",
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
        status: "OK",
        message: "Membro adicionado à área",
        data: member,
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
          .json({ success: false, error: "Organization not found" });
      }

      const { areaId, memberId } = req.params;
      const { role } = req.body;

      const normalizedRole =
        typeof role === "string" ? role.trim().toUpperCase() : "";
      if (!normalizedRole || !AREA_MEMBER_ROLES.includes(normalizedRole)) {
        return res.status(400).json({
          success: false,
          error: "Invalid area member role. Use ADMIN, MEMBER or GUEST",
        });
      }

      const area = await this.areasRepository.getAreaById(
        areaId,
        organization.id
      );
      if (!area) {
        return res
          .status(404)
          .json({ success: false, error: "Area not found" });
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
          .json({ success: false, error: "Area member not found" });
      }

      const updated = await this.areasRepository.updateAreaMemberRole(
        areaId,
        organization.id,
        memberId,
        normalizedRole,
        userId
      );

      res.status(200).json({
        status: "OK",
        message: "Membro atualizado com sucesso",
        data: updated,
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
          .json({ success: false, error: "Organization not found" });
      }

      const { areaId, memberId } = req.params;

      const area = await this.areasRepository.getAreaById(
        areaId,
        organization.id
      );
      if (!area) {
        return res
          .status(404)
          .json({ success: false, error: "Area not found" });
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
          .json({ success: false, error: "Member not found" });
      }

      const removed = await this.areasRepository.removeAreaMember(
        areaId,
        organization.id,
        memberId,
        userId
      );

      res.status(200).json({
        status: "OK",
        message: "Membro removido da área",
        data: removed,
      });
    } catch (error) {
      console.error("Error removing area member:", error);
      return next(fromUnknown(error));
    }
  }
}

module.exports = new OrganizationAreasController();
