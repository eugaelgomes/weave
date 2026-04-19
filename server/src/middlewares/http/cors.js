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
    origin(origin, cb) {
      if (!origin) {
        if (isDev) {
          return cb(null, true);
        }
        return cb(
          new Error("Headless requests are not allowed in production.")
        );
      }

      const normalized = origin.replace(/\/+$/, "");
      const ok = matchers.some((fn) => fn(normalized));

      if (ok) {
        return cb(null, true);
      }
      return cb(new Error("Origin not allowed by CORS."));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-Requested-With",
      "Accept",
      "Cookie",
      "X-Weave-Internal-Challenge",
    ],
    exposedHeaders: ["Content-Range", "X-Content-Range", "Set-Cookie"],
    maxAge: 600,
    optionsSuccessStatus: 204,
  };
}

module.exports = { makeCorsOptions };
