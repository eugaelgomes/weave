const { AppError } = require("@/errors");
const UsersRepository = require("@/modules/users/repositories/search-users.repository");

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

    // If onboarding state is defined but not COMPLETED, block access
    if (onboardingState && onboardingState.step !== "COMPLETED") {
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
