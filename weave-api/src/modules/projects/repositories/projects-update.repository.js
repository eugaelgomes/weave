const { executeQuery } = require("@/database/connection");
const {
  PROJECT_WRITE_CAPABLE_ROLES,
} = require("@/modules/projects/project-role-policy");

const PROJECT_WRITE_CAPABLE_ROLES_SQL = PROJECT_WRITE_CAPABLE_ROLES.map(
  (role) => `'${role}'`
).join(", ");

class ProjectsUpdateRepository {
  async updateProject(projectId, userId, updates) {
    const allowedFields = [
      "title",
      "description",
      "status",
      "properties",
      "projects_files",
    ];

    const keys = Object.keys(updates).filter((k) => allowedFields.includes(k));

    if (keys.length === 0) {
      throw new Error("Nenhum campo válido para atualizar.");
    }

    const setQuery = keys
      .map((key, index) => {
        if (key === "properties") {
          // Remove as chaves enviadas e recalcula com progress
          return `${key} = jsonb_strip_nulls(
            COALESCE(properties, '{}'::jsonb) || $${index + 3}::jsonb || jsonb_build_object(
              'progress', 
              COALESCE(
                (
                  SELECT ROUND(
                    (
                      COUNT(*) FILTER (WHERE EXISTS (
                        SELECT 1 FROM project_stages ps
                        WHERE ps.id = notes.project_stage_id
                          AND ps.project_id = notes.project_id
                          AND COALESCE((ps.properties->>'is_done')::boolean, false) = true
                      ))::numeric
                      / NULLIF(COUNT(*), 0)
                    ) * 100
                  )::integer
                  FROM notes
                  WHERE notes.project_id = projects.id AND notes.deleted = false
                ),
                0
              )
            )
          )`;
        }
        if (key === "projects_files") {
          // Append novos arquivos ao array existente
          return `${key} = COALESCE(projects_files, '[]'::jsonb) || $${index + 3}::jsonb`;
        }
        return `${key} = $${index + 3}`;
      })
      .join(", ");

    const query = `
      UPDATE projects
      SET ${setQuery}, updated_at = NOW()
      WHERE id = $1 AND user_id = $2 AND deleted = false
      RETURNING 
        id::text,
        user_id::text,
        title,
        description,
        properties,
        projects_files,
        status,
        created_at,
        updated_at,
        deleted;
    `;

    const values = [
      projectId,
      userId,
      ...keys.map((k) =>
        k === "properties" || k === "projects_files"
          ? JSON.stringify(updates[k])
          : updates[k]
      ),
    ];

    return executeQuery(query, values);
  }
  async updateProjectInOrganization(projectId, organizationId, updates) {
    const allowedFields = [
      "title",
      "description",
      "status",
      "properties",
      "projects_files",
    ];

    const keys = Object.keys(updates).filter((k) => allowedFields.includes(k));

    if (keys.length === 0) {
      throw new Error("Nenhum campo válido para atualizar.");
    }

    const setQuery = keys
      .map((key, index) => {
        if (key === "properties") {
          return `${key} = jsonb_strip_nulls(
            COALESCE(properties, '{}'::jsonb) || $${index + 3}::jsonb || jsonb_build_object(
              'progress', 
              COALESCE(
                (
                  SELECT ROUND(
                    (
                      COUNT(*) FILTER (WHERE EXISTS (
                        SELECT 1 FROM project_stages ps
                        WHERE ps.id = notes.project_stage_id
                          AND ps.project_id = notes.project_id
                          AND COALESCE((ps.properties->>'is_done')::boolean, false) = true
                      ))::numeric
                      / NULLIF(COUNT(*), 0)
                    ) * 100
                  )::integer
                  FROM notes
                  WHERE notes.project_id = projects.id AND notes.deleted = false
                ),
                0
              )
            )
          )`;
        }
        if (key === "projects_files") {
          return `${key} = COALESCE(projects_files, '[]'::jsonb) || $${index + 3}::jsonb`;
        }
        return `${key} = $${index + 3}`;
      })
      .join(", ");

    const query = `
      UPDATE projects
      SET ${setQuery}, updated_at = NOW()
      WHERE id = $1 AND organization_id = $2::uuid AND deleted = false
      RETURNING 
        id::text,
        user_id::text,
        title,
        description,
        properties,
        projects_files,
        status,
        created_at,
        updated_at,
        deleted;
    `;

    const values = [
      projectId,
      organizationId,
      ...keys.map((k) =>
        k === "properties" || k === "projects_files"
          ? JSON.stringify(updates[k])
          : updates[k]
      ),
    ];

    return executeQuery(query, values);
  }
  async updateCollaboratorPermissionWithOrgManagement(
    projectId,
    organizationId,
    collaboratorUserId,
    newRole
  ) {
    const query = `
      WITH updated_member AS (
        UPDATE project_members
        SET role = UPPER($4), updated_at = NOW()
        WHERE project_id = $1::uuid
          AND user_id = $3::uuid
          AND deleted = false
          AND EXISTS (
            SELECT 1 FROM projects
            WHERE id = $1::uuid AND organization_id = $2::uuid AND deleted = false
          )
        RETURNING *
      )
      SELECT 
        p.id::text,
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
      GROUP BY p.id;
    `;

    return executeQuery(query, [
      projectId,
      organizationId,
      collaboratorUserId,
      newRole,
    ]);
  }

