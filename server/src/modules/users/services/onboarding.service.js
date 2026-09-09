const { prisma } = require("@theweave/database");
const SearchUsersRepository = require("@/modules/users/repositories/users.repository");
const WorkspacesRepository = require("@/modules/workspaces/repositories/base.repository");
const OnboardingRepository = require("../repositories/onboarding.repository");
const queueController = require("@theweave/database");

class OnboardingService {
  /**
   * Processes the first onboarding step (Profile Setup)
   */
  async processProfileStep(userId, profileData) {
    const { name, username, timezone } = profileData;

    // Check if user already accepted terms
    const user = await SearchUsersRepository.findById(userId);
    const completedSteps = user.onboarding_state?.completed_steps || [];

    if (!completedSteps.includes("terms")) {
      throw new Error("TERMS_NOT_ACCEPTED");
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

      return { success: true };
    });
  }

  /**
   * Processes the second onboarding step (Workspace Setup)
   */
  async processWorkspaceStep(userId, workspaceData) {
    const { workspace_name, unique_name, invite_token } = workspaceData;

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
      } else {
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

      return { workspaceId: workspaceIdToJoin };
    });
  }

  /**
   * Completes the onboarding flow and dispatches welcome email
   */
  async completeOnboarding(userId) {
    await prisma.$transaction(async (client) => {
      await OnboardingRepository.appendOnboardingStep(userId, "COMPLETED", "intro", client);
    });

    const user = await SearchUsersRepository.findById(userId);

    // Dispatch welcome email
    if (user && user.email) {
      queueController
        .addJob("emails_queue", {
          email: user.email,
          type: "welcome_message",
          userName: user.name,
          username: user.username,
        })
        .catch((err) => console.error("Failed to enqueue welcome message:", err));
    }

    return { message: "Onboarding finalized", success: true };
  }
}

module.exports = new OnboardingService();
