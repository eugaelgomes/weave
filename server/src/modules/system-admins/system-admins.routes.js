const express = require("express");
const SystemAdminsController = require("@/modules/system-admins/system-admins.controller");
const {
  requireSystemAdmin,
  requireSuperAdmin,
  requireManager,
} = require("@/modules/system-auth/system-auth.middleware");

const router = express.Router();

// Todas as rotas requerem autenticação de system admin
router.use(requireSystemAdmin);

// Estatísticas (todos os roles podem ver)
router.get(
  "/stats",
  SystemAdminsController.getStats.bind(SystemAdminsController)
);

// Listar e visualizar (todos os roles podem ver)
router.get("/", SystemAdminsController.listAdmins.bind(SystemAdminsController));
router.get(
  "/:id",
  SystemAdminsController.getAdminById.bind(SystemAdminsController)
);

// Criar (apenas super_admin)
router.post(
  "/",
  requireSuperAdmin,
  SystemAdminsController.createAdmin.bind(SystemAdminsController)
);

// Atualizar (apenas super_admin e manager)
router.put(
  "/:id",
  requireManager,
  SystemAdminsController.updateAdmin.bind(SystemAdminsController)
);

// Suspender/Ativar (apenas super_admin e manager)
router.post(
  "/:id/suspend",
  requireManager,
  SystemAdminsController.suspendAdmin.bind(SystemAdminsController)
);
router.post(
  "/:id/activate",
  requireManager,
  SystemAdminsController.activateAdmin.bind(SystemAdminsController)
);

// Deletar/Restaurar (apenas super_admin)
router.delete(
  "/:id",
  requireSuperAdmin,
  SystemAdminsController.deleteAdmin.bind(SystemAdminsController)
);
router.post(
  "/:id/restore",
  requireSuperAdmin,
  SystemAdminsController.restoreAdmin.bind(SystemAdminsController)
);

module.exports = router;
