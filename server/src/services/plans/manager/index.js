const PlansRepository = require("@/modules/plans/plans.repository");

const { USAGE_PATHS } = require("@/services/plans/plan-paths");

class PlansManager {
  async getAllPlans(req, res) {
    try {
      const plans = await PlansRepository.getAllPlans();

      if (!plans || plans.length === 0) {
        return res.status(404).json({ message: "No plans found." });
      }
      if (plans instanceof Error) {
        return res.status(500).json({ message: "Error retrieving plans." });
      }

      return res.status(200).json({
        plans: plans.map((plan) => ({
          planId: plan.plan_id,
          name: plan.name,
          details: plan.details || [],
          createdAt: plan.created_at,
          updatedAt: plan.updated_at,
        })),
      });
    } catch (error) {
      console.error("Error in getAllPlans:", error);
      return res.status(500).json({ message: "Internal server error." });
    }
  }

  /**
   * Helper central para converter Dot Notation ("a.b") em Postgres Path ("{a,b}")
   */
  toPgPath(dotPath) {
    return `{${dotPath.replace(/\./g, ",")}}`;
  }

  /**
   * MÉTODOS DE CONSUMO ESPECÍFICOS
   */

  // Consumir Mensagem de IA
  async consumeAiMessage(usageId, tokens = 0) {
    // Incrementa contador de mensagens
    await PlansRepository.incrementUsageCounter(
      usageId,
      this.toPgPath(USAGE_PATHS.MONTHLY.WEAVE_AI.MESSAGES_SENT),
      1
    );
    // Incrementa tokens (opcional)
    if (tokens > 0) {
      await PlansRepository.incrementUsageCounter(
        usageId,
        this.toPgPath(USAGE_PATHS.MONTHLY.WEAVE_AI.TOKENS_ESTIMATED),
        tokens
      );
    }
  }

  // Consumir Criação de Nota
  async consumeNoteCreation(usageId) {
    return await PlansRepository.incrementUsageCounter(
      usageId,
      this.toPgPath(USAGE_PATHS.SUMMARY.NOTES_TOTAL),
      1
    );
  }

  // Registrar Upload de Arquivo (Soma o tamanho em MB)
  async consumeStorage(usageId, fileSizeMb) {
    // Incrementa o contador de arquivos
    await PlansRepository.incrementUsageCounter(
      usageId,
      this.toPgPath(USAGE_PATHS.MONTHLY.STORAGE.FILES_COUNT),
      1
    );
    // Soma o peso do arquivo ao total do mês
    return await PlansRepository.incrementUsageCounter(
      usageId,
      this.toPgPath(USAGE_PATHS.MONTHLY.STORAGE.TOTAL_UPLOADED_MB),
      fileSizeMb
    );
  }

  // Consumir Exportação
  async consumeExport(usageId, type = "notes") {
    const path =
      type === "backup"
        ? USAGE_PATHS.MONTHLY.EXPORTS.BACKUPS_COUNT
        : USAGE_PATHS.MONTHLY.EXPORTS.NOTES_COUNT;

    return await PlansRepository.incrementUsageCounter(
      usageId,
      this.toPgPath(path),
      1
    );
  }

  /**
   * Atualiza metadados gerais (Ex: data da última atividade)
   */
  async updateLastActivity(usageId) {
    return await PlansRepository.updateJsonValue(
      usageId,
      this.toPgPath(USAGE_PATHS.HISTORY.LAST_ACTIVITY),
      new Date().toISOString()
    );
  }

  /**
   *  Padrão de plano ao criar novo user
   */
  async setDefaultPlanForNewUser(userId) {
    const planId = "afbee06b-18c8-4a15-972c-b94eccf763ec";
    if (!planId) {
      throw new Error("Default plan not found.");
    }
    return await PlansRepository.assignPlanToUser(userId, planId);
  }
}

module.exports = new PlansManager();
