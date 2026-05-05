/**
 * Notes & Blocks → Markdown Serializer
 *
 * Converts note_blocks tree + note metadata into structured markdown
 * for the weave-engine LLM context. Preserves all IDs, relations,
 * stages, priorities, tags, and file references.
 *
 * Rules:
 * - Notes grouped by project_stages
 * - Max 8 root-level blocks per note (depth-first)
 * - Inline marks applied via char offsets
 */

const MAX_BLOCKS_PER_NOTE = 8;

// ═══════════════════════════════════════════════════════════════════
// Inline mark application
// ═══════════════════════════════════════════════════════════════════

/**
 * Applies marks (bold, italic, link, etc.) to plain text using
 * character offsets (start/end) from the block properties.
 *
 * @param {string} text
 * @param {Array<{ type: string, start: number, end: number, attrs?: object }>} marks
 * @returns {string}
 */
function applyMarks(text, marks) {
  if (!text || !Array.isArray(marks) || marks.length === 0) {
    return text || "";
  }

  // Sort marks by start position descending so we can apply from right-to-left
  // without shifting earlier offsets
  const sorted = [...marks]
    .filter((m) => typeof m.start === "number" && typeof m.end === "number")
    .sort((a, b) => b.start - a.start || b.end - a.end);

  let result = text;

  for (const mark of sorted) {
    const start = Math.max(0, mark.start);
    const end = Math.min(result.length, mark.end);
    if (start >= end) continue;

    const segment = result.slice(start, end);
    let wrapped;

    switch (mark.type) {
      case "bold":
        wrapped = `**${segment}**`;
        break;
      case "italic":
        wrapped = `*${segment}*`;
        break;
      case "strike":
        wrapped = `~~${segment}~~`;
        break;
      case "code":
        wrapped = `\`${segment}\``;
        break;
      case "underline":
        wrapped = `<u>${segment}</u>`;
        break;
      case "highlight":
        wrapped = `==${segment}==`;
        break;
      case "link":
        wrapped = `[${segment}](${mark.attrs?.href || "#"})`;
        break;
      case "subscript":
        wrapped = `<sub>${segment}</sub>`;
        break;
      case "superscript":
        wrapped = `<sup>${segment}</sup>`;
        break;
      default:
        wrapped = segment;
    }

    result = result.slice(0, start) + wrapped + result.slice(end);
  }

  return result;
}

// ═══════════════════════════════════════════════════════════════════
// Block → Markdown conversion
// ═══════════════════════════════════════════════════════════════════

/**
 * Converts a single block node into a markdown line (or lines).
 *
 * @param {object} block
 * @param {number} indent - indentation level for nested lists
 * @returns {string}
 */
function blockToMarkdown(block, indent = 0) {
  const props = block.properties || {};
  const text = applyMarks(
    typeof props.text === "string" ? props.text : block.text || "",
    props.marks
  );
  const prefix = "  ".repeat(indent);

  switch (block.type) {
    case "paragraph":
      return `${prefix}${text}`;

    case "heading": {
      const level = Math.min(Math.max(parseInt(props.attrs?.level) || 1, 1), 6);
      return `${prefix}${"#".repeat(level)} ${text}`;
    }

    case "quote":
      return text
        .split("\n")
        .map((line) => `${prefix}> ${line}`)
        .join("\n");

    case "code": {
      const lang = props.attrs?.language || "";
      return `${prefix}\`\`\`${lang}\n${prefix}${text}\n${prefix}\`\`\``;
    }

    case "divider":
      return `${prefix}---`;

    case "image": {
      const src = props.attrs?.src || "";
      const alt = props.attrs?.alt || "image";
      return `${prefix}![${alt}](${src})`;
    }

    case "list": {
      const ordered = props.attrs?.ordered === true;
      const bullet = ordered ? "1." : "-";
      const selfLine = text ? `${prefix}${bullet} ${text}` : "";

      const childrenLines = (block.children || [])
        .map((child) => blockToMarkdown(child, indent + 1))
        .filter(Boolean);

      return [selfLine, ...childrenLines].filter(Boolean).join("\n");
    }

    case "todo": {
      const checked = props.attrs?.checked === true || block.done === true;
      return `${prefix}- [${checked ? "x" : " "}] ${text}`;
    }

    case "table":
      return `${prefix}${text || "(table)"}`;

    case "page":
      return `${prefix}<!-- page break -->`;

    default:
      return text ? `${prefix}${text}` : "";
  }
}

// ═══════════════════════════════════════════════════════════════════
// Note metadata → YAML frontmatter
// ═══════════════════════════════════════════════════════════════════

/**
 * Builds a YAML-like frontmatter header for a note.
 *
 * @param {object} note
 * @returns {string}
 */
