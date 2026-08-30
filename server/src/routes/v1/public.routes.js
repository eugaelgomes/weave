const express = require("express");
const { verifyToken } = require("@/middlewares/auth/verify-token");
const { API_SCOPES } = require("@/config/api-scopes");
const { logPublicApiRequest } = require("@/middlewares/http/log-public-api-request");

const notesRoutes = require("@/modules/notes/notes.routes");
const calendarRoutes = require("@/modules/calendar/calendar.routes");
const agentHouseRoutes = require("@/modules/agent-house/agent-house.routes");
const SearchUsersController = require("@/modules/users/controllers/search-users.controllers");
const { requireScope } = require("@/middlewares/auth/require-scope");
const { highTrafficLimiter } = require("@/middlewares/security/request-limiters");

const DEFAULT_VERSION = "v1";

/**
 * Array of public routes definitions
 * @type {Array<{method: string, path: string, middlewares: Array<Function>, handler: Function}>}
 */
const publicRoutes = [
  {
    handler: (req, res) => {
      res.json({
        apiToken: req.apiToken,
        message: "Successfully accessed Weave Public API.",
        status: "OK",
        user: req.user,
      });
    },
    method: "get",
    middlewares: [verifyToken],
    path: "/me",
  },
];

/**
 * Creates and configures the Express router for public API endpoints
 *
 * @param {object} options - Router options
 * @param {string} [options.version="v1"] - The API version
 * @returns {import('express').Router} Express Router instance
 */
const createPublicRouter = ({ version = DEFAULT_VERSION } = {}) => {
  const router = express.Router();

  // Stamp the API version on every request for logging and routing.
  router.use((req, _res, next) => {
    req.apiVersion = version;
    next();
  });

  // Observability: log every authenticated Public API request fire-and-forget.
  router.use(logPublicApiRequest);

  publicRoutes.forEach(({ method, path, middlewares = [], handler }) => {
    router[method](path, ...middlewares, handler);
  });

  router.use("/notes", notesRoutes);
  router.use("/calendar", calendarRoutes);
  router.use("/agent-house", agentHouseRoutes);

  // Expose ONLY the search endpoint for users
  router.get(
    "/users/search",
    verifyToken,
    highTrafficLimiter,
    requireScope(API_SCOPES.USERS_READ),
    (req, res, next) => SearchUsersController.searchUsers(req, res, next)
  );

  return router;
};

module.exports = { createPublicRouter };
