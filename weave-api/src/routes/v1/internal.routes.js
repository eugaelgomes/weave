// src/routes/v1/internal.routes.js

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
const engineRoutes = require("@/modules/engine/engine.routes");
const artifactsRoutes = require("@/modules/artifacts/artifacts.routes");

const DEFAULT_VERSION = "v1";
const DEV_ORIGIN_REGEX = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;

/**
 * Parses a comma-separated string of origins into an array of trimmed origin strings
 *
 * @param {string} rawValue - Comma-separated list of allowed origins
 * @returns {Array<string>} Array of parsed origins
 */
const parseOriginList = (rawValue = "") =>
  rawValue
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

/**
 * Resolves the list of production origins from environment variables
 *
 * @returns {Array<string>} Array of allowed production origins
 */
const resolveProductionOrigins = () => {
  const envValue =
    process.env.PRODUCTION_ALLOWED_ORIGINS || process.env.ALLOWED_ORIGINS || "";
  return parseOriginList(envValue);
};

// Configure CORS-like matchers
/**
 * Escapes regular expression special characters in a string
 *
 * @param {string} s - The string to escape
 * @returns {string} The escaped string
 */
function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Builds a matcher function for a given origin pattern (supporting wildcards)
 *
 * @param {string} allowed - The allowed origin pattern (can contain '*')
 * @returns {Function} A function that takes an origin and returns true if it matches the pattern
 */
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

/**
 * Determines whether a specific path should skip origin guards
 *
 * @param {string} path - The request path
 * @returns {boolean} True if the path should bypass origin checks
 */
const shouldSkipOriginGuard = (path) =>
  path.startsWith("/webhooks") ||
  path.startsWith("/auth/signin/sso") ||
  path.startsWith("/auth/sso");

/**
 * Checks if a given origin is allowed to access the API
 *
 * @param {string} origin - The origin header from the request
 * @param {boolean} isDev - Whether the server is running in development mode
 * @returns {boolean} True if the origin is allowed, false otherwise
 */
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
        "[Origin Guard] No production origin configured. Set PRODUCTION_ALLOWED_ORIGINS or ALLOWED_ORIGINS to restrict access."
      );
    }
    return true;
  }

  // Remove trailing slashes from origin if it comes from the policy for checking
  const normalizedOrigin = origin.replace(/\/+$/, "");
  return originMatchers.some((fn) => fn(normalizedOrigin));
};

/**
 * Registry mapping base paths to their respective handler routes
 * @type {Array<{basePath: string, handler: import('express').Router}>}
 */
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
  { basePath: "/engine", handler: engineRoutes },
  { basePath: "/artifacts", handler: artifactsRoutes },
];

/**
 * Creates and configures the Express router for internal API endpoints
 *
 * @param {object} options - Router options
 * @param {string} [options.version="v1"] - The API version
 * @returns {import('express').Router} Express Router instance
 */
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
      return res.status(403).json({ error: "Access denied." });
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
