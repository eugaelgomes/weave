const BaseRepository = require("../base.repository");
const PlansRepository = require("@/modules/plans/repositories/plans.repository");
const { generatePublicId } = require("@/utils/formatters.util");
const { buildUserWithContextQuery } = require("../_shared/user-with-context.query");

/**
 * Persistência relacionada ao fluxo GitHub OAuth.
 */
class GithubOauthRepository extends BaseRepository {
  /**
   * @param {string} githubId
   * @returns {Promise<import('@/types/models').User | null>}
   */
  async findUserByGithubId(githubId) {
    const query = buildUserWithContextQuery("u.github_id = $1");
    const results = await this.executeQuery(query, [githubId]);
    return results[0];
  }

  /**
   * @param {string} userId
   * @param {string} githubId
   * @param {string|null} avatarUrl
   * @param {string|null} [name=null]
   * @returns {Promise<import('@/types/models').User>}
   */
  async updateUserWithGithub(userId, githubId, avatarUrl, name = null) {
    const query = `
      UPDATE users 
      SET github_id = $1,
          auth_with_github = true,
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
      RETURNING *
    `;
    const results = await this.executeQuery(query, [githubId, avatarUrl, name, userId]);
    return results[0];
  }

  /**
   * @param {string} githubId
   * @param {string} name
   * @param {string} username
   * @param {string} email
   * @param {string|null} avatarUrl
   * @returns {Promise<import('@/types/models').User>}
   */
  async createUserWithGithub(githubId, name, username, email, avatarUrl) {
    const planId = await PlansRepository.getDefaultSignupPlanId();
    const publicUserId = generatePublicId();
    const query = `
      INSERT INTO users (
        github_id, name, username, email, avatar_url, password,
        auth_with_github, email_verified, email_verified_at, created_at, updated_at, plan_id, public_user_id,
        onboarding_state
      ) 
      VALUES (
        $1, $2, $3, $4, $5, '', true, true, NOW(), NOW(), NOW(),
        $6, $7,
        '{"step": "TERMS_ACCEPTED", "completed_steps": ["terms"], "terms_version": "v1"}'::jsonb
      ) 
      RETURNING *
    `;
    const results = await this.executeQuery(query, [
      githubId,
      name,
      username,
      email,
      avatarUrl,
      planId,
      publicUserId,
    ]);
    const user = results[0];
    if (user && planId) {
      await PlansRepository.assignPlanToUser(user.user_id, planId);
    }
    return user;
  }
}

module.exports = new GithubOauthRepository();
