const { cloneDefaultNoteDocumentState } = require("./document-normalizer");

const createBlockId = () => {
  return `doc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
};

const extractTextFromContent = (content = []) => {
  if (!Array.isArray(content)) return "";

  const textParts = [];
  for (const node of content) {
    if (!node || typeof node !== "object") continue;
    if (node.type === "text" && typeof node.text === "string") {
      textParts.push(node.text);
      continue;
    }
    if (node.type === "hardBreak") {
      textParts.push("\n");
      continue;
    }
    if (Array.isArray(node.content)) {
      textParts.push(extractTextFromContent(node.content));
    }
  }

  return textParts.join("").trim();
};

const paragraphNode = (text = "", attrs) => {
  const node = {
    content: text
      ? [
          {
            text,
            type: "text",
          },
        ]
      : [],
    type: "paragraph",
  };
  if (attrs && typeof attrs === "object" && Object.keys(attrs).length > 0) {
    node.attrs = attrs;
  }
  return node;
};

const lineBackgroundFromAttrs = (attrs) => {
  if (!attrs || typeof attrs !== "object") return {};
  const bg = attrs.backgroundColor;
  if (typeof bg !== "string" || !bg.trim()) return {};
  return { backgroundColor: bg.trim() };
};

const mapNodeToBlock = (
  node,
  noteId,
  level = 0,
  position = 0,
  parentId = null
) => {
  if (!node || typeof node !== "object") return null;

  const base = {
    children: [],
    id: createBlockId(),
    level,
    note_id: noteId,
    parent_id: parentId,
    position,
    properties: {},
    text: "",
    type: "paragraph",
  };

  if (node.type === "heading") {
    return {
      ...base,
      properties: {
        level: node?.attrs?.level || 1,
        ...lineBackgroundFromAttrs(node.attrs),
      },
      text: extractTextFromContent(node.content),
      type: "heading",
    };
  }

  if (node.type === "paragraph") {
    return {
      ...base,
      properties: {
        ...lineBackgroundFromAttrs(node.attrs),
      },
      text: extractTextFromContent(node.content),
      type: "paragraph",
    };
  }

  if (node.type === "blockquote") {
    return {
      ...base,
      properties: {
        ...lineBackgroundFromAttrs(node.attrs),
      },
      text: extractTextFromContent(node.content),
      type: "quote",
    };
  }

  if (node.type === "codeBlock") {
    return {
      ...base,
      properties: {
        language:
          typeof node?.attrs?.language === "string" ? node.attrs.language : "",
      },
      text: extractTextFromContent(node.content),
      type: "code",
    };
  }

  if (node.type === "horizontalRule") {
    return {
      ...base,
      type: "divider",
    };
  }

  if (node.type === "taskList") {
    const items = Array.isArray(node.content) ? node.content : [];
    const children = items.map((item, index) => {
      return {
        ...base,
        children: [],
        done: item?.attrs?.checked === true,
        id: createBlockId(),
        level: level + 1,
        parent_id: base.id,
        position: index,
        properties: {
          ...lineBackgroundFromAttrs(item?.attrs),
        },
        text: extractTextFromContent(item?.content),
        type: "todo",
      };
    });

    return {
      ...base,
      children,
      text: "",
      type: "list",
    };
  }

  if (node.type === "bulletList" || node.type === "orderedList") {
    const items = Array.isArray(node.content) ? node.content : [];
    const children = items.map((item, index) => ({
      ...base,
      children: [],
      id: createBlockId(),
      level: level + 1,
      parent_id: base.id,
      position: index,
      properties: {
        ...lineBackgroundFromAttrs(item?.attrs),
      },
      text: extractTextFromContent(item?.content),
      type: "list",
    }));

    return {
      ...base,
      children,
      properties: node.type === "orderedList" ? { ordered: true } : {},
      text: "",
      type: "list",
    };
  }

  if (Array.isArray(node.content)) {
    return {
      ...base,
      children: node.content
        .map((child, index) =>
          mapNodeToBlock(child, noteId, level + 1, index, base.id)
        )
        .filter(Boolean),
      text: extractTextFromContent(node.content),
      type: "paragraph",
    };
  }

  return base;
};

const documentToBlocks = (rawDocumentState, noteId = "") => {
  const state = rawDocumentState || cloneDefaultNoteDocumentState();
  const root = state?.document;
  const content = Array.isArray(root?.content) ? root.content : [];

  return content
    .map((node, index) => mapNodeToBlock(node, noteId, 0, index, null))
    .filter(Boolean);
};

const buildNodeFromBlock = (block) => {
  const text = typeof block?.text === "string" ? block.text : "";
  const children = Array.isArray(block?.children) ? block.children : [];

  if (block?.type === "heading") {
    const attrs = { level: Number(block?.properties?.level) || 1 };
    if (block?.properties?.backgroundColor) {
      attrs.backgroundColor = block.properties.backgroundColor;
    }
    return {
      attrs,
      content: paragraphNode(text).content,
      type: "heading",
    };
  }

  if (block?.type === "code") {
    const language =
      typeof block?.properties?.language === "string"
        ? block.properties.language.trim()
        : "";
    return {
      attrs: language ? { language } : undefined,
      content: paragraphNode(text).content,
      type: "codeBlock",
    };
  }

  if (block?.type === "quote") {
    const bqAttrs = {};
    if (block?.properties?.backgroundColor) {
      bqAttrs.backgroundColor = block.properties.backgroundColor;
    }
    return {
      attrs: Object.keys(bqAttrs).length ? bqAttrs : undefined,
      content: [paragraphNode(text)],
      type: "blockquote",
    };
  }

  if (block?.type === "divider") {
    return { type: "horizontalRule" };
  }

  if (block?.type === "todo") {
    const attrs = { checked: block?.done === true };
    if (block?.properties?.backgroundColor) {
      attrs.backgroundColor = block.properties.backgroundColor;
    }
    return {
      attrs,
      content: [paragraphNode(text)],
      type: "taskItem",
    };
  }

  if (block?.type === "list") {
    if (children.some((child) => child?.type === "todo")) {
      return {
        content: children
          .map((child) => buildNodeFromBlock(child))
          .filter(Boolean),
        type: "taskList",
      };
    }

    if (children.length > 0) {
      return {
        content: children
          .map((child) => {
            const li = {
              content: [paragraphNode(child?.text || "")],
              type: "listItem",
            };
            if (child?.properties?.backgroundColor) {
              li.attrs = { backgroundColor: child.properties.backgroundColor };
            }
            return li;
          })
          .filter(Boolean),
        type: block?.properties?.ordered ? "orderedList" : "bulletList",
      };
    }
  }

  const paragraphAttrs = block?.properties?.backgroundColor
    ? { backgroundColor: block.properties.backgroundColor }
    : undefined;
  return paragraphNode(text, paragraphAttrs);
};

const blocksToDocument = (blocks = []) => {
  const nodes = Array.isArray(blocks)
    ? blocks.map((block) => buildNodeFromBlock(block)).filter(Boolean)
    : [];

  return {
    document: {
      content: nodes.length > 0 ? nodes : [paragraphNode("")],
      type: "doc",
    },
    version: 1,
  };
};

module.exports = {
  blocksToDocument,
  documentToBlocks,
};
