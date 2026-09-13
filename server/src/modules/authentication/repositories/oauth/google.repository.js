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
    // `users.username` is varchar(50). Reserve room for the timestamp so a
    // long email local-part cannot remove the uniqueness suffix.
    const username = `${email.split("@")[0].slice(0, 36)}_${Date.now()}`;
    const planId = await PlansRepository.getDefaultSignupPlanId();
    const publicUserId = generatePublicId();

    const query = `
      INSERT INTO users (
        google_id, name, email, username, auth_with_google, avatar_url,
        password, email_verified, email_verified_at, plan_id, public_user_id,
        onboarding_state
      )
      VALUES (
        $1, $2, $3, $4, true, $5, '', true, NOW(),
        $6, $7,
        '{"step": "TERMS_ACCEPTED", "completed_steps": ["terms"], "terms_version": "v1"}'::jsonb
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
    const user = results[0];
    if (user && planId) {
      // The account already received its plan in the INSERT above. A failure to
      // create the auxiliary subscription record (for example, while a legacy
      // database migration is pending) must not make the OAuth login fail.
      try {
        await PlansRepository.assignPlanToUser(user.user_id, planId);
      } catch (error) {
        console.error("Google OAuth user subscription initialization failed:", {
          code: error.code || null,
          message: error.message,
          userId: user.user_id,
        });
      }
    }
    return user;
  }

  /**
   * @param {string} userId
   * @param {string} googleId
   * @param {string|null} [avatarUrl=null]
   * @param {string|null} [name=null]
   * @returns {Promise<import('@/types/models').User>}
   */
  async updateUserWithGoogle(userId, googleId, avatarUrl = null, name = null) {
    const query = `
      UPDATE users
      SET google_id = $1,
          auth_with_google = true,
          email_verified = true,
          email_verified_at = COALESCE(email_verified_at, NOW()),
          avatar_url = COALESCE($2, avatar_url),
          name = COALESCE(NULLIF(name, ''), $3),
          status = 'ACTIVE',
          updated_at = NOW(),
          onboarding_state = CASE
            WHEN onboarding_state IS NULL OR onboarding_state = '{}'::jsonb THEN
              jsonb_build_object(
                'step', 'TERMS_ACCEPTED',
                'completed_steps', CASE WHEN workspace_id IS NOT NULL THEN '["terms", "workspace"]'::jsonb ELSE '["terms"]'::jsonb END,
                'terms_version', 'v1'
              )
            WHEN NOT (COALESCE(onboarding_state->'completed_steps', '[]'::jsonb) ? 'terms') THEN
              jsonb_set(
                onboarding_state,
                '{completed_steps}',
                COALESCE(onboarding_state->'completed_steps', '[]'::jsonb) || '["terms"]'::jsonb
              )
            ELSE onboarding_state
          END
      WHERE user_id = $4
      RETURNING user_id, username, name, email, avatar_url, auth_with_google, created_at;
    `;
    const results = await this.executeQuery(query, [googleId, avatarUrl, name, userId]);
    return results[0];
  }
}

module.exports = new GoogleOauthRepository();
