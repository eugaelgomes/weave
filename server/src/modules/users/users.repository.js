const { executeQuery } = require("@/database/connection");
const { defaultAppPreferences } = require("@/modules/users/normalize");

class UserRepository {
  /**
   * Cria um novo usuário no banco de dados.
   *
   * @param {Object} userData
   * @param {string} userData.name
   * @param {string} userData.username
   * @param {string} userData.email
   * @param {string} [userData.password]
   * @param {string} [userData.timezone]
   * @param {boolean} [userData.private_profile]
   * @param {string} [userData.birth_date]
   * @param {string} [userData.phone_number]
   * @param {string} [userData.avatar_url]
   * @returns {Promise<import('@/types/models').User>} Usuário recém-criado
   */
  async createUser(userData) {
    const {
      name,
      username,
      email,
      password,
      timezone,
      private_profile,
      birth_date,
      phone_number,
      avatar_url,
    } = userData;

    const query = `
    INSERT INTO users (
      name, 
      username, 
      email, 
      password, 
      timezone, 
      private_profile,
      birth_date, 
      phone_number, 
      avatar_url,
      user_preference
    ) 
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    RETURNING user_id, email, name, avatar_url, created_at;
  `;

    return await executeQuery(query, [
      name,
      username,
      email,
      password,
      timezone,
      private_profile,
      birth_date,
      phone_number,
      avatar_url,
      defaultAppPreferences,
    ]);
  }

  async createGithubUser(username, name, githubId) {
    const query = `
      INSERT INTO 
        users (username, name, github_id) 
      VALUES ($1, $2, $3)
      RETURNING user_id;
    `;
    return await executeQuery(query, [username, name, githubId]);
  }

  async findAll() {
    const query = `
    SELECT 
      name, email, username, 
    CASE WHEN avatar_url IS NOT NULL THEN true ELSE false END as has_profile_image 
    FROM users
    `;
    return await executeQuery(query);
  }

  async getProfileImage(userId) {
    const query = `
    SELECT
      avatar_url, name 
    FROM users
    WHERE user_id = $1 
    LIMIT 1`;
    const results = await executeQuery(query, [userId]);
    return results[0];
  }

  /**
   * Checa se já existe um usuário com o mesmo username ou email
   *
   * @param {string} username Username desejado
   * @param {string} email Email desejado
   * @returns {Promise<import('@/types/models').User[]>}
   */
  async findByUsernameOrEmail(username, email) {
    const query = `SELECT * FROM users WHERE (email = $1 OR username = $2) AND deleted = false`;
    return await executeQuery(query, [email, username]);
  }

  /**
   * Busca dados públicos do usuário por ID
   *
   * @param {string} userId O ID interno do usuário
   * @returns {Promise<import('@/types/models').User | undefined>}
   */
  async getUserById(userId) {
    const query = `
    SELECT 
      user_id, username, name, email, avatar_url, created_at 
    FROM users 
    WHERE user_id = $1 AND deleted = false 
    LIMIT 1`;
    const results = await executeQuery(query, [userId]);
    return results[0];
  }

  async getUserByUsername(username) {
    const query = `
    SELECT
      u.user_id,
      u.username,
      u.name,
      u.email,
      u.password,
      u.avatar_url,
      u.birth_date,
      u.private_profile,
      u.phone_number,
      u.auth_with_google,
      u.theme_mode,
      u.created_at,
      u.updated_at,
      u.email_verified,
      u.email_verified_at,
      u.plan_id,
      o.id AS org_id,
      o.unique_name AS org_unique_name,
      o.org_name AS org_name,
      p.plan_id AS user_plan_id,
      p.name AS plan_name,
      p.details AS plan_details,
      pu.plan_id AS usage_plan_id,
      pu.client_type,
      pu.usage_details,
      pu.period_start,
      pu.period_end
    FROM users u
    LEFT JOIN organizations o ON o.user_id = u.user_id
    LEFT JOIN plans p ON p.plan_id = u.plan_id
    LEFT JOIN plans_usage pu ON pu.user_id = u.user_id
    WHERE (
      (u.username IS NOT NULL AND u.username = $1)
      OR (u.email IS NOT NULL AND u.email = $1)
    )
    AND u.deleted = false
    LIMIT 1;
  `;

    const results = await executeQuery(query, [username]);
    return results[0];
  }

