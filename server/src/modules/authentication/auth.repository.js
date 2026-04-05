const { executeQuery } = require("@/database/connection");

/**
 * Authentication Repository
 * All queries related to user authentication, login processes, and OAuth integrations are centralized here.
 * This includes fetching user data for login, logging login attempts, and handling third-party OAuth user creation and linking.
 */
class AuthRepository {
  /**
   * Busca um usuário pelo nome de usuário ou e-mail.
   * Usado para o processo de login na plataforma.
   *
   * @param {string} username O nome de usuário ou e-mail
   * @returns {Promise<import('@/types/models').User | null>} Objeto de usuário detalhado ou null se não encontrado
   */
  async findUserByUsername(username) {
    const query = `
      WITH target_user AS (
          SELECT * FROM users WHERE username = $1 AND deleted = false
          UNION ALL
          SELECT * FROM users WHERE email = $1 AND deleted = false
          LIMIT 1
      )
      SELECT
        u.user_id,
        u.username,
        u.name AS user_name,
        u.email,
        u.password,
        u.avatar_url,
        u.birth_date,
        u.private_profile,
        u.phone_number,
        u.auth_with_google,
        u.auth_with_github,
        u.github_id,
        u.theme_mode,
        u.created_at,
        u.updated_at,
        u.email_verified,
        u.email_verified_at,
        u.plan_id,
        u.user_preference,
        
        -- Plano (Subselect simples)
        (SELECT p.name FROM plans p WHERE p.plan_id = u.plan_id) AS plan_name,
        (SELECT p.details FROM plans p WHERE p.plan_id = u.plan_id) AS plan_details,

        -- Organização (Subselect retornando Objeto JSON)
        (
          SELECT row_to_json(org_data)
          FROM (
            SELECT 
              om.org_id, 
              om.role AS org_member_role, 
              om.created_at AS org_member_since, 
              o.unique_name AS org_unique_name, 
              o.org_name, 
              o.logo_url AS org_logo_url
            FROM organizations_members om
            JOIN organizations o ON o.id = om.org_id
            WHERE om.user_id = u.user_id
            ORDER BY om.created_at DESC 
            LIMIT 1
          ) org_data
        ) AS organization,

        -- Uso do Plano (Subselect retornando Objeto JSON)
        (
          SELECT row_to_json(usage_data)
          FROM (
            SELECT 
              pu.plan_id AS usage_plan_id, 
              pu.client_type AS usage_client_type, 
              pu.usage_details, 
              pu.period_start, 
              pu.period_end,
              p2.name AS usage_plan_name
            FROM plans_usage pu
            LEFT JOIN plans p2 ON p2.plan_id = pu.plan_id
            WHERE pu.user_id = u.user_id
            ORDER BY pu.period_end DESC 
            LIMIT 1
          ) usage_data
        ) AS current_usage,

        -- Área Padrão (Subselect retornando Objeto JSON)
        (
          SELECT row_to_json(area_data)
          FROM (
            SELECT 
              oam.area_id AS org_default_area_id,
              oam.role AS org_default_area_role,
              oam.joined_at AS org_default_area_member_since,
              oa.area_name AS org_default_area_name,
              oa.slug AS org_default_area_slug,
              oa.description AS org_default_area_description,
              oa.properties AS org_default_area_properties
            FROM organizations_areas_members oam
            JOIN organizations_areas oa ON oa.id = oam.area_id
            WHERE oam.user_id = u.user_id
              AND oam.deleted = false
              AND oa.deleted = false
              -- Regra: A área deve pertencer à última organização ativa do usuário
              AND oam.organization_id = (
                  SELECT org_id FROM organizations_members 
                  WHERE user_id = u.user_id ORDER BY created_at DESC LIMIT 1
              )
            ORDER BY oam.joined_at ASC 
            LIMIT 1
          ) area_data
        ) AS default_area

      FROM target_user u;
    `;
    const results = await executeQuery(query, [username]);
    return results[0];
  }

  /**
   * Salva um log de tentativa de login (sucesso ou falha).
   *
   * @param {string} userId O ID do usuário
   * @param {string} ip O endereço IP da requisição
   * @param {Date | string} timestamp Data/hora da tentativa
   * @param {boolean} success Indica se o login foi bem sucedido
   * @param {string} userAgent Informações do navegador/cliente
   * @returns {Promise<any>}
   */
  async loginLogs(userId, ip, timestamp, success, userAgent) {
    const query = `
      INSERT INTO user_login_logs (user_id, ip_address, created_at, success, user_agent)
      VALUES ($1, $2, $3, $4, $5);
    `;
    return await executeQuery(query, [
      userId,
      ip,
      timestamp,
      success,
      userAgent,
    ]);
  }

