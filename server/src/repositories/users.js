/* eslint-disable quotes */
const { executeQuery } = require("@/services/db/db-connection");

class UserRepository {
  async createUser(
    name,
    username,
    email,
    password,
    profileImageUrl,
    createdAt
  ) {
    const query = `
      INSERT INTO users (name, username, email, password, avatar_url, created_at) 
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING user_id
    `;
    return await executeQuery(query, [
      name,
      username,
      email,
      password,
      profileImageUrl,
      createdAt,
    ]);
  }

  async createGithubUser(username, name, githubId) {
    const query = `
      INSERT INTO users (username, name, github_id) 
      VALUES ($1, $2, $3)
      RETURNING user_id
    `;
    return await executeQuery(query, [username, name, githubId]);
  }

  async findAll() {
    const query = `
    SELECT name, email, username, 
    CASE WHEN avatar_url IS NOT NULL THEN true ELSE false END as has_profile_image 
    FROM users
    `;
    return await executeQuery(query);
  }

  async getProfileImage(userId) {
    const query = `SELECT avatar_url, name FROM users WHERE user_id = $1 LIMIT 1`;
    const results = await executeQuery(query, [userId]);
    return results[0];
  }

  async findByUsernameOrEmail(username, email) {
    const query = `SELECT * FROM users WHERE (email = $1 OR username = $2) AND deleted = false`;
    return await executeQuery(query, [email, username]);
  }

  async getUserById(userId) {
    const query = `SELECT user_id, username, name, email, avatar_url, created_at FROM users WHERE user_id = $1 AND deleted = false LIMIT 1`;
    const results = await executeQuery(query, [userId]);
    return results[0];
  }

  async searchUsers(searchTerm) {
    const query = `
      SELECT user_id, username, name, email, avatar_url 
      FROM users 
      WHERE (LOWER(username) LIKE LOWER($1) 
         OR LOWER(email) LIKE LOWER($1))
         AND deleted = false
      ORDER BY username
      LIMIT 10
    `;
    return await executeQuery(query, [`%${searchTerm}%`]);
  }

  async findById(userId) {
    const query = `SELECT user_id, username, name, email, avatar_url FROM users WHERE user_id = $1 AND deleted = false LIMIT 1`;
    const results = await executeQuery(query, [userId]);
    return results[0];
  }

  async findByGithubId(githubId) {
    const query = `SELECT user_id, username, name FROM users WHERE github_id = $1 LIMIT 1`;
    const results = await executeQuery(query, [githubId]);
    return results[0];
  }

  async updateProfileImage(userId, url) {
    const query = `
      UPDATE users
      SET avatar_url = $1
      WHERE user_id = $2
      RETURNING user_id, avatar_url
    `;
    return await executeQuery(query, [url, userId]);
  }

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

    if (fields.length === 0) {
      const query = `
        SELECT user_id, username, name, email, avatar_url, theme_mode, birth_date, phone_number, private_profile, created_at
        FROM users
        WHERE user_id = $1 AND deleted = false
      `;
      const results = await executeQuery(query, [userId]);
      return results[0];
    }

    values.push(userId);
    const query = `
      UPDATE users
      SET ${fields.join(', ')}
      WHERE user_id = $${paramIndex} AND deleted = false
      RETURNING user_id, username, name, email, avatar_url, theme_mode, birth_date, phone_number, private_profile, created_at
    `;
    const results = await executeQuery(query, values);
    return results[0];
  }

  async updateUserPassword(userId, hashedPassword) {
    const query = `
      UPDATE users
      SET password = $1
      WHERE user_id = $2 AND deleted = false
    `;
    return await executeQuery(query, [hashedPassword, userId]);
  }

  async deleteUser(userId) {
    const query = `
      DELETE FROM users
      WHERE user_id = $1
      RETURNING user_id
    `;
    return await executeQuery(query, [userId]);
  }

  // Email change validation
  async deactivateOldEmailTokens(userId) {
    const query = `UPDATE tokens SET active = FALSE WHERE user_id = $1 AND active = TRUE AND type = 'email_verification'`;
    return await executeQuery(query, [userId]);
  }

  async createEmailChangeToken(userId, token, newEmail, createdAt) {
    const query = `
      INSERT INTO tokens (user_id, token, type, expires_at, created_at, active, data_to_update) 
      VALUES ($1, $2, 'email_verification', ($3::timestamp + interval '1 hour'), $3, TRUE, $4)
    `;
    return await executeQuery(query, [userId, token, createdAt, JSON.stringify({ new_email: newEmail })]);
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
    const query = `SELECT data_to_update FROM tokens WHERE user_id = $1 AND active = TRUE AND type = 'email_verification' AND expires_at > NOW()`;
    const results = await executeQuery(query, [userId]);
    return results[0]?.data_to_update;
  }

  async clearDataToUpdate(userId) {
    const query = `UPDATE tokens SET data_to_update = NULL WHERE user_id = $1 AND type = 'email_verification'`;
    return await executeQuery(query, [userId]);
  }

  async deactivateEmailToken(token) {
    const query = `UPDATE tokens SET active = FALSE WHERE token = $1`;
    return await executeQuery(query, [token]);
  }

  // Email activation
  async createEmailActivationToken(userId, token, createdAt) {
    const query = `
      INSERT INTO tokens (user_id, token, type, expires_at, created_at, active) 
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
}

module.exports = new UserRepository();
