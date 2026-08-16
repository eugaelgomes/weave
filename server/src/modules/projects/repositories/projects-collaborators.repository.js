const { executeQuery } = require("@/database/connection");

/**
 * @typedef {Object} ProjectCollaboratorJson
 * @property {string} user_id
 * @property {string} [name]
 * @property {string} [username]
 * @property {string} [email]
 * @property {string|null} [avatar_url]
 * @property {string} role
 * @property {string} [added_at]
 * @property {string} [added_by]

 */

/**
 * Row returned by collaborator mutation/list queries: project id plus aggregated collaborators.
 * @typedef {Object} ProjectCollaboratorsAggregateRow
 * @property {string} id
 * @property {ProjectCollaboratorJson[]} collaborators
 */

/**
 * Minimal project row (owner-scoped lookup).
 * @typedef {Object} ProjectSummaryRow
 * @property {string} id
 * @property {string} user_id
 * @property {string} title
 * @property {string|null} [description]
 * @property {Object} [properties]
 * @property {unknown} [projects_files]
 * @property {string} status
 * @property {string} created_at
 * @property {string} updated_at
 * @property {boolean} deleted
 */

/**
 * Note summary embedded in project detail queries.
 * @typedef {Object} AssociatedNoteJson
 * @property {string} id
 * @property {string} title
 * @property {string|null} [description]
 * @property {unknown} [tags]
 * @property {string} status
 * @property {string} created_at
 * @property {string} updated_at
 * @property {{ user_id: string, username: string }} created_by
 */

/**
 * Project row with owner/org/collaborators/notes (access or org-scope detail).
 * @typedef {Object} ProjectDetailRow
 * @property {string} id
 * @property {string} user_id
 * @property {string} title
 * @property {string|null} [description]
 * @property {Object} [properties]
 * @property {unknown} [projects_files]
 * @property {string} status
 * @property {string} created_at
 * @property {string} updated_at
 * @property {boolean} deleted
 * @property {string} [owner_username]
 * @property {string} [owner_email]
 * @property {string} [owner_name]
 * @property {string|null} [owner_avatar_url]
 * @property {string|null} [organization_id]
 * @property {string|null} [organization_name]
 * @property {string|null} [organization_unique_name]
 * @property {string|null} [organization_logo_url]
 * @property {ProjectCollaboratorJson[]} collaborators
 * @property {AssociatedNoteJson[]} associated_notes
 */

/**
 * Persists and reads `project_members` and related project context for collaborators.
 * All SQL lives in this module; callers use UUID strings compatible with Postgres casting.
 */
class ProjectsCollaboratorsRepository {
  /**
   * Inserts an active project member when the acting user owns the project.
   * @param {string} projectId - Project UUID.
   * @param {string} ownerId - Project owner user UUID (`added_by`).
   * @param {string} collaboratorUserId - User UUID to add as member.
   * @param {string} [role="viewer"] - `project_member_role_enum` value (stored uppercased).
   * @returns {Promise<ProjectCollaboratorsAggregateRow[]>}
   */
  async addCollaborator(projectId, ownerId, collaboratorUserId, role = "viewer") {
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

  /**
   * Inserts a project member when the project belongs to the given organization.
   * @param {string} projectId - Project UUID.
   * @param {string} organizationId - Organization UUID matching `projects.organization_id`.
   * @param {string} actingUserId - User UUID recorded as `added_by`.
   * @param {string} collaboratorUserId - User UUID to add as member.
   * @param {string} [role="viewer"] - `project_member_role_enum` value (stored uppercased).
   * @returns {Promise<ProjectCollaboratorsAggregateRow[]>}
   */
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
    return executeQuery(query, [projectId, organizationId, actingUserId, collaboratorUserId, role]);
  }

