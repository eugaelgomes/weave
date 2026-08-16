/**
 * @module agent-house/repositories/agents.repository
 * @description Data access layer for Weave AI Agents (ai_user_agent table).
 * Handles CRUD operations, sharing permissions, and project associations for custom agents.
 *
 * Dependencies:
 * - `@/database/connection`: PostgreSQL connection pool.
 *
 * Used by:
 * - `agent-house/controllers/agents.controller.js`: For all agent management API endpoints.
 * - `agent-house/services/chat-orchestrator.service.js`: To fetch agent personality and tool constraints before chat generation.
 */
const { pool } = require("@/database/connection");

class AgentsRepository {
  /**
   * Creates a new user agent.
   *
   * @param {string} userId
   * @param {object} data
   * @param {string} data.name
   * @param {string} [data.description]
   * @param {string|null} [data.projectId]
   * @param {boolean} [data.isActive]
   * @param {object} [data.personality]
   * @returns {Promise<object>}
   */
  async createAgent(userId, data) {
    const query = `
      INSERT INTO ai_user_agent (
        user_id, name, description, project_id, is_active, personality,
        created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
      RETURNING *
    `;

    const result = await pool.query(query, [
      userId,
      data.name || "Unnamed Agent",
      data.description || null,
      data.projectId || null,
      data.isActive !== false,
      data.personality || {},
    ]);
    return result.rows[0];
  }

  /**
   * Lists user agents with optional filtering.
   *
   * @param {string} userId
   * @param {object} [filters]
   * @param {string} [filters.projectId]
   * @param {boolean} [filters.isActive]
   * @param {string} [filters.search]
   * @returns {Promise<object[]>}
   */
  async getUserAgents(userId, filters = {}) {
    const conditions = ["a.user_id = $1", "(a.deleted = false OR a.deleted IS NULL)"];
    const values = [userId];
    let paramIndex = 2;

    if (filters.projectId) {
      conditions.push(`a.project_id = $${paramIndex}`);
      values.push(filters.projectId);
      paramIndex++;
    }

    if (filters.isActive !== undefined) {
      conditions.push(`a.is_active = $${paramIndex}`);
      values.push(filters.isActive);
      paramIndex++;
    }

    if (filters.search) {
      conditions.push(`(a.name ILIKE $${paramIndex} OR a.description ILIKE $${paramIndex})`);
      values.push(`%${filters.search}%`);
      paramIndex++;
    }

    const query = `
      SELECT
        a.id, a.user_id, a.name, a.description, a.project_id, a.is_active,
        a.personality, a.knowledge_files, a.shared_with,
        a.created_at, a.updated_at,
        p.title AS project_title
      FROM ai_user_agent a
      LEFT JOIN projects p ON p.id = a.project_id AND p.deleted = false
      WHERE ${conditions.join(" AND ")}
      ORDER BY a.updated_at DESC
    `;

    const result = await pool.query(query, values);
    return result.rows;
  }

  /**
   * Gets a single agent by ID.
   *
   * @param {string} agentId
   * @param {string} userId
   * @returns {Promise<object|undefined>}
   */
  async getAgentById(agentId, userId) {
    const query = `
      SELECT
        a.id, a.user_id, a.name, a.description, a.project_id, a.is_active,
        a.personality, a.knowledge_files, a.shared_with,
        a.created_at, a.updated_at,
        p.title AS project_title
      FROM ai_user_agent a
      LEFT JOIN projects p ON p.id = a.project_id AND p.deleted = false
      WHERE a.id = $1 AND a.user_id = $2 AND (a.deleted = false OR a.deleted IS NULL)
      LIMIT 1
    `;

    const result = await pool.query(query, [agentId, userId]);
    return result.rows[0];
  }

  /**
   * Gets a single agent by ID, allowing owner or explicit share access.
   *
   * @param {string} agentId
   * @param {string} userId
   * @returns {Promise<object|undefined>}
   */
  async getAgentByIdWithAccess(agentId, userId) {
    const query = `
      SELECT
        a.id, a.user_id, a.name, a.description, a.project_id, a.is_active,
        a.personality, a.knowledge_files, a.shared_with,
        a.created_at, a.updated_at,
        p.title AS project_title
      FROM ai_user_agent a
      LEFT JOIN projects p ON p.id = a.project_id AND p.deleted = false
      WHERE a.id = $1
        AND (a.deleted = false OR a.deleted IS NULL)
        AND (
          a.user_id = $2
          OR EXISTS (
            SELECT 1
            FROM jsonb_array_elements(COALESCE(a.shared_with, '[]'::jsonb)) AS shared_entry
            WHERE shared_entry->>'userId' = $2::text
          )
        )
      LIMIT 1
    `;

    const result = await pool.query(query, [agentId, userId]);
    return result.rows[0];
  }