function buildNoteFrontmatter(note) {
  const lines = ["---"];

  lines.push(`note_id: "${note.id}"`);

  if (note.project_id) {
    lines.push(`project_id: "${note.project_id}"`);
  }

  if (note.project_stage_name) {
    lines.push(`stage: "${note.project_stage_name}"`);
  }
  if (note.project_stage_id) {
    lines.push(`stage_id: "${note.project_stage_id}"`);
  }

  if (note.priority_name) {
    const color = note.priority_color || "";
    lines.push(`priority: "${note.priority_name}${color ? ` (${color})` : ""}"`);
  }

  // Resolved tags
  if (Array.isArray(note.resolved_tags) && note.resolved_tags.length > 0) {
    const tagNames = note.resolved_tags.map((t) =>
      typeof t === "string" ? t : t.name || "unknown"
    );
    lines.push(`tags: [${tagNames.map((t) => `"${t}"`).join(", ")}]`);
  }

  if (note.user_name) {
    lines.push(`owner: "${note.user_name}${note.user_id ? ` (${note.user_id})` : ""}"`);
  }

  if (note.due_date) {
    const dueStr =
      note.due_date instanceof Date
        ? note.due_date.toISOString().split("T")[0]
        : String(note.due_date).split("T")[0];
    lines.push(`due_date: "${dueStr}"`);
  }

  if (note.status) {
    lines.push(`status: "${note.status}"`);
  }

  if (Array.isArray(note.collaborators) && note.collaborators.length > 0) {
    const collabNames = note.collaborators
      .filter((c) => c && c.id)
      .map((c) => `"${c.name || c.username || "unknown"} (${c.id})"`);
    if (collabNames.length > 0) {
      lines.push(`collaborators: [${collabNames.join(", ")}]`);
    }
  }

  lines.push("---");
  return lines.join("\n");
}

// ═══════════════════════════════════════════════════════════════════
// Single note → Markdown
// ═══════════════════════════════════════════════════════════════════

/**
 * Serializes a single note (with blocks) into markdown.
 *
 * @param {object} note - Note metadata
 * @param {object[]} blocks - Blocks tree (already built by buildBlocksTree)
 * @returns {string}
 */
function noteToMarkdown(note, blocks = []) {
  const parts = [];

  // Frontmatter
  parts.push(buildNoteFrontmatter(note));
  parts.push("");

  // Title
  parts.push(`### [NOTE] ${note.title || "Untitled"}`);

  // Description
  if (note.description && note.description !== "Write note description here") {
    parts.push(`> ${note.description}`);
  }

  parts.push("");

  // Blocks (max 8 root-level)
  const limited = blocks.slice(0, MAX_BLOCKS_PER_NOTE);
  for (const block of limited) {
    const md = blockToMarkdown(block, 0);
    if (md) {
      parts.push(md);
    }
  }

  if (blocks.length > MAX_BLOCKS_PER_NOTE) {
    parts.push(
      `\n> _...${blocks.length - MAX_BLOCKS_PER_NOTE} more blocks truncated_`
    );
  }

  return parts.join("\n");
}

// ═══════════════════════════════════════════════════════════════════
// Grouped notes by stage → Markdown
// ═══════════════════════════════════════════════════════════════════

/**
 * Groups notes by stage and serializes all into a single markdown document.
 *
 * @param {object[]} stages - Stages sorted by position [{ id, name, position, properties }]
 * @param {Map<string, object[]>} notesByStageId - Map<stageId, notes[]>
 * @param {Map<string, object[]>} blocksByNoteId - Map<noteId, blocks[]>
 * @param {object[]} [unstagedNotes] - Notes without a stage
 * @returns {string}
 */
function notesGroupedByStage(
  stages,
  notesByStageId,
  blocksByNoteId,
  unstagedNotes = []
) {
  const sections = [];

  for (const stage of stages) {
    const stageNotes = notesByStageId.get(stage.id) || [];
    const isDone = stage.properties?.is_done === true;
    const count = stageNotes.length;

    sections.push(
      `## 📊 Stage: ${stage.name} (${count} notes)${isDone ? " ✅" : ""}`
    );

    if (count === 0) {
      sections.push("_No notes in this stage._\n");
      continue;
    }

    for (const note of stageNotes) {
      const blocks = blocksByNoteId.get(note.id) || [];
      sections.push(noteToMarkdown(note, blocks));
      sections.push(""); // blank line separator
    }
  }

  // Unstaged notes
  if (unstagedNotes.length > 0) {
    sections.push(`## 📊 Stage: Unassigned (${unstagedNotes.length} notes)`);
    for (const note of unstagedNotes) {
      const blocks = blocksByNoteId.get(note.id) || [];
      sections.push(noteToMarkdown(note, blocks));
      sections.push("");
    }
  }

  return sections.join("\n");
}

module.exports = {
  applyMarks,
  blockToMarkdown,
  buildNoteFrontmatter,
  noteToMarkdown,
  notesGroupedByStage,
  MAX_BLOCKS_PER_NOTE,
};
