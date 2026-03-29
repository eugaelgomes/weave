const express = require("express");

// Rotas nos módulos
const authRoutes = require("@/modules/authentication/auth.routes");
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
const notificationsRoutes = require("@/modules/notifications/notifications.routes");
const calendarEventsRoutes = require("@/modules/calendar-events/calendar-events.routes");
const apiTokensRoutes = require("@/modules/api-tokens/api-tokens.routes");

const router = express.Router();

router.use((req, res, next) => {
  /**
   * Ignore cors verification for webhooks and SSO signin route.
   */
  if (req.path.startsWith("/webhooks") || req.path.startsWith("/auth/signin/sso/")) {
    return next();
  }

  const env = process.env.NODE_ENV;
  const origin = req.headers.origin;

  if (env === "development") {
    if (origin && !/^http:\/\/localhost(:\d+)?$/.test(origin) && !/^http:\/\/127\.0\.0\.1(:\d+)?$/.test(origin)) {
      return res.status(403).json({ error: "Acesso negado." });
    }
  } else {
    if (origin !== "https://weavenotes.app") {
      return res.status(403).json({ error: "Acesso negado." });
    }
  }

  next();
});

const routeMap = [
  { handler: adminRoutes, path: "/admin" },
  { handler: apiTokensRoutes, path: "/api-tokens" },
  { handler: authRoutes, path: "/auth" },
  { handler: backupRoutes, path: "/backup" },
  { handler: calendarEventsRoutes, path: "/calendar-events" },
  { handler: aiRoutes, path: "/weave-ai" },
  { handler: notesRoutes, path: "/notes" },
  { handler: organizationsRoutes, path: "/organizations" },
  { handler: passwordRoutes, path: "/password" },
  { handler: plansRoutes, path: "/plans" },
  { handler: notificationsRoutes, path: "/notifications" },
  { handler: projectsRoutes, path: "/projects" },
  { handler: systemAdminsRoutes, path: "/system-admins" },
  { handler: systemAuthRoutes, path: "/system-auth" },
  { handler: userRoutes, path: "/users" },
  { handler: webhooksRoutes, path: "/webhooks" },
];

routeMap.forEach(({ path, handler }) => router.use(path, handler));

module.exports = router;
