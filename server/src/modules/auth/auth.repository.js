const { executeQuery } = require("@/database/connection");

class AuthRepository {
  async findUserByUsername(username) {
    const query = `
    WITH target_user AS (
        -- Ramo 1: Busca indexada por Username (apenas ativos)
        SELECT *
        FROM users
        WHERE username = $1 
          AND deleted = false
        --
        UNION ALL
        --
        -- Ramo 2: Busca indexada por Email (apenas ativos)
        --
        SELECT *
        FROM users
        WHERE email = $1 
          AND deleted = false
        --
        -- Short-circuit: Para assim que encontrar o primeiro match
        --
        LIMIT 1
    )
    SELECT
      -- User Data
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
      u.theme_mode,
      u.created_at,
      u.updated_at,
      u.email_verified,
      u.email_verified_at,
      u.plan_id,
      u.user_preference,
      --
      -- Current Plan Data (Join 1:1 Direto)
      --
      p.plan_id::text AS user_plan_id,
      p.name AS plan_name,
      p.details AS plan_details,
      --
      -- Organization Data (Via Lateral Join Determinístico)
      --
      om_data.org_id,
      om_data.role AS org_member_role,
      om_data.created_at AS org_member_since,
      om_data.unique_name AS org_unique_name,
      om_data.org_name,
      om_data.logo_url AS org_logo_url,
      --
      -- Usage Data (Via Lateral Join - Apenas o mais recente)
      --
      pu_data.plan_id::text AS usage_plan_id,
      pu_data.usage_plan_name,
      pu_data.client_type AS usage_client_type,
      pu_data.usage_details,
      pu_data.period_start,
      pu_data.period_end
    FROM target_user u
    LEFT JOIN plans p ON p.plan_id = u.plan_id
    -- Otimização: Busca APENAS a organização mais recente/relevante
    LEFT JOIN LATERAL (
        SELECT 
            om.org_id, om.role, om.created_at,
            o.unique_name, o.org_name, o.logo_url
        FROM organizations_members om
        JOIN organizations o ON o.id = om.org_id
        WHERE om.user_id = u.user_id
        ORDER BY om.created_at DESC -- Garante que pegamos a entrada mais nova
        LIMIT 1
    ) om_data ON true
    --
    -- Otimização: Busca APENAS o registro de uso mais recente
    --
    LEFT JOIN LATERAL (
        SELECT 
            pu.plan_id, pu.client_type, pu.usage_details, 
            pu.period_start, pu.period_end,
            p2.name AS usage_plan_name
        FROM plans_usage pu
        LEFT JOIN plans p2 ON p2.plan_id = pu.plan_id
        WHERE pu.user_id = u.user_id
        ORDER BY pu.period_end DESC -- Garante que pegamos o uso atual
        LIMIT 1
    ) pu_data ON true;
    `;
    const results = await executeQuery(query, [username]);
    return results[0];
  }

  async loginLogs(userId, ip, timestamp, success, userAgent) {
    const query = `
      INSERT INTO 
        user_login_logs (user_id, ip_address, created_at, success, user_agent)
      VALUES
        ($1, $2, $3, $4, $5);
    `;
    return await executeQuery(query, [
      userId,
      ip,
      timestamp,
      success,
      userAgent,
    ]);
  }

  async logUserLocation(userId, ip, timestamp, location, userAgent) {
    const query = `
      INSERT INTO user_location_logs 
        (user_id, ip_address, created_at, location, user_agent) 
      VALUES
        ($1, $2, $3, $4, $5);
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
      SELECT
        u.user_id,
        u.username,
        u.name,
        u.email,
        u.password,
        u.avatar_url,
        u.auth_with_google,
        u.theme_mode,
        u.private_profile,
        u.plan_id,
        u.created_at,
        p.plan_id::text AS user_plan_id,
        p.name AS plan_name,
        om_data.org_id,
        om_data.role AS org_member_role,
        om_data.unique_name AS org_unique_name,
        om_data.org_name
      FROM users u
      LEFT JOIN plans p ON p.plan_id = u.plan_id
      LEFT JOIN LATERAL (
        SELECT om.org_id, om.role, o.unique_name, o.org_name
        FROM organizations_members om
        JOIN organizations o ON o.id = om.org_id
        WHERE om.user_id = u.user_id
        ORDER BY om.created_at DESC
        LIMIT 1
      ) om_data ON true
      WHERE u.email = $1 AND u.deleted = false
      LIMIT 1;
    `;
    const results = await executeQuery(query, [email]);
    return results[0];
  }

  async findUserByGoogleId(googleId) {
    const query = `
      SELECT
        u.user_id,
        u.username,
        u.name,
        u.email,
        u.password,
        u.avatar_url,
        u.auth_with_google,
        u.theme_mode,
        u.private_profile,
        u.plan_id,
        u.created_at,
        p.plan_id::text AS user_plan_id,
        p.name AS plan_name,
        om_data.org_id,
        om_data.role AS org_member_role,
        om_data.unique_name AS org_unique_name,
        om_data.org_name
      FROM users u
      LEFT JOIN plans p ON p.plan_id = u.plan_id
      LEFT JOIN LATERAL (
        SELECT om.org_id, om.role, o.unique_name, o.org_name
        FROM organizations_members om
        JOIN organizations o ON o.id = om.org_id
        WHERE om.user_id = u.user_id
        ORDER BY om.created_at DESC
        LIMIT 1
      ) om_data ON true
      WHERE u.google_id = $1 AND u.deleted = false
      LIMIT 1;
    `;
    const results = await executeQuery(query, [googleId]);
    return results[0];
  }

  async createUserWithGoogle(googleId, name, email, avatarUrl = null) {
    const username = email.split("@")[0] + "_" + Date.now();

    const query = `
      INSERT INTO 
        users (google_id, name, email, username, auth_with_google, avatar_url, password, email_verified, email_verified_at)
      VALUES
        ($1, $2, $3, $4, true, $5, '', true, NOW())
      RETURNING 
        user_id, username, name, email, avatar_url, auth_with_google, created_at;
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

  async updateUserWithGoogle(userId, googleId, avatarUrl = null) {
    const query = `
      UPDATE 
        users
      SET 
        google_id = $1, auth_with_google = true, avatar_url = COALESCE($2, avatar_url)
      WHERE 
        user_id = $3
      RETURNING 
        user_id, username, name, email, avatar_url, auth_with_google, created_at;
    `;
    const results = await executeQuery(query, [googleId, avatarUrl, userId]);
    return results[0];
  }
}

module.exports = new AuthRepository();
