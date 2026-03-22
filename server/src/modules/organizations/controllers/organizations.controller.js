const OrganizationsBaseController = require("./base-controller");
const spacesService = require("@/services/storage");
const areasRepository = require("@/modules/organizations/repository/areas.repository");
const {
  normalizeOrganizationName,
  generateUniqueOrganizationName,
  normalizeOrganizationProperties,
  updateOrganizationProperties,
  getDefaultOrganizationProperties,
  orgDataResponse,
} = require("../normalizer");

class OrganizationsController extends OrganizationsBaseController {
  constructor() {
    super();
    this.areasRepository = areasRepository;
  }

  async _generateUniqueAreaSlug(organizationId, slugBase) {
    if (!slugBase) {
      return null;
    }

    const existingSlugs = await this.areasRepository.getMatchingSlugs(
      organizationId,
      slugBase
    );

    if (!existingSlugs.includes(slugBase)) {
      return slugBase;
    }

    let counter = 1;
    let candidate = `${slugBase}-${counter}`;
    while (existingSlugs.includes(candidate)) {
      counter += 1;
      candidate = `${slugBase}-${counter}`;
    }

    return candidate;
  }

  async _createDefaultOrganizationArea(organization, createdBy) {
    const defaultName = "Área Central";
    const slugBase =
      organization.unique_name || normalizeOrganizationName(defaultName);
    try {
      const uniqueSlug = await this._generateUniqueAreaSlug(
        organization.id,
        slugBase
      );

      const newArea = await this.areasRepository.createArea({
        organizationId: organization.id,
        parentAreaId: null,
        areaName: defaultName,
        slug: uniqueSlug || `${slugBase}-${organization.id}`,
        description: `Área central da organização ${organization.org_name}`,
        properties: { system: true },
        createdBy,
      });

      await this.areasRepository.addAreaMember(
        newArea.id,
        organization.id,
        createdBy,
        "manager",
        createdBy
      );
    } catch (error) {
      console.error("Erro ao criar área padrão da organização:", error);
      throw new Error("Falha ao criar a área central padrão da organização");
    }
  }

  async createOrganization(req, res) {
    try {
      const userId = this._validateAuthentication(req, res);
      if (!userId) return;

      const existingOrg = await this._getUserOrganization(userId);
      if (existingOrg) {
        return res.status(400).json({
          success: false,
          error: "Usuário já possui uma organização. Use PUT para atualizar.",
        });
      }

      const {
        org_name,
        unique_name: providedUniqueName,
        logo_url,
        banner_url,
        description,
        properties,
        org_domains,
      } = req.body;

      this._validateRequiredFields({ org_name });

      let unique_name;
      if (providedUniqueName) {
        unique_name = normalizeOrganizationName(providedUniqueName);
        if (!unique_name) {
          throw new Error("Nome único fornecido é inválido após normalização");
        }

        const existingNames =
          await this.organizationsRepository.getAvailableOrgNames(unique_name);
        if (existingNames.includes(unique_name)) {
          throw new Error(`Nome único '${unique_name}' já está em uso`);
        }
      } else {
        unique_name = await generateUniqueOrganizationName(org_name);
      }

      const normalizedProperties = properties
        ? normalizeOrganizationProperties(properties)
        : getDefaultOrganizationProperties();

      const validatedDomains = this._validateOrgDomains(org_domains);

      const newOrganization = await this.organizationsRepository.createOrgs(
        userId,
        org_name.trim(),
        unique_name,
        logo_url || null,
        banner_url || null,
        description?.trim() || "Type description here...",
        normalizedProperties,
        validatedDomains
      );

      await this._createDefaultOrganizationArea(newOrganization, userId);

      res.status(201).json({
        status: "OK",
        message: "Organização criada com sucesso",
        data: newOrganization,
      });
    } catch (error) {
      console.error("Erro ao criar organização:", error);
      res.status(400).json({
        success: false,
        error: error.message || "Erro ao criar organização",
      });
    }
  }

  async getOrganization(req, res) {
    try {
      const userId = this._validateAuthentication(req, res);
      if (!userId) return;

      const organization = await this._getUserOrganization(userId);
      if (!organization) {
        return res.status(404).json({
          success: false,
          error: "Organização não encontrada",
          message: "Usuário ainda não possui uma organização",
        });
      }

      // Construir resposta formatada
      const formattedOrganization = {
        created_at: organization.created_at,
        updated_at: organization.updated_at,
        identity: {
          id: organization.id,
          user_id: organization.user_id,
          org_name: organization.org_name,
          unique_name: organization.unique_name,
          logo_url: organization.logo_url,
          banner_url: organization.banner_url,
          description: organization.description,
        },
        properties: organization.properties,
        org_domains: organization.org_domains || [],
        owners: [
          {
            id: organization.user_id,
            name: organization.name,
            username: organization.username,
            email: organization.email,
            avatar_url: organization.avatar_url,
          },
        ],
        deleted: organization.deleted,
      };

      res
        .status(200)
        .json({ status: "OK", organization_data: formattedOrganization });
    } catch (error) {
      console.error("Erro ao buscar organização:", error);
      res
        .status(500)
        .json({ success: false, error: "Erro ao buscar organização" });
    }
  }

