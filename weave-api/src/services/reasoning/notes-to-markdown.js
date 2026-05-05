/**
 * Note-to-Markdown Serializer
 *
 * Converts the note blocks tree and metadata into a clean, structured
 * markdown document for LLM context injection.
 */

const yaml = require("js-yaml");

/**
 * Serializes a collection of notes grouped by project stages.
 *
 * @param {object[]} stages
 * @param {Map} notesByStageId
 * @param {Map} blocksByNoteId
 * @param {object[]} unstagedNotes
 * @returns {string}
 */
function notesGroupedByStage(
  stages,
  notesByStageId,
  blocksByNoteId,
  unstagedNotes
) {
  const sections = [];

  sections.push("## 📝 Notes & Tasks");

  for (const stage of stages) {
    const stageNotes = notesByStageId.get(stage.id) || [];
    if (stageNotes.length === 0) continue;

    sections.push(`### Stage: ${stage.name}`);
    for (const note of stageNotes) {
      sections.push(
        serializeNote(note, blocksByNoteId.get(note.id) || [])
      );
    }
    sections.push("");
  }

  if (unstagedNotes.length > 0) {
    sections.push("### Unstaged / Backlog");
    for (const note of unstagedNotes) {
      sections.push(
        serializeNote(note, blocksByNoteId.get(note.id) || [])
      );
    }
  }

  return sections.join("\n");
}

/**
 * Serializes a single note with its frontmatter and block tree.
 *
 * @param {object} note
 * @param {object[]} blocks
 * @returns {string}
 */
function serializeNote(note, blocks) {
  const frontmatter = {
    id: note.id,
    title: note.title,
    status: note.status,
    priority: note.priority_name || "medium",
    due_date: note.due_date,
    owner: note.user_name,
    collaborators: note.collaborators?.map((c) => c.name) || [],
    tags: note.resolved_tags?.map((t) => t.name) || [],
  };

  const yamlStr = yaml.dump(frontmatter).trim();
  const contentMarkdown = blocksToMarkdown(blocks);

  return `
---
${yamlStr}
---

${contentMarkdown}
`.trim() + "\n";
}

/**
 * Converts a tree of blocks into markdown.
 *
 * @param {object[]} blocks
 * @param {number} depth
 * @returns {string}
 */
function blocksToMarkdown(blocks, depth = 0) {
  if (!Array.isArray(blocks)) return "";

  return blocks
    .map((block) => {
      const indent = "  ".repeat(depth);
      let content = "";

      switch (block.type) {
        case "paragraph":
          content = `${indent}${applyMarks(block.text, block.properties?.marks)}\n`;
          break;

        case "heading":
          const level = Math.min((block.properties?.level || 1) + depth, 6);
          content = `${"#".repeat(level)} ${applyMarks(block.text, block.properties?.marks)}\n`;
          break;

        case "todo":
          const checked = block.done || block.properties?.attrs?.checked;
          content = `${indent}- [${checked ? "x" : " "}] ${applyMarks(block.text, block.properties?.marks)}\n`;
          break;

        case "list":
          const marker = block.properties?.attrs?.ordered ? "1." : "-";
          content = `${indent}${marker} ${applyMarks(block.text, block.properties?.marks)}\n`;
          if (block.children?.length) {
            content += blocksToMarkdown(block.children, depth + 1);
          }
          break;

        case "blockquote":
          content = `${indent}> ${applyMarks(block.text, block.properties?.marks)}\n`;
          break;

        case "code_block":
          const lang = block.properties?.language || "";
          content = `${indent}\`\`\`${lang}\n${indent}${block.text}\n${indent}\`\`\`\n`;
          break;

        default:
          content = block.text ? `${indent}${block.text}\n` : "";
      }

      return content;
    })
    .join("\n");
}

/**
 * Applies Tiptap/Editor marks (bold, italic, etc.) based on offsets.
 *
 * @param {string} text
 * @param {object[]} marks
 * @returns {string}
 */
function applyMarks(text, marks) {
  if (!text) return "";
  if (!Array.isArray(marks) || marks.length === 0) return text;

  // Sort marks by priority or type if needed, but here we'll just apply them
  // A robust way is to use an array of characters and wrap them
  let result = text;

  // Simple implementation for common marks (Markdown doesn't support overlapping as easily as HTML)
  // We'll process bold, italic, code, and link
  const sortedMarks = [...marks].sort((a, b) => b.from - a.from);

  for (const mark of sortedMarks) {
    const { from, to, type, attrs } = mark;
    const part = result.slice(from, to);
    let wrapped = part;

    switch (type) {
      case "bold":
        wrapped = `**${part}**`;
        break;
      case "italic":
        wrapped = `*${part}*`;
        break;
      case "code":
        wrapped = `\`${part}\``;
        break;
      case "link":
        wrapped = `[${part}](${attrs?.href})`;
        break;
      case "strike":
        wrapped = `~~${part}~~`;
        break;
    }

    result = result.slice(0, from) + wrapped + result.slice(to);
  }

  return result;
}

module.exports = {
  serializeNote,
  blocksToMarkdown,
  notesGroupedByStage,
};
