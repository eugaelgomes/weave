const OrganizationsBaseController = require("./base-controller");
const areasRepository = require("@/modules/organizations/repositories/areas.repository");
const CreateUsersRepository = require("@/modules/users/repositories/create-users.repository");
const UserDataRepository = require("@/modules/users/repositories/user-data.repository");
const SearchUsersRepository = require("@/modules/users/repositories/search-users.repository");
const UserTokensRepository = require("@/modules/users/repositories/user-tokens.repository");
const DeleteUsersRepository = require("@/modules/users/repositories/delete-users.repository");
const { normalizeOrganizationName } = require("../normalizer");

const AREA_MEMBER_ROLES = ["manager", "editor", "viewer"];

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
    return member?.role === "manager";
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
      throw new Error("Área pai não encontrada");
    }
    return parent;
  }

  async listAreas(req, res) {
    try {
      const userId = this._validateAuthentication(req, res);
      if (!userId) return;

      const organization = await this._getUserOrganization(userId);
      if (!organization) {
        return res
          .status(404)
          .json({ success: false, error: "Organização não encontrada" });
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
      console.error("Erro ao listar áreas:", error);
      res
        .status(500)
        .json({ success: false, error: "Erro ao listar áreas da organização" });
    }
  }

  async getArea(req, res) {
    try {
      const userId = this._validateAuthentication(req, res);
      if (!userId) return;

      const organization = await this._getUserOrganization(userId);
      if (!organization) {
        return res
          .status(404)
          .json({ success: false, error: "Organização não encontrada" });
      }

      const { areaId } = req.params;
      const area = await this.areasRepository.getAreaById(
        areaId,
        organization.id
      );

      if (!area) {
        return res
          .status(404)
          .json({ success: false, error: "Área não encontrada" });
      }

      res.status(200).json({ status: "OK", data: area });
    } catch (error) {
      console.error("Erro ao buscar área:", error);
      res
        .status(500)
        .json({ success: false, error: "Erro ao buscar dados da área" });
    }
  }

  async createArea(req, res) {
    try {
      const userId = this._validateAuthentication(req, res);
      if (!userId) return;

      const organization = await this._getUserOrganization(userId);
      if (!organization) {
        return res
          .status(404)
          .json({ success: false, error: "Organização não encontrada" });
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
          error: "area_name é obrigatório e deve ser uma string",
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

          if (!member || member.role !== "manager") {
            return res.status(403).json({
              success: false,
              error: "Apenas managers da área pai podem criar subáreas",
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
        message: "Área criada com sucesso",
        data: newArea,
      });
    } catch (error) {
      console.error("Erro ao criar área:", error);
      res.status(400).json({
        success: false,
        error: error.message || "Erro ao criar área",
      });
    }
  }

  async updateArea(req, res) {
    try {
      const userId = this._validateAuthentication(req, res);
      if (!userId) return;

      const organization = await this._getUserOrganization(userId);
      if (!organization) {
        return res
          .status(404)
          .json({ success: false, error: "Organização não encontrada" });
      }

      const { areaId } = req.params;
      const existingArea = await this.areasRepository.getAreaById(
        areaId,
        organization.id
      );

      if (!existingArea) {
        return res
          .status(404)
          .json({ success: false, error: "Área não encontrada" });
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
      console.error("Erro ao atualizar área:", error);
      res.status(400).json({
        success: false,
        error: error.message || "Erro ao atualizar área",
      });
    }
  }

  async deleteArea(req, res) {
    try {
      const userId = this._validateAuthentication(req, res);
      if (!userId) return;

      const organization = await this._getUserOrganization(userId);
      if (!organization) {
        return res
          .status(404)
          .json({ success: false, error: "Organização não encontrada" });
      }

      const { areaId } = req.params;
      const area = await this.areasRepository.getAreaById(
        areaId,
        organization.id
      );
      if (!area) {
        return res
          .status(404)
          .json({ success: false, error: "Área não encontrada" });
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
      console.error("Erro ao remover área:", error);
      res.status(400).json({ success: false, error: "Erro ao remover área" });
    }
  }

  async listAreaMembers(req, res) {
    try {
      const userId = this._validateAuthentication(req, res);
      if (!userId) return;

      const organization = await this._getUserOrganization(userId);
      if (!organization) {
        return res
          .status(404)
          .json({ success: false, error: "Organização não encontrada" });
      }

      const { areaId } = req.params;
      const area = await this.areasRepository.getAreaById(
        areaId,
        organization.id
      );
      if (!area) {
        return res
          .status(404)
          .json({ success: false, error: "Área não encontrada" });
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
      console.error("Erro ao listar membros da área:", error);
      res.status(500).json({
        success: false,
        error: "Erro ao listar membros da área",
      });
    }
  }

  async addAreaMember(req, res) {
    try {
      const userId = this._validateAuthentication(req, res);
      if (!userId) return;

      const organization = await this._getUserOrganization(userId);
      if (!organization) {
        return res
          .status(404)
          .json({ success: false, error: "Organização não encontrada" });
      }

      const { areaId } = req.params;
      const area = await this.areasRepository.getAreaById(
        areaId,
        organization.id
      );
      if (!area) {
        return res
          .status(404)
          .json({ success: false, error: "Área não encontrada" });
      }

      if (
        !(await this._requireAreaWriteAccess(res, organization, areaId, userId))
      ) {
        return;
      }

      const { user_id, role = "viewer" } = req.body;
      if (!user_id) {
        return res
          .status(400)
          .json({ success: false, error: "user_id é obrigatório" });
      }
      if (!AREA_MEMBER_ROLES.includes(role)) {
        return res.status(400).json({
          success: false,
          error: "Role inválido para membro da área",
        });
      }

      const targetUser = await SearchUsersRepository.findById(user_id);
      if (!targetUser) {
        return res
          .status(404)
          .json({ success: false, error: "Usuário não encontrado" });
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
        role,
        userId
      );

      res.status(201).json({
        status: "OK",
        message: "Membro adicionado à área",
        data: member,
      });
    } catch (error) {
      console.error("Erro ao adicionar membro à área:", error);
      res.status(400).json({
        success: false,
        error: error.message || "Erro ao adicionar membro",
      });
    }
  }

  async updateAreaMember(req, res) {
    try {
      const userId = this._validateAuthentication(req, res);
      if (!userId) return;

      const organization = await this._getUserOrganization(userId);
      if (!organization) {
        return res
          .status(404)
          .json({ success: false, error: "Organização não encontrada" });
      }

      const { areaId, memberId } = req.params;
      const { role } = req.body;

      if (!role || !AREA_MEMBER_ROLES.includes(role)) {
        return res.status(400).json({
          success: false,
          error: "Role inválido para membro da área",
        });
      }

      const area = await this.areasRepository.getAreaById(
        areaId,
        organization.id
      );
      if (!area) {
        return res
          .status(404)
          .json({ success: false, error: "Área não encontrada" });
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
          .json({ success: false, error: "Membro não encontrado na área" });
      }

      const updated = await this.areasRepository.updateAreaMemberRole(
        areaId,
        organization.id,
        memberId,
        role,
        userId
      );

      res.status(200).json({
        status: "OK",
        message: "Membro atualizado com sucesso",
        data: updated,
      });
    } catch (error) {
      console.error("Erro ao atualizar membro da área:", error);
      res.status(400).json({
        success: false,
        error: error.message || "Erro ao atualizar membro",
      });
    }
  }

  async removeAreaMember(req, res) {
    try {
      const userId = this._validateAuthentication(req, res);
      if (!userId) return;

      const organization = await this._getUserOrganization(userId);
      if (!organization) {
        return res
          .status(404)
          .json({ success: false, error: "Organização não encontrada" });
      }

      const { areaId, memberId } = req.params;

      const area = await this.areasRepository.getAreaById(
        areaId,
        organization.id
      );
      if (!area) {
        return res
          .status(404)
          .json({ success: false, error: "Área não encontrada" });
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
          .json({ success: false, error: "Membro não encontrado" });
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
      console.error("Erro ao remover membro da área:", error);
      res.status(400).json({
        success: false,
        error: error.message || "Erro ao remover membro",
      });
    }
  }
}

module.exports = new OrganizationAreasController();
