const BaseRepository = require("./base.repository");
const { prisma } = require("@theweave/database");

/**
 * @typedef {Object} UpdateOnboardingProfileData
 * @property {string} name - User's full display name.
 * @property {string} username - User's unique handle.
 * @property {string} [timezone] - User's preferred timezone.
 */

/**
 * Repository responsible for user onboarding workflows, invite claims, and initial profile setups.
 */
class OnboardingRepository extends BaseRepository {
  /**
   * Updates the onboarding state of a user by appending a step to the completed_steps array atomically.
   *
   * @param {string} userId - Target user UUID.
   * @param {string} stepName - Current active step name.
   * @param {string} stepKeyToAppend - Completed step key to append to history.
   * @param {import('@prisma/client').PrismaClient | import('@prisma/client').Prisma.TransactionClient} [client=prisma] - Transaction or client instance.
   * @returns {Promise<number>} Number of affected database rows.
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
   * Overwrites the entire onboarding JSON state object for a user.
   *
   * @param {string} userId - Target user UUID.
   * @param {Record<string, any>} state - New onboarding state object.
   * @param {import('@prisma/client').PrismaClient | import('@prisma/client').Prisma.TransactionClient} [client=prisma] - Transaction or client instance.
   * @returns {Promise<import('@prisma/client').users>} Updated user record.
   */
  async setOnboardingState(userId, state, client = prisma) {
    return await client.users.update({
      data: { onboarding_state: state },
      where: { user_id: userId },
    });
  }

  /**
   * Updates basic profile details during the onboarding phase.
   *
   * @param {string} userId - Target user UUID.
   * @param {UpdateOnboardingProfileData} profileData - Profile fields to update.
   * @param {import('@prisma/client').PrismaClient | import('@prisma/client').Prisma.TransactionClient} [client=prisma] - Transaction or client instance.
   * @returns {Promise<import('@prisma/client').users>} Updated user record.
   */
  async updateProfile(userId, profileData, client = prisma) {
    const data = {};

    if (typeof profileData.name === "string") {
      data.name = profileData.name;
    }

    if (typeof profileData.username === "string") {
      data.username = profileData.username;
    }

    if (typeof profileData.timezone === "string") {
      data.timezone = profileData.timezone || null;
    }

    if (Object.keys(data).length === 0) {
      return await client.users.findUnique({ where: { user_id: userId } });
    }

    return await client.users.update({
      data,
      where: { user_id: userId },
    });
  }

  /**
   * Finds a pending workspace invitation linked to an invite token.
   *
   * @param {string} inviteToken - Invite token linked to the pending member.
   * @param {import('@prisma/client').PrismaClient | import('@prisma/client').Prisma.TransactionClient} [client=prisma] - Transaction or client instance.
   * @returns {Promise<{ id: string, role_id: string, workspace_id: string } | null>} Pending workspace member record or null.
   */
  async findPendingInvite(inviteToken, client = prisma) {
    return await client.workspace_members.findFirst({
      select: { id: true, role_id: true, workspace_id: true },
      where: { user_id: inviteToken },
    });
  }

  /**
   * Transfers a pending workspace invitation to the actual authenticated user and removes the temporary invite user.
   *
   * @param {string} pendingMemberId - ID of the workspace member row.
   * @param {string} newUserId - Authenticated user UUID claiming the invite.
   * @param {string} inviteToken - Original invite token user ID to clean up.
   * @param {import('@prisma/client').PrismaClient | import('@prisma/client').Prisma.TransactionClient} [client=prisma] - Transaction or client instance.
   * @returns {Promise<void>}
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
   * Activates a pending invitation when the user was already authenticated upon invitation creation.
   *
   * @param {string} pendingMemberId - ID of the workspace member record to activate.
   * @param {import('@prisma/client').PrismaClient | import('@prisma/client').Prisma.TransactionClient} [client=prisma] - Transaction or client instance.
   * @returns {Promise<void>}
   */
  async activateInvite(pendingMemberId, client = prisma) {
    await client.workspace_members.update({
      data: { status: "ACTIVE" },
      where: { id: pendingMemberId },
    });
  }
}

module.exports = new OnboardingRepository();
