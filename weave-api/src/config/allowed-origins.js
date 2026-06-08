const DEFAULT_ORIGINS = [
  "https://weavenotes.app",
  "https://www.weavenotes.app",
  "https://theweave.tech",
  "https://*.theweave.tech",
];

const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",").map((o) => o.trim())
  : DEFAULT_ORIGINS;

const ALLOWED_HOSTNAMES = allowedOrigins
  .map((url) => {
    try {
      // For wildcard origins like https://*.theweave.tech,
      // replace * with a placeholder to make it a valid URL for parsing
      const sanitized = url.replace("*.", "wildcard-placeholder.");
      return new URL(sanitized).hostname.replace("wildcard-placeholder.", "");
    } catch (e) {
      return null;
    }
  })
  .filter(Boolean);

const cookieDomain = process.env.COOKIE_DOMAIN || undefined;

/**
 * Extracts the registrable domain (eTLD+1) from a hostname.
 * e.g. "apis.weavenotes.app" → "weavenotes.app"
 * @param {string} hostname
 * @returns {string}
 */
function getRegistrableDomain(hostname) {
  const parts = (hostname || "").split(".");
  return parts.length >= 2 ? parts.slice(-2).join(".") : hostname || "";
}

/**
 * Resolves the cookie domain for a given hostname.
 * Handles exact matches AND subdomains (e.g. apis.weavenotes.app → weavenotes.app).
 * @param {string} hostname - The request hostname (e.g. "apis.weavenotes.app")
 * @returns {string|undefined} The cookie domain or undefined (dev / unresolvable)
 */
const getCookieDomain = (hostname) => {
  if (process.env.NODE_ENV !== "production") return undefined;

  if (cookieDomain) return cookieDomain;

  // Find allowed hostname that matches exactly or is the base of a subdomain
  const baseHostname = ALLOWED_HOSTNAMES.find(
    (allowed) => hostname === allowed || hostname.endsWith(`.${allowed}`)
  );

  if (baseHostname) {
    return getRegistrableDomain(baseHostname);
  }

  // Fallback: extract base domain from hostname itself (e.g. apis.weavenotes.app → weavenotes.app)
  const baseDomain = getRegistrableDomain(hostname);
  if (baseDomain && baseDomain.includes(".")) {
    console.warn(
      `[Cookie Domain] Hostname "${hostname}" not in ALLOWED_HOSTNAMES. ` +
        `Falling back to "${baseDomain}". Set COOKIE_DOMAIN env var to avoid this.`
    );
    return baseDomain;
  }

  return undefined;
};

/**
 * Auto-detects the correct SameSite cookie policy based on configured origins.
 *
 * When the frontend (ALLOWED_ORIGINS) and the API (APP_DOMAIN) live on
 * different registrable domains (e.g. theweave.tech → apis.weavenotes.app),
 * the browser treats requests as **cross-site** and will NOT send cookies
 * unless `SameSite=None; Secure` is set.
 *
 * Priority: COOKIE_SAME_SITE env → auto-detection → "lax"
 * @returns {"none" | "lax" | "strict"}
 */
function detectSameSitePolicy() {
  // Explicit env override always wins
  if (process.env.COOKIE_SAME_SITE) {
    return process.env.COOKIE_SAME_SITE;
  }

  if (process.env.NODE_ENV !== "production") {
    return "lax";
  }

  const apiDomain = getRegistrableDomain(process.env.APP_DOMAIN || "");
  if (!apiDomain) return "lax";

  const originDomains = new Set(ALLOWED_HOSTNAMES.map(getRegistrableDomain));

  // If ANY allowed origin has a different registrable domain than the API, it's cross-site
  const hasCrossSite = [...originDomains].some((d) => d && d !== apiDomain);

  if (hasCrossSite) {
    console.log(
      `[Cookie SameSite] Cross-site detected (origins include domains besides "${apiDomain}"). Using SameSite=None.`
    );
    return "none";
  }

  return "lax";
}

module.exports = {
  allowedOrigins,
  detectSameSitePolicy,
  getCookieDomain,
};
