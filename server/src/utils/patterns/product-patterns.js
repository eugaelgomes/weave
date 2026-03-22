// Usar Object.freeze impede que você altere esses valores acidentalmente em outro lugar

// --- PROJECTS ---
export const PROJECT_STATUS = Object.freeze({
  OPEN: "open",
  RUNNING: "running",
  COMPLETED: "completed",
  ON_HOLD: "on-hold",
  DELETED: "deleted",
  ARCHIVED: "archived",
});

export const PROJECT_FIELDS = Object.freeze({
  TITLE_MAX_LENGTH: 100,
  DESCRIPTION_MAX_LENGTH: 500,
  ALLOWED_PRIORITIES: ["low", "medium", "high", "critical"],
});

// --- NOTES ---
export const NOTE_STATUS = Object.freeze({
  VISIBLE: "visible",
  SECURE: "secure",
  ARCHIVED: "archived",
});

export const NOTE_TYPES = Object.freeze({
  TEXT: "text",
  CHECKLIST: "checklist",
  CODE_SNIPPET: "code-snippet",
});

// --- BLOCKS (Conteúdo dentro das notas) ---
export const BLOCK_TYPES = Object.freeze({
  TEXT: "text",
  PARAGRAPH: "paragraph",
  HEADING: "heading",
  HEADING_1: "h1",
  HEADING_2: "h2",
  HEADING_3: "h3",
  TODO: "todo",
  LIST: "list",
  PAGE: "page",
  CODE: "code",
  QUOTE: "quote",
  IMAGE: "image",
  DIVIDER: "divider",
});

export const BLOCK_CONFIG = Object.freeze({
  MAX_DEPTH: 3,
  ALLOW_HTML: false,
});

// --- COLORS ---
export const HEX_COLOR_REGEX =
  /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6}|[0-9A-Fa-f]{8})$/;

export const ALLOWED_COLOR_TYPES = Object.freeze({
  FORMAT: "hex",
  REGEX: HEX_COLOR_REGEX,
});

export const ALLOWED_PROJECT_STATUSES = Object.values(PROJECT_STATUS);
export const ALLOWED_NOTE_STATUSES = Object.values(NOTE_STATUS);
export const ALLOWED_BLOCK_TYPES = Object.values(BLOCK_TYPES);