  /**
   * Updates a member's role under org-scoped project ownership.
   * @param {string} projectId - Project UUID.
   * @param {string} organizationId - Organization UUID.
   * @param {string} collaboratorUserId - Member user UUID.
   * @param {string} newRole - New `project_member_role_enum` value (stored uppercased).
   * @returns {Promise<ProjectCollaboratorsAggregateRow[]>}
   */
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
    return executeQuery(query, [projectId, organizationId, collaboratorUserId, newRole]);
  }

  /**
   * Updates a member's role when the project is owned by `ownerId`.
   * @param {string} projectId - Project UUID.
   * @param {string} ownerId - Project owner user UUID.
   * @param {string} collaboratorUserId - Member user UUID.
   * @param {string} newRole - New `project_member_role_enum` value (stored uppercased).
   * @returns {Promise<ProjectCollaboratorsAggregateRow[]>}
   */
  async updateCollaboratorPermission(projectId, ownerId, collaboratorUserId, newRole) {
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
    return executeQuery(query, [projectId, ownerId, collaboratorUserId, newRole]);
  }

  /**
   * Soft-deletes a project member when the project is owned by `ownerId`.
   * @param {string} projectId - Project UUID.
   * @param {string} ownerId - Project owner user UUID.
   * @param {string} collaboratorUserId - Member user UUID.
   * @returns {Promise<ProjectCollaboratorsAggregateRow[]>}
   */
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

  /**
   * Soft-deletes a project member under org-scoped project ownership.
   * @param {string} projectId - Project UUID.
   * @param {string} organizationId - Organization UUID.
   * @param {string} collaboratorUserId - Member user UUID.
   * @returns {Promise<ProjectCollaboratorsAggregateRow[]>}
   */
  async removeCollaboratorWithOrgManagement(projectId, organizationId, collaboratorUserId) {
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

  /**
   * Lists collaborators for a project if `userId` is owner or an active member.
   * @param {string} projectId - Project UUID.
   * @param {string} userId - Requesting user UUID.
   * @returns {Promise<Array<{ id: string, user_id: string, collaborators: ProjectCollaboratorJson[] }>>}
   */
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
          )
        )
      GROUP BY p.id;
    `;
    return executeQuery(query, [projectId, userId]);
  }

  /**
   * Lists collaborators when the project belongs to `organizationId`.
   * @param {string} projectId - Project UUID.
   * @param {string} organizationId - Organization UUID.
   * @returns {Promise<Array<{ id: string, user_id: string, collaborators: ProjectCollaboratorJson[] }>>}
   */
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

  /**
   * True if the user is an active member of the project.
   * @param {string} projectId - Project UUID.
   * @param {string} userId - User UUID.
   * @returns {Promise<boolean>}
   */
  async isCollaborator(projectId, userId) {
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

  /**
   * True if a non-deleted membership row exists (regardless of suspension).
   * @param {string} projectId - Project UUID.
   * @param {string} userId - User UUID.
   * @returns {Promise<boolean>}
   */
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

  /**
   * Context Lookup: Get roles for multiple users in a project.
   * @param {string[]} userIds
   * @param {string} projectId
   * @returns {Promise<Array<{ user_id: string, role: string }>>}
   */
  async getCollaboratorsByUserIds(userIds, projectId) {
    if (!userIds || userIds.length === 0) return [];

    const query = `
      SELECT user_id::text, role
      FROM project_members
      WHERE project_id = $1::uuid
        AND user_id = ANY($2::uuid[])
        AND deleted = false
    `;
    return await executeQuery(query, [projectId, userIds]);
  }

  /**
   * Fetches a project row only when `userId` is the owner.
   * @param {string} projectId - Project UUID.
   * @param {string} userId - Owner user UUID.
   * @returns {Promise<ProjectSummaryRow[]>}
   */
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

  /**
   * Fetches project detail when `userId` is owner or an active member.
   * @param {string} projectId - Project UUID.
   * @param {string} userId - Requesting user UUID.
   * @returns {Promise<ProjectDetailRow[]>}
   */
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
          )
        )
      GROUP BY p.id, u.username, u.email, u.name, u.avatar_url, o.org_name, o.unique_name, o.logo_url
      LIMIT 1;
    `;
    return executeQuery(query, [projectId, userId]);
  }

  /**
   * Fetches project detail when the project belongs to `organizationId`.
   * @param {string} projectId - Project UUID.
   * @param {string} organizationId - Organization UUID.
   * @returns {Promise<ProjectDetailRow[]>}
   */
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
}

module.exports = new ProjectsCollaboratorsRepository();
