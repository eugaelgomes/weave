const crypto = require("crypto");

const MAX_TREE_DEPTH = 50;

/** @type {readonly string[]} */
const ALLOWED_BLOCK_TYPES = Object.freeze([
  "paragraph",
  "heading",
  "quote",
  "code",
  "divider",
  "image",
  "list",
  "todo",
  "table",
  "page",
]);

const NOTE_DOCUMENT_HEX_COLOR_PALETTE = Object.freeze([
  "#6b7280",
  "#f3f4f6",
  "#ef4444",
  "#f97316",
  "#eab308",
  "#22c55e",
  "#06b6d4",
  "#3b82f6",
  "#a855f7",
  "#ec4899",
]);

const NOTE_DOCUMENT_HEX_COLOR_PALETTE_SET = new Set(NOTE_DOCUMENT_HEX_COLOR_PALETTE);

const ALLOWED_MARK_TYPES = Object.freeze([
  "bold",
  "code",
  "highlight",
  "italic",
  "link",
  "strike",
  "subscript",
  "superscript",
  "textStyle",
  "underline",
]);

const isPlainObject = (value) =>
  !!value && typeof value === "object" && !Array.isArray(value);

const expandShorthandHex = (hexBody) => {
  if (hexBody.length === 3) {
    return hexBody
      .split("")
      .map((c) => c + c)
      .join("");
  }
  return hexBody;
};

/**
 * @param {unknown} value
 * @param {string} path
 * @returns {string}
 */
const parseAllowedHexColor = (value, path) => {
  if (typeof value !== "string") {
    throw new Error(`${path}: cor deve ser string hex`);
  }
  const trimmed = value.trim();
  if (!trimmed.startsWith("#")) {
    throw new Error(`${path}: cor hex deve começar com '#'`);
  }
  const body = trimmed.slice(1).toLowerCase();
  if (!/^[0-9a-f]{3}$|^[0-9a-f]{6}$/.test(body)) {
    throw new Error(`${path}: formato hex inválido (use #RGB ou #RRGGBB)`);
  }
  const normalized = `#${expandShorthandHex(body)}`;
  if (!NOTE_DOCUMENT_HEX_COLOR_PALETTE_SET.has(normalized)) {
    throw new Error(`${path}: cor hex fora da paleta permitida`);
  }
  return normalized;
};

