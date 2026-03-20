const { executeQuery } = require("@/database/connection");

class ProjectsRepository {
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
      LEFT JOIN organizations o ON o.id = p.org_id
      LEFT JOIN projects_members pm ON pm.project_id = p.id AND pm.deleted = false
      LEFT JOIN users cu ON cu.user_id = pm.user_id
      WHERE p.deleted = false
        AND p.parent_project_id IS NULL
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
    const allowedFields = ["title", "description", "status", "properties", "projects_files"];

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
                    (COUNT(*) FILTER (WHERE status = 'done')::numeric / 
                    NULLIF(COUNT(*), 0)) * 100
                  )::integer
                  FROM notes
                  WHERE project_id = projects.id AND deleted = false
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

  async deleteProject(projectId, userId) {
    const query = `
      UPDATE projects
      SET deleted = true, updated_at = NOW()
      WHERE id = $1 AND user_id = $2
      RETURNING id::text;
    `;

    return executeQuery(query, [projectId, userId]);
  }

   /**
   * Cria um projeto e as suas respectivas colunas (stages) de forma atômica
   * utilizando CTEs do PostgreSQL.
   */
  async createProjectWithStages(projectData, stagesData) {
    const query = `
      -- 1. Inserimos o projeto principal e retornamos a linha gerada
      WITH new_project AS (
        INSERT INTO projects (
          user_id, 
          org_id, 
          title, 
          description, 
          methodology, 
          default_view, 
          status, 
          properties,
          parent_project_id
        )
        VALUES (
          $1::uuid, 
          $2::uuid, 
          $3, 
          $4, 
          $5::project_methodology, 
          $6::project_view_type, 
          $7::project_status, 
          $8::jsonb,
          $10::uuid
        )
        RETURNING *
      ),
      -- 2. Inserimos as colunas (stages) vinculando ao ID do projeto recém-criado
      -- Usamos jsonb_to_recordset para "descompactar" o array do JavaScript em linhas SQL
      inserted_stages AS (
        INSERT INTO project_stages (project_id, name, position, color, properties)
        SELECT 
          p.id, 
          s.name, 
          s.position, 
          s.color, 
          s.properties::jsonb
        FROM new_project p
        CROSS JOIN jsonb_to_recordset($9::jsonb) AS s(name text, position integer, color text, properties jsonb)
        RETURNING *
      )
      -- 3. Retornamos o projeto montado já com o array de stages embutido
      SELECT 
        np.id::text,
        np.user_id::text,
        np.org_id::text,
        np.title,
        np.description,
        np.methodology,
        np.default_view,
        np.properties,
        np.status,
        np.created_at,
        np.updated_at,
        np.deleted,
        (
          SELECT jsonb_agg(
            jsonb_build_object(
              'id', st.id::text,
              'name', st.name,
              'position', st.position,
              'color', st.color,
              'properties', st.properties
            ) ORDER BY st.position ASC
          ) FROM inserted_stages st
        ) AS stages
      FROM new_project np;
    `;

    const values = [
      projectData.user_id,
      projectData.org_id || null,
      projectData.title,
      projectData.description || null,
      projectData.methodology,
      projectData.default_view,
      projectData.status,
      projectData.properties,
      JSON.stringify(stagesData),
      projectData.parent_project_id || null
    ];

    return executeQuery(query, values);
  }

  /**
   * Busca todas as colunas (stages) de um projeto específico
   */
  async getProjectStages(projectId) {
    const query = `
      SELECT 
        id::text,
        project_id::text,
        name,
        position,
        color,
        properties,
        created_at,
        updated_at
      FROM project_stages
      WHERE project_id = $1::uuid
      ORDER BY position ASC;
    `;

    return executeQuery(query, [projectId]);
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
          AND project_id IS DISTINCT FROM $1::uuid
          AND (user_id = $3::uuid OR EXISTS (
            SELECT 1 FROM note_collaborators nc 
            WHERE nc.note_id = $2::uuid AND nc.user_id = $3::uuid AND nc.removed = false
          ))
        RETURNING id::text
      ),
      updated_project AS (
        UPDATE projects
        SET 
          properties = COALESCE(properties, '{}'::jsonb) || jsonb_build_object(
            'progress',
            COALESCE(
              (SELECT ROUND(
                (COUNT(*) FILTER (WHERE status = 'done')::numeric / 
                NULLIF(COUNT(*), 0)) * 100
              )::integer
              FROM notes
              WHERE project_id = $1::uuid AND deleted = false),
              0
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
          AND EXISTS (SELECT 1 FROM updated_note)
        RETURNING id::text
      )
      SELECT up.id,
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
        ) AS associated_notes
      FROM updated_project up;
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
      updated_project AS (
        UPDATE projects
        SET 
          properties = COALESCE(properties, '{}'::jsonb) || jsonb_build_object(
            'progress',
            COALESCE(
              (SELECT ROUND(
                (COUNT(*) FILTER (WHERE status = 'done')::numeric / 
                NULLIF(COUNT(*), 0)) * 100
              )::integer
              FROM notes
              WHERE project_id = $1::uuid AND deleted = false AND id != $2::uuid),
              0
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
          AND EXISTS (SELECT 1 FROM updated_note)
        RETURNING id::text
      )
      SELECT * FROM updated_project;
    `;

    return executeQuery(query, [projectId, noteId, userId]);
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
                SELECT 1 FROM projects_members pm
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
              (COUNT(*) FILTER (WHERE status = 'done')::numeric / 
              NULLIF(COUNT(*), 0)) * 100
            )::integer
            FROM notes
            WHERE project_id = $1::uuid AND deleted = false),
            0
          )
        ),
        updated_at = NOW()
      WHERE id = $1::uuid
        AND EXISTS (
          SELECT 1 FROM notes WHERE id = $2::uuid AND project_id = $1::uuid AND deleted = false
        )
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
  async getProjectStats(userId, filters = {}) {
    const { status, methodology, from, to, parent_only = true } = filters;

    const conditions = [
      'p.deleted = false',
      'p.active = true',
      `(
        p.user_id = $1::uuid
        OR EXISTS (
          SELECT 1 FROM projects_members pm2
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
      params.push(status);
      paramIndex++;
    }

    if (methodology) {
      conditions.push(`p.methodology = $${paramIndex}::project_methodology`);
      params.push(methodology);
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
      conditions.push('p.parent_project_id IS NULL');
    }

    const whereClause = conditions.join('\n        AND ');

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
            COUNT(*) FILTER (WHERE status IN ('open','in_progress'))     AS active,
            COUNT(*) FILTER (WHERE status = 'open')                      AS open,
            COUNT(*) FILTER (WHERE status = 'in_progress')               AS in_progress,
            COUNT(*) FILTER (WHERE status = 'paused')                    AS paused,
            COUNT(*) FILTER (WHERE status = 'completed')                 AS completed,
            COUNT(*) FILTER (WHERE status = 'archived')                  AS archived
          FROM user_projects
        ),
        methodology_stats AS (
          SELECT
            COUNT(*) FILTER (WHERE methodology = 'kanban')    AS kanban,
            COUNT(*) FILTER (WHERE methodology = 'scrum')     AS scrum,
            COUNT(*) FILTER (WHERE methodology = 'waterfall') AS waterfall,
            COUNT(*) FILTER (WHERE methodology = 'custom')    AS custom
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
            COUNT(*) FILTER (WHERE n.status = 'visible')    AS visible,
            COUNT(*) FILTER (WHERE n.status = 'archived')   AS archived,
            COUNT(*) FILTER (WHERE n.status = 'secure')     AS secure
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
}

module.exports = new ProjectsRepository();
