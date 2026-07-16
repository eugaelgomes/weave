const { executeQuery } = require("@/database/connection");

/**
 * Builds parameterized WHERE fragments for project list queries (shared list + stats-style filters).
 *
 * @typedef {{ mode: 'user', userId: string } | { mode: 'organization', organizationId: string }} ProjectListScope
 */

class ProjectsReadRepository {
  /**
   * @param {ProjectListScope} scope
   * @param {Record<string, unknown>} filters
   * @param {string} actorUserId - Authenticated user (ownership filters).
   * @returns {{ conditions: string[], params: unknown[], nextIndex: number }}
   */
  _buildProjectsListConditions(scope, filters, actorUserId) {
    const conditions = [];
    const params = [];
    let i = 1;

    conditions.push("p.deleted = false");

    if (scope.mode === "organization") {
      params.push(scope.organizationId);
      conditions.push(`p.organization_id = $${i}::uuid`);
      i++;
    } else {
      params.push(scope.userId);
      conditions.push(`(
          p.user_id::text = $${i}::text
          OR EXISTS (
            SELECT 1 FROM project_members pm0
            WHERE pm0.project_id = p.id
              AND pm0.user_id::text = $${i}::text
              AND pm0.deleted = false
          )
        )`);
      i++;
    }

    if (filters.organization_id) {
      params.push(filters.organization_id);
      conditions.push(`p.organization_id = $${i}::uuid`);
      i++;
    }

    if (filters.parent_only) {
      conditions.push("p.parent_project_id IS NULL");
    }
    if (filters.has_parent) {
      conditions.push("p.parent_project_id IS NOT NULL");
    }

    if (filters.active === true || filters.active === false) {
      params.push(filters.active);
      conditions.push(`p.active = $${i}`);
      i++;
    }

    if (filters.status?.length) {
      params.push(filters.status);
      conditions.push(`p.status = ANY($${i}::project_status[])`);
      i++;
    }

    if (filters.methodology?.length) {
      params.push(filters.methodology);
      conditions.push(`p.methodology = ANY($${i}::project_methodology_enum[])`);
      i++;
    }

    if (filters.visibility?.length) {
      params.push(filters.visibility);
      conditions.push(`p.visibility = ANY($${i}::project_visibility_enum[])`);
      i++;
    }

    if (filters.owner_user_id) {
      params.push(filters.owner_user_id);
      conditions.push(`p.user_id::text = $${i}::text`);
      i++;
    }

    if (filters.collaborator_user_id) {
      params.push(filters.collaborator_user_id);
      conditions.push(`EXISTS (
          SELECT 1 FROM project_members pmc
          WHERE pmc.project_id = p.id
            AND pmc.user_id::text = $${i}::text
            AND pmc.deleted = false
        )`);
      i++;
    }

    if (filters.ownership === "owned") {
      params.push(actorUserId);
      conditions.push(`p.user_id::text = $${i}::text`);
      i++;
    } else if (filters.ownership === "collaborating") {
      params.push(actorUserId);
      conditions.push(`p.user_id::text <> $${i}::text`);
      i++;
      params.push(actorUserId);
      conditions.push(`EXISTS (
          SELECT 1 FROM project_members pmo
          WHERE pmo.project_id = p.id
            AND pmo.user_id::text = $${i}::text
            AND pmo.deleted = false
        )`);
      i++;
    }

    if (filters.created_from) {
      params.push(filters.created_from);
      conditions.push(`p.created_at >= $${i}::timestamptz`);
      i++;
    }
    if (filters.created_to) {
      params.push(filters.created_to);
      conditions.push(`p.created_at <= $${i}::timestamptz`);
      i++;
    }
    if (filters.updated_from) {
      params.push(filters.updated_from);
      conditions.push(`p.updated_at >= $${i}::timestamptz`);
      i++;
    }
    if (filters.updated_to) {
      params.push(filters.updated_to);
      conditions.push(`p.updated_at <= $${i}::timestamptz`);
      i++;
    }
    if (filters.start_from) {
      params.push(filters.start_from);
      conditions.push(`p.start_date >= $${i}::date`);
      i++;
    }
    if (filters.start_to) {
      params.push(filters.start_to);
      conditions.push(`p.start_date <= $${i}::date`);
      i++;
    }
    if (filters.target_end_from) {
      params.push(filters.target_end_from);
      conditions.push(`p.target_end_date >= $${i}::date`);
      i++;
    }
    if (filters.target_end_to) {
      params.push(filters.target_end_to);
      conditions.push(`p.target_end_date <= $${i}::date`);
      i++;
    }

    if (
      typeof filters.progress_min === "number" &&
      !Number.isNaN(filters.progress_min)
    ) {
      params.push(filters.progress_min);
      conditions.push(`p.progress >= $${i}::numeric`);
      i++;
    }
    if (
      typeof filters.progress_max === "number" &&
      !Number.isNaN(filters.progress_max)
    ) {
      params.push(filters.progress_max);
      conditions.push(`p.progress <= $${i}::numeric`);
      i++;
    }

    if (filters.search) {
      params.push(`%${filters.search}%`);
      conditions.push(`(
          LOWER(p.title) LIKE LOWER($${i})
          OR LOWER(COALESCE(p.description, '')) LIKE LOWER($${i})
        )`);
      i++;
    }

    if (filters.priority?.length) {
      params.push(filters.priority);
      conditions.push(`p.properties->>'priority' = ANY($${i}::text[])`);
      i++;
    }

    if (filters.tags?.length) {
      params.push(JSON.stringify(filters.tags));
      conditions.push(
        `COALESCE(p.properties->'tags','[]'::jsonb) @> $${i}::jsonb`
      );
      i++;
    }

    return { conditions, nextIndex: i, params };
  }