  /**
   * Salva a localização geográfica a partir de um IP durante o login.
   *
   * @param {string} userId O ID do usuário logado
   * @param {string} ip O endereço IP
   * @param {Date | string} timestamp Moment da requisição
   * @param {string} location Formato com a localidade (ex: "City, Country")
   * @param {string} userAgent Informações do dispositivo
   * @returns {Promise<any>}
   */
  async logUserLocation(userId, ip, timestamp, location, userAgent) {
    const query = `
      INSERT INTO user_location_logs (user_id, ip_address, created_at, location, user_agent) 
      VALUES ($1, $2, $3, $4, $5);
    `;
    return await executeQuery(query, [
      userId,
      ip,
      timestamp,
      location,
      userAgent,
    ]);
  }

  /**
   * Busca um usuário estritamente pelo e-mail e verifica se não está deletado.
   * Usado para envio de recuperar senhas, OAuth e verificações de duplicidade.
   *
   * @param {string} email Email a ser pesquisado
   * @returns {Promise<import('@/types/models').User | null>} Objeto preenchido com dados ou null se não houver
   */
  async findUserByEmail(email) {
    const query = `
      SELECT
        u.user_id, u.username, u.name, u.email, u.password,
        u.avatar_url, u.auth_with_google, u.auth_with_github, u.github_id, u.theme_mode,
        u.private_profile, u.plan_id, u.created_at,
        
        (SELECT p.name FROM plans p WHERE p.plan_id = u.plan_id) AS plan_name,

        (
          SELECT row_to_json(org_data)
          FROM (
            SELECT om.org_id, om.role AS org_member_role, o.unique_name AS org_unique_name, o.org_name
            FROM organizations_members om
            JOIN organizations o ON o.id = om.org_id
            WHERE om.user_id = u.user_id
            ORDER BY om.created_at DESC LIMIT 1
          ) org_data
        ) AS organization,

        (
          SELECT row_to_json(area_data)
          FROM (
            SELECT 
              oam.area_id AS org_default_area_id, oam.role AS org_default_area_role,
              oam.joined_at AS org_default_area_member_since, oa.area_name AS org_default_area_name,
              oa.slug AS org_default_area_slug, oa.description AS org_default_area_description,
              oa.properties AS org_default_area_properties
            FROM organizations_areas_members oam
            JOIN organizations_areas oa ON oa.id = oam.area_id
            WHERE oam.user_id = u.user_id AND oam.deleted = false AND oa.deleted = false
              AND oam.organization_id = (
                  SELECT org_id FROM organizations_members 
                  WHERE user_id = u.user_id ORDER BY created_at DESC LIMIT 1
              )
            ORDER BY oam.joined_at ASC LIMIT 1
          ) area_data
        ) AS default_area

      FROM users u
      WHERE u.email = $1 AND u.deleted = false
      LIMIT 1;
    `;
    const results = await executeQuery(query, [email]);
    return results[0];
  }

  /**
   * Busca diretamente um usuário que teve registro via Google OAuth.
   *
   * @param {string} googleId Identificador único fornecido pelo provedor Google
   * @returns {Promise<import('@/types/models').User | null>} Dados do usuário recuperados do banco
   */
  async findUserByGoogleId(googleId) {
    const query = `
      SELECT
        u.user_id, u.username, u.name, u.email, u.password,
        u.avatar_url, u.auth_with_google, u.auth_with_github, u.github_id, u.theme_mode,
        u.private_profile, u.plan_id, u.created_at,
        
        (SELECT p.name FROM plans p WHERE p.plan_id = u.plan_id) AS plan_name,

        (
          SELECT row_to_json(org_data)
          FROM (
            SELECT om.org_id, om.role AS org_member_role, o.unique_name AS org_unique_name, o.org_name
            FROM organizations_members om
            JOIN organizations o ON o.id = om.org_id
            WHERE om.user_id = u.user_id
            ORDER BY om.created_at DESC LIMIT 1
          ) org_data
        ) AS organization,

        (
          SELECT row_to_json(area_data)
          FROM (
            SELECT 
              oam.area_id AS org_default_area_id, oam.role AS org_default_area_role,
              oam.joined_at AS org_default_area_member_since, oa.area_name AS org_default_area_name,
              oa.slug AS org_default_area_slug, oa.description AS org_default_area_description,
              oa.properties AS org_default_area_properties
            FROM organizations_areas_members oam
            JOIN organizations_areas oa ON oa.id = oam.area_id
            WHERE oam.user_id = u.user_id AND oam.deleted = false AND oa.deleted = false
              AND oam.organization_id = (
                  SELECT org_id FROM organizations_members 
                  WHERE user_id = u.user_id ORDER BY created_at DESC LIMIT 1
              )
            ORDER BY oam.joined_at ASC LIMIT 1
          ) area_data
        ) AS default_area

      FROM users u
      WHERE u.google_id = $1 AND u.deleted = false
      LIMIT 1;
    `;
    const results = await executeQuery(query, [googleId]);
    return results[0];
  }

