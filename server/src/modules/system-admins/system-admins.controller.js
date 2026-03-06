const SystemAdminsRepository = require("@/modules/system-admins/system-admins.repository");

class SystemAdminsController {
  _handleError(error, res) {
    console.error(`[SystemAdminsController Error]: ${error.message}`, {
      stack: error.stack,
    });

    if (error.message.includes("não encontrad")) {
      return res.status(404).json({ error: error.message });
    }
    if (error.message.includes("obrigatório") || error.message.includes("inválido") || error.message.includes("já cadastrado")) {
      return res.status(400).json({ error: error.message });
    }

    return res.status(500).json({ error: "Erro interno do servidor." });
  }

  // ==================== LISTAR ====================

  async listAdmins(req, res) {
    try {
      const {
        page = 1,
        limit = 20,
        search = "",
        status = "all",
        orderBy = "created_at",
        order = "DESC",
      } = req.query;

      const result = await SystemAdminsRepository.listAdmins({
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

  // ==================== BUSCAR ====================

  async getAdminById(req, res) {
    try {
      const { id } = req.params;
      if (!id) throw new Error("ID é obrigatório");

      const admin = await SystemAdminsRepository.getAdminById(id);
      if (!admin) throw new Error("Admin não encontrado");

      return res.json({ admin });
    } catch (error) {
      return this._handleError(error, res);
    }
  }

  // ==================== CRIAR ====================

  async createAdmin(req, res) {
    try {
      const { email, name, role, user_function } = req.body;

      if (!email || !name) {
        throw new Error("Email e nome são obrigatórios");
      }

      const validRoles = ["super_admin", "manager", "support", "read_only"];
      if (role && !validRoles.includes(role)) {
        throw new Error("Role inválida");
      }

      const createdBy = req.systemAdmin.adminId;

      const admin = await SystemAdminsRepository.createAdmin(
        { email, name, role, user_function },
        createdBy
      );

      return res.status(201).json({
        message: "Admin criado com sucesso",
        admin,
      });
    } catch (error) {
      return this._handleError(error, res);
    }
  }

  // ==================== ATUALIZAR ====================

  async updateAdmin(req, res) {
    try {
      const { id } = req.params;
      if (!id) throw new Error("ID é obrigatório");

      // Prevenir que admin altere a si mesmo em campos críticos
      if (id === req.systemAdmin.adminId && (req.body.role || req.body.is_active === false)) {
        throw new Error("Não é possível alterar sua própria role ou status");
      }

      const updated = await SystemAdminsRepository.updateAdmin(id, req.body);
      if (!updated) throw new Error("Nenhum campo válido para atualizar");

      return res.json({
        message: "Admin atualizado com sucesso",
        admin: updated,
      });
    } catch (error) {
      return this._handleError(error, res);
    }
  }

  // ==================== SUSPENDER/ATIVAR ====================

  async suspendAdmin(req, res) {
    try {
      const { id } = req.params;
      if (!id) throw new Error("ID é obrigatório");

      // Prevenir auto-suspensão
      if (id === req.systemAdmin.adminId) {
        throw new Error("Não é possível suspender a si mesmo");
      }

      const admin = await SystemAdminsRepository.suspendAdmin(id);
      if (!admin) throw new Error("Admin não encontrado");

      return res.json({
        message: "Admin suspenso com sucesso",
        admin,
      });
    } catch (error) {
      return this._handleError(error, res);
    }
  }

  async activateAdmin(req, res) {
    try {
      const { id } = req.params;
      if (!id) throw new Error("ID é obrigatório");

      const admin = await SystemAdminsRepository.activateAdmin(id);
      if (!admin) throw new Error("Admin não encontrado");

      return res.json({
        message: "Admin ativado com sucesso",
        admin,
      });
    } catch (error) {
      return this._handleError(error, res);
    }
  }

  // ==================== DELETAR ====================

  async deleteAdmin(req, res) {
    try {
      const { id } = req.params;
      if (!id) throw new Error("ID é obrigatório");

      // Prevenir auto-exclusão
      if (id === req.systemAdmin.adminId) {
        throw new Error("Não é possível deletar a si mesmo");
      }

      const deleted = await SystemAdminsRepository.softDeleteAdmin(id);
      if (!deleted) throw new Error("Admin não encontrado");

      return res.json({
        message: "Admin deletado com sucesso",
        admin: deleted,
      });
    } catch (error) {
      return this._handleError(error, res);
    }
  }

  async restoreAdmin(req, res) {
    try {
      const { id } = req.params;
      if (!id) throw new Error("ID é obrigatório");

      const restored = await SystemAdminsRepository.restoreAdmin(id);
      if (!restored) throw new Error("Admin não encontrado");

      return res.json({
        message: "Admin restaurado com sucesso",
        admin: restored,
      });
    } catch (error) {
      return this._handleError(error, res);
    }
  }

  // ==================== ESTATÍSTICAS ====================

  async getStats(req, res) {
    try {
      const stats = await SystemAdminsRepository.getAdminStats();
      return res.json({ stats });
    } catch (error) {
      return this._handleError(error, res);
    }
  }
}

module.exports = new SystemAdminsController();