  /**
   * Paginated / filtered project root list with optional sparse includes.
   *
   * @param {ProjectListScope} scope
   * @param {Record<string, unknown>} filters
   * @param {{ limit: number, offset: number }} pagination
   * @param {{ field: string, order: string }} sort
   * @param {{ collaborators: boolean, notes: boolean, subprojects: boolean }} include
   * @param {string} actorUserId
   * @returns {Promise<{ rows: object[], total: number }>}
   */
  async getAllProjectsFiltered(
    scope,
    filters,
    pagination,
    sort,
    include,
    actorUserId
  ) {
    const { conditions, params, nextIndex } = this._buildProjectsListConditions(
      scope,
      filters,
      actorUserId
    );
    const whereClause = conditions.join("\n        AND ");

    const sortMap = {
      created_at: "p.created_at",
      progress: "p.progress",
      start_date: "p.start_date",
      target_end_date: "p.target_end_date",
      title: "p.title",
      updated_at: "p.updated_at",
    };
    const sortCol = sortMap[sort.field] || "p.created_at";
    const sortDir = sort.order === "asc" ? "ASC" : "DESC";

    const collaboratorsSql = include.collaborators
      ? `COALESCE(
          (SELECT jsonb_agg(row.obj)
           FROM (
             SELECT DISTINCT ON (pm.user_id) jsonb_build_object(
              'user_id', pm.user_id::text,
              'name', cu.name,
              'username', cu.username,
              'email', cu.email,
              'avatar_url', cu.avatar_url,
              'role', pm.role,
              'added_at', pm.created_at,
              'added_by', pm.added_by::text
            ) AS obj
             FROM project_members pm
             JOIN users cu ON cu.user_id = pm.user_id
             WHERE pm.project_id = p.id AND pm.deleted = false
             ORDER BY pm.user_id, pm.created_at DESC
           ) row),
          '[]'::jsonb
        )`
      : `'[]'::jsonb`;

    const notesSql = include.notes
      ? `COALESCE(
          (SELECT jsonb_agg(
            jsonb_build_object(
              'id', n.id::text,
              'public_id', n.public_note_id,
              'title', n.title,
              'description', n.description,
              'tags', n.tags,
              'status', n.status,
              'created_at', n.created_at,
              'updated_at', n.updated_at,
              'created_by', jsonb_build_object(
                'user_id', n.user_id::text,
                'username', nu.username
              )
            )
          ) FROM notes n
          JOIN users nu ON nu.user_id = n.user_id
          WHERE n.project_id = p.id AND n.deleted = false),
          '[]'::jsonb
        )`
      : `'[]'::jsonb`;

    const subprojectsSql = include.subprojects
      ? `COALESCE(
          (SELECT jsonb_agg(
            jsonb_build_object(
              'id', sp.id::text,
              'public_id', sp.public_project_id,
              'title', sp.title,
              'description', sp.description,
              'status', sp.status,
              'properties', sp.properties,
              'created_at', sp.created_at,
              'updated_at', sp.updated_at
            )
          ) FROM projects sp
          WHERE sp.parent_project_id = p.id AND sp.deleted = false),
          '[]'::jsonb
        )`
      : `'[]'::jsonb`;

    let paramIdx = nextIndex;
    params.push(pagination.limit);
    const limIdx = paramIdx;
    paramIdx++;
    params.push(pagination.offset);
    const offIdx = paramIdx;

    const query = `
      SELECT 
        p.id::text,
        p.public_project_id,
        p.user_id::text,
        p.parent_project_id::text,
        p.title,
        p.description,
        p.methodology,
        p.properties,
        p.projects_files,
        p.status,
        p.created_at,
        p.updated_at,
        p.deleted,
        p.active,
        u.username AS owner_username,
        u.email AS owner_email,
        u.name AS owner_name,
        u.avatar_url AS owner_avatar_url,
        p.organization_id as organization_id,
        o.org_name as organization_name,
        o.unique_name as organization_unique_name,
        o.logo_url as organization_logo_url,
        ${collaboratorsSql} AS collaborators,
        ${notesSql} AS associated_notes,
        ${subprojectsSql} AS subprojects,
        COUNT(*) OVER() AS total_count
      FROM projects p
      JOIN users u ON u.user_id = p.user_id
      LEFT JOIN organizations o ON o.id = p.organization_id
      WHERE ${whereClause}
      ORDER BY ${sortCol} ${sortDir}
      LIMIT $${limIdx} OFFSET $${offIdx};
    `;

    const rows = await executeQuery(query, params);
    const total =
      rows.length > 0 ? parseInt(String(rows[0].total_count), 10) || 0 : 0;
    const stripped = rows.map((r) => {
      const row = { ...r };
      delete row.total_count;
      return row;
    });
    return { rows: stripped, total };
  }

  async getAllProjects(userId) {
    const query = `
      SELECT 
        p.id::text,
        p.public_project_id,
        p.user_id::text,
        p.parent_project_id::text,
        p.title,
        p.description,
        p.methodology,
        p.properties,
        p.projects_files,
        p.status,
        p.created_at,
        p.updated_at,
        p.deleted,
        p.active,
        u.username AS owner_username,
        u.email AS owner_email,
        u.name AS owner_name,
        u.avatar_url AS owner_avatar_url,
        p.organization_id as organization_id,
        o.org_name as organization_name,
        o.unique_name as organization_unique_name,
        o.logo_url as organization_logo_url,
        (
          SELECT COUNT(*)::int
          FROM project_stages ps
          WHERE ps.project_id = p.id
        ) AS stages_count,
        COALESCE(
          jsonb_agg(
            DISTINCT jsonb_build_object(
              'user_id', pm.user_id::text,
              'name', cu.name,
              'username', cu.username,
              'email', cu.email,
              'avatar_url', cu.avatar_url,
              'role', pm.role,
              'added_at', pm.created_at,
              'added_by', pm.added_by::text
            )
          ) FILTER (WHERE pm.id IS NOT NULL AND pm.deleted = false),
          '[]'::jsonb
        ) AS collaborators,
        COALESCE(
          (SELECT jsonb_agg(
            jsonb_build_object(
              'id', n.id::text,
              'public_id', n.public_note_id,
              'title', n.title,
              'description', n.description,
              'tags', n.tags,
              'status', n.status,
              'created_at', n.created_at,
              'updated_at', n.updated_at,
              'created_by', jsonb_build_object(
                'user_id', n.user_id::text,
                'username', nu.username
              )
            )
          ) FROM notes n
          JOIN users nu ON nu.user_id = n.user_id
          WHERE n.project_id = p.id AND n.deleted = false),
          '[]'::jsonb
        ) AS associated_notes,
        COALESCE(
          (SELECT jsonb_agg(
            jsonb_build_object(
              'id', sp.id::text,
              'public_id', sp.public_project_id,
              'title', sp.title,
              'description', sp.description,
              'status', sp.status,
              'properties', sp.properties,
              'created_at', sp.created_at,
              'updated_at', sp.updated_at
            )
          ) FROM projects sp
          WHERE sp.parent_project_id = p.id AND sp.deleted = false),
          '[]'::jsonb
        ) AS subprojects
      FROM projects p
      JOIN users u ON u.user_id = p.user_id
      LEFT JOIN organizations o ON o.id = p.organization_id
      LEFT JOIN project_members pm ON pm.project_id = p.id AND pm.deleted = false
      LEFT JOIN users cu ON cu.user_id = pm.user_id
      WHERE p.deleted = false
        AND p.parent_project_id IS NULL
        AND (
          p.user_id::text = $1::text
          OR EXISTS (
            SELECT 1 FROM project_members pm2
            WHERE pm2.project_id = p.id
              AND pm2.user_id::text = $1::text
              AND pm2.deleted = false
          )
        )
      GROUP BY p.id, u.username, u.email, u.name, u.avatar_url, o.org_name, o.unique_name, o.logo_url
      ORDER BY p.created_at DESC;
    `;
    return executeQuery(query, [userId]);
  }

