const MAX_DOCUMENT_DEPTH = 50;

const DOCUMENT_VERSION = 1;

/**
 * Paleta Hex Colors
 */
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

const NOTE_DOCUMENT_HEX_COLOR_PALETTE_SET = new Set(
  NOTE_DOCUMENT_HEX_COLOR_PALETTE
);

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
 * @param {string} path — caminho para mensagem de erro
 * @returns {string} hex normalizado #rrggbb minúsculo, presente na paleta
 */
const parseAllowedNoteDocumentHexColor = (value, path) => {
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

const NOTE_DOCUMENT_MARK_TYPES = Object.freeze({
  BOLD: "bold",
  CODE: "code",
  HIGHLIGHT: "highlight",
  ITALIC: "italic",
  LINK: "link",
  STRIKE: "strike",
  SUBSCRIPT: "subscript",
  SUPERSCRIPT: "superscript",
  TEXT_STYLE: "textStyle",
  UNDERLINE: "underline",
});

const NOTE_DOCUMENT_NODE_TYPES = Object.freeze({
  BLOCKQUOTE: "blockquote",
  BULLET_LIST: "bulletList",
  CODE_BLOCK: "codeBlock",
  DOC: "doc",
  HARD_BREAK: "hardBreak",
  HEADING: "heading",
  HORIZONTAL_RULE: "horizontalRule",
  IMAGE: "image",
  LIST_ITEM: "listItem",
  ORDERED_LIST: "orderedList",
  PARAGRAPH: "paragraph",
  TABLE: "table",
  TABLE_CELL: "tableCell",
  TABLE_HEADER: "tableHeader",
  TABLE_ROW: "tableRow",
  TASK_ITEM: "taskItem",
  TASK_LIST: "taskList",
  TEXT: "text",
});

const ALLOWED_NOTE_DOCUMENT_MARKS = Object.freeze(
  Object.values(NOTE_DOCUMENT_MARK_TYPES)
);

const ALLOWED_NOTE_DOCUMENT_NODES = Object.freeze(
  Object.values(NOTE_DOCUMENT_NODE_TYPES)
);

const DEFAULT_NOTE_DOCUMENT_STATE = Object.freeze({
  document: {
    content: [
      {
        content: [],
        type: NOTE_DOCUMENT_NODE_TYPES.PARAGRAPH,
      },
    ],
    type: NOTE_DOCUMENT_NODE_TYPES.DOC,
  },
  version: DOCUMENT_VERSION,
});

const isPlainObject = (value) => {
  return !!value && typeof value === "object" && !Array.isArray(value);
};

const isStorageImageSource = (value) => {
  if (typeof value !== "string") return false;
  const src = value.trim();
  if (!src) return false;

  // Placeholder transitório para upload multipart no update.
  if (src.startsWith("upload://")) return true;

  if (src.startsWith("notes/") || src.startsWith("weave-notes/notes/")) {
    return true;
  }

  if (/^https?:\/\//i.test(src) && src.includes("/notes/")) {
    return true;
  }

  return false;
};

const cloneDefaultNoteDocumentState = () => {
  return structuredClone(DEFAULT_NOTE_DOCUMENT_STATE);
};

const validateMarkAttrs = (type, attrs) => {
  if (attrs === undefined) return;
  if (!isPlainObject(attrs)) {
    throw new Error(`Atributos inválidos para mark '${type}'`);
  }

  if (type === NOTE_DOCUMENT_MARK_TYPES.LINK) {
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

  if (
    type === NOTE_DOCUMENT_MARK_TYPES.TEXT_STYLE ||
    type === NOTE_DOCUMENT_MARK_TYPES.HIGHLIGHT
  ) {
    if (attrs.color !== undefined) {
      attrs.color = parseAllowedNoteDocumentHexColor(
        attrs.color,
        `mark '${type}'.attrs.color`
      );
    }
  }
};

const validateMark = (rawMark, path) => {
  if (!isPlainObject(rawMark)) {
    throw new Error(`${path}: mark inválido`);
  }

  const { type, attrs } = rawMark;
  if (!ALLOWED_NOTE_DOCUMENT_MARKS.includes(type)) {
    throw new Error(`${path}: mark '${type}' não suportado`);
  }

  validateMarkAttrs(type, attrs);
};

const validateOptionalLineBackgroundColor = (attrs, path) => {
  if (attrs.backgroundColor !== undefined) {
    attrs.backgroundColor = parseAllowedNoteDocumentHexColor(
      attrs.backgroundColor,
      `${path}.attrs.backgroundColor`
    );
  }
};

const validateNodeAttrs = (type, attrs, path) => {
  if (attrs === undefined) return;
  if (!isPlainObject(attrs)) {
    throw new Error(`${path}: attrs inválido para node '${type}'`);
  }

  switch (type) {
    case NOTE_DOCUMENT_NODE_TYPES.PARAGRAPH: {
      validateOptionalLineBackgroundColor(attrs, path);
      break;
    }
    case NOTE_DOCUMENT_NODE_TYPES.HEADING: {
      const level = Number(attrs.level);
      if (!Number.isInteger(level) || level < 1 || level > 6) {
        throw new Error(`${path}: heading exige attrs.level entre 1 e 6`);
      }
      validateOptionalLineBackgroundColor(attrs, path);
      break;
    }
    case NOTE_DOCUMENT_NODE_TYPES.BLOCKQUOTE: {
      validateOptionalLineBackgroundColor(attrs, path);
      break;
    }
    case NOTE_DOCUMENT_NODE_TYPES.LIST_ITEM: {
      validateOptionalLineBackgroundColor(attrs, path);
      break;
    }
    case NOTE_DOCUMENT_NODE_TYPES.ORDERED_LIST: {
      if (
        attrs.start !== undefined &&
        (!Number.isInteger(attrs.start) || attrs.start < 1)
      ) {
        throw new Error(
          `${path}: orderedList attrs.start deve ser inteiro >= 1`
        );
      }
      break;
    }
    case NOTE_DOCUMENT_NODE_TYPES.TASK_ITEM: {
      if (attrs.checked !== undefined && typeof attrs.checked !== "boolean") {
        throw new Error(`${path}: taskItem attrs.checked deve ser boolean`);
      }
      validateOptionalLineBackgroundColor(attrs, path);
      break;
    }
    case NOTE_DOCUMENT_NODE_TYPES.IMAGE: {
      if (typeof attrs.src !== "string" || !attrs.src.trim()) {
        throw new Error(`${path}: image exige attrs.src`);
      }
      if (!isStorageImageSource(attrs.src)) {
        throw new Error(
          `${path}: image attrs.src deve apontar para arquivo no storage`
        );
      }
      if (attrs.alt !== undefined && typeof attrs.alt !== "string") {
        throw new Error(`${path}: image attrs.alt deve ser string`);
      }
      if (attrs.title !== undefined && typeof attrs.title !== "string") {
        throw new Error(`${path}: image attrs.title deve ser string`);
      }
      break;
    }
    case NOTE_DOCUMENT_NODE_TYPES.CODE_BLOCK: {
      if (attrs.language !== undefined && typeof attrs.language !== "string") {
        throw new Error(`${path}: codeBlock attrs.language deve ser string`);
      }
      break;
    }
    case NOTE_DOCUMENT_NODE_TYPES.TABLE_CELL:
    case NOTE_DOCUMENT_NODE_TYPES.TABLE_HEADER: {
      if (
        attrs.colspan !== undefined &&
        (!Number.isInteger(attrs.colspan) || attrs.colspan < 1)
      ) {
        throw new Error(`${path}: attrs.colspan deve ser inteiro >= 1`);
      }
      if (
        attrs.rowspan !== undefined &&
        (!Number.isInteger(attrs.rowspan) || attrs.rowspan < 1)
      ) {
        throw new Error(`${path}: attrs.rowspan deve ser inteiro >= 1`);
      }
      if (
        attrs.colwidth !== undefined &&
        !(
          Array.isArray(attrs.colwidth) &&
          attrs.colwidth.every((w) => Number.isInteger(w) && w > 0)
        )
      ) {
        throw new Error(
          `${path}: attrs.colwidth deve ser array de inteiros > 0`
        );
      }
      validateOptionalLineBackgroundColor(attrs, path);
      break;
    }
    default:
      break;
  }
};

const validateChildConstraint = (parentType, childType, path) => {
  if (parentType === NOTE_DOCUMENT_NODE_TYPES.DOC) {
    if (
      [
        NOTE_DOCUMENT_NODE_TYPES.TEXT,
        NOTE_DOCUMENT_NODE_TYPES.HARD_BREAK,
        NOTE_DOCUMENT_NODE_TYPES.TABLE_CELL,
        NOTE_DOCUMENT_NODE_TYPES.TABLE_HEADER,
        NOTE_DOCUMENT_NODE_TYPES.TABLE_ROW,
        NOTE_DOCUMENT_NODE_TYPES.LIST_ITEM,
        NOTE_DOCUMENT_NODE_TYPES.TASK_ITEM,
      ].includes(childType)
    ) {
      throw new Error(
        `${path}: node '${childType}' inválido na raiz do documento`
      );
    }
  }

  if (
    [
      NOTE_DOCUMENT_NODE_TYPES.PARAGRAPH,
      NOTE_DOCUMENT_NODE_TYPES.HEADING,
    ].includes(parentType)
  ) {
    if (
      ![
        NOTE_DOCUMENT_NODE_TYPES.TEXT,
        NOTE_DOCUMENT_NODE_TYPES.HARD_BREAK,
        NOTE_DOCUMENT_NODE_TYPES.IMAGE,
      ].includes(childType)
    ) {
      throw new Error(
        `${path}: '${childType}' inválido dentro de '${parentType}'`
      );
    }
  }

  if (parentType === NOTE_DOCUMENT_NODE_TYPES.LIST_ITEM) {
    if (
      ![
        NOTE_DOCUMENT_NODE_TYPES.PARAGRAPH,
        NOTE_DOCUMENT_NODE_TYPES.BULLET_LIST,
        NOTE_DOCUMENT_NODE_TYPES.ORDERED_LIST,
        NOTE_DOCUMENT_NODE_TYPES.TASK_LIST,
        NOTE_DOCUMENT_NODE_TYPES.BLOCKQUOTE,
        NOTE_DOCUMENT_NODE_TYPES.CODE_BLOCK,
      ].includes(childType)
    ) {
      throw new Error(`${path}: '${childType}' inválido dentro de 'listItem'`);
    }
  }

  if (parentType === NOTE_DOCUMENT_NODE_TYPES.TASK_ITEM) {
    if (
      ![
        NOTE_DOCUMENT_NODE_TYPES.PARAGRAPH,
        NOTE_DOCUMENT_NODE_TYPES.BULLET_LIST,
        NOTE_DOCUMENT_NODE_TYPES.ORDERED_LIST,
        NOTE_DOCUMENT_NODE_TYPES.TASK_LIST,
        NOTE_DOCUMENT_NODE_TYPES.BLOCKQUOTE,
        NOTE_DOCUMENT_NODE_TYPES.CODE_BLOCK,
      ].includes(childType)
    ) {
      throw new Error(`${path}: '${childType}' inválido dentro de 'taskItem'`);
    }
  }

  if (
    [
      NOTE_DOCUMENT_NODE_TYPES.BULLET_LIST,
      NOTE_DOCUMENT_NODE_TYPES.ORDERED_LIST,
    ].includes(parentType)
  ) {
    if (childType !== NOTE_DOCUMENT_NODE_TYPES.LIST_ITEM) {
      throw new Error(`${path}: listas aceitam apenas 'listItem'`);
    }
  }

  if (parentType === NOTE_DOCUMENT_NODE_TYPES.TASK_LIST) {
    if (childType !== NOTE_DOCUMENT_NODE_TYPES.TASK_ITEM) {
      throw new Error(`${path}: taskList aceita apenas 'taskItem'`);
    }
  }

  if (parentType === NOTE_DOCUMENT_NODE_TYPES.TABLE) {
    if (childType !== NOTE_DOCUMENT_NODE_TYPES.TABLE_ROW) {
      throw new Error(`${path}: table aceita apenas 'tableRow'`);
    }
  }

  if (parentType === NOTE_DOCUMENT_NODE_TYPES.TABLE_ROW) {
    if (
      ![
        NOTE_DOCUMENT_NODE_TYPES.TABLE_CELL,
        NOTE_DOCUMENT_NODE_TYPES.TABLE_HEADER,
      ].includes(childType)
    ) {
      throw new Error(
        `${path}: tableRow aceita apenas 'tableCell' e 'tableHeader'`
      );
    }
  }

  if (
    [
      NOTE_DOCUMENT_NODE_TYPES.TABLE_CELL,
      NOTE_DOCUMENT_NODE_TYPES.TABLE_HEADER,
    ].includes(parentType)
  ) {
    if (
      ![
        NOTE_DOCUMENT_NODE_TYPES.PARAGRAPH,
        NOTE_DOCUMENT_NODE_TYPES.HEADING,
        NOTE_DOCUMENT_NODE_TYPES.BULLET_LIST,
        NOTE_DOCUMENT_NODE_TYPES.ORDERED_LIST,
        NOTE_DOCUMENT_NODE_TYPES.BLOCKQUOTE,
        NOTE_DOCUMENT_NODE_TYPES.CODE_BLOCK,
      ].includes(childType)
    ) {
      throw new Error(`${path}: conteúdo inválido dentro de célula de tabela`);
    }
  }
};

const validateNode = (node, path, parentType = null, depth = 0) => {
  if (!isPlainObject(node)) {
    throw new Error(`${path}: node inválido`);
  }

  if (depth > MAX_DOCUMENT_DEPTH) {
    throw new Error("Documento excede profundidade máxima permitida");
  }

  const { type, attrs, content, marks, text } = node;

  if (!ALLOWED_NOTE_DOCUMENT_NODES.includes(type)) {
    throw new Error(`${path}: node '${type}' não suportado`);
  }

  if (parentType) {
    validateChildConstraint(parentType, type, path);
  }

  validateNodeAttrs(type, attrs, path);

  if (type === NOTE_DOCUMENT_NODE_TYPES.TEXT) {
    if (typeof text !== "string") {
      throw new Error(`${path}: node 'text' exige propriedade text`);
    }
    if (content !== undefined) {
      throw new Error(`${path}: node 'text' não pode ter content`);
    }
  } else if (
    [
      NOTE_DOCUMENT_NODE_TYPES.HARD_BREAK,
      NOTE_DOCUMENT_NODE_TYPES.HORIZONTAL_RULE,
      NOTE_DOCUMENT_NODE_TYPES.IMAGE,
    ].includes(type)
  ) {
    if (content !== undefined) {
      throw new Error(`${path}: node '${type}' não pode ter content`);
    }
  } else {
    if (!Array.isArray(content)) {
      throw new Error(`${path}: node '${type}' exige array em content`);
    }
    content.forEach((child, index) => {
      validateNode(child, `${path}.content[${index}]`, type, depth + 1);
    });
  }

  if (marks !== undefined) {
    if (type !== NOTE_DOCUMENT_NODE_TYPES.TEXT) {
      throw new Error(`${path}: marks só são permitidos em node 'text'`);
    }
    if (!Array.isArray(marks)) {
      throw new Error(`${path}: marks deve ser array`);
    }
    marks.forEach((mark, index) => {
      validateMark(mark, `${path}.marks[${index}]`);
    });
  }
};

const normalizeRawDocumentInput = (raw) => {
  if (raw === undefined || raw === null) {
    return cloneDefaultNoteDocumentState();
  }

  if (typeof raw === "string") {
    try {
      return JSON.parse(raw);
    } catch {
      throw new Error("document deve ser um JSON válido");
    }
  }

  if (!isPlainObject(raw)) {
    throw new Error("document deve ser um objeto");
  }

  return raw;
};

const assignNodeIntegerOrdering = (node, nextNodeIdRef, siblingOrder = 0) => {
  const normalizedNode = { ...node };

  if (normalizedNode.type !== NOTE_DOCUMENT_NODE_TYPES.DOC) {
    normalizedNode.id = nextNodeIdRef.value;
    normalizedNode.order = siblingOrder;
    nextNodeIdRef.value += 1;
  }

  if (Array.isArray(normalizedNode.content)) {
    normalizedNode.content = normalizedNode.content.map((child, index) => {
      return assignNodeIntegerOrdering(child, nextNodeIdRef, index);
    });
  }

  return normalizedNode;
};

const normalizeNoteDocumentPayload = (raw) => {
  const parsed = normalizeRawDocumentInput(raw);

  if (!isPlainObject(parsed.document)) {
    throw new Error("document.document deve ser um objeto");
  }

  const version =
    parsed.version === undefined ? DOCUMENT_VERSION : Number(parsed.version);
  if (!Number.isInteger(version) || version < 1) {
    throw new Error("document.version deve ser um inteiro >= 1");
  }

  validateNode(parsed.document, "document.document");
  const documentWithOrdering = assignNodeIntegerOrdering(parsed.document, {
    value: 1,
  });

  return {
    document: documentWithOrdering,
    version,
  };
};

const validateNoteDocumentPayload = (raw) => {
  try {
    normalizeNoteDocumentPayload(raw);
    return null;
  } catch (error) {
    return error.message || "document inválido";
  }
};

module.exports = {
  ALLOWED_NOTE_DOCUMENT_MARKS,
  ALLOWED_NOTE_DOCUMENT_NODES,
  cloneDefaultNoteDocumentState,
  DEFAULT_NOTE_DOCUMENT_STATE,
  DOCUMENT_VERSION,
  normalizeNoteDocumentPayload,
  NOTE_DOCUMENT_HEX_COLOR_PALETTE,
  NOTE_DOCUMENT_MARK_TYPES,
  NOTE_DOCUMENT_NODE_TYPES,
  parseAllowedNoteDocumentHexColor,
  validateNoteDocumentPayload,
};
