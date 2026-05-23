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

  async getRootArea(organizationId) {
    const query = `
			SELECT *
			FROM organization_areas
			WHERE organization_id = $1 AND is_root_area = true AND deleted = false
			LIMIT 1;
		`;
    const results = await executeQuery(query, [organizationId]);
    return results[0];
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
			  AND (is_root_area = false OR $${index + 2}::boolean = false)
			RETURNING *;
		`;

    const hasStructuralChange = fields.parent_area_id !== undefined;
    values.push(areaId, organizationId, hasStructuralChange);

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
			  AND is_root_area = false
			RETURNING *;
		`;
    const results = await executeQuery(query, [areaId, organizationId]);
    return results[0];
  }

  async listAreaMembers(areaId, organizationId) {
    const query = `
			SELECT 
				m.id, m.organization_id, m.area_id, m.user_id, m.role, m.status, m.invited_by, m.deleted, m.removed_at, m.removed_by, m.deleted_at, m.created_at, m.updated_at,
				u.name, u.username, u.email, u.avatar_url
			FROM organization_area_members m
			JOIN users u ON u.user_id = m.user_id
			WHERE m.organization_id = $1
				AND m.deleted = false
				AND m.area_id = $2

			UNION ALL

			SELECT 
				om.id, om.organization_id, $2::uuid AS area_id, om.user_id, om.role, om.status, om.invited_by, om.deleted, om.removed_at, om.removed_by, om.deleted_at, om.created_at, om.updated_at,
				u.name, u.username, u.email, u.avatar_url
			FROM organization_members om
			JOIN users u ON u.user_id = om.user_id
			WHERE om.organization_id = $1
				AND om.deleted = false
				AND om.role IN ('ADMIN', 'SUPER_ADMIN')
				AND EXISTS (
				  SELECT 1 FROM organization_areas a
				  WHERE a.id = $2 AND a.organization_id = $1 AND a.is_root_area = true
				)
			ORDER BY name ASC;
		`;
    return await executeQuery(query, [organizationId, areaId]);
  }

  async getAreaMember(areaId, organizationId, userId) {
    const query = `
			SELECT *
			FROM organization_area_members
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
			WITH existing AS (
				SELECT id, deleted
				FROM organization_area_members
				WHERE organization_id = $1
					AND area_id = $2
					AND user_id = $3
				LIMIT 1
			),
			reactivated AS (
				UPDATE organization_area_members
				SET deleted = false,
						role = UPPER($4)::public.organization_workspace_role_enum,
						invited_by = $5,
						status = 'ACTIVE'::public.organization_member_status_enum,
						updated_at = now(),
						removed_at = NULL,
						removed_by = NULL
				WHERE id = (SELECT id FROM existing WHERE deleted = true)
				RETURNING *
			),
			inserted AS (
				INSERT INTO organization_area_members (
					organization_id,
					area_id,
					user_id,
					role,
					invited_by,
					status
				)
				SELECT $1, $2, $3,
					UPPER($4)::public.organization_workspace_role_enum,
					$5,
					'ACTIVE'::public.organization_member_status_enum
				WHERE NOT EXISTS (SELECT 1 FROM existing)
				RETURNING *
			)
			SELECT * FROM reactivated
			UNION ALL
			SELECT * FROM inserted;
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
			UPDATE organization_area_members
			SET role = UPPER($4)::public.organization_workspace_role_enum,
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
			UPDATE organization_area_members
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
