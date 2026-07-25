/**
 * Sprint Context Builder
 *
 * Assembles the full sprint context for the weave-engine by querying
 * project data, stages, notes, blocks, and members. Outputs structured
 * markdown with stats for LLM consumption.
 */

const { executeQuery } = require("../../database/connection");
const { notesGroupedByStage } = require("./notes-to-markdown");
const { logger } = require("../../config/logger");

const MAX_BLOCKS_PER_NOTE = 8;

class SprintContextBuilder {
  /**
   * Builds the full sprint context markdown + stats.
   *
   * @param {object} config - Report config row from getDueConfigs()
   * @returns {Promise<{ fullContext: string, stats: object }>}
   */
  async build(config) {
    const projectId = config.project_id;
    const sprintId = config.sprint_id;

    const [project, stages, notes, members] = await Promise.all([
      this._fetchProject(projectId),
      this._fetchStages(projectId),
      this._fetchNotesWithMeta(projectId),
      this._fetchMembers(projectId),
    ]);

    if (!project) {
      logger.warn("Sprint context builder: project not found", { projectId });
      return { fullContext: "", stats: {} };
    }

    // Fetch blocks for each note (max 8 root-level per note)
    const blocksByNoteId = new Map();
    for (const note of notes) {
      const blocks = await this._fetchBlocks(note.id);
      blocksByNoteId.set(note.id, blocks);
    }

    // Group notes by stage
    const notesByStageId = new Map();
    const unstagedNotes = [];

    for (const note of notes) {
      if (note.project_stage_id) {
        const stageId = note.project_stage_id;
        if (!notesByStageId.has(stageId)) {
          notesByStageId.set(stageId, []);
        }
        notesByStageId.get(stageId).push(note);
      } else {
        unstagedNotes.push(note);
      }
    }

    // Calculate stats
    const stats = this._calculateStats(notes, blocksByNoteId, stages, notesByStageId);

    // Build full markdown context
    const fullContext = this._buildMarkdown(
      project,
      config,
      stages,
      members,
      notesByStageId,
      blocksByNoteId,
      unstagedNotes,
      stats
    );

    return { fullContext, stats };
  }

  // ═══════════════════════════════════════════════════════════════════
  // DB Queries
  // ═══════════════════════════════════════════════════════════════════

  async _fetchProject(projectId) {
    const rows = await executeQuery(
      `SELECT
        p.id::text, p.title, p.description, p.status, p.methodology,
        p.properties, p.organization_id::text,
        u.name AS owner_name, u.user_id::text AS owner_id,
        o.org_name AS organization_name
      FROM projects p
      INNER JOIN users u ON u.user_id = p.user_id
      LEFT JOIN organizations o ON o.id = p.organization_id AND o.deleted = false
      WHERE p.id = $1 AND p.deleted = false`,
      [projectId]
    );
    return rows[0] || null;
  }

  async _fetchStages(projectId) {
    return executeQuery(
      `SELECT
        id::text, name, position, color, properties
      FROM project_stages
      WHERE project_id = $1 AND deleted = false
      ORDER BY position ASC`,
      [projectId]
    );
  }

  async _fetchNotesWithMeta(projectId) {
    return executeQuery(
      `SELECT
        n.id::text,
        n.title,
        n.description,
        n.status,
        n.due_date,
        n.project_id::text,
        n.project_stage_id::text,
        n.user_id::text,
        n.properties,
        n.created_at,
        n.updated_at,
        u.name AS user_name,
        pst.name AS project_stage_name,
        tp.name AS priority_name,
        tp.color_hex AS priority_color,
        COALESCE(
          (SELECT json_agg(json_build_object('id', t.id, 'name', t.name, 'color', t.color_hex))
           FROM tags t WHERE t.id = ANY(n.tags)), '[]'::json
        ) AS resolved_tags,
        COALESCE(
          (SELECT json_agg(json_build_object(
            'id', c.user_id, 'name', c.name, 'username', c.username
          ))
          FROM note_collaborators nc
          INNER JOIN users c ON nc.user_id = c.user_id
          WHERE nc.note_id = n.id), '[]'::json
        ) AS collaborators
      FROM notes n
      INNER JOIN users u ON n.user_id = u.user_id
      LEFT JOIN project_stages pst ON pst.id = n.project_stage_id
      LEFT JOIN task_priorities tp ON tp.id = n.priority_id AND tp.deleted = false
      WHERE n.project_id = $1
        AND n.deleted = false
      ORDER BY n.updated_at DESC`,
      [projectId]
    );
  }

  async _fetchBlocks(noteId) {
    const rows = await executeQuery(
      `SELECT
        id::text,
        note_id::text,
        parent_id::text,
        type,
        properties,
        position,
        created_by::text
      FROM note_blocks
      WHERE note_id = $1 AND deleted = false
      ORDER BY parent_id NULLS FIRST, position ASC, created_at ASC`,
      [noteId]
    );

    // Build tree (same logic as note-blocks.repository.buildBlocksTree)
    const tree = this._buildBlocksTree(rows);

    // Return max 8 root-level blocks
    return tree.slice(0, MAX_BLOCKS_PER_NOTE);
  }

  async _fetchMembers(projectId) {
    return executeQuery(
      `SELECT
        pm.user_id::text,
        pm.role,
        u.name,
        u.username,
        u.email
      FROM project_members pm
      INNER JOIN users u ON u.user_id = pm.user_id
      WHERE pm.project_id = $1
        AND pm.deleted = false
        AND pm.suspended = false
      ORDER BY
        CASE pm.role
          WHEN 'project_manager' THEN 0
          WHEN 'contributor' THEN 1
          WHEN 'commenter' THEN 2
          WHEN 'viewer' THEN 3
          ELSE 4
        END`,
      [projectId]
    );
  }

