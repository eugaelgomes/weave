const express = require("express");
const { verifyToken } = require("@/middlewares/auth/verify-token");

const notesRoutes = require("@/modules/notes/notes.routes");
const projectsRoutes = require("@/modules/projects/projects.routes");
const calendarEventsRoutes = require("@/modules/calendar-events/calendar-events.routes");
const tagsRoutes = require("@/modules/tags/tags.routes");
const taskPrioritiesRoutes = require("@/modules/task_priorities/task_priorities.routes");
const weaveAiRoutes = require("@/modules/weave-ai/weave-ai.routes");
const SearchUsersController = require("@/modules/users/controllers/search-users.controllers");
const { requireScope } = require("@/middlewares/auth/require-scope");
const { highTrafficLimiter } = require("@/middlewares/security/request-limiters");

const DEFAULT_VERSION = "v1";

const publicRoutes = [
  {
    method: "get",
    path: "/me",
    middlewares: [verifyToken],
    handler: (req, res) => {
      res.json({
        status: "OK",
        message: "Successfully accessed Weave Notes Public API.",
        user: req.user,
        apiToken: req.apiToken,
      });
    },
  },
];

const createPublicRouter = ({ version = DEFAULT_VERSION } = {}) => {
  const router = express.Router();

  router.use((req, _res, next) => {
    req.apiVersion = version;
    next();
  });

  publicRoutes.forEach(({ method, path, middlewares = [], handler }) => {
    router[method](path, ...middlewares, handler);
  });

  router.use("/notes", notesRoutes);
  router.use("/projects", projectsRoutes);
  router.use("/calendar-events", calendarEventsRoutes);
  router.use("/tags", tagsRoutes);
  router.use("/task-priorities", taskPrioritiesRoutes);
  router.use("/weave-ai", weaveAiRoutes);

  // Expose ONLY the search endpoint for users
  router.get(
    "/users/search",
    verifyToken,
    highTrafficLimiter,
    requireScope("users:read"),
    (req, res, next) => SearchUsersController.searchUsers(req, res, next)
  );

  return router;
};

module.exports = { createPublicRouter };