  async getProjectById(projectId, userId) {
    const query = `
      SELECT 
        id::text,
        public_project_id,
        user_id::text,
        title,
        description,
        properties,
        projects_files,
        status,
        created_at,
        updated_at,
        deleted
      FROM projects
      WHERE (id::text = $1 OR public_project_id = $1)
        AND user_id = $2
        AND deleted = false
      LIMIT 1;
    `;
    return executeQuery(query, [projectId, userId]);
  }

  async getProjectByIdWithAccess(projectId, userId) {
    const query = `
      SELECT 
        p.id::text,
        p.public_project_id,
        p.user_id::text,
        p.parent_project_id::text,
        p.title,
        p.description,
        p.methodology,
        p.properties,
        p.projects_files,
        p.status,
        p.created_at,
        p.updated_at,
        p.deleted,
        p.active,
        u.username AS owner_username,
        u.email AS owner_email,
        u.name AS owner_name,
        u.avatar_url AS owner_avatar_url,
        p.organization_id as organization_id,
        o.org_name as organization_name,
        o.unique_name as organization_unique_name,
        o.logo_url as organization_logo_url,
        COALESCE(
          jsonb_agg(
            DISTINCT jsonb_build_object(
              'user_id', pm.user_id::text,
              'name', cu.name,
              'username', cu.username,
              'email', cu.email,
              'avatar_url', cu.avatar_url,
              'role', pm.role,
              'added_at', pm.created_at,
              'added_by', pm.added_by::text
            )
          ) FILTER (WHERE pm.id IS NOT NULL AND pm.deleted = false),
          '[]'::jsonb
        ) AS collaborators,
        COALESCE(
          (SELECT jsonb_agg(
            jsonb_build_object(
              'id', n.id::text,
              'public_id', n.public_note_id,
              'title', n.title,
              'description', n.description,
              'tags', n.tags,
              'status', n.status,
              'created_at', n.created_at,
              'updated_at', n.updated_at,
              'created_by', jsonb_build_object(
                'user_id', n.user_id::text,
                'username', nu.username
              )
            )
          ) FROM notes n
          JOIN users nu ON nu.user_id = n.user_id
          WHERE n.project_id = p.id AND n.deleted = false),
          '[]'::jsonb
        ) AS associated_notes
      FROM projects p
      JOIN users u ON u.user_id = p.user_id
      LEFT JOIN organizations o ON o.id = p.organization_id
      LEFT JOIN project_members pm ON pm.project_id = p.id AND pm.deleted = false
      LEFT JOIN users cu ON cu.user_id = pm.user_id
      WHERE (p.id::text = $1 OR p.public_project_id = $1)
        AND p.deleted = false
        AND (
          p.user_id::text = $2::text
          OR EXISTS (
            SELECT 1 FROM project_members pm2
            WHERE pm2.project_id = p.id
              AND pm2.user_id::text = $2::text
              AND pm2.deleted = false
          )
        )
      GROUP BY p.id, u.username, u.email, u.name, u.avatar_url, o.org_name, o.unique_name, o.logo_url
      LIMIT 1;
    `;
    return executeQuery(query, [projectId, userId]);
  }

  /** Lista raízes de projeto de toda a organização (admin / super_admin). */
  async getAllProjectsInOrganization(organizationId) {
    const query = `
      SELECT 
        p.id::text,
        p.public_project_id,
        p.user_id::text,
        p.parent_project_id::text,
        p.title,
        p.description,
        p.methodology,
        p.properties,
        p.projects_files,
        p.status,
        p.created_at,
        p.updated_at,
        p.deleted,
        p.active,
        u.username AS owner_username,
        u.email AS owner_email,
        u.name AS owner_name,
        u.avatar_url AS owner_avatar_url,
        p.organization_id as organization_id,
        o.org_name as organization_name,
        o.unique_name as organization_unique_name,
        o.logo_url as organization_logo_url,
        COALESCE(
          jsonb_agg(
            DISTINCT jsonb_build_object(
              'user_id', pm.user_id::text,
              'name', cu.name,
              'username', cu.username,
              'email', cu.email,
              'avatar_url', cu.avatar_url,
              'role', pm.role,
              'added_at', pm.created_at,
              'added_by', pm.added_by::text
            )
          ) FILTER (WHERE pm.id IS NOT NULL AND pm.deleted = false),
          '[]'::jsonb
        ) AS collaborators,
        COALESCE(
          (SELECT jsonb_agg(
            jsonb_build_object(
              'id', n.id::text,
              'public_id', n.public_note_id,
              'title', n.title,
              'description', n.description,
              'tags', n.tags,
              'status', n.status,
              'created_at', n.created_at,
              'updated_at', n.updated_at,
              'created_by', jsonb_build_object(
                'user_id', n.user_id::text,
                'username', nu.username
              )
            )
          ) FROM notes n
          JOIN users nu ON nu.user_id = n.user_id
          WHERE n.project_id = p.id AND n.deleted = false),
          '[]'::jsonb
        ) AS associated_notes,
        COALESCE(
          (SELECT jsonb_agg(
            jsonb_build_object(
              'id', sp.id::text,
              'public_id', sp.public_project_id,
              'title', sp.title,
              'description', sp.description,
              'status', sp.status,
              'properties', sp.properties,
              'created_at', sp.created_at,
              'updated_at', sp.updated_at
            )
          ) FROM projects sp
          WHERE sp.parent_project_id = p.id AND sp.deleted = false),
          '[]'::jsonb
        ) AS subprojects
      FROM projects p
      JOIN users u ON u.user_id = p.user_id
      LEFT JOIN organizations o ON o.id = p.organization_id
      LEFT JOIN project_members pm ON pm.project_id = p.id AND pm.deleted = false
      LEFT JOIN users cu ON cu.user_id = pm.user_id
      WHERE p.deleted = false
        AND p.parent_project_id IS NULL
        AND p.organization_id = $1::uuid
      GROUP BY p.id, u.username, u.email, u.name, u.avatar_url, o.org_name, o.unique_name, o.logo_url
      ORDER BY p.created_at DESC;
    `;
    return executeQuery(query, [organizationId]);
  }

