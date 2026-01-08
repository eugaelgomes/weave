const express = require("express");

const authRoutes = require("@/modules/auth/auth.routes");
const userRoutes = require("@/modules/users/users.routes");
const passwordRoutes = require("@/modules/password/password.routes");
const notesRoutes = require("@/modules/notes/notes.routes");
const backupRoutes = require("@/modules/backup/backup.routes");
const projectsRoutes = require("@/modules/projects/projects.routes");
const aiRoutes = require("@/modules/weave-ai/weave-ai.routes");
const organizationsRoutes = require("@/modules/organizations/organizations.routes");
const plansRoutes = require("@/modules/plans/plans.routes");

const router = express.Router();

// Health Check
router.get("/health", (req, res) => {
  res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
  res.setHeader("Pragma", "no-cache");

  const healthcheck = {
    status: "online",
    uptime: process.uptime(),
    message: "All systems operational",
    timestamp: new Date().toISOString(),
    service: "weave-notes-api",
  };

  try {
    res.send(healthcheck);
  } catch (error) {
    healthcheck.message = error;
    res.status(503).send();
  }
});

const routeMap = [
  { path: "/auth", handler: authRoutes },
  { path: "/users", handler: userRoutes },
  { path: "/password", handler: passwordRoutes },
  { path: "/notes", handler: notesRoutes },
  { path: "/backup", handler: backupRoutes },
  { path: "/projects", handler: projectsRoutes },
  { path: "/weave-ai", handler: aiRoutes },
  { path: "/organizations", handler: organizationsRoutes },
  { path: "/plans", handler: plansRoutes },
];

// Router mapping
routeMap.forEach(({ path, handler }) => router.use(path, handler));

module.exports = router;
