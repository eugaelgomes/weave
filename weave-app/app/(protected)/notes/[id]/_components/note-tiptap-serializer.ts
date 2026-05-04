import type { JSONContent } from "@tiptap/react";
import type { Block, CreateBlockData } from "@/app/_services/notes-service/notes.schema";

type BlockProperties = Record<string, unknown> | null | undefined;

function getTextFromBlock(block: Block): string {
  if (typeof block.text === "string") return block.text;
  const props = block.properties as BlockProperties;
  if (props && typeof props.text === "string") return props.text;
  return "";
}

function getBlockLevel(block: Block): number {
  const props = block.properties as BlockProperties;
  if (props && typeof props.level === "number") return props.level;
  if (props?.attrs && typeof (props.attrs as Record<string, unknown>).level === "number") {
    return (props.attrs as Record<string, unknown>).level as number;
  }
  return 2;
}

function getBlockLanguage(block: Block): string {
  const props = block.properties as BlockProperties;
  if (props && typeof props.language === "string") return props.language;
  if (props?.attrs && typeof (props.attrs as Record<string, unknown>).language === "string") {
    return (props.attrs as Record<string, unknown>).language as string;
  }
  return "";
}

function getImageAttrs(block: Block): { src: string; alt: string } {
  const props = block.properties as BlockProperties;
  const attrs = props?.attrs as Record<string, unknown> | undefined;
  const src = attrs?.src as string || block.text || "";
  const alt = attrs?.alt as string || "";
  return { src, alt };
}

function isOrderedList(block: Block): boolean {
  const props = block.properties as BlockProperties;
  const attrs = props?.attrs as Record<string, unknown> | undefined;
  return attrs?.ordered === true;
}

function textToContent(text: string): JSONContent[] {
  if (!text) return [];
  return [{ type: "text", text }];
}

function contentToText(content: JSONContent[] | undefined): string {
  if (!content) return "";
  return content
    .map((node) => {
      if (node.type === "text") return node.text || "";
      if (node.content) return contentToText(node.content);
      return "";
    })
    .join("");
}

function blockToNode(block: Block): JSONContent | null {
  const text = getTextFromBlock(block);

  switch (block.type) {
    case "paragraph":
      return {
        type: "paragraph",
        content: textToContent(text),
      };

    case "heading": {
      const level = getBlockLevel(block);
      return {
        type: "heading",
        attrs: { level: Math.min(6, Math.max(1, level)) },
        content: textToContent(text),
      };
    }

    case "quote":
      return {
        type: "blockquote",
        content: [
          {
            type: "paragraph",
            content: textToContent(text),
          },
        ],
      };

    case "code": {
      const language = getBlockLanguage(block);
      return {
        type: "codeBlock",
        attrs: { language },
        content: textToContent(text),
      };
    }

    case "todo":
      return {
        type: "taskList",
        content: [
          {
            type: "taskItem",
            attrs: { checked: block.done ?? false },
            content: [
              {
                type: "paragraph",
                content: textToContent(text),
              },
            ],
          },
        ],
      };

    case "list": {
      const ordered = isOrderedList(block);
      const listType = ordered ? "orderedList" : "bulletList";
      const children = block.children ?? [];

      if (children.length === 0 && text) {
        return {
          type: listType,
          content: [
            {
              type: "listItem",
              content: [
                {
                  type: "paragraph",
                  content: textToContent(text),
                },
              ],
            },
          ],
        };
      }

      return {
        type: listType,
        content: children.map((child: Block) => ({
          type: "listItem",
          content: [
            {
              type: "paragraph",
              content: textToContent(getTextFromBlock(child)),
            },
          ],
        })),
      };
    }

    case "divider":
      return {
        type: "horizontalRule",
      };

    case "image": {
      const { src, alt } = getImageAttrs(block);
      return {
        type: "image",
        attrs: { src, alt },
      };
    }

    default:
      if (text) {
        return {
          type: "paragraph",
          content: textToContent(text),
        };
      }
      return null;
  }
}

