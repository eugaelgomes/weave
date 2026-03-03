const AdminRepository = require("@/modules/admin/admin.repository");

class AdminController {
  constructor() {
    this.adminRepository = AdminRepository;
  }

  _handleError(error, res) {
    console.error(`[AdminController Error]: ${error.message}`, {
      stack: error.stack,
    });

    if (error.message.includes("não encontrad")) {
      return res.status(404).json({ error: error.message });
    }
    if (error.message.includes("obrigatório") || error.message.includes("inválido")) {
      return res.status(400).json({ error: error.message });
    }

    return res.status(500).json({ error: "Erro interno do servidor." });
  }

  // ==================== DASHBOARD ====================

  async getDashboard(req, res) {
    try {
      const stats = await this.adminRepository.getDashboardStats();
      return res.json({ stats });
    } catch (error) {
      return this._handleError(error, res);
    }
  }

  // ==================== USERS ====================

  async listUsers(req, res) {
    try {
      const {
        page = 1,
        limit = 20,
        search = "",
        status = "all",
        orderBy = "created_at",
        order = "DESC",
      } = req.query;

      const result = await this.adminRepository.listUsers({
        page: parseInt(page, 10),
        limit: Math.min(parseInt(limit, 10), 100),
        search,
        status,
        orderBy,
        order,
      });

      return res.json(result);
    } catch (error) {
      return this._handleError(error, res);
    }
  }

  async getUserById(req, res) {
    try {
      const { id } = req.params;
      if (!id) throw new Error("ID do usuário é obrigatório");

      const user = await this.adminRepository.getUserById(id);
      if (!user) throw new Error("Usuário não encontrado");

      const stats = await this.adminRepository.getUserStats(id);

      return res.json({ user, stats });
    } catch (error) {
      return this._handleError(error, res);
    }
  }

  async updateUser(req, res) {
    try {
      const { id } = req.params;
      if (!id) throw new Error("ID do usuário é obrigatório");

      const updated = await this.adminRepository.updateUser(id, req.body);
      if (!updated) throw new Error("Nenhum campo válido para atualizar");

      return res.json({ message: "Usuário atualizado com sucesso", user: updated });
    } catch (error) {
      return this._handleError(error, res);
    }
  }

  async deleteUser(req, res) {
    try {
      const { id } = req.params;
      if (!id) throw new Error("ID do usuário é obrigatório");

      const deleted = await this.adminRepository.softDeleteUser(id);
      if (!deleted) throw new Error("Usuário não encontrado");

      return res.json({ message: "Usuário desativado com sucesso", user: deleted });
    } catch (error) {
      return this._handleError(error, res);
    }
  }

  async restoreUser(req, res) {
    try {
      const { id } = req.params;
      if (!id) throw new Error("ID do usuário é obrigatório");

      const restored = await this.adminRepository.restoreUser(id);
      if (!restored) throw new Error("Usuário não encontrado");

      return res.json({ message: "Usuário restaurado com sucesso", user: restored });
    } catch (error) {
      return this._handleError(error, res);
    }
  }

  // ==================== ORGANIZATIONS ====================

  async listOrganizations(req, res) {
    try {
      const {
        page = 1,
        limit = 20,
        search = "",
        status = "all",
        orderBy = "created_at",
        order = "DESC",
      } = req.query;

      const result = await this.adminRepository.listOrganizations({
        page: parseInt(page, 10),
        limit: Math.min(parseInt(limit, 10), 100),
        search,
        status,
        orderBy,
        order,
      });

      return res.json(result);
    } catch (error) {
      return this._handleError(error, res);
    }
  }

  async getOrganizationById(req, res) {
    try {
      const { id } = req.params;
      if (!id) throw new Error("ID da organização é obrigatório");

      const organization = await this.adminRepository.getOrganizationById(id);
      if (!organization) throw new Error("Organização não encontrada");

      const members = await this.adminRepository.getOrganizationMembers(id);

      return res.json({ organization, members });
    } catch (error) {
      return this._handleError(error, res);
    }
  }

  async updateOrganization(req, res) {
    try {
      const { id } = req.params;
      if (!id) throw new Error("ID da organização é obrigatório");

      const updated = await this.adminRepository.updateOrganization(id, req.body);
      if (!updated) throw new Error("Nenhum campo válido para atualizar");

      return res.json({ message: "Organização atualizada com sucesso", organization: updated });
    } catch (error) {
      return this._handleError(error, res);
    }
  }

  async deleteOrganization(req, res) {
    try {
      const { id } = req.params;
      if (!id) throw new Error("ID da organização é obrigatório");

      const deleted = await this.adminRepository.softDeleteOrganization(id);
      if (!deleted) throw new Error("Organização não encontrada");

      return res.json({ message: "Organização desativada com sucesso", organization: deleted });
    } catch (error) {
      return this._handleError(error, res);
    }
  }

  async restoreOrganization(req, res) {
    try {
      const { id } = req.params;
      if (!id) throw new Error("ID da organização é obrigatório");

      const restored = await this.adminRepository.restoreOrganization(id);
      if (!restored) throw new Error("Organização não encontrada");

      return res.json({ message: "Organização restaurada com sucesso", organization: restored });
    } catch (error) {
      return this._handleError(error, res);
    }
  }

  // ==================== PLANS ====================

  async listPlans(req, res) {
    try {
      const plans = await this.adminRepository.listPlans();
      return res.json({ plans });
    } catch (error) {
      return this._handleError(error, res);
    }
  }
}

module.exports = new AdminController();