  async updateCollaboratorSuspensionWithOrgManagement(
    projectId,
    organizationId,
    collaboratorUserId,
    suspended
  ) {
    const query = `
      WITH updated_member AS (
        UPDATE project_members
        SET suspended = $4, updated_at = NOW()
        WHERE project_id = $1::uuid
          AND user_id = $3::uuid
          AND deleted = false
          AND EXISTS (
            SELECT 1 FROM projects WHERE id = $1::uuid AND organization_id = $2::uuid AND deleted = false
          )
        RETURNING project_id
      )
      SELECT 
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
          ) FILTER (WHERE pm.id IS NOT NULL),
          '[]'::jsonb
        ) AS collaborators
      FROM project_members pm
      JOIN users u ON pm.user_id = u.user_id
      WHERE pm.project_id = $1::uuid
        AND pm.deleted = false
      GROUP BY pm.project_id;
    `;

    return executeQuery(query, [
      projectId,
      organizationId,
      collaboratorUserId,
      suspended,
    ]);
  }

  async updateCollaboratorPermission(
    projectId,
    ownerId,
    collaboratorUserId,
    newRole
  ) {
    const query = `
      WITH updated_member AS (
        UPDATE project_members
        SET role = UPPER($4), updated_at = NOW()
        WHERE project_id = $1::uuid
          AND user_id = $3::uuid
          AND deleted = false
          AND EXISTS (
            SELECT 1 FROM projects
            WHERE id = $1::uuid AND user_id = $2::uuid AND deleted = false
          )
        RETURNING *
      )
      SELECT 
        p.id::text,
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
      GROUP BY p.id;
    `;

    return executeQuery(query, [
      projectId,
      ownerId,
      collaboratorUserId,
      newRole,
    ]);
  }

