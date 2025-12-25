const allowedOrigins = [
  "http://localhost:3000",
  "http://localhost:5173",
  "https://notes.codaweb.com.br",
  "https://notes.gaelgomes.dev",
  "https://weavenotes.app",
  "https://www.weavenotes.app",
];

const ALLOWED_HOSTNAMES = allowedOrigins.map((url) => {
  try {
    return new URL(url).hostname;
  } catch (e) {
    return null;
  }
}).filter(Boolean);

const getCookieDomain = (hostname) => {
  if (process.env.NODE_ENV !== "production") return undefined;

  if (ALLOWED_HOSTNAMES.includes(hostname)) {
    if (hostname.endsWith("weavenotes.app")) return "weavenotes.app";
    if (hostname.endsWith("codaweb.com.br")) return "codaweb.com.br";
    if (hostname.endsWith("gaelgomes.dev")) return "gaelgomes.dev";
    return hostname;
  }

  return undefined;
};

module.exports = {
  allowedOrigins,
  getCookieDomain,
};

