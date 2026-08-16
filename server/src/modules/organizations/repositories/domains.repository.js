const { executeQuery } = require("@/database/connection");

class OrganizationDomainsRepository {
  async listByOrganization(organizationId) {
    const query = `
      SELECT
        id,
        organization_id,
        domain_name,
        verification_token,
        status,
        sso_enabled,
        sso_provider,
        sso_metadata,
        verified_at,
        created_at,
        updated_at,
        deleted
      FROM organization_domains
      WHERE organization_id = $1 AND deleted = false
      ORDER BY created_at DESC;
    `;

    return executeQuery(query, [organizationId]);
  }

  async findById(id) {
    const query = `
      SELECT *
      FROM organization_domains
      WHERE id = $1 AND deleted = false
      LIMIT 1;
    `;

    const results = await executeQuery(query, [id]);
    return results[0] || null;
  }

  async findByOrganizationAndName(organizationId, domainName) {
    const query = `
      SELECT *
      FROM organization_domains
      WHERE organization_id = $1
        AND LOWER(domain_name) = LOWER($2)
        AND deleted = false
      LIMIT 1;
    `;

    const results = await executeQuery(query, [organizationId, domainName]);
    return results[0] || null;
  }

  async findActiveByDomain(domainName) {
    const query = `
      SELECT *
      FROM organization_domains
      WHERE LOWER(domain_name) = LOWER($1)
        AND deleted = false
      LIMIT 1;
    `;

    const results = await executeQuery(query, [domainName]);
    return results[0] || null;
  }

  async createDomain({ organizationId, domainName, verificationToken }) {
    const query = `
      INSERT INTO organization_domains (
        organization_id,
        domain_name,
        verification_token
      )
      VALUES ($1, $2, $3)
      RETURNING *;
    `;

    const results = await executeQuery(query, [organizationId, domainName, verificationToken]);

    return results[0];
  }

  async updateVerificationStatus({ domainId, status, verified }) {
    const query = `
      UPDATE organization_domains
      SET status = $2,
          verified_at = $3,
          updated_at = NOW()
      WHERE id = $1
      RETURNING *;
    `;

    const results = await executeQuery(query, [domainId, status, verified ? new Date() : null]);

    return results[0] || null;
  }

  async updateVerificationFailure(domainId) {
    const query = `
      UPDATE organization_domains
      SET status = 'FAILED',
          updated_at = NOW()
      WHERE id = $1
      RETURNING *;
    `;

    const results = await executeQuery(query, [domainId]);
    return results[0] || null;
  }

  async deleteDomain(domainId) {
    const query = `
      UPDATE organization_domains
      SET deleted = true,
          deleted_at = NOW(),
          updated_at = NOW()
      WHERE id = $1
      RETURNING *;
    `;

    const results = await executeQuery(query, [domainId]);
    return results[0] || null;
  }

  async updateSsoConfiguration(domainId, { provider, metadata, enabled }) {
    const query = `
      UPDATE organization_domains
      SET sso_provider = $2,
          sso_metadata = $3::jsonb,
          sso_enabled = $4,
          updated_at = NOW()
      WHERE id = $1
      RETURNING *;
    `;

    const serializedMetadata = metadata ? JSON.stringify(metadata) : null;

    const results = await executeQuery(query, [
      domainId,
      provider || null,
      serializedMetadata,
      Boolean(enabled),
    ]);

    return results[0] || null;
  }
}

module.exports = new OrganizationDomainsRepository();
