const { allowedOrigins } = require("@/config/allowed-origins");

const WHITELIST = allowedOrigins;

function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function buildMatcher(allowed) {
  if (allowed.includes("*")) {
    const pattern = "^" + allowed.split("*").map(escapeRegExp).join(".*") + "$";
    const re = new RegExp(pattern);
    return (origin) => re.test(origin);
  }
  return (origin) => origin === allowed;
}

function makeCorsOptions() {
  const isDev = process.env.NODE_ENV !== "production";

  const devMatchers = isDev
    ? [
        (origin) => /^http:\/\/localhost(:\d+)?$/.test(origin),
        (origin) => /^http:\/\/127\.0\.0\.1(:\d+)?$/.test(origin),
      ]
    : [];

  const matchers = WHITELIST.map(buildMatcher).concat(devMatchers);

  return {
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-Requested-With",
      "Accept",
      "Cookie",
      "X-Weave-Internal-Challenge",
    ],
    credentials: true,
    exposedHeaders: ["Content-Range", "X-Content-Range", "Set-Cookie"],
    maxAge: 600,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    optionsSuccessStatus: 204,
    origin(origin, cb) {
      // In development, allow every origin (including tool-specific schemes)
      // so API clients like Postman/Insomnia can run tests without CORS blocks.
      if (isDev) {
        return cb(null, true);
      }

      // Requests without an Origin header come from direct browser navigation,
      // server-to-server calls (reverse proxy, health checks), and CLI tools.
      // CORS is enforced by the browser, so these are safe to allow.
      if (!origin) {
        return cb(null, true);
      }

      const normalized = origin.replace(/\/+$/, "");
      const ok = matchers.some((fn) => fn(normalized));

      if (ok) {
        return cb(null, true);
      }
      return cb(new Error("Origin not allowed by CORS."));
    },
  };
}

module.exports = { makeCorsOptions };
