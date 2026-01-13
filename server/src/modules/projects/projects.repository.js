const { executeQuery } = require("@/services/db");

class ProjectsRepository {
  async getAllProjects(userId) {
    const query = `
      SELECT 
        p.id::text,
        p.user_id::text,
        p.title,
        p.description,
        p.properties,
        p.status,
        p.created_at,
        p.updated_at,
        p.deleted,
        p.associated_notes,
        u.username AS owner_username,
        u.email AS owner_email,
        u.name AS owner_name,
        u.avatar_url AS owner_avatar_url,
        p.org_id as organization_id,
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
        ) AS collaborators
      FROM projects p
      JOIN users u ON u.user_id = p.user_id
      LEFT JOIN organizations o ON o.id = p.org_id
      LEFT JOIN projects_members pm ON pm.project_id = p.id AND pm.deleted = false
      LEFT JOIN users cu ON cu.user_id = pm.user_id
      WHERE p.deleted = false
        AND (
          p.user_id = $1::uuid
          OR EXISTS (
            SELECT 1 FROM projects_members pm2
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
        p.status,
        p.created_at,
        p.updated_at,
        p.deleted,
        p.associated_notes,
        u.username AS owner_username,
        u.email AS owner_email,
        u.name AS owner_name,
        u.avatar_url AS owner_avatar_url,
        p.org_id as organization_id,
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
        ) AS collaborators
      FROM projects p
      JOIN users u ON u.user_id = p.user_id
      LEFT JOIN organizations o ON o.id = p.org_id
      LEFT JOIN projects_members pm ON pm.project_id = p.id AND pm.deleted = false
      LEFT JOIN users cu ON cu.user_id = pm.user_id
      WHERE p.id = $1::uuid
        AND p.deleted = false
        AND (
          p.user_id = $2::uuid
          OR EXISTS (
            SELECT 1 FROM projects_members pm2
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

  async updateProject(projectId, userId, updates) {
    const allowedFields = ["title", "description", "status", "properties"];

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
                    (COUNT(*) FILTER (WHERE (note->>'status') = 'done')::numeric / 
                    NULLIF(COUNT(*), 0)) * 100
                  )::integer
                  FROM jsonb_array_elements(COALESCE(associated_notes, '[]'::jsonb)) AS note
                ),
                0
              )
            )
          )`;
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
        status,
        created_at,
        updated_at,
        deleted;
    `;

    const values = [
      projectId,
      userId,
      ...keys.map((k) =>
        k === "properties" ? JSON.stringify(updates[k]) : updates[k]
      ),
    ];

    return executeQuery(query, values);
  }

  async deleteProject(projectId, userId) {
    const query = `
      UPDATE projects
      SET deleted = true, updated_at = NOW()
      WHERE id = $1 AND user_id = $2
      RETURNING id::text;
    `;

    return executeQuery(query, [projectId, userId]);
  }

  async createProject(userId, title, description, status, properties) {
    const query = `
      INSERT INTO projects (user_id, title, description, status, properties)
      VALUES ($1, $2, $3, $4, $5::jsonb || jsonb_build_object('progress', 0))
      RETURNING 
        id::text,
        user_id::text,
        title,
        description,
        properties,
        status,
        created_at,
        updated_at,
        deleted;
    `;

    const values = [
      userId,
      title,
      description || null,
      status || "ativo",
      JSON.stringify(properties || {}),
    ];

    return executeQuery(query, values);
  }

  async addCollaborator(
    projectId,
    ownerId,
    collaboratorUserId,
    role = "viewer"
  ) {
    const query = `
      WITH inserted_member AS (
        INSERT INTO projects_members (project_id, user_id, role, added_by)
        VALUES ($1, $3, $4, $2)
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
      LEFT JOIN projects_members pm ON pm.project_id = p.id AND pm.deleted = false
      LEFT JOIN users u ON u.user_id = pm.user_id
      WHERE p.id = $1::uuid
      GROUP BY p.id;
    `;

    return executeQuery(query, [projectId, ownerId, collaboratorUserId, role]);
  }

  async removeCollaborator(projectId, ownerId, collaboratorUserId) {
    const query = `
      WITH deleted_member AS (
        UPDATE projects_members
        SET deleted = true, updated_at = NOW()
        WHERE project_id = $1::uuid
          AND user_id = $3::uuid
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
      LEFT JOIN projects_members pm ON pm.project_id = p.id AND pm.deleted = false
      LEFT JOIN users u ON u.user_id = pm.user_id
      WHERE p.id = $1::uuid
      GROUP BY p.id;
    `;

    return executeQuery(query, [projectId, ownerId, collaboratorUserId]);
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
      LEFT JOIN projects_members pm ON pm.project_id = p.id AND pm.deleted = false
      LEFT JOIN users u ON u.user_id = pm.user_id
      WHERE p.id = $1::uuid
        AND p.deleted = false
        AND (
          p.user_id = $2::uuid
          OR EXISTS (
            SELECT 1 FROM projects_members pm2
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

  async updateCollaboratorPermission(
    projectId,
    ownerId,
    collaboratorUserId,
    newRole
  ) {
    const query = `
      WITH updated_member AS (
        UPDATE projects_members
        SET role = $4, updated_at = NOW()
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
      LEFT JOIN projects_members pm ON pm.project_id = p.id AND pm.deleted = false
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

  async isCollaborator(projectId, userId) {
    const query = `
      SELECT EXISTS (
        SELECT 1
        FROM projects_members pm
        WHERE pm.project_id = $1::uuid
          AND pm.user_id = $2::uuid
          AND pm.deleted = false
          AND pm.suspended = false
      ) AS is_collaborator;
    `;

    const result = await executeQuery(query, [projectId, userId]);
    return result[0]?.is_collaborator || false;
  }

  async isSuspendedCollaborator(projectId, userId) {
    const query = `
      SELECT EXISTS (
        SELECT 1
        FROM projects_members pm
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
        FROM projects_members pm
        WHERE pm.project_id = $1::uuid
          AND pm.user_id = $2::uuid
          AND pm.deleted = false
      ) AS is_collaborator;
    `;

    const result = await executeQuery(query, [projectId, userId]);
    return result[0]?.is_collaborator || false;
  }

  async updateCollaboratorSuspension(
    projectId,
    ownerId,
    collaboratorUserId,
    suspended
  ) {
    const query = `
      WITH updated_member AS (
        UPDATE projects_members
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
      FROM projects_members pm
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

  async addNoteToProject(projectId, noteId, userId) {
    const query = `
      WITH updated_note AS (
        UPDATE notes
        SET project_id = $1::uuid, updated_at = NOW()
        WHERE id = $2::uuid
          AND (user_id = $3::uuid OR EXISTS (
            SELECT 1 FROM note_collaborators nc 
            WHERE nc.note_id = $2::uuid AND nc.user_id = $3::uuid AND nc.removed = false
          ))
        RETURNING id::text, title, description, tags, status, created_at, updated_at, user_id
      ),
      project_collaborators AS (
        SELECT COALESCE(
          jsonb_agg(
            jsonb_build_object(
              'user_id', pm.user_id::text,
              'name', u.name,
              'username', u.username,
              'email', u.email,
              'avatar_url', u.avatar_url,
              'role', pm.role
            )
          ) FILTER (WHERE pm.id IS NOT NULL),
          '[]'::jsonb
        ) AS collaborators
        FROM projects_members pm
        LEFT JOIN users u ON u.user_id = pm.user_id
        WHERE pm.project_id = $1::uuid AND pm.deleted = false
      ),
      updated_project AS (
        UPDATE projects
        SET 
          associated_notes = COALESCE(associated_notes, '[]'::jsonb) || 
          jsonb_build_array(
            jsonb_build_object(
              'id', (SELECT id FROM updated_note),
              'title', (SELECT title FROM updated_note),
              'description', (SELECT description FROM updated_note),
              'tags', (SELECT tags FROM updated_note),
              'created_by', jsonb_build_object(
                'user_id', (SELECT user_id::text FROM updated_note),
                'username', (SELECT u.username FROM updated_note un JOIN users u ON u.user_id = un.user_id)
              ),
              'collaborators', (SELECT collaborators FROM project_collaborators),
              'status', (SELECT status FROM updated_note),
              'created_at', (SELECT created_at FROM updated_note),
              'updated_at', (SELECT updated_at FROM updated_note)
            )
          ),
          properties = COALESCE(properties, '{}'::jsonb) || jsonb_build_object(
            'progress',
            (
              SELECT ROUND(
                (COUNT(*) FILTER (WHERE (note->>'status') = 'done')::numeric / 
                NULLIF(COUNT(*), 0)) * 100
              )::integer
              FROM jsonb_array_elements(
                COALESCE(associated_notes, '[]'::jsonb) || 
                jsonb_build_array(
                  jsonb_build_object(
                    'id', (SELECT id FROM updated_note),
                    'status', (SELECT status FROM updated_note)
                  )
                )
              ) AS note
            )
          ),
          updated_at = NOW()
        WHERE id = $1::uuid
          AND (user_id = $3::uuid OR EXISTS (
            SELECT 1 FROM projects_members pm
            WHERE pm.project_id = $1::uuid
              AND pm.user_id = $3::uuid
              AND pm.deleted = false
              AND pm.suspended = false
          ))
          AND deleted = false
          AND NOT EXISTS (
            SELECT 1 
            FROM jsonb_array_elements(COALESCE(associated_notes, '[]'::jsonb)) AS note
            WHERE note->>'id' = $2::text
          )
        RETURNING id::text, associated_notes
      )
      SELECT * FROM updated_project;
    `;

    return executeQuery(query, [projectId, noteId, userId]);
  }

  async removeNoteFromProject(projectId, noteId, userId) {
    const query = `
      WITH updated_note AS (
        UPDATE notes
        SET project_id = NULL, updated_at = NOW()
        WHERE id = $2::uuid AND project_id = $1::uuid
        RETURNING id
      ),
      filtered_notes AS (
        SELECT COALESCE(jsonb_agg(elem), '[]'::jsonb) AS notes
        FROM jsonb_array_elements(COALESCE(
          (SELECT associated_notes FROM projects WHERE id = $1::uuid), 
          '[]'::jsonb
        )) AS elem
        WHERE elem->>'id' != $2::text
      ),
      updated_project AS (
        UPDATE projects
        SET 
          associated_notes = (SELECT notes FROM filtered_notes),
          properties = COALESCE(properties, '{}'::jsonb) || jsonb_build_object(
            'progress',
            (
              SELECT COALESCE(
                ROUND(
                  (COUNT(*) FILTER (WHERE (note->>'status') = 'done')::numeric / 
                  NULLIF(COUNT(*), 0)) * 100
                )::integer,
                0
              )
              FROM jsonb_array_elements((SELECT notes FROM filtered_notes)) AS note
            )
          ),
          updated_at = NOW()
        WHERE id = $1::uuid
          AND (user_id = $3::uuid OR EXISTS (
            SELECT 1 FROM projects_members pm
            WHERE pm.project_id = $1::uuid
              AND pm.user_id = $3::uuid
              AND pm.deleted = false
              AND pm.suspended = false
              AND pm.role = 'admin'
          ))
          AND deleted = false
        RETURNING id::text, associated_notes
      )
      SELECT * FROM updated_project;
    `;

    return executeQuery(query, [projectId, noteId, userId]);
  }

  async getAssociatedNotes(projectId, userId) {
    const query = `
      SELECT 
        id::text,
        user_id::text,
        associated_notes
      FROM projects
      WHERE id = $1::uuid
        AND (user_id = $2::uuid OR EXISTS (
          SELECT 1 FROM projects_members pm
          WHERE pm.project_id = $1::uuid
            AND pm.user_id = $2::uuid
            AND pm.deleted = false
            AND pm.suspended = false
        ))
        AND deleted = false;
    `;

    return executeQuery(query, [projectId, userId]);
  }

  async updateNoteInProject(projectId, noteId, userId) {
    const query = `
      WITH project_collaborators AS (
        SELECT COALESCE(
          jsonb_agg(
            jsonb_build_object(
              'user_id', pm.user_id::text,
              'name', u.name,
              'username', u.username,
              'email', u.email,
              'avatar_url', u.avatar_url,
              'role', pm.role
            )
          ) FILTER (WHERE pm.id IS NOT NULL),
          '[]'::jsonb
        ) AS collaborators
        FROM projects_members pm
        LEFT JOIN users u ON u.user_id = pm.user_id
        WHERE pm.project_id = $1::uuid AND pm.deleted = false
      ),
      updated_notes AS (
        SELECT jsonb_agg(
          CASE 
            WHEN elem->>'id' = $2::text 
            THEN jsonb_build_object(
              'id', (SELECT id::text FROM notes WHERE id = $2::uuid),
              'title', (SELECT title FROM notes WHERE id = $2::uuid),
              'description', (SELECT description FROM notes WHERE id = $2::uuid),
              'tags', (SELECT tags FROM notes WHERE id = $2::uuid),
              'created_by', jsonb_build_object(
                'user_id', (SELECT n.user_id::text FROM notes n WHERE n.id = $2::uuid),
                'username', (SELECT u.username FROM notes n JOIN users u ON u.user_id = n.user_id WHERE n.id = $2::uuid)
              ),
              'collaborators', (SELECT collaborators FROM project_collaborators),
              'status', (SELECT status FROM notes WHERE id = $2::uuid),
              'created_at', (SELECT created_at FROM notes WHERE id = $2::uuid),
              'updated_at', (SELECT updated_at FROM notes WHERE id = $2::uuid)
            )
            ELSE elem
          END
        ) AS notes
        FROM jsonb_array_elements(COALESCE(
          (SELECT associated_notes FROM projects WHERE id = $1::uuid),
          '[]'::jsonb
        )) AS elem
      )
      UPDATE projects
      SET 
        associated_notes = (SELECT notes FROM updated_notes),
        properties = COALESCE(properties, '{}'::jsonb) || jsonb_build_object(
          'progress',
          (
            SELECT COALESCE(
              ROUND(
                (COUNT(*) FILTER (WHERE (note->>'status') = 'done')::numeric / 
                NULLIF(COUNT(*), 0)) * 100
              )::integer,
              0
            )
            FROM jsonb_array_elements((SELECT notes FROM updated_notes)) AS note
          )
        ),
        updated_at = NOW()
      WHERE id = $1::uuid
        AND (user_id = $3::uuid OR EXISTS (
          SELECT 1 FROM projects_members pm
          WHERE pm.project_id = $1::uuid
            AND pm.user_id = $3::uuid
            AND pm.deleted = false
            AND pm.suspended = false
        ))
        AND deleted = false
      RETURNING 
        id::text,
        associated_notes;
    `;

    return executeQuery(query, [projectId, noteId, userId]);
  }
}

module.exports = new ProjectsRepository();
