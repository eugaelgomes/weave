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
const adminRoutes = require("@/modules/admin/admin.routes");
const systemAuthRoutes = require("@/modules/system-auth/system-auth.routes");
const systemAdminsRoutes = require("@/modules/system-admins/system-admins.routes");

const router = express.Router();

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
  { path: "/admin", handler: adminRoutes },
  { path: "/system-auth", handler: systemAuthRoutes },
  { path: "/system-admins", handler: systemAdminsRoutes },
];

// Router mapping
routeMap.forEach(({ path, handler }) => router.use(path, handler));

module.exports = router;
