const BaseRepository = require("./base.repository");
const { prisma } = require("@theweave/database");

class OnboardingRepository extends BaseRepository {
  /**
   * Updates the onboarding state of a user preserving the completed_steps array
   * @param {string} userId
   * @param {string} stepName
   * @param {string} stepKeyToAppend
   * @param {import('@prisma/client').PrismaClient} client
   */
  async appendOnboardingStep(userId, stepName, stepKeyToAppend, client = prisma) {
    const stepValue = `"${stepName}"`;
    const appendValue = `["${stepKeyToAppend}"]`;

    return await client.$executeRaw`
      UPDATE users 
      SET onboarding_state = jsonb_set(
          jsonb_set(COALESCE(onboarding_state, '{}'::jsonb), '{step}', ${stepValue}::jsonb),
          '{completed_steps}', (COALESCE(onboarding_state->'completed_steps', '[]'::jsonb) - ${stepKeyToAppend}::text) || ${appendValue}::jsonb
      )
      WHERE user_id = ${userId}
    `;
  }

  /**
   * Overwrites the entire onboarding state
   * @param {string} userId
   * @param {Object} state
   * @param {import('@prisma/client').PrismaClient} client
   */
  async setOnboardingState(userId, state, client = prisma) {
    return await client.users.update({
      data: { onboarding_state: state },
      where: { user_id: userId },
    });
  }

  /**
   * Updates basic profile fields for the user
   */
  async updateProfile(userId, { name, username, timezone }, client = prisma) {
    return await client.users.update({
      data: {
        name,
        timezone: timezone || null,
        username,
      },
      where: { user_id: userId },
    });
  }

  /**
   * Finds a pending invite in workspace_members
   */
  async findPendingInvite(inviteToken, client = prisma) {
    return await client.workspace_members.findFirst({
      select: { id: true, role_id: true, workspace_id: true },
      where: { user_id: inviteToken },
    });
  }

  /**
   * Transfers a pending invite to the actual authenticated user and deletes the dummy user
   */
  async claimInvite(pendingMemberId, newUserId, inviteToken, client = prisma) {
    await client.workspace_members.update({
      data: { status: "ACTIVE", user_id: newUserId },
      where: { id: pendingMemberId },
    });

    await client.users.deleteMany({
      where: {
        status: "PENDING_INVITE",
        user_id: inviteToken,
      },
    });
  }

  /**
   * Activates an invite if the user was already authenticated during invite creation
   */
  async activateInvite(pendingMemberId, client = prisma) {
    await client.workspace_members.update({
      data: { status: "ACTIVE" },
      where: { id: pendingMemberId },
    });
  }
}

module.exports = new OnboardingRepository();
