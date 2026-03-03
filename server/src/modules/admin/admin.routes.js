const express = require("express");
const adminController = require("@/modules/admin/admin.controller");
const { verifyAdminToken } = require("@/modules/admin/admin.middleware");

const router = express.Router();

// Todas as rotas admin requerem autenticação + permissão admin
router.use(verifyAdminToken);

// Dashboard
router.get("/dashboard", adminController.getDashboard.bind(adminController));

// Users
router.get("/users", adminController.listUsers.bind(adminController));
router.get("/users/:id", adminController.getUserById.bind(adminController));
router.put("/users/:id", adminController.updateUser.bind(adminController));
router.delete("/users/:id", adminController.deleteUser.bind(adminController));
router.post("/users/:id/restore", adminController.restoreUser.bind(adminController));

// Organizations
router.get("/organizations", adminController.listOrganizations.bind(adminController));
router.get("/organizations/:id", adminController.getOrganizationById.bind(adminController));
router.put("/organizations/:id", adminController.updateOrganization.bind(adminController));
router.delete("/organizations/:id", adminController.deleteOrganization.bind(adminController));
router.post("/organizations/:id/restore", adminController.restoreOrganization.bind(adminController));

// Plans
router.get("/plans", adminController.listPlans.bind(adminController));

module.exports = router;
