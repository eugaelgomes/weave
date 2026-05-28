const express = require("express");
const {
  issueInternalChallenge,
  verifyInternalWebChallenge,
} = require("@/middlewares/security/internal-web-challenge");

const authRoutes = require("@/modules/authentication/auth.routes");
const userRoutes = require("@/modules/users/users.routes");
const passwordRoutes = require("@/modules/password/password.routes");
const notesRoutes = require("@/modules/notes/notes.routes");
const backupRoutes = require("@/modules/backup/backup.routes");
const projectsRoutes = require("@/modules/projects/projects.routes");
const organizationsRoutes = require("@/modules/organizations/organizations.routes");
const plansRoutes = require("@/modules/plans/plans.routes");
const webhooksRoutes = require("@/modules/webhooks/webhooks.routes");
const notificationsRoutes = require("@/modules/notifications/notifications.routes");
const calendarEventsRoutes = require("@/modules/calendar-events/calendar-events.routes");
const apiTokensRoutes = require("@/modules/api-tokens/api-tokens.routes");
const tagsRoutes = require("@/modules/tags/tags.routes");
const taskPrioritiesRoutes = require("@/modules/task-priorities/task-priorities.routes");
const weaveAiRoutes = require("@/modules/weave-ai/weave-ai.routes");
const slackRoutes = require("@/modules/slack/slack.routes");

const DEFAULT_VERSION = "v1";
const DEV_ORIGIN_REGEX = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;

const parseOriginList = (rawValue = "") =>
  rawValue
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

const resolveProductionOrigins = () => {
  const envValue =
    process.env.PRODUCTION_ALLOWED_ORIGINS || process.env.ALLOWED_ORIGINS || "";
  return parseOriginList(envValue);
};

// Configurar matchers semelhantes ao CORS
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

const PRODUCTION_ORIGINS_LIST = resolveProductionOrigins();
const originMatchers = PRODUCTION_ORIGINS_LIST.map(buildMatcher);
let missingOriginConfigLogged = false;

const shouldSkipOriginGuard = (path) =>
  path.startsWith("/webhooks") ||
  path.startsWith("/auth/signin/sso") ||
  path.startsWith("/auth/sso");

const isAllowedOrigin = (origin, isDev) => {
  if (!origin) {
    return true;
  }

  if (isDev) {
    return DEV_ORIGIN_REGEX.test(origin);
  }

  if (PRODUCTION_ORIGINS_LIST.length === 0) {
    if (!missingOriginConfigLogged) {
      missingOriginConfigLogged = true;
      console.warn(
        "[Origin Guard] Nenhuma origem de produção configurada. Defina PRODUCTION_ALLOWED_ORIGINS ou ALLOWED_ORIGINS para restringir o acesso."
      );
    }
    return true;
  }

  // Remove trailing slashes origin caso venha da policy para conferir
  const normalizedOrigin = origin.replace(/\/+$/, "");
  return originMatchers.some((fn) => fn(normalizedOrigin));
};

const routeRegistry = [
  { basePath: "/api-tokens", handler: apiTokensRoutes },
  { basePath: "/auth", handler: authRoutes },
  { basePath: "/backup", handler: backupRoutes },
  { basePath: "/calendar-events", handler: calendarEventsRoutes },
  { basePath: "/notes", handler: notesRoutes },
  { basePath: "/organizations", handler: organizationsRoutes },
  { basePath: "/projects", handler: tagsRoutes },
  { basePath: "/projects", handler: taskPrioritiesRoutes },
  { basePath: "/organizations", handler: tagsRoutes },
  { basePath: "/organizations", handler: taskPrioritiesRoutes },
  { basePath: "/password", handler: passwordRoutes },
  { basePath: "/plans", handler: plansRoutes },
  { basePath: "/notifications", handler: notificationsRoutes },
  { basePath: "/projects", handler: projectsRoutes },
  { basePath: "/task-priorities", handler: taskPrioritiesRoutes },
  { basePath: "/users", handler: userRoutes },
  { basePath: "/webhooks", handler: webhooksRoutes },
  { basePath: "/weave-ai", handler: weaveAiRoutes },
  { basePath: "/slack", handler: slackRoutes },
];

const createInternalRouter = ({ version = DEFAULT_VERSION } = {}) => {
  const router = express.Router();

  router.use((req, res, next) => {
    req.apiVersion = version;

    if (shouldSkipOriginGuard(req.path)) {
      return next();
    }

    const isDev = process.env.NODE_ENV !== "production";
    const originAllowed = isAllowedOrigin(req.headers.origin, isDev);

    if (!originAllowed) {
      return res.status(403).json({ error: "Acesso negado." });
    }

    return next();
  });

  router.get("/_internal/challenge", issueInternalChallenge);
  router.use(verifyInternalWebChallenge);

  routeRegistry.forEach(({ basePath, handler }) =>
    router.use(basePath, handler)
  );

  return router;
};

module.exports = { createInternalRouter };