  /**
   * Gets all agents bound to a specific project.
   *
   * @param {string} projectId
   * @param {string} userId
   * @returns {Promise<object[]>}
   */
  async getAgentsByProject(projectId, userId) {
    const query = `
      SELECT
        a.id, a.user_id, a.name, a.description, a.project_id, a.is_active,
        a.personality, a.knowledge_files, a.shared_with,
        a.created_at, a.updated_at
      FROM ai_user_agent a
      WHERE a.project_id = $1
        AND a.user_id = $2
        AND (a.deleted = false OR a.deleted IS NULL)
      ORDER BY a.updated_at DESC
    `;

    const result = await pool.query(query, [projectId, userId]);
    return result.rows;
  }

  /**
   * Updates an agent with partial data.
   *
   * @param {string} agentId
   * @param {string} userId
   * @param {object} updates
   * @returns {Promise<object|undefined>}
   */
  async updateAgent(agentId, userId, updates) {
    const allowedColumns = [
      "name",
      "description",
      "project_id",
      "is_active",
      "personality",
      "knowledge_files",
      "shared_with",
    ];

    const fields = [];
    const values = [agentId, userId];
    let paramIndex = 3;

    for (const [key, value] of Object.entries(updates)) {
      if (allowedColumns.includes(key)) {
        fields.push(`${key} = $${paramIndex}`);
        values.push(value);
        paramIndex++;
      }
    }

    if (fields.length === 0) return null;

    const query = `
      UPDATE ai_user_agent
      SET ${fields.join(", ")}, updated_at = NOW()
      WHERE id = $1 AND user_id = $2 AND (deleted = false OR deleted IS NULL)
      RETURNING *
    `;

    const result = await pool.query(query, values);
    return result.rows[0];
  }

  /**
   * Assigns an agent to a project.
   *
   * @param {string} agentId
   * @param {string} userId
   * @param {string} projectId
   * @returns {Promise<object|undefined>}
   */
  async assignToProject(agentId, userId, projectId) {
    const query = `
      UPDATE ai_user_agent
      SET project_id = $3, updated_at = NOW()
      WHERE id = $1 AND user_id = $2 AND (deleted = false OR deleted IS NULL)
      RETURNING *
    `;

    const result = await pool.query(query, [agentId, userId, projectId]);
    return result.rows[0];
  }

  /**
   * Removes an agent from its project.
   *
   * @param {string} agentId
   * @param {string} userId
   * @returns {Promise<object|undefined>}
   */
  async unassignFromProject(agentId, userId) {
    const query = `
      UPDATE ai_user_agent
      SET project_id = NULL, updated_at = NOW()
      WHERE id = $1 AND user_id = $2 AND (deleted = false OR deleted IS NULL)
      RETURNING *
    `;

    const result = await pool.query(query, [agentId, userId]);
    return result.rows[0];
  }

  /**
   * Toggles the active state of an agent.
   *
   * @param {string} agentId
   * @param {string} userId
   * @param {boolean} isActive
   * @returns {Promise<object|undefined>}
   */
  async toggleActive(agentId, userId, isActive) {
    const query = `
      UPDATE ai_user_agent
      SET is_active = $3, updated_at = NOW()
      WHERE id = $1 AND user_id = $2 AND (deleted = false OR deleted IS NULL)
      RETURNING *
    `;

    const result = await pool.query(query, [agentId, userId, isActive]);
    return result.rows[0];
  }

  /**
   * Duplicates an existing agent with a "(Copy)" suffix.
   *
   * @param {string} agentId
   * @param {string} userId
   * @returns {Promise<object|undefined>}
   */
  async duplicateAgent(agentId, userId) {
    const query = `
      INSERT INTO ai_user_agent (
        user_id, name, description, project_id, is_active,
        personality, knowledge_files, shared_with,
        created_at, updated_at
      )
      SELECT
        user_id,
        name || ' (Copy)',
        description,
        project_id,
        is_active,
        personality,
        knowledge_files,
        '[]'::jsonb,
        NOW(),
        NOW()
      FROM ai_user_agent
      WHERE id = $1 AND user_id = $2 AND (deleted = false OR deleted IS NULL)
      RETURNING *
    `;

    const result = await pool.query(query, [agentId, userId]);
    return result.rows[0];
  }

  /**
   * Shares an agent with other users.
   *
   * @param {string} agentId
   * @param {string} ownerId
   * @param {Array<{userId: string, permission: string}>} sharedWithList
   * @returns {Promise<object|undefined>}
   */
  async shareAgent(agentId, ownerId, sharedWithList) {
    const query = `
      UPDATE ai_user_agent
      SET shared_with = $3::jsonb, updated_at = NOW()
      WHERE id = $1 AND user_id = $2
      RETURNING *
    `;

    const result = await pool.query(query, [agentId, ownerId, JSON.stringify(sharedWithList)]);
    return result.rows[0];
  }

  /**
   * Soft-deletes an agent.
   *
   * @param {string} agentId
   * @param {string} userId
   * @returns {Promise<boolean>}
   */
  async deleteAgent(agentId, userId) {
    const query = `
      UPDATE ai_user_agent
      SET deleted = true, deleted_at = NOW()
      WHERE id = $1 AND user_id = $2
    `;

    await pool.query(query, [agentId, userId]);
    return true;
  }
}

module.exports = new AgentsRepository();