  async searchUsers(searchTerm) {
    const query = `
      SELECT 
        user_id, 
        username, 
        name, 
        email, 
        avatar_url 
      FROM 
        users 
      WHERE 
        (LOWER(username) LIKE LOWER($1) 
        OR LOWER(email) LIKE LOWER($1))
        AND deleted = false
        AND private_profile = false
      ORDER BY 
        name ASC
      LIMIT 15;
    `;
    const results = await executeQuery(query, [`%${searchTerm}%`]);
    return results;
  }

  /**
   * Busca um usuário (dados restritos) por ID
   * @param {string} userId
   * @returns {Promise<import('@/types/models').User | undefined>}
   */
  async findById(userId) {
    const query = `
      SELECT 
        user_id, username, name, email, avatar_url 
      FROM users
      WHERE user_id = $1 AND deleted = false 
      LIMIT 1`;
    const results = await executeQuery(query, [userId]);
    return results[0];
  }

  async findByGithubId(githubId) {
    const query = `
      SELECT
        user_id, username, name 
      FROM users
      WHERE github_id = $1
      LIMIT 1`;
    const results = await executeQuery(query, [githubId]);
    return results[0];
  }

  /**
   * Salva a nova URL base de imagem do perfil de um usuário
   *
   * @param {string} userId
   * @param {string} url URL assinada/s3
   * @returns {Promise<any>}
   */
  async updateProfileImage(userId, url) {
    const query = `
      UPDATE users
      SET avatar_url = $1
      WHERE user_id = $2
      RETURNING user_id, avatar_url;
    `;
    return await executeQuery(query, [url, userId]);
  }

  /**
   * Atualiza perfis de usuário, fazendo build de chaves customizadas via update dinâmico
   *
   * @param {string} userId O ID interno do usuário
   * @param {Partial<import('@/types/models').User>} updates Objeto de atualização
   * @returns {Promise<import('@/types/models').User | undefined>}
   */
  async updateUserProfile(userId, updates) {
    const fields = [];
    const values = [];
    let paramIndex = 1;

    if (updates.name !== undefined) {
      fields.push(`name = $${paramIndex++}`);
      values.push(updates.name);
    }
    if (updates.email !== undefined) {
      fields.push(`email = $${paramIndex++}`);
      values.push(updates.email);
    }
    if (updates.username !== undefined) {
      fields.push(`username = $${paramIndex++}`);
      values.push(updates.username);
    }
    if (updates.theme_mode !== undefined) {
      fields.push(`theme_mode = $${paramIndex++}`);
      values.push(updates.theme_mode);
    }
    if (updates.birth_date !== undefined) {
      fields.push(`birth_date = $${paramIndex++}`);
      values.push(updates.birth_date);
    }
    if (updates.phone_number !== undefined) {
      fields.push(`phone_number = $${paramIndex++}`);
      values.push(updates.phone_number);
    }
    if (updates.private_profile !== undefined) {
      fields.push(`private_profile = $${paramIndex++}`);
      values.push(updates.private_profile);
    }
    if (updates.user_preference !== undefined) {
      fields.push(`user_preference = $${paramIndex++}`);
      values.push(updates.user_preference);
    }

    if (fields.length === 0) {
      const query = `
        SELECT user_id, username, name, email, avatar_url, theme_mode, birth_date, phone_number, private_profile, user_preference, created_at
        FROM users
        WHERE user_id = $1 AND deleted = false
      `;
      const results = await executeQuery(query, [userId]);
      return results[0];
    }

    values.push(userId);
    const query = `
      UPDATE users
      SET ${fields.join(", ")}
      WHERE user_id = $${paramIndex} AND deleted = false
      RETURNING user_id, username, name, email, avatar_url, theme_mode, birth_date, phone_number, private_profile, user_preference, created_at;
    `;
    const results = await executeQuery(query, values);
    return results[0];
  }

