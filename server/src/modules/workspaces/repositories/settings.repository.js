const { executeQuery } = require("@/database/connection");

class OrganizationSettingsRepository {
  async getSettings(organizationId) {
    const query = `
      SELECT *
      FROM organization_settings
      WHERE organization_id = $1 AND deleted = false
    `;
    const rows = await executeQuery(query, [organizationId]);
    return rows[0] || null;
  }

  async createDefaultSettings(organizationId, client = null) {
    const query = `
      INSERT INTO organization_settings (organization_id)
      VALUES ($1)
      RETURNING *
    `;
    const exec = client ? client.query.bind(client) : executeQuery;
    const res = await exec(query, [organizationId]);
    return res.rows ? res.rows[0] : (Array.isArray(res) ? res[0] : res);
  }

  async updateSAML(organizationId, samlData) {
    const query = `
      UPDATE organization_settings
      SET saml = $2::jsonb, updated_at = NOW()
      WHERE organization_id = $1 AND deleted = false
      RETURNING *
    `;
    const rows = await executeQuery(query, [organizationId, JSON.stringify(samlData)]);
    return rows[0];
  }

  async updateDomains(organizationId, domainsData) {
    const query = `
      UPDATE organization_settings
      SET domains = $2::jsonb, updated_at = NOW()
      WHERE organization_id = $1 AND deleted = false
      RETURNING *
    `;
    const rows = await executeQuery(query, [organizationId, JSON.stringify(domainsData)]);
    return rows[0];
  }

  async updateSettings(organizationId, settingsData) {
    const keys = [];
    const values = [organizationId];
    let i = 2;

    const allowedFields = ["saml", "domains", "tracing", "branding", "preferences", "integrations"];

    for (const [key, value] of Object.entries(settingsData)) {
      if (allowedFields.includes(key)) {
        keys.push(`${key} = $${i}::jsonb`);
        values.push(JSON.stringify(value));
        i++;
      }
    }

    if (keys.length === 0) return this.getSettings(organizationId);

    const query = `
      UPDATE organization_settings
      SET ${keys.join(", ")}, updated_at = NOW()
      WHERE organization_id = $1 AND deleted = false
      RETURNING *
    `;

    const rows = await executeQuery(query, values);
    return rows[0];
  }

  async findByDomain(domainName) {
    const query = `
      SELECT *
      FROM organization_settings
      WHERE deleted = false
        AND EXISTS (
          SELECT 1
          FROM jsonb_array_elements(
            CASE 
              WHEN jsonb_typeof(domains) = 'array' THEN domains 
              ELSE '[]'::jsonb 
            END
          ) AS d
          WHERE d->>'domain_name' = $1
            AND d->>'status' = 'VERIFIED'
        )
      LIMIT 1
    `;
    const rows = await executeQuery(query, [domainName]);
    return rows[0] || null;
  }

  async isDomainRestricted(domainName) {
    const query = `
      SELECT 1
      FROM organization_settings
      WHERE deleted = false
        AND EXISTS (
          SELECT 1
          FROM jsonb_array_elements(
            CASE 
              WHEN jsonb_typeof(domains) = 'array' THEN domains 
              ELSE '[]'::jsonb 
            END
          ) AS d
          WHERE d->>'domain_name' = $1
            AND (d->>'status' = 'VERIFIED' OR d->>'status' = 'PENDING')
        )
      LIMIT 1
    `;
    const rows = await executeQuery(query, [domainName]);
    return rows.length > 0;
  }

  async updateCreationIdentityStep(
    organization_id,
    user_id,
    {
      org_name,
      unique_name,
      logo_url,
      banner_url,
      description,
      country,
    }
  ) {
    const query = `
      UPDATE workspaces o
      SET org_name = $3,
          unique_name = $4,
          logo_url = $5,
          banner_url = $6,
          description = $7,
          default_timezone = $8,
          default_locale = $9,
          country = $10,
          settings = $11::jsonb,
          updated_at = NOW()
      WHERE o.id = $1
        AND (
          o.user_id = $2
          OR EXISTS (
            SELECT 1 FROM organization_members om
            WHERE om.organization_id = o.id
              AND om.user_id = $2
              
              AND om.deleted = false
              AND om.role IN ('SUPER_ADMIN', 'ADMIN')
          )
        )
      RETURNING
        id,
        user_id,
        org_name,
        unique_name,
        logo_url,
        banner_url,
        description,
        country,
        NULL AS plan_snapshot,
        plan_id,
        created_at,
        updated_at,
        deleted;
    `;

    const results = await executeQuery(query, [
      organization_id,
      user_id,
      org_name,
      unique_name,
      logo_url,
      banner_url,
      description,
      country,
    ]);
    return results[0] || null;
  }

  async updateCreationConfigurationStep(
    organization_id,
    user_id,
    { plan_id }
  ) {
    const query = `
      UPDATE workspaces o
      SET plan_id = $3,
          updated_at = NOW()
      WHERE o.id = $1
        AND (
          o.user_id = $2
          OR EXISTS (
            SELECT 1 FROM organization_members om
            WHERE om.organization_id = o.id
              AND om.user_id = $2
              
              AND om.deleted = false
              AND om.role IN ('SUPER_ADMIN', 'ADMIN', 'BILLING_MANAGER')
          )
        )
      RETURNING
        id,
        user_id,
        org_name,
        unique_name,
        logo_url,
        banner_url,
        description,
        country,
        NULL AS plan_snapshot,
        plan_id,
        created_at,
        updated_at,
        deleted;
    `;

    const results = await executeQuery(query, [
      organization_id,
      user_id,
      plan_id,
    ]);
    return results[0] || null;
  }

  // --- SYSTEM SETTINGS ---
  async getSystemSettings() {
    const query = `SELECT * FROM system_settings WHERE id = 1 LIMIT 1;`;
    const results = await executeQuery(query);
    if (!results || results.length === 0) {
      return this.initializeSystemSettings();
    }
    return results[0];
  }

  async initializeSystemSettings() {
    const query = `
      INSERT INTO system_settings (id, storage_config, smtp_config, oauth_config, ai_global_config, instance_branding)
      VALUES (1, '{}', '{}', '{}', '{}', '{}')
      ON CONFLICT (id) DO NOTHING
      RETURNING *;
    `;
    const results = await executeQuery(query);
    if (results && results.length > 0) return results[0];

    const fallbackQuery = `SELECT * FROM system_settings WHERE id = 1 LIMIT 1;`;
    const fallbackResults = await executeQuery(fallbackQuery);
    return fallbackResults[0];
  }

  async updateSystemSettings(updates) {
    const fields = [];
    const values = [];
    let count = 1;

    for (const [key, value] of Object.entries(updates)) {
      if (
        [
          "storage_config",
          "smtp_config",
          "oauth_config",
          "ai_global_config",
          "instance_branding",
        ].includes(key)
      ) {
        fields.push(`${key} = $${count}::jsonb`);
        values.push(typeof value === "string" ? value : JSON.stringify(value));
        count++;
      }
    }

    if (fields.length === 0) return this.getSystemSettings();

    const query = `
      UPDATE system_settings
      SET ${fields.join(", ")}, updated_at = NOW()
      WHERE id = 1
      RETURNING *;
    `;

    const results = await executeQuery(query, values);
    return results[0];
  }
}

module.exports = new OrganizationSettingsRepository();