  // ═══════════════════════════════════════════════════════════════════
  // Tree builder (mirrors note-blocks.repository.buildBlocksTree)
  // ═══════════════════════════════════════════════════════════════════

  _buildBlocksTree(rows) {
    const ROOT = "__root__";
    const byParent = new Map();

    for (const r of rows) {
      const pid = r.parent_id ? String(r.parent_id) : ROOT;
      if (!byParent.has(pid)) byParent.set(pid, []);
      byParent.get(pid).push(r);
    }

    for (const list of byParent.values()) {
      list.sort((a, b) => Number(a.position) - Number(b.position));
    }

    const walk = (parentKey, depth) => {
      const siblings = byParent.get(parentKey) || [];
      return siblings.map((r) => {
        const props =
          r.properties && typeof r.properties === "object" ? r.properties : {};
        const node = {
          children: [],
          id: String(r.id),
          properties: props,
          text: typeof props.text === "string" ? props.text : "",
          type: r.type,
        };
        if (r.type === "todo") {
          node.done = props.attrs?.checked === true;
        }
        if (r.type === "list") {
          node.children = walk(String(r.id), depth + 1);
        }
        return node;
      });
    };

    return walk(ROOT, 0);
  }

  // ═══════════════════════════════════════════════════════════════════
  // Stats calculator
  // ═══════════════════════════════════════════════════════════════════

  _calculateStats(notes, blocksByNoteId, stages, notesByStageId) {
    let completedTodos = 0;
    let pendingTodos = 0;
    let overdueNotes = 0;
    const now = new Date();

    for (const note of notes) {
      // Due date check
      if (note.due_date && new Date(note.due_date) < now) {
        overdueNotes++;
      }

      // Count todos in blocks
      const blocks = blocksByNoteId.get(note.id) || [];
      const countTodos = (blockList) => {
        for (const b of blockList) {
          if (b.type === "todo") {
            if (b.done || b.properties?.attrs?.checked) {
              completedTodos++;
            } else {
              pendingTodos++;
            }
          }
          if (Array.isArray(b.children)) {
            countTodos(b.children);
          }
        }
      };
      countTodos(blocks);
    }

    const notesByStage = {};
    for (const stage of stages) {
      const stageNotes = notesByStageId.get(stage.id) || [];
      notesByStage[stage.name] = stageNotes.length;
    }

    return {
      completedTodos,
      notesByStage,
      overdueNotes,
      pendingTodos,
      totalNotes: notes.length,
    };
  }

  // ═══════════════════════════════════════════════════════════════════
  // Full markdown builder
  // ═══════════════════════════════════════════════════════════════════

  _buildMarkdown(
    project,
    config,
    stages,
    members,
    notesByStageId,
    blocksByNoteId,
    unstagedNotes,
    stats
  ) {
    const parts = [];

    // Project header
    parts.push(`# 📋 Project: ${project.title}`);
    parts.push(`- **ID**: ${project.id}`);
    parts.push(`- **Status**: ${project.status || "OPEN"}`);
    parts.push(`- **Methodology**: ${project.methodology || "N/A"}`);
    if (project.organization_name) {
      parts.push(`- **Organization**: ${project.organization_name}`);
    }
    if (project.description) {
      parts.push(`- **Description**: ${project.description}`);
    }
    parts.push("");

    // Sprint info
    if (config.sprint_id) {
      parts.push(
        `## 🏃 Sprint ${config.sprint_number || "?"} (${this._formatDate(config.sprint_start)} – ${this._formatDate(config.sprint_end)})`
      );
      if (config.sprint_title) {
        parts.push(`- **Title**: ${config.sprint_title}`);
      }
      parts.push(`- **Status**: ${config.sprint_status || "active"}`);

      const daysRemaining = this._daysUntil(config.sprint_end);
      if (daysRemaining !== null) {
        parts.push(`- **Days Remaining**: ${daysRemaining}`);
      }
      parts.push("");
    }

    // Quick stats
    parts.push("## 📈 Quick Stats");
    parts.push(`- **Total Notes/Tasks**: ${stats.totalNotes}`);
    parts.push(`- **Completed Todos**: ${stats.completedTodos}`);
    parts.push(`- **Pending Todos**: ${stats.pendingTodos}`);
    parts.push(`- **Overdue Notes**: ${stats.overdueNotes}`);
    for (const [stageName, count] of Object.entries(stats.notesByStage)) {
      parts.push(`- **${stageName}**: ${count} notes`);
    }
    parts.push("");

    // Team
    if (members.length > 0) {
      parts.push("## 👥 Team");
      for (const m of members) {
        const role = (m.role || "member").toUpperCase().replace(/_/g, " ");
        parts.push(`- ${m.name || m.username} — ${role}`);
      }
      parts.push("");
    }

    // Notes by stage
    const notesSection = notesGroupedByStage(
      stages,
      notesByStageId,
      blocksByNoteId,
      unstagedNotes
    );
    parts.push(notesSection);

    return parts.join("\n");
  }

  // ═══════════════════════════════════════════════════════════════════
  // Helpers
  // ═══════════════════════════════════════════════════════════════════

  _formatDate(date) {
    if (!date) return "?";
    const d = typeof date === "string" ? date.split("T")[0] : new Date(date).toISOString().split("T")[0];
    const [y, m, day] = d.split("-");
    return `${day}/${m}/${y}`;
  }

  _daysUntil(date) {
    if (!date) return null;
    const target = new Date(typeof date === "string" ? date : date.toISOString());
    const now = new Date();
    const diff = Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return Math.max(0, diff);
  }
}

module.exports = new SprintContextBuilder();
