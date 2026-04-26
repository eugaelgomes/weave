const DEFAULT_ORIGINS = [
  "https://weavenotes.app",
  "https://www.weavenotes.app",
];

const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",").map((o) => o.trim())
  : DEFAULT_ORIGINS;

const ALLOWED_HOSTNAMES = allowedOrigins
  .map((url) => {
    try {
      return new URL(url).hostname;
    } catch (e) {
      return null;
    }
  })
  .filter(Boolean);

const cookieDomain = process.env.COOKIE_DOMAIN || undefined;

const getCookieDomain = (hostname) => {
  if (process.env.NODE_ENV !== "production") return undefined;

  if (cookieDomain) return cookieDomain;
  // Extract the base domain
  if (ALLOWED_HOSTNAMES.includes(hostname)) {
    const parts = hostname.split(".");
    if (parts.length >= 2) {
      return parts.slice(-2).join(".");
    }
    return hostname;
  }

  return undefined;
};

module.exports = {
  allowedOrigins,
  getCookieDomain,
};
