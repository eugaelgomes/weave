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
    // `users.username` is varchar(50). Reserve room for the timestamp so a
    // long email local-part cannot remove the uniqueness suffix.
    const username = `${email.split("@")[0].slice(0, 36)}_${Date.now()}`;
    const planId = await PlansRepository.getDefaultSignupPlanId();
    const publicUserId = generatePublicId();

    const query = `
      INSERT INTO users (
        microsoft_id, name, email, username, auth_with_microsoft,
        password, email_verified, email_verified_at, plan_id, public_user_id,
        onboarding_state
      )
      VALUES (
        $1, $2, $3, $4, true,
        '', true, NOW(), $5, $6,
        '{"step": "TERMS_ACCEPTED", "completed_steps": ["terms"], "terms_version": "v1"}'::jsonb
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
    const user = results[0];
    if (user && planId) {
      await PlansRepository.assignPlanToUser(user.user_id, planId);
    }
    return user;
  }

  /**
   * @param {string} userId
   * @param {string} microsoftId
   * @param {string|null} [name=null]
   * @returns {Promise<import('@/types/models').User>}
   */
  async updateUserWithMicrosoft(userId, microsoftId, name = null) {
    const query = `
      UPDATE users
      SET microsoft_id = $1,
          auth_with_microsoft = true,
          email_verified = true,
          email_verified_at = COALESCE(email_verified_at, NOW()),
          name = COALESCE(NULLIF(name, ''), $2),
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
      WHERE user_id = $3
      RETURNING user_id, username, name, email, auth_with_microsoft, created_at;
    `;
    const results = await this.executeQuery(query, [microsoftId, name, userId]);
    return results[0];
  }
}

module.exports = new MicrosoftOauthRepository();
