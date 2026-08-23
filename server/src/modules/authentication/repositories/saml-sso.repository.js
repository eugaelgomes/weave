const BaseRepository = require("./base.repository");
const PlansRepository = require("@/modules/plans/repositories/plans.repository");
const { generatePublicId } = require("@/utils/formatters.util");

/**
 * Persistence for SAML SSO flow.
 */
class SamlSsoRepository extends BaseRepository {
  /**
   * Creates a user via JIT provisioning for SAML
   * @param {string} samlId - A unique identifier from the SAML profile (like nameID)
   * @param {string} name - User's display name
   * @param {string} email - User's email
   * @returns {Promise<import('@/types/models').User>}
   */
  async createUserWithSaml(samlId, name, email) {
    const rawUsername = `${email.split("@")[0]}_${Date.now()}`;
    const username = rawUsername.slice(0, 80);
    const planId = await PlansRepository.getDefaultSignupPlanId();
    const publicUserId = generatePublicId();

    const query = `
      INSERT INTO users (
        name, email, username,
        password, email_verified, email_verified_at, plan_id, public_user_id, auth_with_saml
      )
      VALUES (
        $1, $2, $3,
        '', true, NOW(), $4, $5, true
      )
      RETURNING user_id, public_user_id, username, name, email, created_at;
    `;

    const results = await this.executeQuery(query, [name, email, username, planId, publicUserId]);

    return results[0];
  }
}

module.exports = new SamlSsoRepository();
