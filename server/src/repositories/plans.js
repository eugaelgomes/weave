const { executeQuery } = require("@/services/db/index");

class PlansRepository {
  // ==========================================
  // Query com todos os planos (not-deleted)
  // ==========================================
  async getAllPlans() {
    const query = `
        SELECT plan_id, name, details, created_at
        FROM plans 
        WHERE deleted = FALSE
        ORDER BY name ASC
      `;
    return await executeQuery(query);
  }

  async getPlanById(planId) {
    const query = `
    SELECT plan_id, name, details, created_at 
    FROM plans 
    WHERE plan_id = $1
      `;
    const results = await executeQuery(query, [planId]);
    return results[0];
  }

  async getUserAndPlan(userId) {
    const query = `
      SELECT u.user_id, u.plan_id, p.details as plan_details
      FROM users u
      LEFT JOIN plans p ON u.plan_id = p.plan_id
      WHERE u.user_id = $1
      LIMIT 1`;
    const results = await executeQuery(query, [userId]);
    return results[0];
  }

  async getPlanUsageCount(planId) {
    const query = `
    SELECT COUNT(*) AS user_count
    FROM users 
    WHERE plan_id = $1
      `;
    const results = await executeQuery(query, [planId]);
    return parseInt(results[0].user_count, 10);
  }

  async getUserWithPlan(userId) {
    const query = `
      SELECT u.user_id, u.plan_id, p.details as plan_details
      FROM users u
      LEFT JOIN plans p ON u.plan_id = p.plan_id
      WHERE u.user_id = $1
      LIMIT 1`;
    const results = await executeQuery(query, [userId]);
    return results[0];
  }

  async getPlanUsage(userId, orgId = null) {
    const query = `
      SELECT id, plan_id, client_type, user_id, org_id, usage_details, 
             lifetime_stats, last_reset_at, created_at, updated_at
      FROM plans_usage 
      WHERE (user_id = $1 AND $1 IS NOT NULL) OR (org_id = $2 AND $2 IS NOT NULL)
      LIMIT 1`;
    const results = await executeQuery(query, [userId, orgId]);
    return results[0];
  }

  // ==========================================
  // ESCRITA E INICIALIZAÇÃO (WRITE)
  // ==========================================

  async createInitialUsage(
    planId,
    userId,
    clientType,
    initialUsageJson,
    orgId = null
  ) {
    const query = `
      INSERT INTO plans_usage (plan_id, user_id, org_id, client_type, usage_details, last_reset_at)
      VALUES ($1, $2, $3, $4, $5, NOW())
      RETURNING *`;
    const results = await executeQuery(query, [
      planId,
      userId,
      orgId,
      clientType,
      initialUsageJson,
    ]);
    return results[0];
  }

  // ==========================================
  // Snapshot Mensal e Reset de Uso
  // ==========================================

  /**
   * Incremento Inteligente: Atualiza o JSONB e, se for nota ou IA, atualiza a coluna de Auditoria (Lifetime)
   */
  async incrementUsageCounter(usageId, jsonPath, amount = 1) {
    // Detecta se o path é de nota ou IA para atualizar a coluna de auditoria correspondente
    const isNote = jsonPath.includes("notes_total");
    const isAI = jsonPath.includes("messages_sent");

    const query = `
      UPDATE plans_usage 
      SET 
        usage_details = jsonb_set(
          usage_details, 
          $1, 
          ((COALESCE(usage_details #>> $1, '0')::int) + $2)::text::jsonb
        ),
        ${isNote ? "total_lifetime_notes = total_lifetime_notes + $2," : ""}
        ${isAI ? "total_lifetime_ai_messages = total_lifetime_ai_messages + $2," : ""}
        updated_at = NOW()
      WHERE id = $3
      RETURNING *`;

    const results = await executeQuery(query, [jsonPath, amount, usageId]);
    return results[0];
  }

