const fs = require("fs");
const path = require("path");

const LOGO_FILE = "weave-notes-nobg.png";

/** @type {string|null|undefined} */
let cachedDataUri;

/**
 * Resolves the logo PNG path inside the monorepo.
 *
 * @returns {string|null}
 */
function resolveLogoAssetPath() {
  const candidates = [
    path.resolve(__dirname, "../../../..", "weave-app/public", LOGO_FILE),
    path.resolve(process.cwd(), "weave-app/public", LOGO_FILE),
    path.resolve(process.cwd(), "../weave-app/public", LOGO_FILE),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  return null;
}

/**
 * Returns a src suitable for <img>: explicit EMAIL_LOGO_URL, else inline base64 asset.
 *
 * @returns {string|null}
 */
function getEmailLogoSrc() {
  if (process.env.EMAIL_LOGO_URL) {
    return process.env.EMAIL_LOGO_URL;
  }

  if (cachedDataUri !== undefined) {
    return cachedDataUri;
  }

  const assetPath = resolveLogoAssetPath();
  if (!assetPath) {
    cachedDataUri = null;
    return null;
  }

  try {
    const buffer = fs.readFileSync(assetPath);
    cachedDataUri = `data:image/png;base64,${buffer.toString("base64")}`;
    return cachedDataUri;
  } catch {
    cachedDataUri = null;
    return null;
  }
}

module.exports = { getEmailLogoSrc, resolveLogoAssetPath };
