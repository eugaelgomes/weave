const PlansRepository = require("@/modules/plans/plans.repository");
const { executeQuery } = require("@/database/connection");
const { USAGE_PATHS } = require("@/services/plans/plan-paths");

class PlanUsageManager {
  /**
   * Gerencia o ciclo de uso: busca o registro, cria se não existir
   * e reseta se o mês tiver virado.
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

    const now = new Date();
    const periodEnd = new Date(
      this.getNestedValue(
        usageRecord.usage_details,
        USAGE_PATHS.MONTHLY.PERIOD_END
      )
    );

    // 2. Reset de Ciclo Mensal
    if (now > periodEnd) {
      const updatedDetails = await this.resetMonthlyCycle(usageRecord);
      return { ...usageRecord, usage_details: updatedDetails };
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
    return await this.incrementUsage(
      usageId,
      USAGE_PATHS.SUMMARY.NOTES_TOTAL,
      1
    );
  }

  /**
   *  Delete Note
   */
  async decrementNoteUsage(usageId) {
    // Passamos -1 para o incrementUsage
    return await this.incrementUsage(
      usageId,
      USAGE_PATHS.SUMMARY.NOTES_TOTAL,
      -1
    );
  }

  /**
   * Incrementa o total de projetos criados
   */
  async consumeProjectCreation(usageId) {
    return await this.incrementUsage(
      usageId,
      USAGE_PATHS.SUMMARY.PROJECTS_TOTAL,
      1
    );
  }

  /**
   * Incrementa uso de IA (mensagens e opcionalmente tokens)
   */
  async consumeAiMessage(usageId, tokens = 0) {
    await this.incrementUsage(
      usageId,
      USAGE_PATHS.MONTHLY.WEAVE_AI.MESSAGES_SENT,
      1
    );
    if (tokens > 0) {
      await this.incrementUsage(
        usageId,
        USAGE_PATHS.MONTHLY.WEAVE_AI.TOKENS_ESTIMATED,
        tokens
      );
    }
  }

  /**
   * Incrementa uso de storage (arquivos e MB)
   */
  async consumeStorage(usageId, fileSizeMb) {
    await this.incrementUsage(
      usageId,
      USAGE_PATHS.MONTHLY.STORAGE.FILES_COUNT,
      1
    );
    return await this.incrementUsage(
      usageId,
      USAGE_PATHS.MONTHLY.STORAGE.TOTAL_UPLOADED_MB,
      fileSizeMb
    );
  }

  /**
   * Incrementa contadores de exportação
   */
  async consumeExport(usageId, type = "notes") {
    const path =
      type === "backup"
        ? USAGE_PATHS.MONTHLY.EXPORTS.BACKUPS_COUNT
        : USAGE_PATHS.MONTHLY.EXPORTS.NOTES_COUNT;
    return await this.incrementUsage(usageId, path, 1);
  }

  // ==========================================
  // LÓGICA INTERNA E HELPERS
  // ==========================================

  async incrementUsage(usageId, dotPath, amount = 1) {
    const pgPath = `{${dotPath.replace(/\./g, ",")}}`;
    return await PlansRepository.incrementUsageCounter(usageId, pgPath, amount);
  }

  // No PlanUsageManager.js

