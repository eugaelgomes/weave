// src/routes/v1/internal.routes.js

const express = require("express");

const {
  issueInternalChallenge,
  verifyInternalWebChallenge,
} = require("@/middlewares/security/internal-web-challenge");

const authRoutes = require("@/modules/authentication/auth.routes");
const userRoutes = require("@/modules/users/users.routes");

const backupRoutes = require("@/modules/backup/backup.routes");
const organizationsRoutes = require("@/modules/workspaces/workspaces.routes");
const plansRoutes = require("@/modules/plans/plans.routes");
const notificationsRoutes = require("@/modules/messenger/notifications.routes");

const agentHouseRoutes = require("@/modules/agent-house/agent-house.routes");

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
  const envValue = process.env.PRODUCTION_ALLOWED_ORIGINS || process.env.ALLOWED_ORIGINS || "";
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
  path.startsWith("/auth/oauth") || path.startsWith("/auth/sso");

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

const slackRoutes = require("@/integration/providers/slack/slack.routes");

/**
 * Registry mapping base paths to their respective handler routes
 * @type {Array<{basePath: string, handler: import('express').Router}>}
 */
const routeRegistry = [
  { basePath: "/auth", handler: authRoutes },
  { basePath: "/backup", handler: backupRoutes },
  { basePath: "/workspaces", handler: organizationsRoutes },
  { basePath: "/plans", handler: plansRoutes },
  { basePath: "/users", handler: userRoutes },
  { basePath: "/weave-ai", handler: agentHouseRoutes },
  { basePath: "/notifications", handler: notificationsRoutes },
  { basePath: "/integrations/slack", handler: slackRoutes },
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

  routeRegistry.forEach(({ basePath, handler }) => {
    router.use(basePath, handler);
  });

  return router;
};

module.exports = { createInternalRouter };
