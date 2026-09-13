const { AppError } = require("@/errors");
const UsersRepository = require("@/modules/users/repositories/users.repository");

/**
 * Middleware that ensures a user has fully completed their onboarding process.
 * Rejects requests with 403 Forbidden if not.
 */
module.exports = async (req, res, next) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return next(AppError.unauthorized("Authentication required."));

    // Fetch user from DB to check current state
    const user = await UsersRepository.findById(userId);
    if (!user) return next(AppError.unauthorized("User not found."));

    const onboardingState = user.onboarding_state || {};
    const completedSteps = onboardingState.completed_steps || [];
    const hasProfile =
      completedSteps.includes("profile") ||
      Boolean(user.name && user.username) ||
      onboardingState.step === "STEP_1_COMPLETED" ||
      onboardingState.step === "STEP_2_COMPLETED";
    const hasWorkspace =
      completedSteps.includes("workspace") ||
      onboardingState.step === "STEP_2_COMPLETED" ||
      Boolean(req.user?.workspaceId);

    const isComplete = onboardingState.step === "COMPLETED" || (hasProfile && hasWorkspace);

    // If mandatory onboarding steps are not finished, block access
    if (!isComplete) {
      return next(
        AppError.forbidden(
          "Onboarding is incomplete. Please finish the initial setup steps.",
          "ONBOARDING_INCOMPLETE"
        )
      );
    }

    next();
  } catch (error) {
    next(error);
  }
};
