const { executeQuery } = require("@/database/connection");

class OrganizationAreasRepository {
  async listOrganizationAreas(organizationId) {
    const query = `
			SELECT *
			FROM organization_areas
			WHERE organization_id = $1 AND deleted = false
			ORDER BY area_name ASC;
		`;
    return await executeQuery(query, [organizationId]);
  }

  async getAreaById(areaId, organizationId) {
    const query = `
			SELECT *
			FROM organization_areas
			WHERE id = $1 AND organization_id = $2 AND deleted = false
			LIMIT 1;
		`;
    const results = await executeQuery(query, [areaId, organizationId]);
    return results[0];
  }

  async getAreaBySlug(organizationId, slug) {
    const query = `
			SELECT *
			FROM organization_areas
			WHERE organization_id = $1 AND slug = $2 AND deleted = false
			LIMIT 1;
		`;
    const results = await executeQuery(query, [organizationId, slug]);
    return results[0];
  }

  async getMatchingSlugs(organizationId, slugBase) {
    const query = `
			SELECT slug
			FROM organization_areas
			WHERE organization_id = $1 AND deleted = false AND slug LIKE $2;
		`;
    const rows = await executeQuery(query, [organizationId, `${slugBase}%`]);
    return rows.map((row) => row.slug);
  }

  async createArea({
    organizationId,
    parentAreaId,
    areaName,
    slug,
    description,
    properties,
    createdBy,
  }) {
    const query = `
			INSERT INTO organization_areas (
				organization_id,
				parent_area_id,
				area_name,
				slug,
				description,
				properties,
				created_by
			)
			VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7)
			RETURNING *;
		`;

    const results = await executeQuery(query, [
      organizationId,
      parentAreaId,
      areaName,
      slug,
      description,
      JSON.stringify(properties || {}),
      createdBy,
    ]);

    return results[0];
  }

  async updateArea(areaId, organizationId, fields = {}) {
    const allowed = [
      "area_name",
      "slug",
      "description",
      "properties",
      "active",
      "parent_area_id",
    ];

    const setClauses = [];
    const values = [];
    let index = 1;

    for (const key of allowed) {
      if (fields[key] === undefined) continue;

      if (key === "properties") {
        setClauses.push(`properties = $${index}::jsonb`);
        values.push(JSON.stringify(fields[key]));
      } else {
        setClauses.push(`${key} = $${index}`);
        values.push(fields[key]);
      }
      index += 1;
    }

    if (!setClauses.length) {
      return this.getAreaById(areaId, organizationId);
    }

    setClauses.push("updated_at = CURRENT_TIMESTAMP");

    const query = `
			UPDATE organization_areas
			SET ${setClauses.join(", ")}
			WHERE id = $${index} AND organization_id = $${index + 1}
			RETURNING *;
		`;

    values.push(areaId, organizationId);

    const results = await executeQuery(query, values);
    return results[0];
  }

  async softDeleteArea(areaId, organizationId) {
    const query = `
			UPDATE organization_areas
			SET deleted = true,
					active = false,
					updated_at = CURRENT_TIMESTAMP
			WHERE id = $1 AND organization_id = $2
			RETURNING *;
		`;
    const results = await executeQuery(query, [areaId, organizationId]);
    return results[0];
  }

  async listAreaMembers(areaId, organizationId) {
    const query = `
			SELECT 
				m.*, 
				u.name,
				u.username,
				u.email,
				u.avatar_url
			FROM organization_members m
			JOIN users u ON u.user_id = m.user_id
			WHERE m.organization_id = $1
				AND m.area_id = $2
				AND m.deleted = false
			ORDER BY u.name ASC;
		`;
    return await executeQuery(query, [organizationId, areaId]);
  }

  async getAreaMember(areaId, organizationId, userId) {
    const query = `
			SELECT *
			FROM organization_members
			WHERE organization_id = $1
				AND area_id = $2
				AND user_id = $3
				AND deleted = false
			LIMIT 1;
		`;
    const results = await executeQuery(query, [organizationId, areaId, userId]);
    return results[0];
  }

  async addAreaMember(areaId, organizationId, userId, role, addedBy) {
    const query = `
			INSERT INTO organization_members (
				organization_id,
				area_id,
				user_id,
				role,
				invited_by,
				status
			)
			VALUES ($1, $2, $3, UPPER($4), $5, 'ACTIVE')
			RETURNING *;
		`;
    const results = await executeQuery(query, [
      organizationId,
      areaId,
      userId,
      role,
      addedBy,
    ]);
    return results[0];
  }

  async updateAreaMemberRole(areaId, organizationId, userId, role) {
    const query = `
			UPDATE organization_members
			SET role = UPPER($4),
					updated_at = CURRENT_TIMESTAMP
			WHERE organization_id = $1
				AND area_id = $2
				AND user_id = $3
				AND deleted = false
			RETURNING *;
		`;
    const results = await executeQuery(query, [
      organizationId,
      areaId,
      userId,
      role,
    ]);
    return results[0];
  }

  async removeAreaMember(areaId, organizationId, userId, removedBy) {
    const query = `
			UPDATE organization_members
			SET deleted = true,
					removed_at = CURRENT_TIMESTAMP,
					removed_by = $4,
					updated_at = CURRENT_TIMESTAMP
			WHERE organization_id = $1
				AND area_id = $2
				AND user_id = $3
				AND deleted = false
			RETURNING *;
		`;
    const results = await executeQuery(query, [
      organizationId,
      areaId,
      userId,
      removedBy,
    ]);
    return results[0];
  }
}

module.exports = new OrganizationAreasRepository();
