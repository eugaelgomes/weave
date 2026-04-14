const { executeQuery } = require("@/database/connection");

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
      WHERE id = $1 AND org_id = $2::uuid AND deleted = false
      RETURNING id::text, user_id::text;
    `;

    return executeQuery(query, [projectId, organizationId]);
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
  async removeCollaboratorWithOrgManagement(
    projectId,
    organizationId,
    collaboratorUserId
  ) {
    const query = `
      WITH deleted_member AS (
        UPDATE projects_members
        SET deleted = true, updated_at = NOW()
        WHERE project_id = $1::uuid
          AND user_id = $3::uuid
          AND EXISTS (
            SELECT 1 FROM projects
            WHERE id = $1::uuid AND org_id = $2::uuid AND deleted = false
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
              WHERE p_org.id = $1::uuid AND p_org.org_id = $4::uuid AND p_org.deleted = false
            )
            OR (user_id = $3::uuid OR EXISTS (
              SELECT 1 FROM projects_members pm
              WHERE pm.project_id = $1::uuid
                AND pm.user_id = $3::uuid
                AND pm.deleted = false
                AND pm.suspended = false
                AND pm.role = 'admin'
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
}

module.exports = new ProjectsDeleteRepository();
