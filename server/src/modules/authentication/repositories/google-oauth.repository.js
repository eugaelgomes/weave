const BaseRepository = require("./base.repository");
const PlansRepository = require("@/modules/plans/repositories/plans.repository");
const { generatePublicId } = require("@/utils/generate-public-id");

/**
 * Persistence related to the Google OAuth flow.
 */
class GoogleOauthRepository extends BaseRepository {
  /**
   * @param {string} googleId
   * @returns {Promise<import('@/types/models').User | null>}
   */
  async findUserByGoogleId(googleId) {
    const query = `
      SELECT
        u.user_id, u.public_user_id, u.username, u.name, u.email, u.password,
        u.avatar_url, u.auth_with_google, u.auth_with_github, u.auth_with_microsoft, u.github_id, u.microsoft_id, u.theme_mode,
        u.private_profile, u.plan_id, u.created_at,
        
        (SELECT p.name FROM plans p WHERE p.plan_id = u.plan_id) AS plan_name,

        (
          SELECT row_to_json(org_data)
          FROM (
            SELECT om.organization_id AS org_id, om.role AS org_member_role, o.unique_name AS org_unique_name, o.public_id AS org_public_id, o.org_name
            FROM organization_members om
            JOIN organizations o ON o.id = om.organization_id
            WHERE om.user_id = u.user_id
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
            FROM organization_area_members oam
            JOIN organization_areas oa ON oa.id = oam.area_id
            WHERE oam.user_id = u.user_id AND oam.deleted = false AND oa.deleted = false
              AND oam.organization_id = (
                  SELECT organization_id FROM organization_members 
                  WHERE user_id = u.user_id
                    AND deleted = false
                  ORDER BY created_at DESC
                  LIMIT 1
              )
            ORDER BY oam.created_at ASC LIMIT 1
          ) area_data
        ) AS default_area

      FROM users u
      WHERE u.google_id = $1 AND u.deleted = false
      LIMIT 1;
    `;
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
