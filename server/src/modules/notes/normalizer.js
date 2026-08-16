const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const PATH_NAMESPACE_PREFIX = "weave-notes/";

/** Bucket key prefix for comment attachments (outside `notes/…`). */
const COMMENT_FILES_STORAGE_ROOT = "notes-comments-files";

const COMMENT_FILES_PATH_PREFIX = `${COMMENT_FILES_STORAGE_ROOT}/`;

const isValidUUID = (value) => !!value && UUID_REGEX.test(String(value));

/**
 * @param {string} path
 * @returns {string}
 */
function stripStorageNamespace(path) {
  const trimmed = String(path).replace(/^\/+/g, "");
  if (trimmed.startsWith(PATH_NAMESPACE_PREFIX)) {
    return trimmed.slice(PATH_NAMESPACE_PREFIX.length);
  }
  return trimmed;
}

/**
 * Default content for jsonb `content` in `notes_comments`, aligned with the notes block model.
 * @see server/docs/notes.md — block structure
 */
const DEFAULT_COMMENT_CONTENT = Object.freeze({
  blocks: [
    {
      properties: {},
      text: "",
      type: "paragraph",
    },
  ],
  version: 1,
});

/**
 * Ensures that each `path` belongs to the uploader and the note (avoids referencing external keys).
 *
 * @param {Array<{ path?: string }>} files
 * @param {string} userId
 * @param {string} noteId
 */
function assertCommentFilesStorageScope(files, userId, noteId) {
  const userSeg = `userId_${userId}`;
  const noteSeg = `noteId_${noteId}`;
  for (const f of files) {
    const path = typeof f.path === "string" ? f.path : "";
    const stripped = stripStorageNamespace(path);
    if (!stripped.startsWith(COMMENT_FILES_PATH_PREFIX)) {
      throw new Error("Invalid comment file");
    }
    if (!stripped.includes(userSeg) || !stripped.includes(noteSeg)) {
      throw new Error("Invalid comment file");
    }
  }
}

/**
 * @param {unknown} raw
 * @returns {Record<string, unknown>}
 */
function normalizeCommentContent(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return structuredClone(DEFAULT_COMMENT_CONTENT);
  }

  const blocks = Array.isArray(raw.blocks) ? raw.blocks : null;
  if (!blocks || blocks.length === 0) {
    return structuredClone(DEFAULT_COMMENT_CONTENT);
  }

  return {
    blocks: blocks.map((b) => {
      if (!b || typeof b !== "object" || Array.isArray(b)) {
        return { properties: {}, text: "", type: "paragraph" };
      }
      const properties =
        b.properties && typeof b.properties === "object" && !Array.isArray(b.properties)
          ? b.properties
          : {};
      return {
        properties,
        text: typeof b.text === "string" ? b.text : "",
        type: typeof b.type === "string" ? b.type : "paragraph",
      };
    }),
    version: typeof raw.version === "number" ? raw.version : 1,
  };
}

/**
 * Entry in jsonb `files`: object metadata in Spaces (same pattern as note files).
 * Expected path: `notes-comments-files/userId_{uuid}/noteId_{uuid}/files/{uuid}_{name}`.
 *
 * @param {unknown} raw
 * @returns {{ id: string; name: string; path: string; type: string }[]}
 */
function normalizeCommentFiles(raw) {
  if (!Array.isArray(raw)) {
    return [];
  }

  const out = [];
  for (const entry of raw) {
    const normalized = normalizeCommentFileEntry(entry);
    if (normalized) {
      out.push(normalized);
    }
  }
  return out;
}

/**
 * @param {unknown} raw
 * @returns {{ id: string; name: string; path: string; type: string } | null}
 */
function normalizeCommentFileEntry(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return null;
  }

  const id = typeof raw.id === "string" ? raw.id.trim() : "";
  const name = typeof raw.name === "string" ? raw.name.trim() : "";
  const type = typeof raw.type === "string" ? raw.type.trim() : "";
  const pathRaw = typeof raw.path === "string" ? raw.path.trim() : "";

  if (!id || !name || !type || !pathRaw) {
    return null;
  }

  const path = stripStorageNamespace(pathRaw);
  if (!path.startsWith(COMMENT_FILES_PATH_PREFIX)) {
    return null;
  }

  return { id, name, path, type };
}

/**
 * @param {Record<string, unknown>} body
 * @returns {{ content: Record<string, unknown>; files: unknown[]; parentId: string | null }}
 */
function normalizeCommentCreatePayload(body) {
  const content = normalizeCommentContent(body?.content);
  const files = normalizeCommentFiles(body?.files);

  const parentRaw = body?.parent_id ?? body?.parentId ?? null;
  const parentId =
    parentRaw === null || parentRaw === undefined || parentRaw === ""
      ? null
      : isValidUUID(parentRaw)
        ? String(parentRaw)
        : null;

  if (parentRaw && !parentId) {
    throw new Error("Invalid parent_id");
  }

  return { content, files, parentId };
}

/**
 * @param {Record<string, unknown>} body
 * @returns {{ content?: Record<string, unknown>; files?: unknown[] }}
 */
function normalizeCommentUpdatePayload(body) {
  const out = {};
  if (Object.prototype.hasOwnProperty.call(body, "content")) {
    out.content = normalizeCommentContent(body.content);
  }
  if (Object.prototype.hasOwnProperty.call(body, "files")) {
    out.files = normalizeCommentFiles(body.files);
  }
  return out;
}

module.exports = {
  assertCommentFilesStorageScope,
  COMMENT_FILES_PATH_PREFIX,
  COMMENT_FILES_STORAGE_ROOT,
  DEFAULT_COMMENT_CONTENT,
  isValidUUID,
  normalizeCommentContent,
  normalizeCommentCreatePayload,
  normalizeCommentFileEntry,
  normalizeCommentFiles,
  normalizeCommentUpdatePayload,
};