  async updateJsonValue(usageId, jsonPath, value) {
    const query = `
      UPDATE plans_usage 
      SET usage_details = jsonb_set(usage_details, $1, $2::jsonb),
          updated_at = NOW()
      WHERE id = $3
      RETURNING usage_details`;
    const results = await executeQuery(query, [
      jsonPath,
      JSON.stringify(value),
      usageId,
    ]);
    return results[0];
  }

  // ==========================================
  // GESTÃO DE CICLO E HISTÓRICO (HISTORY)
  // ==========================================

  async updateFullUsage(usageId, usageDetails, lastResetAt = null) {
    const query = `
      UPDATE plans_usage 
      SET usage_details = $1, 
          last_reset_at = COALESCE($2, last_reset_at),
          updated_at = NOW() 
      WHERE id = $3 
      RETURNING *`;
    const results = await executeQuery(query, [
      usageDetails,
      lastResetAt,
      usageId,
    ]);
    return results[0];
  }

  /**
   * Salva o snapshot do mês na tabela de histórico
   */
  async saveUsageHistory(historyData) {
    const {
      plan_usage_id,
      user_id,
      org_id,
      plan_id,
      period_start,
      period_end,
      final_usage_details,
      total_notes_created,
      total_projects_created,
      total_ai_messages,
      total_storage_mb,
      total_exports
    } = historyData;
    
    const query = `
      INSERT INTO plan_usage_history 
        (plan_usage_id, user_id, org_id, plan_id, period_start, period_end, 
         final_usage_details, total_notes_created, total_projects_created,
         total_ai_messages, total_storage_mb, total_exports)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING id`;
      
    const results = await executeQuery(query, [
      plan_usage_id,
      user_id,
      org_id,
      plan_id,
      period_start,
      period_end,
      final_usage_details,
      total_notes_created || 0,
      total_projects_created || 0,
      total_ai_messages || 0,
      total_storage_mb || 0,
      total_exports || 0
    ]);
    
    return results[0];
  }

  /**
   * Atualiza estatísticas de lifetime
   */
  async updateLifetimeStats(usageId, increments) {
    const query = `
      UPDATE plans_usage
      SET 
        lifetime_stats = jsonb_set(
          jsonb_set(
            jsonb_set(
              jsonb_set(
                COALESCE(lifetime_stats, '{}'::jsonb),
                '{total_notes_ever}',
                to_jsonb(COALESCE((lifetime_stats->>'total_notes_ever')::int, 0) + $2)
              ),
              '{total_projects_ever}',
              to_jsonb(COALESCE((lifetime_stats->>'total_projects_ever')::int, 0) + $3)
            ),
            '{total_ai_messages_ever}',
            to_jsonb(COALESCE((lifetime_stats->>'total_ai_messages_ever')::int, 0) + $4)
          ),
          '{total_storage_used_mb}',
          to_jsonb(COALESCE((lifetime_stats->>'total_storage_used_mb')::numeric, 0) + $5)
        ),
        updated_at = NOW()
      WHERE id = $1
      RETURNING lifetime_stats`;

    const results = await executeQuery(query, [
      usageId,
      increments.notes || 0,
      increments.projects || 0,
      increments.ai_messages || 0,
      increments.storage_mb || 0
    ]);

    return results[0];
  }

  /**
   * Busca histórico de uso
   */
  async getUsageHistory(userId, limit = 12) {
    const query = `
      SELECT 
        id, period_start, period_end,
        total_notes_created, total_projects_created,
        total_ai_messages, total_storage_mb, total_exports,
        created_at
      FROM plan_usage_history
      WHERE user_id = $1
      ORDER BY period_end DESC
      LIMIT $2`;

    return await executeQuery(query, [userId, limit]);
  }

  async assignPlanToUser(userId, planId) {
    const query = `
      UPDATE users
      SET plan_id = $2, updated_at = NOW()
      WHERE user_id = $1
      RETURNING user_id, plan_id
    `;
    const results = await executeQuery(query, [userId, planId]);
    return results[0];
  }
}

module.exports = new PlansRepository();
