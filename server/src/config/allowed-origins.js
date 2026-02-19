const DEFAULT_ORIGINS = [
  "http://localhost:3000",
  "http://localhost:5173",
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

  // Se COOKIE_DOMAIN estiver definido na env, usa diretamente
  if (cookieDomain) return cookieDomain;

  // Fallback: extrai o domínio raiz do hostname
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
