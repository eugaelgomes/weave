const PlansRepository = require("@/modules/plans/plans.repository");
const { executeQuery } = require("@/database/connection");
const { USAGE_PATHS } = require("@/services/plans/plan-paths");
const { enqueuePlanUsageJob } = require("@/services/queue/queue-controller");

class PlanUsageManager {
  /**
   * Gerencia o ciclo de uso: busca o registro e cria se não existir.
   * O rollover mensal agora é executado pelo worker.
   */
  /**
   *
   * @param {string} userId
   * @param {string | null} orgId
   * @returns {Promise<Record<string, any>>}
   */
  async managePlanUsage(userId, orgId = null) {
    let usageRecord = await PlansRepository.getPlanUsage(userId, orgId);

    // 1. Inicialização "Lazy" (Cria no primeiro uso)
    if (!usageRecord) {
      usageRecord = await this._initializeFirstUsage(userId, orgId);
    }

    if (!usageRecord) {
      throw new Error(
        "Não foi possível inicializar o uso: Usuário sem plano atribuído."
      );
    }

    return usageRecord;
  }

  /**
   * Compara uso atual com o limite (Síncrono)
   */
  checkLimit(planDetails, planUsage, actionPath, limitPath) {
    const currentUsage = this.getNestedValue(planUsage, actionPath) || 0;
    const limit = this.getNestedValue(planDetails, limitPath);

    if (limit === null || limit === undefined) return true; // Ilimitado

    return currentUsage < limit;
  }

  /**
   * Valida e busca uso em um único passo (Assíncrono)
   */
  async canPerformAction(
    userId,
    planDetails,
    actionPath,
    limitPath,
    orgId = null
  ) {
    const usageRecord = await this.managePlanUsage(userId, orgId);
    if (!usageRecord) return false;

    return this.checkLimit(
      planDetails,
      usageRecord.usage_details,
      actionPath,
      limitPath
    );
  }

  // ==========================================
  // MÉTODOS DE CONSUMO (INCREMENTOS)
  // ==========================================

  /**
   * Incrementa o total de notas criadas
   */
  async consumeNoteCreation(usageId) {
    return enqueuePlanUsageJob({
      operation: "consume_note_creation",
      usageId,
    });
  }

  /**
   * @param {string} usageId
   * @param {number} [amount=1] - Number of notes deleted (supports bulk)
   */
  async decrementNoteUsage(usageId, amount = 1) {
    return enqueuePlanUsageJob({
      operation: "consume_note_creation",
      payload: { amount: -Math.abs(amount) },
      usageId,
    });
  }

  /**
   * Incrementa o total de projetos criados
   */
  async consumeProjectCreation(usageId) {
    return enqueuePlanUsageJob({
      operation: "consume_project_creation",
      usageId,
    });
  }

  /**
   * @param {string} usageId
   * @param {number} [amount=1] - Number of projects deleted (supports bulk)
   */
  async decrementProjectUsage(usageId, amount = 1) {
    return enqueuePlanUsageJob({
      operation: "consume_project_creation",
      payload: { amount: -Math.abs(amount) },
      usageId,
    });
  }

  /**
   * Incrementa uso de IA (mensagens e opcionalmente tokens)
   */
  async consumeAiMessage(usageId, tokens = 0) {
    return enqueuePlanUsageJob({
      operation: "consume_ai_message",
      payload: { tokens },
      usageId,
    });
  }

  /**
   * Incrementa uso de storage (arquivos e MB)
   */
  async consumeStorage(usageId, fileSizeMb) {
    return enqueuePlanUsageJob({
      operation: "consume_storage",
      payload: { fileSizeMb },
      usageId,
    });
  }

  /**
   * Incrementa contadores de exportação
   */
  async consumeExport(usageId, type = "notes") {
    return enqueuePlanUsageJob({
      operation: "consume_export",
      payload: { type },
      usageId,
    });
  }

  // ==========================================
  // LÓGICA INTERNA E HELPERS
  // ==========================================

  /**
   * Busca histórico de uso do usuário
   */
  async getUserUsageHistory(userId, limit = 12) {
    return await PlansRepository.getUsageHistory(userId, limit);
  }

  /**
   * Gera relatório de uso
   */
  async generateUsageReport(userId) {
    const history = await this.getUserUsageHistory(userId);
    const currentUsage = await PlansRepository.getPlanUsage(userId);

    return {
      current_period: currentUsage?.usage_details,
      lifetime_stats: currentUsage?.lifetime_stats,
      history: history.map((h) => ({
        period: `${h.period_start} - ${h.period_end}`,
        notes: h.total_notes_created,
        projects: h.total_projects_created,
        ai_messages: h.total_ai_messages,
        storage_mb: h.total_storage_mb,
        exports: h.total_exports,
      })),
    };
  }

  async _initializeFirstUsage(userId, orgId) {
    const effectivePlan =
      await PlansRepository.getEffectivePlanByUserId(userId);
    const user = await PlansRepository.getUserWithPlan(userId);
    if (!user && !effectivePlan) return null;

    let planId = effectivePlan?.plan_id;
    let appliedPlanSnapshot = effectivePlan?.plan_details || null;
    let appliedPlanVersion = effectivePlan?.plan_version || null;

    if (!planId) {
      const defaultPlanId = await PlansRepository.getDefaultSignupPlanId();
      if (defaultPlanId) {
        const defaultPlan = await PlansRepository.getPlanById(defaultPlanId);
        planId = defaultPlan?.plan_id || null;
        appliedPlanSnapshot = defaultPlan?.details || null;
        appliedPlanVersion = defaultPlan?.plan_version || 1;
      }
    }
    if (!planId || !appliedPlanSnapshot) return null;

    if (user && !user.plan_id) {
      await executeQuery(
        `UPDATE users SET plan_id = $1 WHERE user_id = $2 AND plan_id IS NULL`,
        [planId, userId]
      );
    }

    const subscriberType = orgId
      ? "organization"
      : effectivePlan?.subscriber_type || "user";
    const subscriberId = orgId || effectivePlan?.subscriber_id || userId;

    const startDate = new Date();
    const endDate = new Date();
    endDate.setMonth(endDate.getMonth() + 1);

    const initialUsageDetails = {
      usage_summary: {
        notes_total: 0,
        projects_total: 0,
        team_members_total: 1,
      },
      monthly_cycle: {
        current_period_start: startDate.toISOString(),
        current_period_end: endDate.toISOString(),
        exports: { notes_count: 0, backups_count: 0 },
        storage: { total_uploaded_mb: 0, files_count: 0 },
        weave_ai: { messages_sent: 0, tokens_estimated: 0 },
      },
      history_metadata: {
        last_activity_at: startDate.toISOString(),
        usage_percentage_total: 0,
      },
    };

    return await PlansRepository.createInitialUsage(
      planId,
      userId,
      orgId ? "organization" : "user",
      initialUsageDetails,
      orgId,
      subscriberType,
      subscriberId,
      appliedPlanSnapshot,
      appliedPlanVersion || 1
    );
  }

  getNestedValue(obj, path) {
    return path.split(".").reduce((acc, part) => acc && acc[part], obj);
  }
}

module.exports = new PlanUsageManager();
