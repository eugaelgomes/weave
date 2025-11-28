/* eslint-disable quotes */
const { executeQuery } = require("@/services/db/db-connection");

class UserRepository {
  // -- funções de criação ---

  // Querie para criar usuário
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

  // Querie para criar id github
  async createGithubUser(username, name, githubId) {
    const query = `
      INSERT INTO users (username, name, github_id) 
      VALUES ($1, $2, $3)
      RETURNING user_id
    `;
    return await executeQuery(query, [username, name, githubId]);
  }

  // --- funções de leitura ---

  // Querie para listar todos os usuários (sem senhas)
  async findAll() {
    const query = `
    SELECT name, email, username, 
    CASE WHEN avatar_url IS NOT NULL THEN true ELSE false END as has_profile_image 
    FROM users
    `;
    return await executeQuery(query);
  }

  // Querie para pegar imagem de perfil
  async getProfileImage(userId) {
    const query = `SELECT avatar_url, name FROM users WHERE user_id = $1 LIMIT 1`;
    const results = await executeQuery(query, [userId]);
    return results[0];
  }

  // Querie para encontrar usuário por username ou email
  async findByUsernameOrEmail(username, email) {
    const query = `SELECT * FROM users WHERE email = $1 OR username = $2`;
    return await executeQuery(query, [email, username]);
  }

  async getUserById(userId) {
    const query = `SELECT user_id, username, name, email, avatar_url, created_at FROM users WHERE user_id = $1 LIMIT 1`;
    const results = await executeQuery(query, [userId]);
    return results[0];
  }

  // Querie para buscar usuários por padrão (para colaboração)
  async searchUsers(searchTerm) {
    const query = `
      SELECT user_id, username, name, email, avatar_url 
      FROM users 
      WHERE LOWER(username) LIKE LOWER($1) 
         OR LOWER(email) LIKE LOWER($1)
      ORDER BY username
      LIMIT 10
    `;
    return await executeQuery(query, [`%${searchTerm}%`]);
  }

  // Querie para encontrar usuário por ID
  async findById(userId) {
    const query = `SELECT user_id, username, name, email, avatar_url FROM users WHERE user_id = $1 LIMIT 1`;
    const results = await executeQuery(query, [userId]);
    return results[0];
  }

  // Querie para encontrar usuário por ID do GitHub **desabilitado**
  async findByGithubId(githubId) {
    const query = `SELECT user_id, username, name FROM users WHERE github_id = $1 LIMIT 1`;
    const results = await executeQuery(query, [githubId]);
    return results[0];
  }

  // --- funções de atualização ---

  // Querie para atualizar imagem de perfil
  async updateProfileImage(userId, url) {
    const query = `
      UPDATE users
      SET avatar_url = $1
      WHERE user_id = $2
      RETURNING user_id, avatar_url
    `;
    return await executeQuery(query, [url, userId]);
  }

  // --- funções de deleção ---

  // Querie para deletar usuário
  async deleteUser(userId) {
    const query = `
      DELETE FROM users
      WHERE user_id = $1
      RETURNING user_id
    `;
    return await executeQuery(query, [userId]);
  }
}

module.exports = new UserRepository();
