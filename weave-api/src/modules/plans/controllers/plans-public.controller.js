const PlansService = require("../services/plans.service");

class PlansPublicController {
  /**
   * Retrieves all available subscription plans publicly.
   * Internal fields like billing or governance are sanitized.
   */
  async getAllPlans(req, res) {
    try {
      const plans = await PlansService.listAvailablePlans();

      if (!plans || plans.length === 0) {
        return res.status(404).json({ message: "No plans found." });
      }

      return res.status(200).json({ plans });
    } catch (error) {
      console.error("[PlansPublicController.getAllPlans]", error);
      return res.status(500).json({ message: "Internal server error" });
    }
  }
}

module.exports = new PlansPublicController();