  /** Detalhe de projeto desde que pertença à organização (sem ser dono/membro). */
  async getProjectByIdWithOrgScope(projectId, organizationId) {
    const query = `
      SELECT 
        p.id::text,
        p.public_project_id,
        p.user_id::text,
        p.parent_project_id::text,
        p.title,
        p.description,
        p.methodology,
        p.properties,
        p.projects_files,
        p.status,
        p.created_at,
        p.updated_at,
        p.deleted,
        p.active,
        u.username AS owner_username,
        u.email AS owner_email,
        u.name AS owner_name,
        u.avatar_url AS owner_avatar_url,
        p.organization_id as organization_id,
        o.org_name as organization_name,
        o.unique_name as organization_unique_name,
        o.logo_url as organization_logo_url,
        COALESCE(
          jsonb_agg(
            DISTINCT jsonb_build_object(
              'user_id', pm.user_id::text,
              'name', cu.name,
              'username', cu.username,
              'email', cu.email,
              'avatar_url', cu.avatar_url,
              'role', pm.role,
              'added_at', pm.created_at,
              'added_by', pm.added_by::text
            )
          ) FILTER (WHERE pm.id IS NOT NULL AND pm.deleted = false),
          '[]'::jsonb
        ) AS collaborators,
        COALESCE(
          (SELECT jsonb_agg(
            jsonb_build_object(
              'id', n.id::text,
              'public_id', n.public_note_id,
              'title', n.title,
              'description', n.description,
              'tags', n.tags,
              'status', n.status,
              'created_at', n.created_at,
              'updated_at', n.updated_at,
              'created_by', jsonb_build_object(
                'user_id', n.user_id::text,
                'username', nu.username
              )
            )
          ) FROM notes n
          JOIN users nu ON nu.user_id = n.user_id
          WHERE n.project_id = p.id AND n.deleted = false),
          '[]'::jsonb
        ) AS associated_notes
      FROM projects p
      JOIN users u ON u.user_id = p.user_id
      LEFT JOIN organizations o ON o.id = p.organization_id
      LEFT JOIN project_members pm ON pm.project_id = p.id AND pm.deleted = false
      LEFT JOIN users cu ON cu.user_id = pm.user_id
      WHERE (p.id::text = $1 OR p.public_project_id = $1)
        AND p.deleted = false
        AND p.organization_id = $2::uuid
      GROUP BY p.id, u.username, u.email, u.name, u.avatar_url, o.org_name, o.unique_name, o.logo_url
      LIMIT 1;
    `;
    return executeQuery(query, [projectId, organizationId]);
  }

  async getProjectsWithUserInfo(userId) {
    const query = `
      SELECT 
        p.id::text,
        p.title,
        p.description,
        p.properties,
        p.status,
        p.created_at,
        p.updated_at,
        u.user_id::text AS owner_id,
        u.username AS owner_username,
        u.email AS owner_email
      FROM projects p
      JOIN users u ON u.user_id = p.user_id
      WHERE p.user_id = $1
        AND p.deleted = false
      ORDER BY p.created_at DESC;
    `;
    return executeQuery(query, [userId]);
  }
  /**
   * Returns the first stage id for a project (lowest position).
   *
   * @param {string} projectId
   * @returns {Promise<string|null>}
   */
  async getFirstProjectStageId(projectId) {
    const query = `
      SELECT id::text
      FROM project_stages
      WHERE project_id = $1::uuid
      ORDER BY "position" ASC
      LIMIT 1;
    `;
    const rows = await executeQuery(query, [projectId]);
    return rows?.[0]?.id ? String(rows[0].id) : null;
  }

  async getProjectStages(projectId) {
    const query = `
      SELECT 
        id::text,
        project_id::text,
        name,
        "position",
        color,
        properties,
        created_at,
        updated_at
      FROM project_stages
      WHERE project_id = $1::uuid
      ORDER BY "position" ASC;
    `;

    return executeQuery(query, [projectId]);
  }

  /**
   * Filtered / paginated stages for a project.
   *
   * @param {string} projectId
   * @param {Record<string, unknown>} filters
   * @param {{ limit: number, offset: number }} pagination
   * @param {{ field: string, order: string }} sort
   * @returns {Promise<{ rows: object[], total: number }>}
   */
  async getProjectStagesFiltered(projectId, filters, pagination, sort) {
    const conditions = ["project_id = $1::uuid", "deleted = false"];
    const params = [projectId];
    let i = 2;

    if (filters.include_done === false) {
      conditions.push(
        `COALESCE((properties->>'is_done')::boolean, false) = false`
      );
    }

    if (filters.search) {
      params.push(`%${filters.search}%`);
      conditions.push(`LOWER(name) LIKE LOWER($${i})`);
      i++;
    }

    const sortMap = {
      created_at: "created_at",
      name: "name",
      position: '"position"',
    };
    const sortCol = sortMap[sort.field] || '"position"';
    const sortDir = sort.order === "asc" ? "ASC" : "DESC";

    params.push(pagination.limit);
    const limIdx = i;
    i++;
    params.push(pagination.offset);
    const offIdx = i;

    const whereClause = conditions.join(" AND ");
    const query = `
      SELECT 
        id::text,
        project_id::text,
        name,
        "position",
        color,
        properties,
        created_at,
        updated_at,
        COUNT(*) OVER() AS total_count
      FROM project_stages
      WHERE ${whereClause}
      ORDER BY ${sortCol} ${sortDir}
      LIMIT $${limIdx} OFFSET $${offIdx};
    `;

    const rows = await executeQuery(query, params);
    const total =
      rows.length > 0 ? parseInt(String(rows[0].total_count), 10) || 0 : 0;
    const stripped = rows.map((r) => {
      const row = { ...r };
      delete row.total_count;
      return row;
    });
    return { rows: stripped, total };
  }

