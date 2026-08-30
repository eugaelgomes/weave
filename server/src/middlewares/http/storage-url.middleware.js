const spacesService = require("@/services/storage.service");

// Known storage folder prefixes (from SpacesService.FOLDER_PATHS)
const STORAGE_PREFIXES = [
  "agents/",
  "backups/",
  "images/",
  "notes/",
  "notes-comments-files/",
  "workspaces/",
  "projects/",
  "users-content/",
];

/**
 * Returns true only if the value is clearly a relative storage path.
 * We match on VALUE (not key name) to avoid false positives on generic keys like "url", "key", "src".
 */
function isStoragePath(value) {
  if (typeof value !== "string" || !value.trim()) return false;
  // Already absolute — leave it alone
  if (
    value.startsWith("http://") ||
    value.startsWith("https://") ||
    value.startsWith("data:") ||
    value.startsWith("blob:")
  ) {
    return false;
  }
  return STORAGE_PREFIXES.some((prefix) => value.startsWith(prefix));
}

async function traverseAndReplaceStorageUrlsAsync(obj) {
  if (Array.isArray(obj)) {
    await Promise.all(obj.map((item) => traverseAndReplaceStorageUrlsAsync(item)));
  } else if (obj !== null && typeof obj === "object") {
    const promises = [];
    for (const key of Object.keys(obj)) {
      const value = obj[key];
      if (typeof value === "string" && isStoragePath(value)) {
        promises.push(
          spacesService.getSignedUrl(value).then((signedUrl) => {
            if (signedUrl) {
              obj[key] = signedUrl;
            }
          })
        );
      } else if (typeof value === "object" && value !== null) {
        promises.push(traverseAndReplaceStorageUrlsAsync(value));
      }
    }
    await Promise.all(promises);
  }
}

/**
 * Middleware that intercepts res.json to rewrite relative storage keys to signed URLs with expiration time.
 */
function storageUrlInterceptorMiddleware(req, res, next) {
  const originalJson = res.json;

  res.json = function (body) {
    traverseAndReplaceStorageUrlsAsync(body)
      .catch((err) => {
        console.error("Error in storageUrlInterceptorMiddleware:", err);
      })
      .finally(() => {
        originalJson.call(this, body);
      });
  };

  next();
}

module.exports = { storageUrlInterceptorMiddleware, traverseAndReplaceStorageUrlsAsync };
