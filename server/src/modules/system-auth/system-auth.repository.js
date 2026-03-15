const { executeQuery } = require("@/database/connection");

class SystemAuthRepository {
  /**
   * Busca admin por email
   */
  async findAdminByEmail(email) {
    const query = `
      SELECT 
        id, email, name, role, user_function, password,
        is_active, is_suspended, is_deleted,
        created_at, updated_at
      FROM system_admins
      WHERE email = $1 AND is_deleted = false
    `;
    const results = await executeQuery(query, [email]);
    return results[0];
  }

  /**
   * Busca admin por ID
   */
  async findAdminById(adminId) {
    const query = `
      SELECT 
        id, email, name, role, user_function,
        is_active, is_suspended, is_deleted,
        created_at, updated_at, created_by
      FROM system_admins
      WHERE id = $1 AND is_deleted = false
    `;
    const results = await executeQuery(query, [adminId]);
    return results[0];
  }

  /**
   * Valida se admin está apto para usar o sistema
   */
  async validateAdminStatus(adminId) {
    const admin = await this.findAdminById(adminId);

    if (!admin) {
      return { valid: false, reason: "Admin não encontrado" };
    }

    if (!admin.is_active) {
      return { valid: false, reason: "Conta inativa" };
    }

    if (admin.is_suspended) {
      return { valid: false, reason: "Conta suspensa" };
    }

    return { valid: true, admin };
  }

  /**
   * Atualiza último acesso
   */
  async updateLastAccess(adminId) {
    const query = `
      UPDATE system_admins 
      SET updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `;
    await executeQuery(query, [adminId]);
  }
}

module.exports = new SystemAuthRepository();
