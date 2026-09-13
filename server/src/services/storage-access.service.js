const { rowCount } = require("@/database/connection");

class StorageAccessError extends Error {
  constructor(message = "Você não tem permissão para acessar este arquivo.", statusCode = 403) {
    super(message);
    this.name = "StorageAccessError";
    this.statusCode = statusCode;
  }
}

const USER_ID_PREFIX = "userId_";
const WORKSPACES_MEMBERS_TABLE = "workspace_members";
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
        key: normalized,
        ownerId: sanitizeId(segments[1]),
        type: "user-owned",
      };
    }
    case "users-content": {
      if (segments[1] === "profile") {
        return {
          key: normalized,
          ownerId: sanitizeId(segments[2]),
          type: "user-owned",
        };
      }
      return null;
    }

    case "projects": {
      const ownerId = extractPrefixedValue(segments[1] || "", USER_ID_PREFIX);
      const projectId = extractPrefixedValue(segments[2] || "", PROJECT_ID_PREFIX);
      if (!projectId) return null;
      return {
        key: normalized,
        ownerId: sanitizeId(ownerId),
        projectId,
        type: "project",
      };
    }
    case "organizations":
    case "workspaces": {
      const workspaceId = sanitizeId(segments[1]);
      if (!workspaceId) return null;
      return {
        key: normalized,
        type: "workspace",
        workspaceId,
      };
    }
    default:
      return null;
  }
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
        )
      )
    LIMIT 1;
  `;

  const count = await rowCount(query, [projectId, userId]);
  return count > 0;
};

const hasWorkspaceAccess = async (userId, workspaceId) => {
  if (!userId || !workspaceId) return false;

  const query = `
    SELECT 1
    FROM workspaces o
    WHERE o.id = $1
      AND (
        o.user_id = $2 OR EXISTS (
          SELECT 1 FROM ${WORKSPACES_MEMBERS_TABLE} om
          WHERE om.workspace_id = o.id
            AND om.user_id = $2
            AND om.deleted = false
        )
      )
    LIMIT 1;
  `;

  const count = await rowCount(query, [workspaceId, userId]);
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

    case "project":
      hasAccess = await hasProjectAccess(normalizedUserId, descriptor.projectId);
      break;
    case "workspace":
      hasAccess = await hasWorkspaceAccess(normalizedUserId, descriptor.workspaceId);
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
  assertFileAccess,
  StorageAccessError,
};
