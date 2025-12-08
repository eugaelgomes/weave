const express = require("express");

// Sub-rotas
const authRoutes = require("@/routes/auth.routes");
const userRoutes = require("@/routes/users.routes");
const passwordRoutes = require("@/routes/password.routes");
const notesRoutes = require("@/routes/notes.routes");
const backupRoutes = require("@/routes/backup.routes");
const projectsRoutes = require("@/routes/projects.routes");
const aiRoutes = require("@/routes/ai.routes");

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

// Endpoints das subrotas
const routeMap = [
  { path: "/auth", handler: authRoutes },
  { path: "/users", handler: userRoutes },
  { path: "/password", handler: passwordRoutes },
  { path: "/notes", handler: notesRoutes },
  { path: "/backup", handler: backupRoutes },
  { path: "/projects", handler: projectsRoutes },
  { path: "/ai", handler: aiRoutes },
];

// Router mapping
routeMap.forEach(({ path, handler }) => router.use(path, handler));

module.exports = router;
