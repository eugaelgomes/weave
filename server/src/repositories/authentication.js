const { executeQuery } = require("@/services/db/db-connection");

class AuthRepository {
  async findUserByUsername(username) {
    const query = `
      SELECT user_id, username, name, email, password, avatar_url, auth_with_google, theme_mode, created_at, updated_at
      FROM users
      WHERE (username = $1 OR email = $1) AND deleted = false
      LIMIT 1
    `;
    const results = await executeQuery(query, [username]);
    return results[0];
  }

  async updateUserProfile(userId, name, email, username, theme_mode) {
    const query = `
      UPDATE users
      SET name = $1, email = $2, username = $3, theme_mode = $4
      WHERE user_id = $5 AND deleted = false
      RETURNING user_id, username, name, email, avatar_url, theme_mode, created_at
    `;
    const results = await executeQuery(query, [name, email, username, theme_mode, userId]);
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

  async logUserLocation(userId, ip, timestamp, location, userAgent) {
    const query = `
      INSERT INTO user_location_logs (user_id, ip_address, created_at, location, user_agent) 
      VALUES ($1, $2, $3, $4, $5)
    `;
    return await executeQuery(query, [
      userId,
      ip,
      timestamp,
      location,
      userAgent,
    ]);
  }

  async findUserByEmail(email) {
    const query = `
      SELECT user_id, username, name, email, password, avatar_url, auth_with_google, created_at
      FROM users
      WHERE email = $1
      LIMIT 1
    `;
    const results = await executeQuery(query, [email]);
    return results[0];
  }

  async findUserByGoogleId(googleId) {
    const query = `
      SELECT user_id, username, name, email, password, avatar_url, auth_with_google, created_at
      FROM users
      WHERE google_id = $1
      LIMIT 1
    `;
    const results = await executeQuery(query, [googleId]);
    return results[0];
  }

  async createUserWithGoogle(googleId, name, email, avatarUrl = null) {
    try {
      console.log("Tentando criar usuário com Google:", {
        googleId,
        name,
        email,
        avatarUrl,
      });

      const username = email.split("@")[0] + "_" + Date.now();

      const query = `
        INSERT INTO users (google_id, name, email, username, auth_with_google, avatar_url, password)
        VALUES ($1, $2, $3, $4, true, $5, '')
        RETURNING user_id, username, name, email, avatar_url, auth_with_google, created_at
      `;

      console.log("Query SQL:", query);
      console.log("Parâmetros:", [googleId, name, email, username, avatarUrl]);

      const results = await executeQuery(query, [
        googleId,
        name,
        email,
        username,
        avatarUrl,
      ]);
      console.log("Resultado da inserção:", results);

      return results[0];
    } catch (error) {
      console.error("Erro detalhado ao criar usuário com Google:", error);
      throw error;
    }
  }

  // Atualizar usuário existente para marcar autenticação com Google
  async updateUserWithGoogle(userId, googleId, avatarUrl = null) {
    const query = `
      UPDATE users
      SET google_id = $1, auth_with_google = true, avatar_url = COALESCE($2, avatar_url)
      WHERE user_id = $3
      RETURNING user_id, username, name, email, avatar_url, auth_with_google, created_at
    `;
    const results = await executeQuery(query, [googleId, avatarUrl, userId]);
    return results[0];
  }
}

module.exports = new AuthRepository();
