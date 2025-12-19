const organizationsRepository = require("@/repositories/organizations");
const {
  normalizeOrganizationName,
  generateUniqueOrganizationName,
  normalizeOrganizationProperties,
  updateOrganizationProperties,
  getDefaultOrganizationProperties,
} = require("./normalizer");

class OrganizationsController {
  constructor() {
    this.organizationsRepository = organizationsRepository;
  }

  // ========================================
  // MÉTODOS UTILITÁRIOS E VALIDAÇÃO
  // ========================================

  /**
   * Valida se o usuário está autenticado
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   * @returns {string|null} - Retorna o userId se válido, ou envia erro HTTP
   */
  _validateAuthentication(req, res) {
    const userId = req.user?.userId;

    if (!userId) {
      res.status(401).json({ error: "Usuário não autenticado" });
      return null;
    }

    return userId;
  }

  /**
   * Busca a organização do usuário
   * @param {string} userId - ID do usuário
   * @returns {Object|null} - Organização encontrada ou null
   */
  async _getUserOrganization(userId) {
    const organizations = await this.organizationsRepository.getOrgsByUserId(
      userId
    );
    return organizations.find((org) => !org.deleted) || null;
  }

  /**
   * Valida campos obrigatórios para criação
   * @param {Object} data - Dados da organização
   * @throws {Error} - Se houver campos inválidos
   */
  _validateRequiredFields(data) {
    if (!data.org_name || typeof data.org_name !== "string") {
      throw new Error("Nome da organização é obrigatório");
    }

    if (data.org_name.trim().length < 2) {
      throw new Error("Nome da organização deve ter pelo menos 2 caracteres");
    }

    if (data.org_name.length > 100) {
      throw new Error("Nome da organização deve ter no máximo 100 caracteres");
    }
  }

  /**
   * Valida e sanitiza org_domains
   * @param {Array} domains - Domínios a serem validados
   * @returns {Array|null} - Domínios validados
   */
  _validateOrgDomains(domains) {
    if (!domains) {
      return null;
    }

    if (!Array.isArray(domains)) {
      throw new Error("org_domains deve ser um array");
    }

    // Validação básica de domínio
    const domainRegex = /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9][a-z0-9-]{0,61}[a-z0-9]$/i;

    const validatedDomains = domains.filter((domain) => {
      if (typeof domain !== "string") return false;
      return domainRegex.test(domain.trim());
    });

