const { executeQuery } = require("@/database/connection");

class ProjectsReadRepository {
  async getAllProjects(userId) {
    const query = `
      SELECT 
        p.id::text,
        p.user_id::text,
        p.parent_project_id::text,
        p.title,
        p.description,
        p.properties,
        p.projects_files,
        p.status,
        p.created_at,
        p.updated_at,
        p.deleted,
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
              'added_by', pm.added_by::text,
              'suspended', pm.suspended
            )
          ) FILTER (WHERE pm.id IS NOT NULL AND pm.deleted = false),
          '[]'::jsonb
        ) AS collaborators,
        COALESCE(
          (SELECT jsonb_agg(
            jsonb_build_object(
              'id', n.id::text,
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
          p.user_id = $1::uuid
          OR EXISTS (
            SELECT 1 FROM project_members pm2
            WHERE pm2.project_id = p.id
              AND pm2.user_id = $1::uuid
              AND pm2.deleted = false
              AND pm2.suspended = false
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
      WHERE id = $1
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
        p.user_id::text,
        p.title,
        p.description,
        p.properties,
        p.projects_files,
        p.status,
        p.created_at,
        p.updated_at,
        p.deleted,
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
              'added_by', pm.added_by::text,
              'suspended', pm.suspended
            )
          ) FILTER (WHERE pm.id IS NOT NULL AND pm.deleted = false),
          '[]'::jsonb
        ) AS collaborators,
        COALESCE(
          (SELECT jsonb_agg(
            jsonb_build_object(
              'id', n.id::text,
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
      WHERE p.id = $1::uuid
        AND p.deleted = false
        AND (
          p.user_id = $2::uuid
          OR EXISTS (
            SELECT 1 FROM project_members pm2
            WHERE pm2.project_id = p.id
              AND pm2.user_id = $2::uuid
              AND pm2.deleted = false
              AND pm2.suspended = false
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
        p.user_id::text,
        p.parent_project_id::text,
        p.title,
        p.description,
        p.properties,
        p.projects_files,
        p.status,
        p.created_at,
        p.updated_at,
        p.deleted,
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
              'added_by', pm.added_by::text,
              'suspended', pm.suspended
            )
          ) FILTER (WHERE pm.id IS NOT NULL AND pm.deleted = false),
          '[]'::jsonb
        ) AS collaborators,
        COALESCE(
          (SELECT jsonb_agg(
            jsonb_build_object(
              'id', n.id::text,
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
        p.user_id::text,
        p.title,
        p.description,
        p.properties,
        p.projects_files,
        p.status,
        p.created_at,
        p.updated_at,
        p.deleted,
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
              'added_by', pm.added_by::text,
              'suspended', pm.suspended
            )
          ) FILTER (WHERE pm.id IS NOT NULL AND pm.deleted = false),
          '[]'::jsonb
        ) AS collaborators,
        COALESCE(
          (SELECT jsonb_agg(
            jsonb_build_object(
              'id', n.id::text,
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
      WHERE p.id = $1::uuid
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
              'added_by', pm.added_by::text,
              'suspended', pm.suspended
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
          p.user_id = $2::uuid
          OR EXISTS (
            SELECT 1 FROM project_members pm2
            WHERE pm2.project_id = p.id
              AND pm2.user_id = $2::uuid
              AND pm2.deleted = false
              AND pm2.suspended = false
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
              'added_by', pm.added_by::text,
              'suspended', pm.suspended
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
          AND pm.user_id = $2::uuid
          AND pm.deleted = false
          AND pm.suspended = false
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
        AND pm.user_id = $2::uuid
        AND pm.deleted = false
        AND pm.suspended = false
      LIMIT 1;
    `;
    const result = await executeQuery(query, [projectId, userId]);
    return result[0]?.role || null;
  }

  async isSuspendedCollaborator(projectId, userId) {
    const query = `
      SELECT EXISTS (
        SELECT 1
        FROM project_members pm
        WHERE pm.project_id = $1::uuid
          AND pm.user_id = $2::uuid
          AND pm.deleted = false
          AND pm.suspended = true
      ) AS is_suspended;
    `;

    const result = await executeQuery(query, [projectId, userId]);
    return result[0]?.is_suspended || false;
  }

  async isCollaboratorInProject(projectId, userId) {
    const query = `
      SELECT EXISTS (
        SELECT 1
        FROM project_members pm
        WHERE pm.project_id = $1::uuid
          AND pm.user_id = $2::uuid
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
        n.user_id::text,
        n.title,
        n.description,
        n.tags,
        n.status,
        n.project_stage_id::text,
        n.created_at,
        n.updated_at,
        nu.username AS created_by_username
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
        n.user_id::text,
        n.title,
        n.description,
        n.tags,
        n.status,
        n.project_stage_id::text,
        n.created_at,
        n.updated_at,
        nu.username AS created_by_username
      FROM notes n
      JOIN users nu ON nu.user_id = n.user_id
      WHERE n.project_id = $1::uuid
        AND n.deleted = false
        AND EXISTS (
          SELECT 1 FROM projects p
          WHERE p.id = $1::uuid
            AND p.deleted = false
            AND (
              p.user_id = $2::uuid
              OR EXISTS (
                SELECT 1 FROM project_members pm
                WHERE pm.project_id = $1::uuid
                  AND pm.user_id = $2::uuid
                  AND pm.deleted = false
                  AND pm.suspended = false
              )
            )
        )
      ORDER BY n.updated_at DESC;
    `;

    return executeQuery(query, [projectId, userId]);
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
            AND pm2.suspended = false
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
      conditions.push(`p.methodology = $${paramIndex}::project_methodology_enum`);
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
            COUNT(*) FILTER (WHERE methodology = 'SCRUM')     AS scrum,
            COUNT(*) FILTER (WHERE methodology = 'WATERFALL') AS waterfall,
            COUNT(*) FILTER (WHERE methodology = 'CUSTOM')    AS custom
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
      conditions.push(`p.methodology = $${paramIndex}::project_methodology_enum`);
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
            COUNT(*) FILTER (WHERE methodology = 'SCRUM')     AS scrum,
            COUNT(*) FILTER (WHERE methodology = 'WATERFALL') AS waterfall,
            COUNT(*) FILTER (WHERE methodology = 'CUSTOM')    AS custom
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
