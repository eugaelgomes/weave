const { rowCount } = require("@/database/connection");

class StorageAccessError extends Error {
  constructor(message = "Você não tem permissão para acessar este arquivo.", statusCode = 403) {
    super(message);
    this.name = "StorageAccessError";
    this.statusCode = statusCode;
  }
}

const USER_ID_PREFIX = "userId_";
const NOTE_ID_PREFIX = "noteId_";
const PROJECT_ID_PREFIX = "projectId_";
const NOTE_COLLAB_TABLE = "note_collaborators";
const PROJECTS_MEMBERS_TABLE = "projects_members";
const ORGANIZATIONS_MEMBERS_TABLE = "organizations_members";
const PATH_NAMESPACE_PREFIX = "weave-notes/";

const normalizeKey = (key = "") => key.replace(/\/+/g, "/").replace(/^\/+/, "");
const stripNamespacePrefix = (key) =>
  key.startsWith(PATH_NAMESPACE_PREFIX) ? key.slice(PATH_NAMESPACE_PREFIX.length) : key;

const extractPrefixedValue = (value = "", prefix) =>
  value.startsWith(prefix) ? value.slice(prefix.length) : null;

const sanitizeId = (value) => (typeof value === "string" && value.length > 0 ? value : null);

const parseResourceDescriptor = (key) => {
  if (!key) {
    return null;
  }

  const normalized = stripNamespacePrefix(normalizeKey(key));
  const segments = normalized.split("/").filter(Boolean);
  if (!segments.length) return null;

  const [root] = segments;

  switch (root) {
    case "backups":
    case "images": {
      return {
        type: "user-owned",
        ownerId: sanitizeId(segments[1]),
        key: normalized,
      };
    }
    case "users-content": {
      if (segments[1] === "profile") {
        return {
          type: "user-owned",
          ownerId: sanitizeId(segments[2]),
          key: normalized,
        };
      }
      return null;
    }
    case "notes": {
      const ownerId = extractPrefixedValue(segments[1] || "", USER_ID_PREFIX);
      const noteId = extractPrefixedValue(segments[2] || "", NOTE_ID_PREFIX);
      if (!noteId) return null;
      return {
        type: "note",
        noteId,
        ownerId: sanitizeId(ownerId),
        key: normalized,
      };
    }
    case "projects": {
      const ownerId = extractPrefixedValue(segments[1] || "", USER_ID_PREFIX);
      const projectId = extractPrefixedValue(segments[2] || "", PROJECT_ID_PREFIX);
      if (!projectId) return null;
      return {
        type: "project",
        projectId,
        ownerId: sanitizeId(ownerId),
        key: normalized,
      };
    }
    case "organizations": {
      const organizationId = sanitizeId(segments[1]);
      if (!organizationId) return null;
      return {
        type: "organization",
        organizationId,
        key: normalized,
      };
    }
    default:
      return null;
  }
};

const hasNoteAccess = async (userId, noteId) => {
  if (!userId || !noteId) return false;

  const query = `
    SELECT 1
    FROM notes n
    WHERE n.id = $1
      AND (
        n.user_id = $2 OR EXISTS (
          SELECT 1 FROM ${NOTE_COLLAB_TABLE} nc
          WHERE nc.note_id = n.id
            AND nc.user_id = $2
            AND (nc.removed IS NULL OR nc.removed = false)
        )
      )
    LIMIT 1;
  `;

  const count = await rowCount(query, [noteId, userId]);
  return count > 0;
};

const hasProjectAccess = async (userId, projectId) => {
  if (!userId || !projectId) return false;

  const query = `
    SELECT 1
    FROM projects p
    WHERE p.id = $1
      AND (
        p.user_id = $2 OR EXISTS (
          SELECT 1 FROM ${PROJECTS_MEMBERS_TABLE} pm
          WHERE pm.project_id = p.id
            AND pm.user_id = $2
            AND pm.deleted = false
            AND pm.suspended = false
        )
      )
    LIMIT 1;
  `;

  const count = await rowCount(query, [projectId, userId]);
  return count > 0;
};

const hasOrganizationAccess = async (userId, organizationId) => {
  if (!userId || !organizationId) return false;

  const query = `
    SELECT 1
    FROM organizations o
    WHERE o.id = $1
      AND (
        o.user_id = $2 OR EXISTS (
          SELECT 1 FROM ${ORGANIZATIONS_MEMBERS_TABLE} om
          WHERE om.org_id = o.id
            AND om.user_id = $2
            AND om.deleted = false
            AND om.suspended = false
        )
      )
    LIMIT 1;
  `;

  const count = await rowCount(query, [organizationId, userId]);
  return count > 0;
};

const assertFileAccess = async (userId, key) => {
  if (!userId) {
    throw new StorageAccessError("Contexto do usuário é obrigatório para acessar arquivos.");
  }

  const descriptor = parseResourceDescriptor(key);
  if (!descriptor) {
    throw new StorageAccessError("Arquivo não reconhecido ou não suportado.");
  }

  const normalizedUserId = String(userId).trim();
  if (descriptor.ownerId && descriptor.ownerId === normalizedUserId) {
    return true;
  }

  let hasAccess = false;

  switch (descriptor.type) {
    case "user-owned":
      hasAccess = descriptor.ownerId === normalizedUserId;
      break;
    case "note":
      hasAccess = await hasNoteAccess(normalizedUserId, descriptor.noteId);
      break;
    case "project":
      hasAccess = await hasProjectAccess(normalizedUserId, descriptor.projectId);
      break;
    case "organization":
      hasAccess = await hasOrganizationAccess(normalizedUserId, descriptor.organizationId);
      break;
    default:
      hasAccess = false;
  }

  if (!hasAccess) {
    throw new StorageAccessError();
  }

  return true;
};

module.exports = {
  StorageAccessError,
  assertFileAccess,
};