  async updateCollaboratorSuspension(
    projectId,
    ownerId,
    collaboratorUserId,
    suspended
  ) {
    const query = `
      WITH updated_member AS (
        UPDATE project_members
        SET suspended = $4, updated_at = NOW()
        WHERE project_id = $1::uuid
          AND user_id = $3::uuid
          AND deleted = false
          AND EXISTS (
            SELECT 1 FROM projects WHERE id = $1::uuid AND user_id = $2::uuid
          )
        RETURNING project_id
      )
      SELECT 
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
          ) FILTER (WHERE pm.id IS NOT NULL),
          '[]'::jsonb
        ) AS collaborators
      FROM project_members pm
      JOIN users u ON pm.user_id = u.user_id
      WHERE pm.project_id = $1::uuid
        AND pm.deleted = false
      GROUP BY pm.project_id;
    `;

    return executeQuery(query, [
      projectId,
      ownerId,
      collaboratorUserId,
      suspended,
    ]);
  }
  async updateNoteInProjectWithOrgScope(
    projectId,
    noteId,
    userId,
    organizationId
  ) {
    const query = `
      UPDATE projects
      SET 
        properties = COALESCE(properties, '{}'::jsonb) || jsonb_build_object(
          'progress',
          COALESCE(
            (SELECT ROUND(
              (
                COUNT(*) FILTER (WHERE EXISTS (
                  SELECT 1 FROM project_stages ps
                  WHERE ps.id = n.project_stage_id
                    AND ps.project_id = n.project_id
                    AND COALESCE((ps.properties->>'is_done')::boolean, false) = true
                ))::numeric
                / NULLIF(COUNT(*), 0)
              ) * 100
            )::integer
            FROM notes n
            WHERE n.project_id = $1::uuid AND n.deleted = false),
            0
          )
        ),
        updated_at = NOW()
      WHERE id = $1::uuid
        AND EXISTS (
          SELECT 1 FROM notes WHERE id = $2::uuid AND project_id = $1::uuid AND deleted = false
        )
        AND (
          EXISTS (
            SELECT 1 FROM projects p_org
            WHERE p_org.id = $1::uuid AND p_org.organization_id = $4::uuid AND p_org.deleted = false
          )
          OR (user_id = $3::uuid OR EXISTS (
            SELECT 1 FROM project_members pm
            WHERE pm.project_id = $1::uuid
              AND pm.user_id = $3::uuid
              AND pm.deleted = false
              AND pm.suspended = false
              AND pm.role IN (${PROJECT_WRITE_CAPABLE_ROLES_SQL})
          ))
        )
        AND deleted = false
      RETURNING 
        id::text,
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
          WHERE n.project_id = $1::uuid AND n.deleted = false),
          '[]'::jsonb
        ) AS associated_notes;
    `;

    return executeQuery(query, [projectId, noteId, userId, organizationId]);
  }
  async updateNoteInProject(projectId, noteId, userId) {
    // Since notes are now fetched directly from the notes table via project_id,
    // "syncing" just means recalculating progress and returning current notes
    const query = `
      UPDATE projects
      SET 
        properties = COALESCE(properties, '{}'::jsonb) || jsonb_build_object(
          'progress',
          COALESCE(
            (SELECT ROUND(
              (
                COUNT(*) FILTER (WHERE EXISTS (
                  SELECT 1 FROM project_stages ps
                  WHERE ps.id = n.project_stage_id
                    AND ps.project_id = n.project_id
                    AND COALESCE((ps.properties->>'is_done')::boolean, false) = true
                ))::numeric
                / NULLIF(COUNT(*), 0)
              ) * 100
            )::integer
            FROM notes n
            WHERE n.project_id = $1::uuid AND n.deleted = false),
            0
          )
        ),
        updated_at = NOW()
      WHERE id = $1::uuid
        AND EXISTS (
          SELECT 1 FROM notes WHERE id = $2::uuid AND project_id = $1::uuid AND deleted = false
        )
        AND (user_id = $3::uuid OR EXISTS (
          SELECT 1 FROM project_members pm
          WHERE pm.project_id = $1::uuid
            AND pm.user_id = $3::uuid
            AND pm.deleted = false
            AND pm.suspended = false
            AND pm.role IN (${PROJECT_WRITE_CAPABLE_ROLES_SQL})
        ))
        AND deleted = false
      RETURNING 
        id::text,
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
          WHERE n.project_id = $1::uuid AND n.deleted = false),
          '[]'::jsonb
        ) AS associated_notes;
    `;

    return executeQuery(query, [projectId, noteId, userId]);
  }
  async updateNoteStage(projectId, noteId, stageId) {
    const query = `
      UPDATE notes
      SET project_stage_id = $3::uuid, updated_at = NOW()
      WHERE id = $2::uuid 
        AND project_id = $1::uuid
        AND deleted = false
      RETURNING id::text, project_stage_id::text;
    `;
    return executeQuery(query, [projectId, noteId, stageId]);
  }

  _projectProgressJsonFragment() {
    return `
      COALESCE(
        (SELECT ROUND(
          (
            COUNT(*) FILTER (WHERE EXISTS (
              SELECT 1 FROM project_stages ps
              WHERE ps.id = n.project_stage_id
                AND ps.project_id = n.project_id
                AND COALESCE((ps.properties->>'is_done')::boolean, false) = true
            ))::numeric
            / NULLIF(COUNT(*), 0)
          ) * 100
        )::integer
        FROM notes n
        WHERE n.project_id = $1::uuid AND n.deleted = false),
        0
      )
    `;
  }