  /**
   * Lightweight child projects (same shape as list subprojects aggregate).
   *
   * @param {string} parentProjectId
   * @returns {Promise<object[]>}
   */
  async getSubprojectsLight(parentProjectId) {
    const query = `
      SELECT 
        id::text,
        public_project_id,
        title,
        description,
        status,
        properties,
        created_at,
        updated_at
      FROM projects sp
      WHERE sp.parent_project_id = $1::uuid
        AND sp.deleted = false
      ORDER BY sp.created_at DESC;
    `;
    return executeQuery(query, [parentProjectId]);
  }

  async getCollaborators(projectId, userId) {
    const query = `
      SELECT 
        p.id::text,
        p.user_id::text,
        COALESCE(
          jsonb_agg(
            jsonb_build_object(
              'user_id', pm.user_id::text,
              'name', u.name,
              'username', u.username,
              'email', u.email,
              'avatar_url', u.avatar_url,
              'role', pm.role,
              'added_at', pm.created_at,
              'added_by', pm.added_by::text
            )
          ) FILTER (WHERE pm.id IS NOT NULL AND pm.deleted = false),
          '[]'::jsonb
        ) AS collaborators
      FROM projects p
      LEFT JOIN project_members pm ON pm.project_id = p.id AND pm.deleted = false
      LEFT JOIN users u ON u.user_id = pm.user_id
      WHERE p.id = $1::uuid
        AND p.deleted = false
        AND (
          p.user_id::text = $2::text
          OR EXISTS (
            SELECT 1 FROM project_members pm2
            WHERE pm2.project_id = p.id
              AND pm2.user_id::text = $2::text
              AND pm2.deleted = false
          )
        )
      GROUP BY p.id;
    `;

    return executeQuery(query, [projectId, userId]);
  }

  async getCollaboratorsWithOrgScope(projectId, organizationId) {
    const query = `
      SELECT 
        p.id::text,
        p.user_id::text,
        COALESCE(
          jsonb_agg(
            jsonb_build_object(
              'user_id', pm.user_id::text,
              'name', u.name,
              'username', u.username,
              'email', u.email,
              'avatar_url', u.avatar_url,
              'role', pm.role,
              'added_at', pm.created_at,
              'added_by', pm.added_by::text
            )
          ) FILTER (WHERE pm.id IS NOT NULL AND pm.deleted = false),
          '[]'::jsonb
        ) AS collaborators
      FROM projects p
      LEFT JOIN project_members pm ON pm.project_id = p.id AND pm.deleted = false
      LEFT JOIN users u ON u.user_id = pm.user_id
      WHERE p.id = $1::uuid
        AND p.organization_id = $2::uuid
        AND p.deleted = false
      GROUP BY p.id;
    `;

    return executeQuery(query, [projectId, organizationId]);
  }
  async isCollaborator(projectId, userId) {
    const query = `
      SELECT EXISTS (
        SELECT 1
        FROM project_members pm
        WHERE pm.project_id = $1::uuid
          AND pm.user_id::text = $2::text
          AND pm.deleted = false
      ) AS is_collaborator;
    `;

    const result = await executeQuery(query, [projectId, userId]);
    return result[0]?.is_collaborator || false;
  }

  async getProjectMemberRole(projectId, userId) {
    const query = `
      SELECT pm.role
      FROM project_members pm
      WHERE pm.project_id = $1::uuid
        AND pm.user_id::text = $2::text
        AND pm.deleted = false
      LIMIT 1;
    `;
    const result = await executeQuery(query, [projectId, userId]);
    return result[0]?.role || null;
  }

  async isCollaboratorInProject(projectId, userId) {
    const query = `
      SELECT EXISTS (
        SELECT 1
        FROM project_members pm
        WHERE pm.project_id = $1::uuid
          AND pm.user_id::text = $2::text
          AND pm.deleted = false
      ) AS is_collaborator;
    `;

    const result = await executeQuery(query, [projectId, userId]);
    return result[0]?.is_collaborator || false;
  }
  async getAssociatedNotesWithOrgScope(projectId, organizationId) {
    const query = `
      SELECT 
        n.id::text,
        n.public_note_id AS public_id,
        n.user_id::text,
        n.project_id::text,
        n.title,
        n.description,
        n.tags,
        n.status,
        n.project_stage_id::text,
        n.parent_id::text AS parent_id,
        n.properties,
        n.priority_id::text,
        n.due_date,
        n.created_at,
        n.updated_at,
        nu.username AS created_by_username,
        COALESCE(
          (
            SELECT jsonb_agg(
              jsonb_build_object(
                'user_id', c.user_id::text,
                'username', c.username,
                'avatar_url', c.avatar_url
              )
            )
            FROM note_collaborators nc
            JOIN users c ON c.user_id = nc.user_id
            WHERE nc.note_id = n.id
              AND nc.removed = false
          ),
          '[]'::jsonb
        ) AS collaborators
      FROM notes n
      JOIN users nu ON nu.user_id = n.user_id
      WHERE n.project_id = $1::uuid
        AND n.deleted = false
        AND EXISTS (
          SELECT 1 FROM projects p
          WHERE p.id = $1::uuid
            AND p.organization_id = $2::uuid
            AND p.deleted = false
        )
      ORDER BY n.updated_at DESC;
    `;

    return executeQuery(query, [projectId, organizationId]);
  }
  async getAssociatedNotes(projectId, userId) {
    const query = `
      SELECT 
        n.id::text,
        n.public_note_id AS public_id,
        n.user_id::text,
        n.project_id::text,
        n.title,
        n.description,
        n.tags,
        n.status,
        n.project_stage_id::text,
        n.parent_id::text AS parent_id,
        n.properties,
        n.priority_id::text,
        n.due_date,
        n.created_at,
        n.updated_at,
        nu.username AS created_by_username,
        COALESCE(
          (
            SELECT jsonb_agg(
              jsonb_build_object(
                'user_id', c.user_id::text,
                'username', c.username,
                'avatar_url', c.avatar_url
              )
            )
            FROM note_collaborators nc
            JOIN users c ON c.user_id = nc.user_id
            WHERE nc.note_id = n.id
              AND nc.removed = false
          ),
          '[]'::jsonb
        ) AS collaborators
      FROM notes n
      JOIN users nu ON nu.user_id = n.user_id
      WHERE n.project_id = $1::uuid
        AND n.deleted = false
        AND EXISTS (
          SELECT 1 FROM projects p
          WHERE p.id = $1::uuid
            AND p.deleted = false
            AND (
              p.user_id::text = $2::text
              OR EXISTS (
                SELECT 1 FROM project_members pm
                WHERE pm.project_id = $1::uuid
                  AND pm.user_id::text = $2::text
                  AND pm.deleted = false
              )
            )
        )
      ORDER BY n.updated_at DESC;
    `;

    return executeQuery(query, [projectId, userId]);
  }

