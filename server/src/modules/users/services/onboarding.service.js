const { prisma } = require("@theweave/database");
const SearchUsersRepository = require("@/modules/users/repositories/users.repository");
const WorkspacesRepository = require("@/modules/workspaces/repositories/base.repository");
const PlansRepository = require("@/modules/plans/repositories/plans.repository");
const OnboardingRepository = require("../repositories/onboarding.repository");
const { normalizeAppPreferences } = require("@/modules/users/utils/normalize");
const { AppError, ERROR_CODES } = require("@/errors");

const isWorkspaceUniqueNameConflict = (error) =>
  error?.code === "P2002" &&
  (error?.meta?.target?.includes?.("unique_name") || error?.message?.includes("unique_name"));

class OnboardingService {
  /**
   * Processes the first onboarding step (Profile Setup)
   */
  async processProfileStep(userId, profileData) {
    const { name, username, timezone, theme_mode, usage_preference } = profileData;

    // Check if user already accepted terms; if not, automatically record terms acceptance
    const user = await SearchUsersRepository.findById(userId);
    const completedSteps = user.onboarding_state?.completed_steps || [];

    if (!completedSteps.includes("terms")) {
      await OnboardingRepository.appendOnboardingStep(userId, "TERMS_ACCEPTED", "terms");
    }

    return await prisma.$transaction(async (client) => {
      const profileUpdates = {};

      if (typeof name === "string" && name.trim()) {
        profileUpdates.name = name.trim();
      }

      if (typeof username === "string" && username.trim()) {
        const isUnique = await SearchUsersRepository.checkUniqueAvailability(
          { username },
          { excludeUserId: userId },
          client
        );

        if (!isUnique.username.available) {
          throw new Error("Username is not available");
        }

        profileUpdates.username = username.trim().toLowerCase();
      }

      if (typeof timezone === "string" && timezone.trim()) {
        profileUpdates.timezone = timezone.trim();
      }

      if (theme_mode) {
        profileUpdates.theme_mode = theme_mode;
      }

      if (usage_preference) {
        profileUpdates.user_preference = normalizeAppPreferences({
          ...user.user_preference,
          language: {
            ...user.user_preference?.language,
            ...usage_preference.language,
          },
        });
      }

      if (Object.keys(profileUpdates).length > 0) {
        await OnboardingRepository.updateProfile(userId, profileUpdates, client);
      }

      // 3. Update onboarding status preserving completed_steps
      await OnboardingRepository.appendOnboardingStep(
        userId,
        "PROFILE_CONFIGURED",
        "profile",
        client
      );

      // If user already belongs to a workspace (e.g. from an invite), complete workspace and onboarding
      if (user.workspace_id || completedSteps.includes("workspace")) {
        await OnboardingRepository.appendOnboardingStep(
          userId,
          "WORKSPACE_CONFIGURED",
          "workspace",
          client
        );
        await OnboardingRepository.appendOnboardingStep(userId, "COMPLETED", "intro", client);
      }

      return { success: true };
    });
  }

  /**
   * Processes the second onboarding step (Workspace Setup)
   */
  async processWorkspaceStep(userId, workspaceData) {
    const { workspace_name, unique_name, invite_token } = workspaceData;

    try {
      return await prisma.$transaction(async (client) => {
        let workspaceIdToJoin = null;

        if (invite_token) {
          // 1. Consume the invite
          const pendingMember = await OnboardingRepository.findPendingInvite(invite_token, client);

          if (!pendingMember) {
            throw new Error("Invalid or expired invite token.");
          }

          workspaceIdToJoin = pendingMember.workspace_id;

          // Transfer the membership to the actual authenticated user
          if (invite_token !== userId) {
            await OnboardingRepository.claimInvite(pendingMember.id, userId, invite_token, client);
          } else {
            // If for some reason the invite_token is already the current user's ID
            await OnboardingRepository.activateInvite(pendingMember.id, client);
          }

          const currentUser = await client.users.findUnique({
            select: { plan_id: true, workspace_id: true },
            where: { user_id: userId },
          });

          const defaultPlanId =
            currentUser?.plan_id || (await PlansRepository.getDefaultSignupPlanId(client));

          await client.users.update({
            data: {
              email_verified: true,
              email_verified_at: new Date(),
              plan_id: defaultPlanId,
              workspace_id: workspaceIdToJoin,
            },
            where: { user_id: userId },
          });
        } else {
          const existingWorkspace = await client.workspaces.findUnique({
            select: { id: true },
            where: { unique_name },
          });

          if (existingWorkspace) {
            throw AppError.conflict(
              "This workspace identifier is already in use.",
              ERROR_CODES.WORKSPACE_UNIQUE_CONFLICT,
              { field: "unique_name" }
            );
          }

          // 1. Create workspace (this also creates settings, default team, and adds member as admin)
          const workspace = await WorkspacesRepository.createWorkspaces(
            userId,
            workspace_name,
            unique_name,
            null,
            null,
            null,
            null,
            client
          );
          workspaceIdToJoin = workspace.id;
        }

        // 5. Update onboarding status preserving completed_steps
        await OnboardingRepository.appendOnboardingStep(
          userId,
          "WORKSPACE_CONFIGURED",
          "workspace",
          client
        );

        // Workspace setup is the final user-facing onboarding step.
        await OnboardingRepository.appendOnboardingStep(userId, "COMPLETED", "intro", client);

        return { workspaceId: workspaceIdToJoin };
      });
    } catch (error) {
      if (isWorkspaceUniqueNameConflict(error)) {
        throw AppError.conflict(
          "This workspace identifier is already in use.",
          ERROR_CODES.WORKSPACE_UNIQUE_CONFLICT,
          { field: "unique_name" }
        );
      }
      throw error;
    }
  }

  /** Completes the onboarding flow. */
  async completeOnboarding(userId) {
    await prisma.$transaction(async (client) => {
      await OnboardingRepository.appendOnboardingStep(
        userId,
        "WORKSPACE_CONFIGURED",
        "workspace",
        client
      );
      await OnboardingRepository.appendOnboardingStep(userId, "COMPLETED", "intro", client);
    });
    return { message: "Onboarding finalized", success: true };
  }
}

module.exports = new OnboardingService();