export function blocksToTiptapDoc(blocks: Block[]): JSONContent {
  const content: JSONContent[] = [];

  for (const block of blocks) {
    const node = blockToNode(block);
    if (node) {
      content.push(node);
    }
  }

  if (content.length === 0) {
    content.push({ type: "paragraph", content: [] });
  }

  return {
    type: "doc",
    content,
  };
}

function nodeToBlock(node: JSONContent, position: number): CreateBlockData | null {
  const text = contentToText(node.content);

  switch (node.type) {
    case "paragraph":
      return {
        type: "paragraph",
        text,
        position,
      };

    case "heading":
      return {
        type: "heading",
        text,
        position,
        properties: {
          level: node.attrs?.level ?? 2,
          attrs: { level: node.attrs?.level ?? 2 },
        },
      };

    case "blockquote": {
      const innerText = node.content
        ?.map((child) => contentToText(child.content))
        .join("\n") || "";
      return {
        type: "quote",
        text: innerText,
        position,
      };
    }

    case "codeBlock":
      return {
        type: "code",
        text,
        position,
        properties: {
          language: node.attrs?.language || "",
          attrs: { language: node.attrs?.language || "" },
        },
      };

    case "taskList": {
      const items = node.content ?? [];
      const blocks: CreateBlockData[] = [];
      
      for (const item of items) {
        if (item.type === "taskItem") {
          const itemText = item.content
            ?.map((child) => contentToText(child.content))
            .join("") || "";
          blocks.push({
            type: "todo",
            text: itemText,
            done: item.attrs?.checked ?? false,
            position: position + blocks.length,
          });
        }
      }
      
      return blocks.length > 0 ? blocks[0] : null;
    }

    case "bulletList":
    case "orderedList": {
      const ordered = node.type === "orderedList";
      const items = node.content ?? [];
      
      if (items.length === 0) return null;

      const firstItemText = items[0]?.content
        ?.map((child) => contentToText(child.content))
        .join("") || "";

      return {
        type: "list",
        text: firstItemText,
        position,
        properties: {
          attrs: { ordered },
        },
      };
    }

    case "horizontalRule":
      return {
        type: "divider",
        text: "",
        position,
      };

    case "image":
      return {
        type: "image",
        text: node.attrs?.src || "",
        position,
        properties: {
          attrs: {
            src: node.attrs?.src || "",
            alt: node.attrs?.alt || "",
          },
        },
      };

    default:
      if (text) {
        return {
          type: "paragraph",
          text,
          position,
        };
      }
      return null;
  }
}

export function tiptapDocToBlocks(doc: JSONContent): CreateBlockData[] {
  const blocks: CreateBlockData[] = [];
  const content = doc.content ?? [];

  for (const node of content) {
    if (node.type === "taskList") {
      const items = node.content ?? [];
      for (const item of items) {
        if (item.type === "taskItem") {
          const itemText = item.content
            ?.map((child) => contentToText(child.content))
            .join("") || "";
          blocks.push({
            type: "todo",
            text: itemText,
            done: item.attrs?.checked ?? false,
            position: blocks.length,
          });
        }
      }
    } else if (node.type === "bulletList" || node.type === "orderedList") {
      const ordered = node.type === "orderedList";
      const items = node.content ?? [];
      
      for (const item of items) {
        if (item.type === "listItem") {
          const itemText = item.content
            ?.map((child) => contentToText(child.content))
            .join("") || "";
          blocks.push({
            type: "paragraph",
            text: (ordered ? "1. " : "- ") + itemText,
            position: blocks.length,
          });
        }
      }
    } else {
      const block = nodeToBlock(node, blocks.length);
      if (block) {
        blocks.push(block);
      }
    }
  }

  return blocks;
}

export function isDocumentEmpty(doc: JSONContent): boolean {
  if (!doc.content || doc.content.length === 0) return true;
  if (doc.content.length === 1) {
    const first = doc.content[0];
    if (first.type === "paragraph" && (!first.content || first.content.length === 0)) {
      return true;
    }
    if (first.type === "paragraph" && first.content?.length === 1) {
      const text = first.content[0];
      if (text.type === "text" && (!text.text || text.text.trim() === "")) {
        return true;
      }
    }
  }
  return false;
}
