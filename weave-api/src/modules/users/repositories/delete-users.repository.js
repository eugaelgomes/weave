const BaseRepository = require("./base.repository");
const { executeQuery } = require("@/database/connection");

/**
 * Tokens e soft-delete relacionados à exclusão de conta.
 */
class DeleteUsersRepository extends BaseRepository {
  /**
   * Desativa tokens anteriores e insere um novo token de exclusão (7 dias).
   *
   * @param {string|number} userId
   * @param {string} token
   * @returns {Promise<import('pg').QueryResultRow[]>}
   */
  async createDeleteAccountToken(userId, token) {
    // Desativa tokens antigos de exclusão
    await executeQuery(
      `UPDATE tokens SET active = FALSE 
       WHERE user_id = $1 AND type = 'delete_user_account' AND active = TRUE`,
      [userId]
    );

    const query = `
      INSERT INTO tokens (user_id, token, type, expires_at, created_at, active)
      VALUES ($1, $2, 'delete_user_account', ($3::timestamp + interval '7 days'), $3, TRUE)
      RETURNING *;
    `;
    return await executeQuery(query, [userId, token, new Date().toISOString()]);
  }

  /**
   * @param {string} token
   * @returns {Promise<import('pg').QueryResultRow|undefined>}
   */
  async findDeleteAccountToken(token) {
    const query = `
      SELECT * FROM tokens 
      WHERE token = $1 AND active = TRUE AND type = 'delete_user_account' AND expires_at > NOW()
    `;
    const results = await executeQuery(query, [token]);
    return results[0];
  }

  /**
   * Marca o usuário como excluído e anonimiza e-mail/username.
   *
   * @param {string|number} userId
   * @returns {Promise<Array<{ user_id: string|number }>>}
   */
  async deleteUser(userId) {
    const randomSuffix = Math.floor(Math.random() * 1000000000);
    const query = `
      UPDATE users
      SET 
        email = $2, 
        username = $3, 
        phone_number = NULL, 
        avatar_url = NULL, 
        name = 'Deleted User',
        deleted = TRUE, 
        deleted_at = NOW()
      WHERE user_id = $1
      RETURNING user_id
    `;
    const deletedUserDomain = process.env.APP_DOMAIN || "weavenotes.app";
    return await executeQuery(query, [
      userId,
      `deleted_user_${randomSuffix}@${deletedUserDomain}`,
      `deleted_user_${randomSuffix}`,
    ]);
  }

  /**
   * @param {string} token
   * @returns {Promise<import('pg').QueryResultRow[]>}
   */
  async deactivateDeleteAccountToken(token) {
    const query = `
      UPDATE tokens 
      SET active = FALSE 
      WHERE token = $1 AND type = 'delete_user_account'
    `;
    return await executeQuery(query, [token]);
  }
}
module.exports = new DeleteUsersRepository();
