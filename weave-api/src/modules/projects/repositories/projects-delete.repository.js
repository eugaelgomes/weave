const { executeQuery } = require("@/database/connection");
const {
  PROJECT_WRITE_CAPABLE_ROLES,
} = require("@/modules/projects/project-role-policy");

const PROJECT_WRITE_CAPABLE_ROLES_SQL = PROJECT_WRITE_CAPABLE_ROLES.map(
  (role) => `'${role}'`
).join(", ");

class ProjectsDeleteRepository {
  async deleteProject(projectId, userId) {
    const query = `
      UPDATE projects
      SET deleted = true, updated_at = NOW()
      WHERE id = $1 AND user_id = $2
      RETURNING id::text;
    `;

    return executeQuery(query, [projectId, userId]);
  }
  async deleteProjectInOrganization(projectId, organizationId) {
    const query = `
      UPDATE projects
      SET deleted = true, updated_at = NOW()
      WHERE id = $1 AND organization_id = $2::uuid AND deleted = false
      RETURNING id::text, user_id::text;
    `;

    return executeQuery(query, [projectId, organizationId]);
  }
  async removeCollaborator(projectId, ownerId, collaboratorUserId) {
    const query = `
      WITH deleted_member AS (
        UPDATE project_members
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
      LEFT JOIN project_members pm ON pm.project_id = p.id AND pm.deleted = false
      LEFT JOIN users u ON u.user_id = pm.user_id
      WHERE p.id = $1::uuid
      GROUP BY p.id;
    `;

    return executeQuery(query, [projectId, ownerId, collaboratorUserId]);
  }
  async removeCollaboratorWithOrgManagement(
    projectId,
    organizationId,
    collaboratorUserId
  ) {
    const query = `
      WITH deleted_member AS (
        UPDATE project_members
        SET deleted = true, updated_at = NOW()
        WHERE project_id = $1::uuid
          AND user_id = $3::uuid
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

    return executeQuery(query, [projectId, organizationId, collaboratorUserId]);
  }
  async removeNoteFromProject(projectId, noteId, userId) {
    const query = `
      WITH updated_note AS (
        UPDATE notes
        SET project_id = NULL, project_stage_id = NULL, updated_at = NOW()
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
              WHERE project_id = $1::uuid AND deleted = false AND id != $2::uuid),
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
      SELECT * FROM updated_project;
    `;

    return executeQuery(query, [projectId, noteId, userId]);
  }
  async removeNoteFromProjectWithOrgScope(
    projectId,
    noteId,
    userId,
    organizationId
  ) {
    const query = `
      WITH updated_note AS (
        UPDATE notes
        SET project_id = NULL, project_stage_id = NULL, updated_at = NOW()
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
              WHERE project_id = $1::uuid AND deleted = false AND id != $2::uuid),
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
      SELECT * FROM updated_project;
    `;

    return executeQuery(query, [projectId, noteId, userId, organizationId]);
  }

  _projectProgressExpr() {
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

  async deleteProjectStage(projectId, userId, stageId) {
    const progressExpr = this._projectProgressExpr();
    const query = `
      WITH auth AS (
        SELECT 1
        FROM project_stages ps
        JOIN projects p ON p.id = ps.project_id
        WHERE ps.id = $3::uuid
          AND ps.project_id = $1::uuid
          AND p.user_id = $2::uuid
          AND p.deleted = false
          AND (
            SELECT COUNT(*)::int FROM project_stages ps2
            WHERE ps2.project_id = $1::uuid
          ) > 1
      ),
      fallback_stage AS (
        SELECT id FROM project_stages
        WHERE project_id = $1::uuid
          AND id <> $3::uuid
        ORDER BY "position" ASC
        LIMIT 1
      ),
      notes_upd AS (
        UPDATE notes n
        SET project_stage_id = (SELECT id FROM fallback_stage), updated_at = NOW()
        WHERE n.project_id = $1::uuid
          AND n.project_stage_id = $3::uuid
          AND n.deleted = false
          AND EXISTS (SELECT 1 FROM auth)
          AND EXISTS (SELECT 1 FROM fallback_stage)
        RETURNING n.id
      ),
      del AS (
        DELETE FROM project_stages ps
        WHERE ps.id = $3::uuid
          AND ps.project_id = $1::uuid
          AND EXISTS (SELECT 1 FROM auth)
        RETURNING
          ps.id::text,
          ps.project_id::text,
          ps.name,
          ps."position",
          ps.color,
          ps.properties,
          ps.created_at,
          ps.updated_at
      ),
      proj_upd AS (
        UPDATE projects p
        SET
          properties = COALESCE(p.properties, '{}'::jsonb)
            || jsonb_build_object('progress', (${progressExpr})),
          updated_at = NOW()
        WHERE p.id = $1::uuid
          AND p.user_id = $2::uuid
          AND p.deleted = false
          AND EXISTS (SELECT 1 FROM del)
        RETURNING p.id
      )
      SELECT row_to_json(d.*) AS stage FROM del d;
    `;

    const rows = await executeQuery(query, [projectId, userId, stageId]);
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

  async deleteProjectStageInOrganization(projectId, organizationId, stageId) {
    const progressExpr = this._projectProgressExpr();
    const query = `
      WITH auth AS (
        SELECT 1
        FROM project_stages ps
        JOIN projects p ON p.id = ps.project_id
        WHERE ps.id = $3::uuid
          AND ps.project_id = $1::uuid
          AND p.organization_id = $2::uuid
          AND p.deleted = false
          AND (
            SELECT COUNT(*)::int FROM project_stages ps2
            WHERE ps2.project_id = $1::uuid
          ) > 1
      ),
      fallback_stage AS (
        SELECT id FROM project_stages
        WHERE project_id = $1::uuid
          AND id <> $3::uuid
        ORDER BY "position" ASC
        LIMIT 1
      ),
      notes_upd AS (
        UPDATE notes n
        SET project_stage_id = (SELECT id FROM fallback_stage), updated_at = NOW()
        WHERE n.project_id = $1::uuid
          AND n.project_stage_id = $3::uuid
          AND n.deleted = false
          AND EXISTS (SELECT 1 FROM auth)
          AND EXISTS (SELECT 1 FROM fallback_stage)
        RETURNING n.id
      ),
      del AS (
        DELETE FROM project_stages ps
        WHERE ps.id = $3::uuid
          AND ps.project_id = $1::uuid
          AND EXISTS (SELECT 1 FROM auth)
        RETURNING
          ps.id::text,
          ps.project_id::text,
          ps.name,
          ps."position",
          ps.color,
          ps.properties,
          ps.created_at,
          ps.updated_at
      ),
      proj_upd AS (
        UPDATE projects p
        SET
          properties = COALESCE(p.properties, '{}'::jsonb)
            || jsonb_build_object('progress', (${progressExpr})),
          updated_at = NOW()
        WHERE p.id = $1::uuid
          AND p.organization_id = $2::uuid
          AND p.deleted = false
          AND EXISTS (SELECT 1 FROM del)
        RETURNING p.id
      )
      SELECT row_to_json(d.*) AS stage FROM del d;
    `;

    const rows = await executeQuery(query, [
      projectId,
      organizationId,
      stageId,
    ]);
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

module.exports = new ProjectsDeleteRepository();
