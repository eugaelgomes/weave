const BaseRepository = require("./base.repository");
const PlansRepository = require("@/modules/plans/repositories/plans.repository");
const { generatePublicId } = require("@/utils/formatters.util");
const { buildUserWithContextQuery } = require("./_shared/user-with-context.query");

/**
 * General authentication repository (find user, SAML provisioning).
 */
class AuthRepository extends BaseRepository {
  /**
   * @param {string} email
   * @returns {Promise<import('@/types/models').User | null>}
   */
  async findUserByEmail(email) {
    const query = buildUserWithContextQuery("LOWER(u.email) = LOWER($1)");
    const results = await this.executeQuery(query, [email]);
    return results[0];
  }

  /**
   * Creates a user via JIT provisioning for SAML
   * @param {string} samlId - A unique identifier from the SAML profile (like nameID)
   * @param {string} name - User's display name
   * @param {string} email - User's email
   * @returns {Promise<import('@/types/models').User>}
   */
  async createUserWithSaml(samlId, name, email) {
    // `users.username` is varchar(50). Reserve room for the timestamp so a
    // long email local-part cannot remove the uniqueness suffix.
    const username = `${email.split("@")[0].slice(0, 36)}_${Date.now()}`;
    const planId = await PlansRepository.getDefaultSignupPlanId();
    const publicUserId = generatePublicId();

    const query = `
      INSERT INTO users (
        name, email, username,
        password, email_verified, email_verified_at, plan_id, public_user_id, auth_with_saml,
        onboarding_state
      )
      VALUES (
        $1, $2, $3,
        '', true, NOW(), $4, $5, true,
        '{"step": "TERMS_ACCEPTED", "completed_steps": ["terms"], "terms_version": "v1"}'::jsonb
      )
      RETURNING user_id, public_user_id, username, name, email, created_at;
    `;

    const results = await this.executeQuery(query, [name, email, username, planId, publicUserId]);
    const user = results[0];
    if (user && planId) {
      await PlansRepository.assignPlanToUser(user.user_id, planId);
    }
    return user;
  }

  /**
   * Updates an existing user (e.g. from a pending invite) when logging in with SAML
   * @param {string} userId - Target user ID
   * @param {string} samlId - SAML NameID
   * @param {string|null} [name=null] - User display name
   * @returns {Promise<import('@/types/models').User>}
   */
  async updateUserWithSaml(userId, samlId, name = null) {
    const query = `
      UPDATE users
      SET auth_with_saml = true,
          email_verified = true,
          email_verified_at = COALESCE(email_verified_at, NOW()),
          name = COALESCE(NULLIF(name, ''), $1),
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
      WHERE user_id = $2
      RETURNING user_id, username, name, email, auth_with_saml, created_at;
    `;
    const results = await this.executeQuery(query, [name, userId]);
    return results[0];
  }
}

module.exports = new AuthRepository();
