const { withTransaction } = require("@/database/connection");
const SearchUsersRepository = require("@/modules/users/repositories/search-users.repository");
const WorkspacesRepository = require("@/modules/workspaces/repositories/base.repository");
const TeamsRepository = require("@/modules/workspaces/repositories/teams.repository");
const OnboardingRepository = require("../repositories/onboarding.repository");
const queueController = require("@theweave/database");

class OnboardingService {
  /**
   * Processes the zero step (Terms Acceptance)
   */
  async processTermsStep(userId, termsData = {}) {
    return await withTransaction(async (client) => {
      const { ip, terms_version } = termsData;

      const metadata = JSON.stringify({
        terms_accepted_at: new Date().toISOString(),
        terms_ip: ip,
        terms_version: terms_version,
      });

      await OnboardingRepository.acceptTerms(userId, metadata, client);

      return { success: true };
    });
  }

  /**
   * Processes the first onboarding step (Profile Setup)
   */
  async processProfileStep(userId, profileData) {
    const { name, username, timezone } = profileData;

    return await withTransaction(async (client) => {
      // 1. Check username availability
      const isUnique = await SearchUsersRepository.checkUniqueAvailability(
        { username },
        { excludeUserId: userId },
        client
      );

      if (!isUnique.username.available) {
        throw new Error("Username is not available");
      }

      // 2. Update profile
      await OnboardingRepository.updateProfile(userId, { name, timezone, username }, client);

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
    const { workspace_name, unique_name, workspace_role, invite_token } = workspaceData;

    return await withTransaction(async (client) => {
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
        // 1. Create workspace
        const workspace = await WorkspacesRepository.createWorkspace(
          { uniqueName: unique_name, workspaceName: workspace_name },
          client
        );
        workspaceIdToJoin = workspace.id;

        // 2. Create workspace settings
        await WorkspacesRepository.createWorkspaceSettings(
          workspaceIdToJoin,
          { role: workspace_role || "general" },
          client
        );

        // 3. Create General team
        await TeamsRepository.createTeam(
          {
            createdBy: userId,
            slug: "general",
            teamName: "General",
            workspaceId: workspaceIdToJoin,
          },
          client
        );

        // 4. Add member as owner
        await WorkspacesRepository.addWorkspaceMember(workspaceIdToJoin, userId, "owner", client);
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
    await withTransaction(async (client) => {
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