  /**
   * Paginated notes for a project with filters (member or org-wide scope).
   *
   * @param {string} projectId
   * @param {{ type: 'member', userId: string } | { type: 'organization', organizationId: string }} scope
   * @param {Record<string, unknown>} filters
   * @param {{ limit: number, offset: number }} pagination
   * @param {{ field: string, order: string }} sort
   * @returns {Promise<{ rows: object[], total: number }>}
   */
  async getAssociatedNotesFiltered(
    projectId,
    scope,
    filters,
    pagination,
    sort
  ) {
    const params = [projectId];
    let i = 2;

    let accessClause;
    if (scope.type === "organization") {
      params.push(scope.organizationId);
      accessClause = `EXISTS (
          SELECT 1 FROM projects p
          WHERE p.id = $1::uuid
            AND p.organization_id = $${i}::uuid
            AND p.deleted = false
        )`;
      i++;
    } else {
      params.push(scope.userId);
      accessClause = `EXISTS (
          SELECT 1 FROM projects p
          WHERE p.id = $1::uuid
            AND p.deleted = false
            AND (
              p.user_id::text = $${i}::text
              OR EXISTS (
                SELECT 1 FROM project_members pm
                WHERE pm.project_id = $1::uuid
                  AND pm.user_id::text = $${i}::text
                  AND pm.deleted = false
              )
            )
        )`;
      i++;
    }

    const conditions = [
      "n.project_id = $1::uuid",
      "n.deleted = false",
      accessClause,
    ];

    if (filters.status?.length) {
      params.push(filters.status);
      conditions.push(`n.status = ANY($${i}::notes_status[])`);
      i++;
    }

    if (filters.priority_id?.length) {
      params.push(filters.priority_id);
      conditions.push(`n.priority_id = ANY($${i}::uuid[])`);
      i++;
    }

    if (filters.tags?.length) {
      params.push(filters.tags);
      conditions.push(`n.tags @> $${i}::uuid[]`);
      i++;
    }

    if (filters.stage_id?.length) {
      params.push(filters.stage_id);
      conditions.push(`n.project_stage_id = ANY($${i}::uuid[])`);
      i++;
    }

    if (filters.created_by?.length) {
      params.push(filters.created_by);
      conditions.push(`n.user_id = ANY($${i}::uuid[])`);
      i++;
    }

    if (filters.collaborator_user_id?.length) {
      params.push(filters.collaborator_user_id);
      conditions.push(`EXISTS (
          SELECT 1 FROM note_collaborators nc_f
          WHERE nc_f.note_id = n.id
            AND nc_f.user_id = ANY($${i}::uuid[])
            AND nc_f.removed = false
        )`);
      i++;
    }

    if (filters.due_from) {
      params.push(filters.due_from);
      conditions.push(`n.due_date >= $${i}::timestamptz`);
      i++;
    }
    if (filters.due_to) {
      params.push(filters.due_to);
      conditions.push(`n.due_date <= $${i}::timestamptz`);
      i++;
    }

    if (filters.created_from) {
      params.push(filters.created_from);
      conditions.push(`n.created_at >= $${i}::timestamptz`);
      i++;
    }
    if (filters.created_to) {
      params.push(filters.created_to);
      conditions.push(`n.created_at <= $${i}::timestamptz`);
      i++;
    }

    if (filters.updated_from) {
      params.push(filters.updated_from);
      conditions.push(`n.updated_at >= $${i}::timestamptz`);
      i++;
    }
    if (filters.updated_to) {
      params.push(filters.updated_to);
      conditions.push(`n.updated_at <= $${i}::timestamptz`);
      i++;
    }

    if (filters.search) {
      params.push(`%${filters.search}%`);
      conditions.push(`(
          LOWER(n.title) LIKE LOWER($${i})
          OR LOWER(COALESCE(n.description, '')) LIKE LOWER($${i})
        )`);
      i++;
    }

    const sortMap = {
      created_at: "n.created_at",
      due_date: "n.due_date NULLS LAST",
      title: "n.title",
      updated_at: "n.updated_at",
    };
    const sortCol = sortMap[sort.field] || "n.updated_at";
    const sortDir = sort.order === "asc" ? "ASC" : "DESC";

    params.push(pagination.limit);
    const limIdx = i;
    i++;
    params.push(pagination.offset);
    const offIdx = i;

    const whereClause = conditions.join("\n        AND ");

    const query = `
      SELECT 
        n.id::text,
        n.public_note_id AS public_id,
        n.user_id::text,
        n.project_id::text,
        n.title,
        n.description,
        n.tags,
        n.status,
        n.project_stage_id::text,
        n.parent_id::text AS parent_id,
        n.properties,
        n.priority_id::text,
        n.due_date,
        n.created_at,
        n.updated_at,
        nu.username AS created_by_username,
        COALESCE(
          (
            SELECT jsonb_agg(
              jsonb_build_object(
                'user_id', c.user_id::text,
                'username', c.username,
                'avatar_url', c.avatar_url
              )
            )
            FROM note_collaborators nc
            JOIN users c ON c.user_id = nc.user_id
            WHERE nc.note_id = n.id
              AND nc.removed = false
          ),
          '[]'::jsonb
        ) AS collaborators,
        COUNT(*) OVER() AS total_count
      FROM notes n
      JOIN users nu ON nu.user_id = n.user_id
      WHERE ${whereClause}
      ORDER BY ${sortCol} ${sortDir}
      LIMIT $${limIdx} OFFSET $${offIdx};
    `;

    const rows = await executeQuery(query, params);
    const total =
      rows.length > 0 ? parseInt(String(rows[0].total_count), 10) || 0 : 0;
    const stripped = rows.map((r) => {
      const row = { ...r };
      delete row.total_count;
      return row;
    });
    return { rows: stripped, total };
  }

