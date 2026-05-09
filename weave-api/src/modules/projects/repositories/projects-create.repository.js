const { executeQuery } = require("@/database/connection");
const {
  PROJECT_WRITE_CAPABLE_ROLES,
} = require("@/modules/projects/project-role-policy");

const PROJECT_WRITE_CAPABLE_ROLES_SQL = PROJECT_WRITE_CAPABLE_ROLES.map(
  (role) => `'${role}'`
).join(", ");

class ProjectsCreateRepository {
  async createProjectWithStages(projectData, stagesData) {
    const query = `
      -- 1. Inserimos o projeto principal e retornamos a linha gerada
      WITH new_project AS (
        INSERT INTO projects (
          user_id, 
          organization_id, 
          title, 
          description, 
          methodology, 
          status, 
          properties,
          parent_project_id
        )
        VALUES (
          $1::uuid, 
          $2::uuid, 
          $3, 
          $4, 
          $5::project_methodology_enum, 
          $6::project_status, 
          $7::jsonb,
          $9::uuid
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
        CROSS JOIN jsonb_to_recordset($8::jsonb) AS s(name text, position integer, color text, properties jsonb)
        RETURNING *
      )
      -- 3. Retornamos o projeto montado já com o array de stages embutido
      SELECT 
        np.id::text,
        np.user_id::text,
        np.organization_id::text,
        np.parent_project_id::text,
        np.title,
        np.description,
        np.methodology,
        np.properties,
        np.status,
        np.created_at,
        np.updated_at,
        np.deleted,
        np.active,
        (
          SELECT jsonb_agg(
            jsonb_build_object(
              'id', st.id::text,
              'project_id', st.project_id::text,
              'name', st.name,
              'position', st.position,
              'color', st.color,
              'properties', st.properties,
              'created_at', st.created_at,
              'updated_at', st.updated_at
            ) ORDER BY st.position ASC
          ) FROM inserted_stages st
        ) AS stages
      FROM new_project np;
    `;

    const values = [
      projectData.user_id,
      projectData.organization_id || null,
      projectData.title,
      projectData.description || null,
      projectData.methodology,
      projectData.status,
      projectData.properties,
      JSON.stringify(stagesData),
      projectData.parent_project_id || null,
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
        INSERT INTO project_members (project_id, user_id, role, added_by)
        VALUES ($1, $3, UPPER($4), $2)
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

    return executeQuery(query, [projectId, ownerId, collaboratorUserId, role]);
  }
  async addCollaboratorWithOrgManagement(
    projectId,
    organizationId,
    actingUserId,
    collaboratorUserId,
    role = "viewer"
  ) {
    const query = `
      WITH inserted_member AS (
        INSERT INTO project_members (project_id, user_id, role, added_by)
        SELECT $1::uuid, $4::uuid, UPPER($5), $3::uuid
        FROM projects p
        WHERE p.id = $1::uuid AND p.organization_id = $2::uuid AND p.deleted = false
        RETURNING *
      )
      SELECT 
        p.id::text,
        COALESCE(
          jsonb_agg(
            DISTINCT jsonb_build_object(
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
      actingUserId,
      collaboratorUserId,
      role,
    ]);
  }
  async addNoteToProject(projectId, noteId, userId) {
    const query = `
      WITH updated_note AS (
        UPDATE notes
        SET project_id = $1::uuid, project_stage_id = NULL, updated_at = NOW()
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
          AND (user_id = $3::uuid OR EXISTS (
            SELECT 1 FROM project_members pm
            WHERE pm.project_id = $1::uuid
              AND pm.user_id = $3::uuid
              AND pm.deleted = false
              AND pm.suspended = false
              AND pm.role IN (${PROJECT_WRITE_CAPABLE_ROLES_SQL})
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
  async addNoteToProjectWithOrgScope(
    projectId,
    noteId,
    userId,
    organizationId
  ) {
    const query = `
      WITH updated_note AS (
        UPDATE notes
        SET project_id = $1::uuid, project_stage_id = NULL, updated_at = NOW()
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

    return executeQuery(query, [projectId, noteId, userId, organizationId]);
  }
}

module.exports = new ProjectsCreateRepository();
