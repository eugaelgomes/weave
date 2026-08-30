const BaseRepository = require("../base.repository");
const PlansRepository = require("@/modules/plans/repositories/plans.repository");
const { generatePublicId } = require("@/utils/formatters.util");
const { buildUserWithContextQuery } = require("../_shared/user-with-context.query");

/**
 * Persistence related to the Google OAuth flow.
 */
class GoogleOauthRepository extends BaseRepository {
  /**
   * @param {string} googleId
   * @returns {Promise<import('@/types/models').User | null>}
   */
  async findUserByGoogleId(googleId) {
    const query = buildUserWithContextQuery("u.google_id = $1");
    const results = await this.executeQuery(query, [googleId]);
    return results[0];
  }

  /**
   * @param {string} googleId
   * @param {string} name
   * @param {string} email
   * @param {string|null} [avatarUrl=null]
   * @returns {Promise<import('@/types/models').User>}
   */
  async createUserWithGoogle(googleId, name, email, avatarUrl = null) {
    const rawUsername = `${email.split("@")[0]}_${Date.now()}`;
    const username = rawUsername.slice(0, 80);
    const planId = await PlansRepository.getDefaultSignupPlanId();
    const publicUserId = generatePublicId();

    const query = `
      INSERT INTO users (
        google_id, name, email, username, auth_with_google, avatar_url,
        password, email_verified, email_verified_at, plan_id, public_user_id
      )
      VALUES (
        $1, $2, $3, $4, true, $5, '', true, NOW(),
        $6, $7
      )
      RETURNING user_id, public_user_id, username, name, email, avatar_url, auth_with_google, created_at;
    `;

    const results = await this.executeQuery(query, [
      googleId,
      name,
      email,
      username,
      avatarUrl,
      planId,
      publicUserId,
    ]);
    return results[0];
  }

  /**
   * @param {string} userId
   * @param {string} googleId
   * @param {string|null} [avatarUrl=null]
   * @returns {Promise<import('@/types/models').User>}
   */
  async updateUserWithGoogle(userId, googleId, avatarUrl = null) {
    const query = `
      UPDATE users
      SET google_id = $1, auth_with_google = true, avatar_url = COALESCE($2, avatar_url), status = 'ACTIVE'
      WHERE user_id = $3
      RETURNING user_id, username, name, email, avatar_url, auth_with_google, created_at;
    `;
    const results = await this.executeQuery(query, [googleId, avatarUrl, userId]);
    return results[0];
  }
}

module.exports = new GoogleOauthRepository();