  async updateOrganization(req, res) {
    try {
      const userId = this._validateAuthentication(req, res);
      if (!userId) return;

      const {
        org_name,
        unique_name,
        logo_url,
        banner_url,
        description,
        properties,
        org_domains,
      } = req.body;

      const currentOrg = await this._getUserOrganization(userId);
      if (!currentOrg) {
        return res
          .status(404)
          .json({ success: false, error: "Organização não encontrada" });
      }

      let updatedUniqueName = currentOrg.unique_name;

      if (org_name && org_name !== currentOrg.org_name) {
        this._validateRequiredFields({ org_name });
        updatedUniqueName = await generateUniqueOrganizationName(org_name);
      }

      if (unique_name && unique_name !== currentOrg.unique_name) {
        const normalizedName = normalizeOrganizationName(unique_name);
        const existingNames =
          await this.organizationsRepository.getAvailableOrgNames(
            normalizedName
          );

        if (existingNames.includes(normalizedName)) {
          throw new Error("Nome único já está em uso");
        }
        updatedUniqueName = normalizedName;
      }

      let updatedProperties = currentOrg.properties;
      if (properties) {
        updatedProperties = updateOrganizationProperties(
          currentOrg.properties,
          properties
        );
      }

      const validatedDomains = org_domains
        ? this._validateOrgDomains(org_domains)
        : currentOrg.org_domains;

      const updatedOrg = await this.organizationsRepository.updateOrg(
        currentOrg.id,
        userId,
        org_name?.trim() || currentOrg.org_name,
        updatedUniqueName,
        logo_url !== undefined ? logo_url : currentOrg.logo_url,
        banner_url !== undefined ? banner_url : currentOrg.banner_url,
        description !== undefined
          ? description?.trim()
          : currentOrg.description,
        updatedProperties,
        currentOrg.deleted,
        validatedDomains
      );

      res.status(200).json({
        status: "OK",
        message: "Organização atualizada com sucesso",
        data: updatedOrg,
      });
    } catch (error) {
      console.error("Erro ao atualizar organização:", error);
      const statusCode = error.message.includes("não encontrada") ? 404 : 400;
      res.status(statusCode).json({
        success: false,
        error: error.message || "Erro ao atualizar organização",
      });
    }
  }

  async updateOrganizationProperties(req, res) {
    try {
      const userId = this._validateAuthentication(req, res);
      if (!userId) return;

      const { properties } = req.body;
      if (!properties || typeof properties !== "object") {
        return res.status(400).json({
          success: false,
          error: "Properties é obrigatório e deve ser um objeto",
        });
      }

      const currentOrg = await this._getUserOrganization(userId);
      if (!currentOrg) {
        return res
          .status(404)
          .json({ success: false, error: "Organização não encontrada" });
      }

      const updatedProperties = updateOrganizationProperties(
        currentOrg.properties,
        properties
      );

      const updatedOrg = await this.organizationsRepository.updateOrg(
        currentOrg.id,
        userId,
        currentOrg.org_name,
        currentOrg.unique_name,
        currentOrg.logo_url,
        currentOrg.banner_url,
        currentOrg.description,
        updatedProperties,
        currentOrg.deleted,
        currentOrg.org_domains
      );

      res.status(200).json({
        status: "OK",
        message: "Propriedades atualizadas com sucesso",
        data: updatedOrg,
      });
    } catch (error) {
      console.error("Erro ao atualizar properties:", error);
      const statusCode = error.message.includes("não encontrada") ? 404 : 400;
      res.status(statusCode).json({
        success: false,
        error: error.message || "Erro ao atualizar properties",
      });
    }
  }

  async deleteOrganization(req, res) {
    try {
      const userId = this._validateAuthentication(req, res);
      if (!userId) return;

      const currentOrg = await this._getUserOrganization(userId);
      if (!currentOrg) {
        return res
          .status(404)
          .json({ success: false, error: "Organização não encontrada" });
      }

      const deletedOrg = await this.organizationsRepository.updateOrg(
        currentOrg.id,
        userId,
        currentOrg.org_name,
        currentOrg.unique_name,
        currentOrg.logo_url,
        currentOrg.banner_url,
        currentOrg.description,
        currentOrg.properties,
        true,
        currentOrg.org_domains
      );

      res.status(200).json({
        status: "OK",
        message: "Organização excluída com sucesso",
        data: deletedOrg,
      });
    } catch (error) {
      console.error("Erro ao excluir organização:", error);
      res
        .status(500)
        .json({ success: false, error: "Erro ao excluir organização" });
    }
  }

