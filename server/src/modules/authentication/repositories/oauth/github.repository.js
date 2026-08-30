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
   * @returns {Promise<import('@/types/models').User>}
   */
  async updateUserWithGithub(userId, githubId, avatarUrl) {
    const query = `
      UPDATE users 
      SET github_id = $1, auth_with_github = true, email_verified = true, email_verified_at = COALESCE(email_verified_at, NOW()), avatar_url = COALESCE($2, avatar_url), status = 'ACTIVE', updated_at = NOW() 
      WHERE user_id = $3
      RETURNING *
    `;
    const results = await this.executeQuery(query, [githubId, avatarUrl, userId]);
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
        auth_with_github, email_verified, email_verified_at, created_at, updated_at, plan_id, public_user_id
      ) 
      VALUES (
        $1, $2, $3, $4, $5, '', true, true, NOW(), NOW(), NOW(),
        $6, $7
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
    return results[0];
  }
}

module.exports = new GithubOauthRepository();