  async updateProjectStage(projectId, userId, stageId, updates) {
    const allowedFields = ["name", "position", "color", "properties"];
    const keys = Object.keys(updates).filter((k) => allowedFields.includes(k));

    if (keys.length === 0) {
      throw new Error("Nenhum campo válido para atualizar.");
    }

    const setParts = keys.map((key, index) => {
      const paramIndex = index + 4;
      if (key === "properties") {
        return `properties = jsonb_strip_nulls(COALESCE(ps.properties, '{}'::jsonb) || $${paramIndex}::jsonb)`;
      }
      if (key === "position") {
        return `"position" = $${paramIndex}::int`;
      }
      return `${key} = $${paramIndex}`;
    });

    const progressFrag = this._projectProgressJsonFragment();
    const values = [
      projectId,
      userId,
      stageId,
      ...keys.map((k) =>
        k === "properties" ? JSON.stringify(updates[k] ?? {}) : updates[k]
      ),
    ];

    const query = `
      WITH stage_upd AS (
        UPDATE project_stages ps
        SET ${setParts.join(", ")}, updated_at = NOW()
        FROM projects p
        WHERE ps.id = $3::uuid
          AND ps.project_id = $1::uuid
          AND p.id = ps.project_id
          AND p.user_id = $2::uuid
          AND p.deleted = false
        RETURNING
          ps.id::text,
          ps.project_id::text,
          ps.name,
          ps."position",
          ps.color,
          ps.properties,
          ps.created_at,
          ps.updated_at
      )
      UPDATE projects p
      SET
        properties = COALESCE(p.properties, '{}'::jsonb)
          || jsonb_build_object('progress', (${progressFrag})),
        updated_at = NOW()
      WHERE p.id = $1::uuid
        AND p.user_id = $2::uuid
        AND p.deleted = false
        AND EXISTS (SELECT 1 FROM stage_upd)
      RETURNING (SELECT row_to_json(su.*) FROM stage_upd su LIMIT 1) AS stage;
    `;

    const rows = await executeQuery(query, values);
    if (!rows?.length || !rows[0].stage) {
      return [];
    }
    const s = rows[0].stage;
    return [
      {
        color: s.color,
        created_at: s.created_at,
        id: s.id,
        name: s.name,
        position: s.position,
        project_id: s.project_id,
        properties: s.properties,
        updated_at: s.updated_at,
      },
    ];
  }

  async updateProjectStageInOrganization(
    projectId,
    organizationId,
    stageId,
    updates
  ) {
    const allowedFields = ["name", "position", "color", "properties"];
    const keys = Object.keys(updates).filter((k) => allowedFields.includes(k));

    if (keys.length === 0) {
      throw new Error("Nenhum campo válido para atualizar.");
    }

    const setParts = keys.map((key, index) => {
      const paramIndex = index + 4;
      if (key === "properties") {
        return `properties = jsonb_strip_nulls(COALESCE(ps.properties, '{}'::jsonb) || $${paramIndex}::jsonb)`;
      }
      if (key === "position") {
        return `"position" = $${paramIndex}::int`;
      }
      return `${key} = $${paramIndex}`;
    });

    const progressFrag = this._projectProgressJsonFragment();
    const values = [
      projectId,
      organizationId,
      stageId,
      ...keys.map((k) =>
        k === "properties" ? JSON.stringify(updates[k] ?? {}) : updates[k]
      ),
    ];

    const query = `
      WITH stage_upd AS (
        UPDATE project_stages ps
        SET ${setParts.join(", ")}, updated_at = NOW()
        FROM projects p
        WHERE ps.id = $3::uuid
          AND ps.project_id = $1::uuid
          AND p.id = ps.project_id
          AND p.organization_id = $2::uuid
          AND p.deleted = false
        RETURNING
          ps.id::text,
          ps.project_id::text,
          ps.name,
          ps."position",
          ps.color,
          ps.properties,
          ps.created_at,
          ps.updated_at
      )
      UPDATE projects p
      SET
        properties = COALESCE(p.properties, '{}'::jsonb)
          || jsonb_build_object('progress', (${progressFrag})),
        updated_at = NOW()
      WHERE p.id = $1::uuid
        AND p.organization_id = $2::uuid
        AND p.deleted = false
        AND EXISTS (SELECT 1 FROM stage_upd)
      RETURNING (SELECT row_to_json(su.*) FROM stage_upd su LIMIT 1) AS stage;
    `;

    const rows = await executeQuery(query, values);
    if (!rows?.length || !rows[0].stage) {
      return [];
    }
    const s = rows[0].stage;
    return [
      {
        color: s.color,
        created_at: s.created_at,
        id: s.id,
        name: s.name,
        position: s.position,
        project_id: s.project_id,
        properties: s.properties,
        updated_at: s.updated_at,
      },
    ];
  }
}

module.exports = new ProjectsUpdateRepository();
