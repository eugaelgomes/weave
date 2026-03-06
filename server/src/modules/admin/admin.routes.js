const express = require("express");
const adminController = require("@/modules/admin/admin.controller");
const {
  requireSystemAdmin,
  requireManager,
  requireSupport,
} = require("@/modules/system-auth/system-auth.middleware");

const router = express.Router();

// Todas as rotas admin requerem autenticação de system admin
router.use(requireSystemAdmin);

// Dashboard (todos os roles)
router.get("/dashboard", adminController.getDashboard.bind(adminController));

// Users - Listar e visualizar (todos os roles)
router.get("/users", adminController.listUsers.bind(adminController));
router.get("/users/:id", adminController.getUserById.bind(adminController));

// Users - Atualizar (support, manager, super_admin)
router.put("/users/:id", requireSupport, adminController.updateUser.bind(adminController));

// Users - Deletar/Restaurar (manager, super_admin)
router.delete("/users/:id", requireManager, adminController.deleteUser.bind(adminController));
router.post("/users/:id/restore", requireManager, adminController.restoreUser.bind(adminController));

// Organizations - Listar e visualizar (todos os roles)
router.get("/organizations", adminController.listOrganizations.bind(adminController));
router.get("/organizations/:id", adminController.getOrganizationById.bind(adminController));

// Organizations - Atualizar (support, manager, super_admin)
router.put("/organizations/:id", requireSupport, adminController.updateOrganization.bind(adminController));

// Organizations - Deletar/Restaurar (manager, super_admin)
router.delete("/organizations/:id", requireManager, adminController.deleteOrganization.bind(adminController));
router.post("/organizations/:id/restore", requireManager, adminController.restoreOrganization.bind(adminController));

// Plans (todos os roles)
router.get("/plans", adminController.listPlans.bind(adminController));

module.exports = router;