  /**
   * Paginated project members with filters.
   *
   * @param {string} projectId
   * @param {Record<string, unknown>} filters
   * @param {{ limit: number, offset: number }} pagination
   * @param {{ field: string, order: string }} sort
   * @returns {Promise<{ rows: object[], total: number }>}
   */
  async listProjectCollaboratorsFiltered(projectId, filters, pagination, sort) {
    const params = [projectId];
    let i = 2;

    const conditions = ["pm.project_id = $1::uuid", "pm.deleted = false"];

    if (filters.role?.length) {
      params.push(filters.role);
      conditions.push(`pm.role = ANY($${i}::project_member_role_enum[])`);
      i++;
    }

    if (filters.search) {
      params.push(`%${filters.search}%`);
      conditions.push(`(
          LOWER(COALESCE(u.name, '')) LIKE LOWER($${i})
          OR LOWER(u.username) LIKE LOWER($${i})
          OR LOWER(u.email) LIKE LOWER($${i})
        )`);
      i++;
    }

    if (filters.added_from) {
      params.push(filters.added_from);
      conditions.push(`pm.created_at >= $${i}::timestamptz`);
      i++;
    }
    if (filters.added_to) {
      params.push(filters.added_to);
      conditions.push(`pm.created_at <= $${i}::timestamptz`);
      i++;
    }

    const sortMap = {
      created_at: "pm.created_at",
      name: "u.name",
      role: "pm.role",
    };
    const sortCol = sortMap[sort.field] || "pm.created_at";
    const sortDir = sort.order === "asc" ? "ASC" : "DESC";

    params.push(pagination.limit);
    const limIdx = i;
    i++;
    params.push(pagination.offset);
    const offIdx = i;

    const whereClause = conditions.join("\n        AND ");

    const query = `
      SELECT 
        pm.user_id::text,
        u.name,
        u.username,
        u.email,
        u.avatar_url,
        pm.role,
        pm.created_at AS added_at,
        pm.added_by::text,
        COUNT(*) OVER() AS total_count
      FROM project_members pm
      INNER JOIN users u ON u.user_id = pm.user_id
      WHERE ${whereClause}
      ORDER BY ${sortCol} ${sortDir}
      LIMIT $${limIdx} OFFSET $${offIdx};
    `;

    const rows = await executeQuery(query, params);
    const total =
      rows.length > 0 ? parseInt(String(rows[0].total_count), 10) || 0 : 0;
    const stripped = rows.map((r) => {
      const row = { ...r };
      delete row.total_count;
      return row;
    });
    return { rows: stripped, total };
  }

  async getProjectStats(userId, filters = {}) {
    const { status, methodology, from, to, parent_only = true } = filters;

    const conditions = [
      "p.deleted = false",
      "p.active = true",
      `(
        p.user_id = $1::uuid
        OR EXISTS (
          SELECT 1 FROM project_members pm2
          WHERE pm2.project_id = p.id
            AND pm2.user_id = $1::uuid
            AND pm2.deleted = false
        )
      )`,
    ];

    const params = [userId];
    let paramIndex = 2;

    if (status) {
      conditions.push(`p.status = $${paramIndex}::project_status`);
      params.push(String(status).toUpperCase());
      paramIndex++;
    }

    if (methodology) {
      conditions.push(
        `p.methodology = $${paramIndex}::project_methodology_enum`
      );
      params.push(String(methodology).toUpperCase());
      paramIndex++;
    }

    if (from) {
      conditions.push(`p.created_at >= $${paramIndex}::timestamptz`);
      params.push(from);
      paramIndex++;
    }

    if (to) {
      conditions.push(`p.created_at <= $${paramIndex}::timestamptz`);
      params.push(to);
      paramIndex++;
    }

    if (parent_only) {
      conditions.push("p.parent_project_id IS NULL");
    }

    const whereClause = conditions.join("\n        AND ");

    const query = `
      WITH
        user_projects AS (
          SELECT
            p.id,
            p.status,
            p.methodology,
            p.properties,
            CASE WHEN p.user_id = $1::uuid THEN 'owned' ELSE 'collaborating' END AS ownership
          FROM projects p
          WHERE ${whereClause}
        ),
        overview AS (
          SELECT
            COUNT(*)                                                      AS total,
            COUNT(*) FILTER (WHERE ownership = 'owned')                  AS owned,
            COUNT(*) FILTER (WHERE ownership = 'collaborating')          AS collaborating,
            COUNT(*) FILTER (WHERE status IN ('OPEN','IN_PROGRESS'))     AS active,
            COUNT(*) FILTER (WHERE status = 'OPEN')                      AS open,
            COUNT(*) FILTER (WHERE status = 'IN_PROGRESS')               AS in_progress,
            COUNT(*) FILTER (WHERE status = 'PAUSED')                    AS paused,
            COUNT(*) FILTER (WHERE status = 'COMPLETED')                 AS completed,
            COUNT(*) FILTER (WHERE status = 'ARCHIVED')                  AS archived
          FROM user_projects
        ),
        methodology_stats AS (
          SELECT
            COUNT(*) FILTER (WHERE methodology = 'KANBAN')    AS kanban,
            COUNT(*) FILTER (WHERE methodology = 'SCRUM')     AS scrum
          FROM user_projects
        ),
        progress_stats AS (
          SELECT
            COALESCE(ROUND(AVG((properties->>'progress')::numeric), 1), 0)      AS average,
            COUNT(*) FILTER (WHERE (properties->>'progress')::numeric >= 80)    AS near_completion,
            COUNT(*) FILTER (
              WHERE properties->>'progress' IS NULL
                 OR (properties->>'progress')::numeric = 0
            )                                                                    AS not_started
          FROM user_projects
        ),
        notes_stats AS (
          SELECT
            COUNT(*)                                         AS total,
            COUNT(*) FILTER (WHERE n.status = 'VISIBLE')    AS visible,
            COUNT(*) FILTER (WHERE n.status = 'ARCHIVED') AS archived,
            COUNT(*) FILTER (WHERE n.status = 'SECURE')    AS secure
          FROM notes n
          WHERE n.project_id IN (SELECT id FROM user_projects)
            AND n.deleted = false
        ),
        tasks_stats AS (
          SELECT
            COUNT(*)                               AS total,
            COUNT(*) FILTER (WHERE b.done = true)  AS done,
            COUNT(*) FILTER (WHERE b.done = false) AS pending
          FROM blocks b
          JOIN notes n ON n.id = b.note_id
          WHERE n.project_id IN (SELECT id FROM user_projects)
            AND n.deleted = false
            AND b.deleted = false
            AND b.type = 'todo'
        )
      SELECT
        row_to_json(o.*)   AS overview,
        row_to_json(m.*)   AS methodology,
        row_to_json(ps.*)  AS progress,
        row_to_json(ns.*)  AS notes,
        row_to_json(ts.*)  AS tasks
      FROM overview o, methodology_stats m, progress_stats ps, notes_stats ns, tasks_stats ts;
    `;

    return executeQuery(query, params);
  }