  async restoreOrganization(req, res) {
    try {
      const userId = this._validateAuthentication(req, res);
      if (!userId) return;

      const organizations =
        await this.organizationsRepository.getOrgsByUserId(userId);
      const organization = organizations.find((org) => org.deleted);

      if (!organization) {
        return res.status(404).json({
          success: false,
          error: "Nenhuma organização deletada encontrada",
        });
      }

      const restoredOrg = await this.organizationsRepository.updateOrg(
        organization.id,
        userId,
        organization.org_name,
        organization.unique_name,
        organization.logo_url,
        organization.banner_url,
        organization.description,
        organization.properties,
        false,
        organization.org_domains
      );

      res.status(200).json({
        status: "OK",
        message: "Organização restaurada com sucesso",
        data: restoredOrg,
      });
    } catch (error) {
      console.error("Erro ao restaurar organização:", error);
      res
        .status(500)
        .json({ success: false, error: "Erro ao restaurar organização" });
    }
  }

  async uploadLogo(req, res) {
    try {
      const userId = this._validateAuthentication(req, res);
      if (!userId) return;

      if (!req.file) {
        return res
          .status(400)
          .json({ success: false, error: "Nenhum arquivo foi enviado" });
      }

      const currentOrg = await this._getUserOrganization(userId);
      if (!currentOrg) {
        return res
          .status(404)
          .json({ success: false, error: "Organização não encontrada" });
      }

      const result = await spacesService.uploadOrganizationLogo(
        req.file.buffer,
        req.file.mimetype,
        currentOrg.id
      );

      if (!result.success) {
        return res
          .status(500)
          .json({ success: false, error: "Erro ao salvar logo" });
      }

      const updatedOrg = await this.organizationsRepository.updateOrgLogo(
        currentOrg.id,
        result.key,
        userId
      );

      res.status(200).json({
        status: "OK",
        message: "Logo atualizado com sucesso",
        data: {
          organization: updatedOrg,
          upload: {
            path: result.key,
            filename: result.fileName,
            size: result.size,
          },
        },
      });
    } catch (error) {
      console.error("Erro ao fazer upload do logo:", error);
      res
        .status(500)
        .json({ success: false, error: "Erro ao fazer upload do logo" });
    }
  }

  async uploadBanner(req, res) {
    try {
      const userId = this._validateAuthentication(req, res);

      if (!userId) return;

      if (!req.file) {
        return res
          .status(400)
          .json({ success: false, error: "Nenhum arquivo foi enviado" });
      }

      const currentOrg = await this._getUserOrganization(userId);
      if (!currentOrg) {
        return res
          .status(404)
          .json({ success: false, error: "Organização não encontrada" });
      }

      const result = await spacesService.uploadOrganizationBanner(
        req.file.buffer,
        req.file.mimetype,
        currentOrg.id
      );

      if (!result.success) {
        return res
          .status(500)
          .json({ success: false, error: "Erro ao salvar banner" });
      }

      const updatedOrg = await this.organizationsRepository.updateOrgBanner(
        currentOrg.id,
        result.key,
        userId
      );

      res.status(200).json({
        status: "OK",
        message: "Banner updated successfully!",
        organization_data: {
          organization: orgDataResponse(updatedOrg),
          upload: {
            path: result.key,
            filename: result.fileName,
            size: result.size,
          },
        },
      });
    } catch (error) {
      //console.error("Erro ao fazer upload do banner:", error);
      res
        .status(500)
        .json({ success: false, error: "Erro ao fazer upload do banner" });
    }
  }

  async organizationProjects(req, res) {
    try {
      const userId = this._validateAuthentication(req, res);
      if (!userId) return;

      const currentOrg = await this._getUserOrganization(userId);
      if (!currentOrg) {
        return res
          .status(404)
          .json({ success: false, error: "Organização não encontrada" });
      }

      const projects =
        await this.organizationsRepository.getOrganizationProjects(
          currentOrg.id
        );

      res.status(200).json({
        status: "OK",
        organization_id: currentOrg.id,
        projects: projects,
      });
    } catch (error) {
      console.error("Erro ao buscar projetos da organização:", error);
      res.status(500).json({
        status: "ERROR",
        error: "Erro ao buscar projetos da organização",
      });
    }
  }
}

module.exports = new OrganizationsController();
