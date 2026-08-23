/**
 * @module notes/utils/blocks-to-markdown.util
 * @description Utility to convert a tree or array of TipTap/Weave blocks into raw markdown.
 */

function asRecord(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined;
  return value;
}

function getMarks(properties) {
  const props = asRecord(properties);
  if (!props || !Array.isArray(props.marks)) return [];
  const marks = [];
  for (const raw of props.marks) {
    const mark = asRecord(raw);
    if (!mark) continue;
    const start = Number(mark.start);
    const end = Number(mark.end);
    const type = typeof mark.type === "string" ? mark.type : "";
    if (!Number.isFinite(start) || !Number.isFinite(end) || !type) continue;
    marks.push({ attrs: asRecord(mark.attrs), end, start, type });
  }
  return marks;
}

function applyMarks(text, marks) {
  if (!text) return "";
  if (!marks.length) return text;

  let result = text;
  const sortedMarks = [...marks].sort((a, b) => b.start - a.start);

  for (const mark of sortedMarks) {
    const { start, end, type, attrs } = mark;
    const part = result.slice(start, end);
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
        wrapped = `[${part}](${typeof attrs?.href === "string" ? attrs.href : ""})`;
        break;
      case "strike":
        wrapped = `~~${part}~~`;
        break;
      default:
        wrapped = part;
    }

    result = result.slice(0, start) + wrapped + result.slice(end);
  }

  return result;
}

function blockText(block) {
  if (typeof block.text === "string") return block.text;
  if (block.properties && typeof block.properties.text === "string") return block.properties.text;
  return "";
}

/**
 * Converts a tree of note-style blocks into markdown.
 * @param {Array<object>} blocks
 * @param {number} depth
 * @returns {string}
 */
function blocksToMarkdown(blocks, depth = 0) {
  if (!Array.isArray(blocks) || blocks.length === 0) return "";

  return blocks
    .map((block) => {
      const indent = "  ".repeat(depth);
      const marks = getMarks(block.properties);
      const text = applyMarks(blockText(block), marks);
      let content = "";

      switch (block.type) {
        case "paragraph":
          content = text ? `${indent}${text}\n` : "\n";
          break;
        case "heading": {
          const props = asRecord(block.properties);
          const level = Math.min((Number(props?.level || props?.attrs?.level) || 1) + depth, 6);
          content = text ? `${"#".repeat(level)} ${text}\n` : "\n";
          break;
        }
        case "todo": {
          const props = asRecord(block.properties);
          const attrs = asRecord(props?.attrs);
          const checked = Boolean(block.done) || Boolean(attrs?.checked);
          content = `${indent}- [${checked ? "x" : " "}] ${text}\n`;
          break;
        }
        case "list": {
          const props = asRecord(block.properties);
          const attrs = asRecord(props?.attrs);
          const marker = attrs?.ordered ? "1." : "-";
          content = `${indent}${marker} ${text}\n`;
          if (block.children?.length) {
            content += blocksToMarkdown(block.children, depth + 1);
          }
          break;
        }
        case "blockquote":
        case "quote":
          content = text ? `${indent}> ${text}\n` : "\n";
          break;
        case "code_block":
        case "code": {
          const props = asRecord(block.properties);
          const lang =
            typeof props?.language === "string" ? props.language : props?.attrs?.language || "";
          const raw = blockText(block);
          content = `${indent}\`\`\`${lang}\n${raw}\n${indent}\`\`\`\n`;
          break;
        }
        default:
          content = text ? `${indent}${text}\n` : "";
      }

      return content;
    })
    .join("\n")
    .trim();
}

module.exports = {
  blocksToMarkdown,
  serializeBlocksToMarkdown: blocksToMarkdown,
};