  async getProjectStatsForOrganization(organizationId, userId, filters = {}) {
    const { status, methodology, from, to, parent_only = true } = filters;

    const conditions = [
      "p.deleted = false",
      "p.active = true",
      "p.organization_id = $1::uuid",
    ];

    const params = [organizationId, userId];
    let paramIndex = 3;

    if (status) {
      conditions.push(`p.status = $${paramIndex}::project_status`);
      params.push(String(status).toUpperCase());
      paramIndex++;
    }

    if (methodology) {
      conditions.push(
        `p.methodology = $${paramIndex}::project_methodology_enum`
      );
      params.push(String(methodology).toUpperCase());
      paramIndex++;
    }

    if (from) {
      conditions.push(`p.created_at >= $${paramIndex}::timestamptz`);
      params.push(from);
      paramIndex++;
    }

    if (to) {
      conditions.push(`p.created_at <= $${paramIndex}::timestamptz`);
      params.push(to);
      paramIndex++;
    }

    if (parent_only) {
      conditions.push("p.parent_project_id IS NULL");
    }

    const whereClause = conditions.join("\n        AND ");

    const query = `
      WITH
        user_projects AS (
          SELECT
            p.id,
            p.status,
            p.methodology,
            p.properties,
            CASE WHEN p.user_id = $2::uuid THEN 'owned' ELSE 'collaborating' END AS ownership
          FROM projects p
          WHERE ${whereClause}
        ),
        overview AS (
          SELECT
            COUNT(*)                                                      AS total,
            COUNT(*) FILTER (WHERE ownership = 'owned')                  AS owned,
            COUNT(*) FILTER (WHERE ownership = 'collaborating')          AS collaborating,
            COUNT(*) FILTER (WHERE status IN ('OPEN','IN_PROGRESS'))     AS active,
            COUNT(*) FILTER (WHERE status = 'OPEN')                      AS open,
            COUNT(*) FILTER (WHERE status = 'IN_PROGRESS')               AS in_progress,
            COUNT(*) FILTER (WHERE status = 'PAUSED')                    AS paused,
            COUNT(*) FILTER (WHERE status = 'COMPLETED')                 AS completed,
            COUNT(*) FILTER (WHERE status = 'ARCHIVED')                  AS archived
          FROM user_projects
        ),
        methodology_stats AS (
          SELECT
            COUNT(*) FILTER (WHERE methodology = 'KANBAN')    AS kanban,
            COUNT(*) FILTER (WHERE methodology = 'SCRUM')     AS scrum
          FROM user_projects
        ),
        progress_stats AS (
          SELECT
            COALESCE(ROUND(AVG((properties->>'progress')::numeric), 1), 0)      AS average,
            COUNT(*) FILTER (WHERE (properties->>'progress')::numeric >= 80)    AS near_completion,
            COUNT(*) FILTER (
              WHERE properties->>'progress' IS NULL
                 OR (properties->>'progress')::numeric = 0
            )                                                                    AS not_started
          FROM user_projects
        ),
        notes_stats AS (
          SELECT
            COUNT(*)                                         AS total,
            COUNT(*) FILTER (WHERE n.status = 'VISIBLE')    AS visible,
            COUNT(*) FILTER (WHERE n.status = 'ARCHIVED') AS archived,
            COUNT(*) FILTER (WHERE n.status = 'SECURE')    AS secure
          FROM notes n
          WHERE n.project_id IN (SELECT id FROM user_projects)
            AND n.deleted = false
        ),
        tasks_stats AS (
          SELECT
            COUNT(*)                               AS total,
            COUNT(*) FILTER (WHERE b.done = true)  AS done,
            COUNT(*) FILTER (WHERE b.done = false) AS pending
          FROM blocks b
          JOIN notes n ON n.id = b.note_id
          WHERE n.project_id IN (SELECT id FROM user_projects)
            AND n.deleted = false
            AND b.deleted = false
            AND b.type = 'todo'
        )
      SELECT
        row_to_json(o.*)   AS overview,
        row_to_json(m.*)   AS methodology,
        row_to_json(ps.*)  AS progress,
        row_to_json(ns.*)  AS notes,
        row_to_json(ts.*)  AS tasks
      FROM overview o, methodology_stats m, progress_stats ps, notes_stats ns, tasks_stats ts;
    `;

    return executeQuery(query, params);
  }
}

module.exports = new ProjectsReadRepository();