  /**
   * Atualiza a senha de um usuário no banco (que já deve vir criptografada - bcrypt)
   *
   * @param {string} userId
   * @param {string} hashedPassword
   * @returns {Promise<any>}
   */
  async updateUserPassword(userId, hashedPassword) {
    const query = `
      UPDATE users
      SET password = $1
      WHERE user_id = $2 AND deleted = false
    `;
    return await executeQuery(query, [hashedPassword, userId]);
  }

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

  async findDeleteAccountToken(token) {
    const query = `
      SELECT * FROM tokens 
      WHERE token = $1 AND active = TRUE AND type = 'delete_user_account' AND expires_at > NOW()
    `;
    const results = await executeQuery(query, [token]);
    return results[0];
  }

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

  async deactivateDeleteAccountToken(token) {
    const query = `
      UPDATE tokens 
      SET active = FALSE 
      WHERE token = $1 AND type = 'delete_user_account'
    `;
    return await executeQuery(query, [token]);
  }

  // Email change validation
  async deactivateOldEmailTokens(userId) {
    const query = `
      UPDATE tokens
      SET active = FALSE
      WHERE user_id = $1 AND active = TRUE AND type = 'email_verification'
    `;
    return await executeQuery(query, [userId]);
  }

  async createEmailChangeToken(userId, token, newEmail, createdAt) {
    const query = `
      INSERT INTO tokens
        (user_id, token, type, expires_at, created_at, active, data_to_update) 
      VALUES 
        ($1, $2, 'email_verification', ($3::timestamp + interval '1 hour'), $3, TRUE, $4);
    `;
    return await executeQuery(query, [
      userId,
      token,
      createdAt,
      JSON.stringify({ new_email: newEmail }),
    ]);
  }

  async findEmailChangeToken(userId, token) {
    const query = `
      SELECT * FROM tokens 
      WHERE user_id = $1 AND token = $2 AND active = TRUE AND type = 'email_verification' AND expires_at > NOW()
    `;
    const results = await executeQuery(query, [userId, token]);
    return results[0];
  }

  async getDataToUpdate(userId) {
    const query = `
      SELECT data_to_update 
      FROM tokens 
      WHERE user_id = $1 AND active = TRUE AND type = 'email_verification' AND expires_at > NOW()'`;
    const results = await executeQuery(query, [userId]);
    return results[0]?.data_to_update;
  }

  async clearDataToUpdate(userId) {
    const query = `
      UPDATE tokens 
      SET data_to_update = NULL 
      WHERE user_id = $1 AND type = 'email_verification'`;
    return await executeQuery(query, [userId]);
  }

  async deactivateEmailToken(token) {
    const query = `
      UPDATE tokens 
      SET active = FALSE 
      WHERE token = $1;`;
    return await executeQuery(query, [token]);
  }

  // Email activation
  async createEmailActivationToken(userId, token, createdAt) {
    const query = `
      INSERT INTO tokens 
        (user_id, token, type, expires_at, created_at, active) 
      VALUES ($1, $2, 'email_verification', ($3::timestamp + interval '7 days'), $3, TRUE)
    `;
    return await executeQuery(query, [userId, token, createdAt]);
  }

  async findEmailActivationToken(token) {
    const query = `
      SELECT * FROM tokens 
      WHERE token = $1 AND active = TRUE AND type = 'email_verification' AND expires_at > NOW()
    `;
    const results = await executeQuery(query, [token]);
    return results[0];
  }

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

  async setDefaultAppPreferences(userId) {
    const query = `
      UPDATE users
      SET user_preference = $1
      WHERE user_id = $2
      RETURNING user_id, user_preference
    `;
    const results = await executeQuery(query, [defaultAppPreferences, userId]);
    return results[0];
  }

  async updateUserPreferences(userId, preferences) {
    const query = `
      UPDATE users
      SET user_preference = $1, updated_at = NOW()
      WHERE user_id = $2
      RETURNING user_id, user_preference, updated_at
    `;
    const results = await executeQuery(query, [preferences, userId]);
    return results[0];
  }

  async getUserPreferences(userId) {
    const query = `
      SELECT user_preference
      FROM users
      WHERE user_id = $1
    `;
    const results = await executeQuery(query, [userId]);
    return results[0]?.user_preference || defaultAppPreferences;
  }
}

module.exports = new UserRepository();