  /**
   * Registra um novo usuário no banco com credenciais do Google OAuth.
   * Cria o nome de usuário usando uma base do e-mail.
   *
   * @param {string} googleId ID do provedor Google
   * @param {string} name Nome do usuário
   * @param {string} email Email do usuário
   * @param {string|null} [avatarUrl=null] URL de foto de perfil fornecida
   * @returns {Promise<import('@/types/models').User>} Retorna o novo usuário inserido (com os dados essenciais para emitir token)
   */
  async createUserWithGoogle(googleId, name, email, avatarUrl = null) {
    const username = email.split("@")[0] + "_" + Date.now();

    const query = `
      INSERT INTO users (google_id, name, email, username, auth_with_google, avatar_url, password, email_verified, email_verified_at)
      VALUES ($1, $2, $3, $4, true, $5, '', true, NOW())
      RETURNING user_id, username, name, email, avatar_url, auth_with_google, created_at;
    `;

    const results = await executeQuery(query, [
      googleId,
      name,
      email,
      username,
      avatarUrl,
    ]);
    return results[0];
  }

  /**
   * Conecta um registro já existente no sistema a uma conta do Google.
   * Utilizado quando um e-mail idêntico tenta logar pelo OAuth.
   *
   * @param {string} userId UUID do usuário no banco
   * @param {string} googleId Identificador único do provedor Google
   * @param {string|null} [avatarUrl=null] Atualização de capa se houver
   * @returns {Promise<import('@/types/models').User>} Retorna os dados essenciais atualizados
   */
  async updateUserWithGoogle(userId, googleId, avatarUrl = null) {
    const query = `
      UPDATE users
      SET google_id = $1, auth_with_google = true, avatar_url = COALESCE($2, avatar_url)
      WHERE user_id = $3
      RETURNING user_id, username, name, email, avatar_url, auth_with_google, created_at;
    `;
    const results = await executeQuery(query, [googleId, avatarUrl, userId]);
    return results[0];
  }

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
            SELECT om.org_id, om.role AS org_member_role, o.unique_name AS org_unique_name, o.org_name
            FROM organizations_members om
            JOIN organizations o ON o.id = om.org_id
            WHERE om.user_id = u.user_id
            ORDER BY om.created_at DESC LIMIT 1
          ) org_data
        ) AS organization,

        (
          SELECT row_to_json(area_data)
          FROM (
            SELECT
              oam.area_id AS org_default_area_id, oam.role AS org_default_area_role,
              oam.joined_at AS org_default_area_member_since, oa.area_name AS org_default_area_name,
              oa.slug AS org_default_area_slug, oa.description AS org_default_area_description,
              oa.properties AS org_default_area_properties
            FROM organizations_areas_members oam
            JOIN organizations_areas oa ON oa.id = oam.area_id
            WHERE oam.user_id = u.user_id AND oam.deleted = false AND oa.deleted = false
              AND oam.organization_id = (
                  SELECT org_id FROM organizations_members
                  WHERE user_id = u.user_id ORDER BY created_at DESC LIMIT 1
              )
            ORDER BY oam.joined_at ASC LIMIT 1
          ) area_data
        ) AS default_area

      FROM users u
      WHERE u.github_id = $1 AND u.deleted = false
      LIMIT 1;
    `;
    const results = await executeQuery(query, [githubId]);
    return results[0];
  }

  // Vincula o perfil do GitHub a uma conta de e-mail já existente
 async updateUserWithGithub(userId, githubId, avatarUrl) {
    const query = `
      UPDATE users 
      SET github_id = $1, auth_with_github = true, email_verified = true, email_verified_at = COALESCE(email_verified_at, NOW()), avatar_url = COALESCE($2, avatar_url), updated_at = NOW() 
      WHERE user_id = $3
      RETURNING *
    `;
    const results= await executeQuery(query, [githubId, avatarUrl, userId]);
    return results[0];
  }

  // Cria o utilizador do zero
  async createUserWithGithub(githubId, name, username, email, avatarUrl) {
    const query = `
      INSERT INTO users (github_id, name, username, email, avatar_url, password, auth_with_github, email_verified, email_verified_at, created_at, updated_at) 
      VALUES ($1, $2, $3, $4, $5, '', true, true, NOW(), NOW(), NOW()) 
      RETURNING *
    `;
    const results= await executeQuery(query, [githubId, name, username, email, avatarUrl]);
    return results[0];
  }
}

module.exports = new AuthRepository();
