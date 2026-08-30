const BaseRepository = require("../base.repository");
const PlansRepository = require("@/modules/plans/repositories/plans.repository");
const { generatePublicId } = require("@/utils/formatters.util");
const { buildUserWithContextQuery } = require("../_shared/user-with-context.query");

/**
 * Persistence for Microsoft OAuth flow.
 */
class MicrosoftOauthRepository extends BaseRepository {
  /**
   * @param {string} microsoftId
   * @returns {Promise<import('@/types/models').User | null>}
   */
  async findUserByMicrosoftId(microsoftId) {
    const query = buildUserWithContextQuery("u.microsoft_id = $1");
    const results = await this.executeQuery(query, [microsoftId]);
    return results[0];
  }

  /**
   * @param {string} microsoftId
   * @param {string} name
   * @param {string} email
   * @returns {Promise<import('@/types/models').User>}
   */
  async createUserWithMicrosoft(microsoftId, name, email) {
    const rawUsername = `${email.split("@")[0]}_${Date.now()}`;
    const username = rawUsername.slice(0, 80);
    const planId = await PlansRepository.getDefaultSignupPlanId();
    const publicUserId = generatePublicId();

    const query = `
      INSERT INTO users (
        microsoft_id, name, email, username, auth_with_microsoft,
        password, email_verified, email_verified_at, plan_id, public_user_id
      )
      VALUES (
        $1, $2, $3, $4, true,
        '', true, NOW(), $5, $6
      )
      RETURNING user_id, public_user_id, username, name, email, auth_with_microsoft, created_at;
    `;

    const results = await this.executeQuery(query, [
      microsoftId,
      name,
      email,
      username,
      planId,
      publicUserId,
    ]);
    return results[0];
  }

  /**
   * @param {string} userId
   * @param {string} microsoftId
   * @returns {Promise<import('@/types/models').User>}
   */
  async updateUserWithMicrosoft(userId, microsoftId) {
    const query = `
      UPDATE users
      SET microsoft_id = $1, auth_with_microsoft = true, email_verified = true, email_verified_at = COALESCE(email_verified_at, NOW()), status = 'ACTIVE', updated_at = NOW()
      WHERE user_id = $2
      RETURNING user_id, username, name, email, auth_with_microsoft, created_at;
    `;
    const results = await this.executeQuery(query, [microsoftId, userId]);
    return results[0];
  }
}

module.exports = new MicrosoftOauthRepository();
