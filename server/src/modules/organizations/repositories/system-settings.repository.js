const { executeQuery } = require("@/database/connection");

class SystemSettingsRepository {
  async getSettings() {
    const query = `SELECT * FROM system_settings WHERE id = 1 LIMIT 1;`;
    const result = await executeQuery(query);
    if (result.rows.length === 0) {
      return this.initializeSettings();
    }
    return result.rows[0];
  }

  async initializeSettings() {
    const query = `
      INSERT INTO system_settings (id, storage_config, smtp_config, oauth_config, ai_global_config, instance_branding)
      VALUES (1, '{}', '{}', '{}', '{}', '{}')
      ON CONFLICT (id) DO NOTHING
      RETURNING *;
    `;
    const result = await executeQuery(query);
    if (result.rows && result.rows.length > 0) return result.rows[0];
    
    // In case of conflict (race condition)
    const fallbackQuery = `SELECT * FROM system_settings WHERE id = 1 LIMIT 1;`;
    const fallbackResult = await executeQuery(fallbackQuery);
    return fallbackResult.rows[0];
  }

  async updateSettings(updates) {
    const fields = [];
    const values = [];
    let count = 1;

    for (const [key, value] of Object.entries(updates)) {
      // Allow only known JSON fields
      if (['storage_config', 'smtp_config', 'oauth_config', 'ai_global_config', 'instance_branding'].includes(key)) {
        fields.push(`${key} = $${count}`);
        values.push(value); // Assuming value is an object, node-postgres might need JSON.stringify if not handled. Let's send raw object and pg driver stringifies it or we do. We will use JSON.stringify to be safe.
      }
    }

    if (fields.length === 0) return this.getSettings();

    const query = `
      UPDATE system_settings
      SET ${fields.join(', ')}, updated_at = NOW()
      WHERE id = 1
      RETURNING *;
    `;
    
    const result = await executeQuery(query, values);
    return result.rows[0];
  }
}

module.exports = new SystemSettingsRepository();
