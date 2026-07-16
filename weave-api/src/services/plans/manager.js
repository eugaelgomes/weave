const PlansRepository = require("@/modules/plans/repositories/plans.repository");

const { USAGE_PATHS } = require("@/services/plans/plan-paths");

class PlansManager {
  /**
   * Strips internal/sensitive fields from plan details for unauthenticated responses.
   * @param {Record<string, any>} details
   * @returns {Record<string, any>}
   */
  _sanitizePlanForPublic(details) {
    if (!details || typeof details !== "object") return {};
    // eslint-disable-next-line no-unused-vars
    const { billing, governance, weave_ai, ...publicFields } = details;
    return publicFields;
  }

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
          createdAt: plan.created_at,
          details: this._sanitizePlanForPublic(plan.details),
          name: plan.name,
          planId: plan.plan_id,
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
   * Atualiza metadados gerais (Ex: data da ultima atividade)
   */
  async updateLastActivity(usageId) {
    return await PlansRepository.updateJsonValue(
      usageId,
      this.toPgPath(USAGE_PATHS.HISTORY.LAST_ACTIVITY),
      new Date().toISOString()
    );
  }

  /**
   * Padrao de plano ao criar novo user
   */
  async setDefaultPlanForNewUser(userId) {
    const user = await PlansRepository.getUserAndPlan(userId);
    if (!user) {
      throw new Error("User not found.");
    }
    if (user.plan_id) {
      return user;
    }

    const defaultPlanId = await PlansRepository.getDefaultSignupPlanId();
    if (!defaultPlanId) {
      throw new Error("Default signup plan not found.");
    }

    return await PlansRepository.assignPlanToUser(userId, defaultPlanId);
  }
}

module.exports = new PlansManager();