  async resetMonthlyCycle(usageRecord) {
    const oldDetails = usageRecord.usage_details;
    const periodStart = this.getNestedValue(
      oldDetails,
      USAGE_PATHS.MONTHLY.PERIOD_START
    );
    const periodEnd = this.getNestedValue(
      oldDetails,
      USAGE_PATHS.MONTHLY.PERIOD_END
    );

    // 1. SALVAR SNAPSHOT NO HISTÓRICO com agregações
    await PlansRepository.saveUsageHistory({
      plan_usage_id: usageRecord.id,
      user_id: usageRecord.user_id,
      organization_id: usageRecord.organization_id,
      plan_id: usageRecord.plan_id,
      period_start: periodStart,
      period_end: periodEnd,
      final_usage_details: oldDetails,
      // Agregações denormalizadas para queries rápidas
      total_notes_created:
        this.getNestedValue(oldDetails, USAGE_PATHS.SUMMARY.NOTES_TOTAL) || 0,
      total_projects_created:
        this.getNestedValue(oldDetails, USAGE_PATHS.SUMMARY.PROJECTS_TOTAL) ||
        0,
      total_ai_messages:
        this.getNestedValue(
          oldDetails,
          USAGE_PATHS.MONTHLY.WEAVE_AI.MESSAGES_SENT
        ) || 0,
      total_storage_mb:
        this.getNestedValue(
          oldDetails,
          USAGE_PATHS.MONTHLY.STORAGE.TOTAL_UPLOADED_MB
        ) || 0,
      total_exports:
        (this.getNestedValue(
          oldDetails,
          USAGE_PATHS.MONTHLY.EXPORTS.NOTES_COUNT
        ) || 0) +
        (this.getNestedValue(
          oldDetails,
          USAGE_PATHS.MONTHLY.EXPORTS.BACKUPS_COUNT
        ) || 0),
    });

    // 2. ATUALIZAR LIFETIME STATS
    await this._updateLifetimeStats(usageRecord.id, oldDetails);

    // 3. PREPARAR NOVOS DADOS
    const newStartDate = new Date();
    const newEndDate = new Date();
    newEndDate.setMonth(newEndDate.getMonth() + 1);

    const updatedDetails = {
      ...oldDetails,
      monthly_cycle: {
        current_period_start: newStartDate.toISOString(),
        current_period_end: newEndDate.toISOString(),
        exports: { notes_count: 0, backups_count: 0 },
        storage: { total_uploaded_mb: 0, files_count: 0 },
        weave_ai: { messages_sent: 0, tokens_estimated: 0 },
      },
    };

    // 4. ATUALIZAR TABELA PRINCIPAL (Resetando e atualizando last_reset_at)
    const result = await PlansRepository.updateFullUsage(
      usageRecord.id,
      updatedDetails,
      newStartDate
    );

    return result.usage_details;
  }

  /**
   * Atualiza estatísticas de lifetime
   */
  async _updateLifetimeStats(usageId, monthDetails) {
    const notesCount =
      this.getNestedValue(monthDetails, USAGE_PATHS.SUMMARY.NOTES_TOTAL) || 0;
    const projectsCount =
      this.getNestedValue(monthDetails, USAGE_PATHS.SUMMARY.PROJECTS_TOTAL) ||
      0;
    const aiMessages =
      this.getNestedValue(
        monthDetails,
        USAGE_PATHS.MONTHLY.WEAVE_AI.MESSAGES_SENT
      ) || 0;
    const storageMb =
      this.getNestedValue(
        monthDetails,
        USAGE_PATHS.MONTHLY.STORAGE.TOTAL_UPLOADED_MB
      ) || 0;

    return await PlansRepository.updateLifetimeStats(usageId, {
      notes: notesCount,
      projects: projectsCount,
      ai_messages: aiMessages,
      storage_mb: storageMb,
    });
  }

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
    const user = await PlansRepository.getUserWithPlan(userId);
    if (!user) return null;

    let planId = user.plan_id;
    if (!planId) {
      const starter = await PlansRepository.getPlanByName("starter");
      planId = starter?.plan_id;
    }
    if (!planId) return null;

    if (!user.plan_id) {
      await executeQuery(
        `UPDATE users SET plan_id = $1 WHERE user_id = $2 AND plan_id IS NULL`,
        [planId, userId]
      );
    }

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
      orgId
    );
  }

  getNestedValue(obj, path) {
    return path.split(".").reduce((acc, part) => acc && acc[part], obj);
  }
}

module.exports = new PlanUsageManager();
