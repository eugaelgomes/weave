const express = require("express");

// Rotas nos módulos
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
const webhooksRoutes = require("@/modules/webhooks/webhooks.routes");

const router = express.Router();

const routeMap = [
  { handler: adminRoutes, path: "/admin" },
  { handler: authRoutes, path: "/auth" },
  { handler: backupRoutes, path: "/backup" },
  { handler: aiRoutes, path: "/weave-ai" },
  { handler: notesRoutes, path: "/notes" },
  { handler: organizationsRoutes, path: "/organizations" },
  { handler: passwordRoutes, path: "/password" },
  { handler: plansRoutes, path: "/plans" },
  { handler: projectsRoutes, path: "/projects" },
  { handler: systemAdminsRoutes, path: "/system-admins" },
  { handler: systemAuthRoutes, path: "/system-auth" },
  { handler: userRoutes, path: "/users" },
  { handler: webhooksRoutes, path: "/webhooks" },
];

routeMap.forEach(({ path, handler }) => router.use(path, handler));

module.exports = router;
