const BaseController = require("@/modules/workspaces/controllers/base-controller");
const OnboardingService = require("../services/onboarding.service");
const SearchUsersRepository = require("@/modules/users/repositories/users.repository");

class OnboardingController extends BaseController {
  /**
   * POST /api/v1/users/me/onboarding/step-1
   * Configures personal profile details
   */
  async submitStepOneProfile(req, res, next) {
    try {
      const { userId } = req.user;

      const user = await SearchUsersRepository.findById(userId);
      if (!user.email_verified) {
        return res.status(403).json({
          code: "EMAIL_NOT_VERIFIED",
          error: "Email verification is required before proceeding.",
        });
      }

      const result = await OnboardingService.processProfileStep(userId, req.body);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/users/me/onboarding/step-2
   * Configures workspace
   */
  async submitStepTwoWorkspace(req, res, next) {
    try {
      const { userId } = req.user;

      const user = await SearchUsersRepository.findById(userId);
      if (!user.email_verified) {
        return res.status(403).json({
          code: "EMAIL_NOT_VERIFIED",
          error: "Email verification is required before proceeding.",
        });
      }

      const result = await OnboardingService.processWorkspaceStep(userId, req.body);
      res.json({ data: result, success: true });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/users/me/onboarding/step-3-complete
   * Finalizes onboarding
   */
  async completeOnboarding(req, res, next) {
    try {
      const { userId } = req.user;

      const result = await OnboardingService.completeOnboarding(userId);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new OnboardingController();
