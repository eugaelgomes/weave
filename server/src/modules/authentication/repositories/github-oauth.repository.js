const BaseRepository = require("./base.repository");
const PlansRepository = require("@/modules/plans/plans.repository");

/**
 * Persistência relacionada ao fluxo GitHub OAuth.
 */
class GithubOauthRepository extends BaseRepository {
  /**
   * @param {string} githubId
   * @returns {Promise<import('@/types/models').User | null>}
   */
  async findUserByGithubId(githubId) {
    const query = `
      SELECT
        u.user_id, u.username, u.name, u.email, u.password,
        u.avatar_url, u.auth_with_google, u.theme_mode,
        u.private_profile, u.plan_id, u.created_at,

        (SELECT p.name FROM plans p WHERE p.plan_id = u.plan_id) AS plan_name,

        (
          SELECT row_to_json(org_data)
          FROM (
            SELECT om.organization_id AS org_id, om.role AS org_member_role, o.unique_name AS org_unique_name, o.org_name
            FROM organization_members om
            JOIN organizations o ON o.id = om.organization_id
            WHERE om.user_id = u.user_id
              AND om.area_id IS NULL
              AND om.deleted = false
            ORDER BY om.created_at DESC LIMIT 1
          ) org_data
        ) AS organization,

        (
          SELECT row_to_json(area_data)
          FROM (
            SELECT
              oam.area_id AS org_default_area_id, oam.role AS org_default_area_role,
              oam.created_at AS org_default_area_member_since, oa.area_name AS org_default_area_name,
              oa.slug AS org_default_area_slug, oa.description AS org_default_area_description,
              oa.properties AS org_default_area_properties
            FROM organization_members oam
            JOIN organization_areas oa ON oa.id = oam.area_id
            WHERE oam.user_id = u.user_id AND oam.deleted = false AND oa.deleted = false
              AND oam.area_id IS NOT NULL
              AND oam.organization_id = (
                  SELECT organization_id FROM organization_members
                  WHERE user_id = u.user_id
                    AND area_id IS NULL
                    AND deleted = false
                  ORDER BY created_at DESC
                  LIMIT 1
              )
            ORDER BY oam.created_at ASC LIMIT 1
          ) area_data
        ) AS default_area

      FROM users u
      WHERE u.github_id = $1 AND u.deleted = false
      LIMIT 1;
    `;
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
      SET github_id = $1, auth_with_github = true, email_verified = true, email_verified_at = COALESCE(email_verified_at, NOW()), avatar_url = COALESCE($2, avatar_url), updated_at = NOW() 
      WHERE user_id = $3
      RETURNING *
    `;
    const results = await this.executeQuery(query, [
      githubId,
      avatarUrl,
      userId,
    ]);
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
    const query = `
      INSERT INTO users (
        github_id, name, username, email, avatar_url, password,
        auth_with_github, email_verified, email_verified_at, created_at, updated_at, plan_id
      ) 
      VALUES (
        $1, $2, $3, $4, $5, '', true, true, NOW(), NOW(), NOW(),
        $6
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
    ]);
    return results[0];
  }
}

module.exports = new GithubOauthRepository();
