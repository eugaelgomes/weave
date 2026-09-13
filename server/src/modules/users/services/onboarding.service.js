const { prisma } = require("@theweave/database");
const SearchUsersRepository = require("@/modules/users/repositories/users.repository");
const WorkspacesRepository = require("@/modules/workspaces/repositories/base.repository");
const PlansRepository = require("@/modules/plans/repositories/plans.repository");
const WorkspaceMembersRepository = require("@/modules/workspaces/repositories/members.repository");
const OnboardingRepository = require("../repositories/onboarding.repository");
const { send_workspace_invite } = require("@/services/email/templates/invite-member");
const { getUserEmailLocale } = require("@/services/email/i18n");
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

      return { success: true };
    });
  }

  /**
   * Processes the second onboarding step (Workspace Setup)
   */
  async processWorkspaceStep(userId, workspaceData) {
    const {
      country,
      invite_token,
      language,
      unique_name,
      workspace_description,
      workspace_name,
      workspace_role,
      workspace_timezone,
    } = workspaceData;

    try {
      return await prisma.$transaction(async (client) => {
        let workspaceIdToJoin = null;
        let workspacePublicId = null;
        let joinedExistingWorkspace = false;

        if (invite_token) {
          joinedExistingWorkspace = true;
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
            workspace_description?.trim() || null,
            country?.trim().toUpperCase() || null,
            client
          );
          workspaceIdToJoin = workspace.id;
          workspacePublicId = workspace.public_id;

          await client.workspace_settings.update({
            data: {
              preferences: {
                language: language || "pt-BR",
                purpose: workspace_role || "team",
                role: workspace_role || "team",
                timezone: workspace_timezone || null,
              },
            },
            where: { workspace_id: workspace.id },
          });
        }

        // 5. Update onboarding status preserving completed_steps
        await OnboardingRepository.appendOnboardingStep(
          userId,
          "WORKSPACE_CONFIGURED",
          "workspace",
          client
        );

        if (joinedExistingWorkspace) {
          await OnboardingRepository.appendOnboardingStep(
            userId,
            "TEAMS_CONFIGURED",
            "teams",
            client
          );
          await OnboardingRepository.appendOnboardingStep(userId, "COMPLETED", "intro", client);
        }

        return { workspaceId: workspaceIdToJoin, workspacePublicId };
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

  /**
   * Processes the optional third onboarding step (teams and members).
   * The workspace is already provisioned in step two, so an empty payload simply completes onboarding.
   */
  async processTeamsStep(userId, setupData) {
    const teams = setupData?.teams || [];
    const members = setupData?.members || [];

    const result = await prisma.$transaction(async (client) => {
      const user = await client.users.findUnique({
        select: { email: true, name: true, username: true, workspace_id: true },
        where: { user_id: userId },
      });

      if (!user?.workspace_id) {
        throw AppError.badRequest("Create or join a workspace before setting up teams.");
      }

      const workspace = await client.workspaces.findUnique({
        select: { id: true, user_id: true, workspace_name: true },
        where: { id: user.workspace_id },
      });
      if (!workspace) throw AppError.notFound("Workspace not found.");
      if (workspace.user_id !== userId && (teams.length > 0 || members.length > 0)) {
        throw AppError.forbidden("Only the workspace owner can configure teams during onboarding.");
      }

      const createdTeams = [];
      const invitations = [];
      const usedSlugs = new Set(
        (
          await client.teams.findMany({
            select: { slug: true },
            where: { deleted: false, workspace_id: workspace.id },
          })
        ).map((team) => team.slug)
      );

      for (const team of teams) {
        const name = team.name.trim();
        const slugRoot =
          name
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-+|-+$/g, "")
            .slice(0, 50) || "team";
        let slug = slugRoot;
        let suffix = 2;
        while (usedSlugs.has(slug)) slug = `${slugRoot}-${suffix++}`;
        usedSlugs.add(slug);

        createdTeams.push(
          await client.teams.create({
            data: {
              created_by: userId,
              description: team.description?.trim() || null,
              name,
              properties: { onboarding: true },
              slug,
              workspace_id: workspace.id,
            },
          })
        );
      }

      if (members.length > 0) {
        const role =
          (await client.workspace_roles.findFirst({
            orderBy: { created_at: "asc" },
            where: { deleted: false, name: { not: "ADMIN" }, workspace_id: workspace.id },
          })) ||
          (await client.workspace_roles.findFirst({
            orderBy: { created_at: "asc" },
            where: { deleted: false, workspace_id: workspace.id },
          }));

        if (!role) throw AppError.badRequest("No workspace role is available for invitations.");

        for (const member of members) {
          const invite = await WorkspaceMembersRepository.createWorkspaceInvite(
            workspace.id,
            member.email.toLowerCase(),
            [role.id],
            userId,
            member.name.trim(),
            null,
            [],
            client
          );
          invitations.push({
            email: member.email.toLowerCase(),
            inviteId: invite.invite_id,
            roleName: role.name,
          });

          const assignedTeam =
            Number.isInteger(member.team_index) && member.team_index >= 0
              ? createdTeams[member.team_index]
              : null;
          if (assignedTeam) {
            await client.team_members.upsert({
              create: {
                added_by: userId,
                role_id: role.id,
                team_id: assignedTeam.id,
                user_id: invite.user_id,
              },
              update: { deleted: false, suspended: false, updated_at: new Date() },
              where: { team_id_user_id: { team_id: assignedTeam.id, user_id: invite.user_id } },
            });
          }
        }
      }

      await OnboardingRepository.appendOnboardingStep(userId, "TEAMS_CONFIGURED", "teams", client);
      await OnboardingRepository.appendOnboardingStep(userId, "COMPLETED", "intro", client);
      return {
        invitations,
        inviterName: user.name || user.username || user.email,
        membersInvited: members.length,
        teamsCreated: createdTeams.length,
        workspaceName: workspace.workspace_name,
      };
    });

    // The invitations are persisted before mail is sent, so a temporary mail-provider failure does
    // not undo the setup or leave the user blocked in onboarding.
    const inviterLocale = await getUserEmailLocale({ userId });
    await Promise.all(
      result.invitations.map((invite) =>
        send_workspace_invite(
          invite.email,
          result.workspaceName,
          result.inviterName,
          invite.inviteId,
          invite.roleName,
          inviterLocale
        )
      )
    );

    return { membersInvited: result.membersInvited, teamsCreated: result.teamsCreated };
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
      await OnboardingRepository.appendOnboardingStep(userId, "TEAMS_CONFIGURED", "teams", client);
      await OnboardingRepository.appendOnboardingStep(userId, "COMPLETED", "intro", client);
    });
    return { message: "Onboarding finalized", success: true };
  }
}

module.exports = new OnboardingService();
