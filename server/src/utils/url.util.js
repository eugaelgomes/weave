/**
 * Utility for building application URLs and formatting links.
 */

/**
 * Gets the base application domain.
 * Falls back to localhost if not set.
 */
function getAppDomain() {
  return process.env.APP_DOMAIN || "localhost";
}

/**
 * Returns true if running in production mode.
 */
function isProduction() {
  return process.env.NODE_ENV === "production";
}

/**
 * Gets the Frontend URL.
 */
function getFrontendUrl() {
  if (process.env.FRONTEND_URL) {
    return process.env.FRONTEND_URL.replace(/\/+$/, "");
  }
  if (!isProduction() || getAppDomain() === "localhost") {
    return "http://localhost:3000";
  }
  return `https://${getAppDomain()}`;
}

/**
 * Gets the Backend (API) URL.
 */
function getBackendUrl() {
  if (!isProduction() || getAppDomain() === "localhost") {
    return "http://localhost:8080";
  }
  return `https://apis.${getAppDomain()}`;
}

/**
 * Gets the MCP URL.
 */
function getMcpUrl() {
  if (!isProduction() || getAppDomain() === "localhost") {
    return "http://localhost:8081";
  }
  return `https://mcp.${getAppDomain()}`;
}

/**
 * Generates the public access URL for a note.
 */
function getNoteUrl(publicId) {
  if (!publicId) return null;
  return `${getFrontendUrl()}/notes/${publicId}`;
}

/**
 * Generates the public access URL for a project.
 */
function getProjectUrl(projectId) {
  if (!projectId) return null;
  return `${getFrontendUrl()}/projects/${projectId}`;
}

/**
 * Generates the public access URL for a comment.
 */
function getCommentUrl(notePublicId, commentId) {
  if (!notePublicId || !commentId) return null;
  return `${getFrontendUrl()}/notes/${notePublicId}/${commentId}`;
}

/**
 * Enriches an MCP response object with an `app_url` property.
 */
function enrichWithAppUrl(item, type, publicIdField, secondaryIdField) {
  if (!item) return item;

  const publicId = item[publicIdField];
  const secondaryId = secondaryIdField ? item[secondaryIdField] : null;
  let appUrl = null;

  if (type === "note" || type === "task") {
    appUrl = getNoteUrl(publicId);
  } else if (type === "project") {
    appUrl = getProjectUrl(publicId);
  } else if (type === "comment") {
    appUrl = getCommentUrl(publicId, secondaryId);
  }

  return {
    ...item,
    app_url: appUrl,
  };
}

module.exports = {
  enrichWithAppUrl,
  getAppDomain,
  getBackendUrl,
  getCommentUrl,
  getFrontendUrl,
  getMcpUrl,
  getNoteUrl,
  getProjectUrl,
  isProduction,
};
