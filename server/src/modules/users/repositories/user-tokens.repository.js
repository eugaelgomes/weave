const BaseRepository = require("./base.repository");
const { executeQuery } = require("@/database/connection");

/**
 * `tokens` table operations for email verification/change and account activation.
 */
class UserTokensRepository extends BaseRepository {
  /**
   * @param {string|number} userId
   * @returns {Promise<import('pg').QueryResultRow[]>}
   */
  async deactivateOldEmailTokens(userId) {
    const query = `
      UPDATE tokens
      SET active = FALSE
      WHERE user_id = $1 AND active = TRUE AND type = 'EMAIL_VERIFICATION'
    `;
    return await executeQuery(query, [userId]);
  }

  /**
   * @param {string|number} userId
   * @param {string} token
   * @param {string} newEmail
   * @param {string} createdAt ISO string or Postgres timestamp
   * @returns {Promise<import('pg').QueryResultRow[]>}
   */
  async createEmailChangeToken(userId, token, newEmail, createdAt) {
    const query = `
      INSERT INTO tokens
        (user_id, token, type, expires_at, created_at, active, data_to_update) 
      VALUES 
        ($1, $2, 'EMAIL_VERIFICATION', ($3::timestamp + interval '1 hour'), $3, TRUE, $4);
    `;
    return await executeQuery(query, [
      userId,
      token,
      createdAt,
      JSON.stringify({ new_email: newEmail }),
    ]);
  }

  /**
   * @param {string|number} userId
   * @param {string} token
   * @returns {Promise<import('pg').QueryResultRow|undefined>}
   */
  async findEmailChangeToken(userId, token) {
    const query = `
      SELECT * FROM tokens 
      WHERE user_id = $1 AND token = $2 AND active = TRUE AND type = 'EMAIL_VERIFICATION' AND expires_at > NOW()
    `;
    const results = await executeQuery(query, [userId, token]);
    return results[0];
  }

  /**
   * @param {string|number} userId
   * @returns {Promise<unknown>}
   */
  async getDataToUpdate(userId) {
    const query = `
      SELECT data_to_update 
      FROM tokens 
      WHERE user_id = $1 AND active = TRUE AND type = 'EMAIL_VERIFICATION' AND expires_at > NOW()
    `;
    const results = await executeQuery(query, [userId]);
    return results[0]?.data_to_update;
  }

  /**
   * @param {string|number} userId
   * @returns {Promise<import('pg').QueryResultRow[]>}
   */
  async clearDataToUpdate(userId) {
    const query = `
      UPDATE tokens 
      SET data_to_update = NULL 
      WHERE user_id = $1 AND type = 'EMAIL_VERIFICATION'`;
    return await executeQuery(query, [userId]);
  }

  /**
   * @param {string} token
   * @returns {Promise<import('pg').QueryResultRow[]>}
   */
  async deactivateEmailToken(token) {
    const query = `
      UPDATE tokens 
      SET active = FALSE 
      WHERE token = $1;`;
    return await executeQuery(query, [token]);
  }

  /**
   * @param {string|number} userId
   * @param {string} token
   * @param {string} code
   * @param {string} createdAt
   * @param {import('pg').PoolClient} [client=null]
   * @returns {Promise<import('pg').QueryResultRow[]>}
   */
  async createEmailActivationToken(userId, token, code, createdAt, client = null) {
    const query = `
      INSERT INTO tokens 
        (user_id, token, code, type, expires_at, created_at, active) 
      VALUES ($1, $2, $3, 'EMAIL_VERIFICATION', ($4::timestamp + interval '7 days'), $4, TRUE)
    `;
    return await executeQuery(query, [userId, token, code, createdAt], client);
  }

  /**
   * @param {string} token
   * @returns {Promise<import('pg').QueryResultRow|undefined>}
   */
  async findEmailActivationToken(token) {
    const query = `
      SELECT * FROM tokens 
      WHERE token = $1 AND active = TRUE AND type = 'EMAIL_VERIFICATION' AND expires_at > NOW()
    `;
    const results = await executeQuery(query, [token]);
    return results[0];
  }

  /**
   * @param {string} code
   * @param {string} email
   * @returns {Promise<import('pg').QueryResultRow|undefined>}
   */
  async findEmailActivationTokenByCodeAndEmail(code, email) {
    const query = `
      SELECT t.* FROM tokens t
      JOIN users u ON u.user_id = t.user_id
      WHERE t.code = $1 AND u.email = $2 AND t.active = TRUE AND t.type = 'EMAIL_VERIFICATION' AND t.expires_at > NOW()
    `;
    const results = await executeQuery(query, [code, email]);
    return results[0];
  }

  /**
   * @param {string|number} userId
   * @returns {Promise<{ user_id: string|number, email: string, email_verified: boolean, email_verified_at: Date|string|null }|undefined>}
   */
  async verifyUserEmail(userId) {
    const query = `
      UPDATE users
      SET email_verified = TRUE, email_verified_at = NOW()
      WHERE user_id = $1
      RETURNING user_id, email, email_verified, email_verified_at
    `;
    const results = await executeQuery(query, [userId]);
    return results[0];
  }

  // ==========================================
  // DELETE ACCOUNT TOKENS
  // ==========================================

  async createDeleteAccountToken(userId, token) {
    await executeQuery(
      `UPDATE tokens SET active = FALSE WHERE user_id = $1 AND type = 'DELETE_USER_ACCOUNT' AND active = TRUE`,
      [userId]
    );

    const query = `
      INSERT INTO tokens (user_id, token, type, expires_at, created_at, active)
      VALUES ($1, $2, 'DELETE_USER_ACCOUNT', ($3::timestamp + interval '7 days'), $3, TRUE)
      RETURNING *;
    `;
    return await executeQuery(query, [userId, token, new Date().toISOString()]);
  }

  async findDeleteAccountToken(token) {
    const query = `SELECT * FROM tokens WHERE token = $1 AND active = TRUE AND type = 'DELETE_USER_ACCOUNT' AND expires_at > NOW()`;
    const results = await executeQuery(query, [token]);
    return results[0];
  }

  async deactivateDeleteAccountToken(token) {
    const query = `UPDATE tokens SET active = FALSE WHERE token = $1 AND type = 'DELETE_USER_ACCOUNT'`;
    return await executeQuery(query, [token]);
  }
}
module.exports = new UserTokensRepository();