    return validatedDomains.length > 0 ? validatedDomains : null;
  }

  // ========================================
  // CREATE - Criar Organização
  // ========================================

  /**
   * Cria uma nova organização (usuário só pode ter uma)
   * POST /api/organizations
   */
  async createOrganization(req, res) {
    try {
      const userId = this._validateAuthentication(req, res);
      if (!userId) return;

      // Verificar se o usuário já tem uma organização
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

      // Validar campos obrigatórios
      this._validateRequiredFields({ org_name });

      // Determinar unique_name (fornecido ou gerado)
      let unique_name;

      if (providedUniqueName) {
        // Se o usuário forneceu, normalizar e validar disponibilidade
        unique_name = normalizeOrganizationName(providedUniqueName);

        if (!unique_name) {
          throw new Error("Nome único fornecido é inválido após normalização");
        }

        // Verificar se já existe
        const existingNames = await this.organizationsRepository.getAvailableOrgNames(
          unique_name
        );

        if (existingNames.includes(unique_name)) {
          throw new Error(`Nome único '${unique_name}' já está em uso`);
        }
      } else {
        // Se não forneceu, gerar automaticamente
        unique_name = await generateUniqueOrganizationName(org_name);
      }

      // Normalizar properties (aplicar defaults e validar)
      const normalizedProperties = properties
        ? normalizeOrganizationProperties(properties)
        : getDefaultOrganizationProperties();

      // Validar domínios
      const validatedDomains = this._validateOrgDomains(org_domains);

      // Inicializar members e projects vazios
      const initialMembers = {
        owner: userId,
        admins: [],
        members: [],
        invited: [],
      };

      const initialProjects = {
        projects: [],
        count: 0,
      };

      // Criar organização
      const newOrganization = await this.organizationsRepository.createOrgs(
        userId,
        org_name.trim(),
        unique_name,
        logo_url || null,
        banner_url || null,
        description?.trim() || "Type description here...",
        normalizedProperties,
        initialMembers,
        initialProjects,
        validatedDomains
      );

      res.status(201).json({
        success: true,
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

  // ========================================
  // READ - Buscar Organização
  // ========================================

  /**
   * Retorna a organização do usuário
   * GET /api/organizations
   */
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

      res.status(200).json({
        success: true,
        data: organization,
      });
    } catch (error) {
      console.error("Erro ao buscar organização:", error);
      res.status(500).json({
        success: false,
        error: "Erro ao buscar organização",
      });
    }
  }

  // ========================================
  // UPDATE - Atualizar Organização
  // ========================================

  /**
   * Atualiza a organização do usuário
   * PUT /api/organizations
   */
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
        members,
        projects,
        org_domains,
      } = req.body;

      // Buscar organização do usuário
      const currentOrg = await this._getUserOrganization(userId);

      if (!currentOrg) {
        return res.status(404).json({
          success: false,
          error: "Organização não encontrada",
        });
      }

      // Preparar dados para atualização
      let updatedUniqueName = currentOrg.unique_name;

      // Se o nome mudou, gerar novo unique_name
      if (org_name && org_name !== currentOrg.org_name) {
        this._validateRequiredFields({ org_name });
        updatedUniqueName = await generateUniqueOrganizationName(org_name);
      }

      // Se unique_name foi fornecido explicitamente, validar
      if (unique_name && unique_name !== currentOrg.unique_name) {
        const normalizedName = normalizeOrganizationName(unique_name);
        // Verificar disponibilidade
        const existingNames = await this.organizationsRepository.getAvailableOrgNames(
          normalizedName
        );
        if (existingNames.includes(normalizedName)) {
          throw new Error("Nome único já está em uso");
        }
        updatedUniqueName = normalizedName;
      }

      // Atualizar properties (merge com as atuais)
      let updatedProperties = currentOrg.properties;
      if (properties) {
        updatedProperties = updateOrganizationProperties(
          currentOrg.properties,
          properties
        );
      }

      // Validar domínios
      const validatedDomains = org_domains
        ? this._validateOrgDomains(org_domains)
        : currentOrg.org_domains;

      // Atualizar organização
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
        members || currentOrg.members,
        projects || currentOrg.projects,
        validatedDomains
      );

      res.status(200).json({
        success: true,
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

  /**
   * Atualiza apenas as properties da organização do usuário
   * PATCH /api/organizations/properties
   */
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

      // Buscar organização do usuário
      const currentOrg = await this._getUserOrganization(userId);

      if (!currentOrg) {
        return res.status(404).json({
          success: false,
          error: "Organização não encontrada",
        });
      }

      // Atualizar properties (merge com as atuais)
      const updatedProperties = updateOrganizationProperties(
        currentOrg.properties,
        properties
      );

      // Atualizar apenas properties
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
        currentOrg.members,
        currentOrg.projects,
        currentOrg.org_domains
      );

      res.status(200).json({
        success: true,
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

  // ========================================
  // DELETE - Excluir Organização (Soft Delete)
  // ========================================

  /**
   * Marca a organização do usuário como deletada (soft delete)
   * DELETE /api/organizations
   */
  async deleteOrganization(req, res) {
    try {
      const userId = this._validateAuthentication(req, res);
      if (!userId) return;

      // Buscar organização do usuário
      const currentOrg = await this._getUserOrganization(userId);

      if (!currentOrg) {
        return res.status(404).json({
          success: false,
          error: "Organização não encontrada",
        });
      }

      // Marcar como deletada
      const deletedOrg = await this.organizationsRepository.updateOrg(
        currentOrg.id,
        userId,
        currentOrg.org_name,
        currentOrg.unique_name,
        currentOrg.logo_url,
        currentOrg.banner_url,
        currentOrg.description,
        currentOrg.properties,
        true, // deleted = true
        currentOrg.members,
        currentOrg.projects,
        currentOrg.org_domains
      );

      res.status(200).json({
        success: true,
        message: "Organização excluída com sucesso",
        data: deletedOrg,
      });
    } catch (error) {
      console.error("Erro ao excluir organização:", error);
      res.status(500).json({
        success: false,
        error: "Erro ao excluir organização",
      });
    }
  }

  /**
   * Restaura a organização deletada do usuário
   * POST /api/organizations/restore
   */
  async restoreOrganization(req, res) {
    try {
      const userId = this._validateAuthentication(req, res);
      if (!userId) return;

      // Buscar organização deletada
      const organizations = await this.organizationsRepository.getOrgsByUserId(
        userId
      );
      const organization = organizations.find((org) => org.deleted);

      if (!organization) {
        return res.status(404).json({
          success: false,
          error: "Nenhuma organização deletada encontrada",
        });
      }

      // Restaurar organização
      const restoredOrg = await this.organizationsRepository.updateOrg(
        organization.id,
        userId,
        organization.org_name,
        organization.unique_name,
        organization.logo_url,
        organization.banner_url,
        organization.description,
        organization.properties,
        false, // deleted = false
        organization.members,
        organization.projects,
        organization.org_domains
      );

      res.status(200).json({
        success: true,
        message: "Organização restaurada com sucesso",
        data: restoredOrg,
      });
    } catch (error) {
      console.error("Erro ao restaurar organização:", error);
      res.status(500).json({
        success: false,
        error: "Erro ao restaurar organização",
      });
    }
  }

  // ========================================
  // MEMBERS - Gerenciamento de Membros
  // ========================================

  /**
   * Adiciona um membro à organização do usuário
   * POST /api/organizations/members
   */
  async addMember(req, res) {
    try {
      const userId = this._validateAuthentication(req, res);
      if (!userId) return;

      const { memberId, role = "member" } = req.body;

      if (!memberId) {
        return res.status(400).json({
          success: false,
          error: "memberId é obrigatório",
        });
      }

      const validRoles = ["admin", "member"];
      if (!validRoles.includes(role)) {
        return res.status(400).json({
          success: false,
          error: "Role deve ser 'admin' ou 'member'",
        });
      }

      // Buscar organização do usuário
      const currentOrg = await this._getUserOrganization(userId);

      if (!currentOrg) {
        return res.status(404).json({
          success: false,
          error: "Organização não encontrada",
        });
      }

      // Verificar se já é membro
      const members = currentOrg.members || {
        owner: userId,
        admins: [],
        members: [],
        invited: [],
      };

      if (
        members.owner === memberId ||
        members.admins?.includes(memberId) ||
        members.members?.includes(memberId)
      ) {
        return res.status(400).json({
          success: false,
          error: "Usuário já é membro da organização",
        });
      }

      // Adicionar membro
      if (role === "admin") {
        members.admins = [...(members.admins || []), memberId];
      } else {
        members.members = [...(members.members || []), memberId];
      }

      // Remover de invited se existir
      if (members.invited?.includes(memberId)) {
        members.invited = members.invited.filter((id) => id !== memberId);
      }

      // Atualizar organização
      const updatedOrg = await this.organizationsRepository.updateOrg(
        currentOrg.id,
        userId,
        currentOrg.org_name,
        currentOrg.unique_name,
        currentOrg.logo_url,
        currentOrg.banner_url,
        currentOrg.description,
        currentOrg.properties,
        currentOrg.deleted,
        members,
        currentOrg.projects,
        currentOrg.org_domains
      );

      res.status(200).json({
        success: true,
        message: "Membro adicionado com sucesso",
        data: updatedOrg,
      });
    } catch (error) {
      console.error("Erro ao adicionar membro:", error);
      res.status(400).json({
        success: false,
        error: error.message || "Erro ao adicionar membro",
      });
    }
  }

  /**
   * Remove um membro da organização do usuário
   * DELETE /api/organizations/members/:memberId
   */
  async removeMember(req, res) {
    try {
      const userId = this._validateAuthentication(req, res);
      if (!userId) return;

      const { memberId } = req.params;

      // Buscar organização do usuário
      const currentOrg = await this._getUserOrganization(userId);

      if (!currentOrg) {
        return res.status(404).json({
          success: false,
          error: "Organização não encontrada",
        });
      }

      const members = currentOrg.members || {
        owner: userId,
        admins: [],
        members: [],
        invited: [],
      };

      // Não pode remover o owner
      if (members.owner === memberId) {
        return res.status(400).json({
          success: false,
          error: "Não é possível remover o proprietário da organização",
        });
      }

      // Remover membro de todas as listas
      members.admins = (members.admins || []).filter((id) => id !== memberId);
      members.members = (members.members || []).filter(
        (id) => id !== memberId
      );
      members.invited = (members.invited || []).filter(
        (id) => id !== memberId
      );

      // Atualizar organização
      const updatedOrg = await this.organizationsRepository.updateOrg(
        currentOrg.id,
        userId,
        currentOrg.org_name,
        currentOrg.unique_name,
        currentOrg.logo_url,
        currentOrg.banner_url,
        currentOrg.description,
        currentOrg.properties,
        currentOrg.deleted,
        members,
        currentOrg.projects,
        currentOrg.org_domains
      );

      res.status(200).json({
        success: true,
        message: "Membro removido com sucesso",
        data: updatedOrg,
      });
    } catch (error) {
      console.error("Erro ao remover membro:", error);
      res.status(400).json({
        success: false,
        error: error.message || "Erro ao remover membro",
      });
    }
  }
}

module.exports = new OrganizationsController();