const isStorageImageSource = (value) => {
  if (typeof value !== "string") return false;
  const src = value.trim();
  if (!src) return false;
  if (src.startsWith("upload://")) return true;
  if (src.startsWith("notes/") || src.startsWith("weave-notes/notes/")) return true;
  if (/^https?:\/\//i.test(src) && src.includes("/notes/")) return true;
  return false;
};

const validateMarkAttrs = (type, attrs) => {
  if (attrs === undefined) return;
  if (!isPlainObject(attrs)) {
    throw new Error(`Atributos inválidos para mark '${type}'`);
  }
  if (type === "link") {
    if (typeof attrs.href !== "string" || !attrs.href.trim()) {
      throw new Error("Mark 'link' exige attrs.href");
    }
    if (attrs.target !== undefined && typeof attrs.target !== "string") {
      throw new Error("Mark 'link': attrs.target deve ser string");
    }
    if (attrs.rel !== undefined && typeof attrs.rel !== "string") {
      throw new Error("Mark 'link': attrs.rel deve ser string");
    }
  }
  if (type === "textStyle" || type === "highlight") {
    if (attrs.color !== undefined) {
      attrs.color = parseAllowedHexColor(attrs.color, `mark '${type}'.attrs.color`);
    }
  }
};

/**
 * @param {unknown} rawMark
 * @param {string} path
 */
const validateMark = (rawMark, path) => {
  if (!isPlainObject(rawMark)) {
    throw new Error(`${path}: mark inválido`);
  }
  const { type, attrs } = rawMark;
  if (!ALLOWED_MARK_TYPES.includes(type)) {
    throw new Error(`${path}: mark '${type}' não suportado`);
  }
  validateMarkAttrs(type, attrs);
};

/**
 * @param {string} blockType
 * @param {Record<string, unknown>} attrs
 * @param {string} path
 */
const validateAttrsForBlockType = (blockType, attrs, path) => {
  if (!isPlainObject(attrs)) {
    throw new Error(`${path}: attrs deve ser objeto`);
  }
  switch (blockType) {
    case "heading": {
      const level = Number(attrs.level);
      if (!Number.isInteger(level) || level < 1 || level > 6) {
        throw new Error(`${path}: heading exige attrs.level entre 1 e 6`);
      }
      if (attrs.backgroundColor !== undefined) {
        attrs.backgroundColor = parseAllowedHexColor(
          attrs.backgroundColor,
          `${path}.attrs.backgroundColor`
        );
      }
      break;
    }
    case "paragraph":
    case "quote":
    case "list":
    case "todo": {
      if (attrs.backgroundColor !== undefined) {
        attrs.backgroundColor = parseAllowedHexColor(
          attrs.backgroundColor,
          `${path}.attrs.backgroundColor`
        );
      }
      if (blockType === "list") {
        if (attrs.ordered !== undefined && typeof attrs.ordered !== "boolean") {
          throw new Error(`${path}: list attrs.ordered deve ser boolean`);
        }
      }
      if (blockType === "todo") {
        if (attrs.checked !== undefined && typeof attrs.checked !== "boolean") {
          throw new Error(`${path}: todo attrs.checked deve ser boolean`);
        }
      }
      break;
    }
    case "code": {
      if (attrs.language !== undefined && typeof attrs.language !== "string") {
        throw new Error(`${path}: code attrs.language deve ser string`);
      }
      break;
    }
    case "image": {
      if (typeof attrs.src !== "string" || !attrs.src.trim()) {
        throw new Error(`${path}: image exige attrs.src`);
      }
      if (!isStorageImageSource(attrs.src)) {
        throw new Error(`${path}: image attrs.src deve apontar para arquivo no storage`);
      }
      if (attrs.alt !== undefined && typeof attrs.alt !== "string") {
        throw new Error(`${path}: image attrs.alt deve ser string`);
      }
      if (attrs.title !== undefined && typeof attrs.title !== "string") {
        throw new Error(`${path}: image attrs.title deve ser string`);
      }
      break;
    }
    case "divider":
    case "page":
    default:
      break;
  }
};

/**
 * Normaliza e valida `properties` de um bloco (text, marks, attrs).
 * @param {string} blockType
 * @param {unknown} rawProperties
 * @param {string} path
 * @returns {Record<string, unknown>}
 */
const normalizeBlockProperties = (blockType, rawProperties, path) => {
  if (rawProperties === undefined || rawProperties === null) {
    return {};
  }
  if (!isPlainObject(rawProperties)) {
    throw new Error(`${path}: properties deve ser objeto`);
  }
  /** @type {Record<string, unknown>} */
  const props = { ...rawProperties };

  if (props.text !== undefined && props.text !== null && typeof props.text !== "string") {
    throw new Error(`${path}.text deve ser string`);
  }

  if (props.marks !== undefined) {
    if (!Array.isArray(props.marks)) {
      throw new Error(`${path}.marks deve ser array`);
    }
    props.marks.forEach((m, i) => validateMark(m, `${path}.marks[${i}]`));
    props.marks.forEach((m, i) => {
      const start = Number(m.start);
      const end = Number(m.end);
      if (!Number.isInteger(start) || !Number.isInteger(end) || start < 0 || end < start) {
        throw new Error(`${path}.marks[${i}]: start/end inválidos`);
      }
    });
  }

  if (props.attrs !== undefined) {
    if (props.attrs === null) {
      delete props.attrs;
    } else {
      validateAttrsForBlockType(blockType, props.attrs, `${path}`);
    }
  }

  if (blockType === "heading") {
    validateAttrsForBlockType(blockType, props.attrs || {}, `${path}.attrs`);
  }
  if (blockType === "image") {
    validateAttrsForBlockType(blockType, props.attrs || {}, `${path}.attrs`);
  }

  return props;
};

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const newBlockId = () => crypto.randomUUID();

/**
 * Valida um nó da árvore de blocos (payload da API).
 * @param {unknown} node
 * @param {string} path
 * @param {number} depth
 * @returns {{ id: string, type: string, properties: Record<string, unknown>, position?: number, done?: boolean, text?: string, children?: unknown[] }}
 */
const validateBlockPayload = (node, path = "blocks", depth = 0) => {
  if (!isPlainObject(node)) {
    throw new Error(`${path}: bloco inválido`);
  }
  if (depth > MAX_TREE_DEPTH) {
    throw new Error("Árvore de blocos excede profundidade máxima");
  }

  let id =
    typeof node.id === "string" && UUID_REGEX.test(node.id.trim())
      ? node.id.trim()
      : newBlockId();

  const type = typeof node.type === "string" ? node.type.trim() : "";
  if (!ALLOWED_BLOCK_TYPES.includes(type)) {
    throw new Error(`${path}: tipo '${type}' não suportado`);
  }

  /** @type {Record<string, unknown>} */
  let properties =
    node.properties !== undefined && isPlainObject(node.properties)
      ? { ...node.properties }
      : {};

  if (typeof node.text === "string" && node.text !== "") {
    properties.text = node.text;
  }

  if (type === "todo" && node.done !== undefined) {
    properties.attrs = {
      ...(isPlainObject(properties.attrs) ? properties.attrs : {}),
      checked: node.done === true,
    };
  }

  properties = normalizeBlockProperties(type, properties, `${path}.properties`);

  /** @type {{ id: string, type: string, properties: Record<string, unknown>, position?: number, children?: unknown[] }} */
  const out = { id, type, properties };

  if (node.position !== undefined) {
    const pos = Number(node.position);
    if (!Number.isInteger(pos) || pos < 0) {
      throw new Error(`${path}.position inválido`);
    }
    out.position = pos;
  }

  if (Array.isArray(node.children) && node.children.length > 0) {
    if (type !== "list") {
      throw new Error(`${path}: apenas blocos 'list' podem ter children`);
    }
    out.children = node.children.map((child, i) =>
      validateBlockPayload(child, `${path}.children[${i}]`, depth + 1)
    );
  }

  return out;
};

/**
 * @param {unknown[]} blocks
 * @returns {unknown[]}
 */
const normalizeBlocksTree = (blocks) => {
  if (!Array.isArray(blocks)) {
    throw new Error("blocks deve ser array");
  }
  return blocks.map((b, i) => validateBlockPayload(b, `blocks[${i}]`, 0));
};

/**
 * Achata árvore em linhas prontas para INSERT (ordem: pai antes dos filhos).
 * @param {unknown[]} tree
 * @param {string} noteId
 * @param {string} userId
 * @param {string | null} parentId
 * @param {number} depth
 * @returns {Array<{ id: string, note_id: string, parent_id: string | null, type: string, properties: Record<string, unknown>, position: number, created_by: string }>}
 */
const flattenBlocksForInsert = (tree, noteId, userId, parentId = null, depth = 0) => {
  const normalized = normalizeBlocksTree(tree);
  /** @type {Array<{ id: string, note_id: string, parent_id: string | null, type: string, properties: Record<string, unknown>, position: number, created_by: string }>} */
  const rows = [];

  const walk = (nodes, pId, d) => {
    nodes.forEach((node, index) => {
      const n = /** @type {{ id: string, type: string, properties: Record<string, unknown>, position?: number, children?: unknown[] }} */ (
        node
      );
      const position = n.position !== undefined ? n.position : index;
      rows.push({
        id: n.id,
        note_id: noteId,
        parent_id: pId,
        type: n.type,
        properties: n.properties,
        position,
        created_by: userId,
      });
      if (Array.isArray(n.children) && n.children.length > 0) {
        walk(n.children, n.id, d + 1);
      }
    });
  };

  walk(normalized, parentId, depth);
  return rows;
};

/**
 * @param {string} blockType
 * @param {unknown} patchProperties - merge parcial de properties (para PATCH)
 * @param {Record<string, unknown> | null} existingProperties
 */
const mergeBlockPropertiesPatch = (blockType, patchProperties, existingProperties = {}) => {
  if (patchProperties === undefined) {
    return normalizeBlockProperties(blockType, existingProperties || {}, "properties");
  }
  if (!isPlainObject(patchProperties)) {
    throw new Error("properties deve ser objeto");
  }
  const base = isPlainObject(existingProperties) ? { ...existingProperties } : {};
  const merged = { ...base, ...patchProperties };
  if (patchProperties.attrs !== undefined && isPlainObject(base.attrs) && isPlainObject(patchProperties.attrs)) {
    merged.attrs = { ...base.attrs, ...patchProperties.attrs };
  }
  return normalizeBlockProperties(blockType, merged, "properties");
};

module.exports = {
  ALLOWED_BLOCK_TYPES,
  ALLOWED_MARK_TYPES,
  NOTE_DOCUMENT_HEX_COLOR_PALETTE,
  flattenBlocksForInsert,
  mergeBlockPropertiesPatch,
  normalizeBlockProperties,
  normalizeBlocksTree,
  newBlockId,
  validateBlockPayload,
};
