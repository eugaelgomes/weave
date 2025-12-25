const express = require("express");
const organizationsController = require("@/controllers/organizations/organization-controller");
const { verifyToken } = require("@/middlewares/auth/auth-middleware");
const upload = require("@/middlewares/data/profile-img");
const validateImageMVP = require("@/middlewares/data/image-validator");

const router = express.Router();

router.use(verifyToken);

// ========================================
// ROTAS DA ORGANIZAÇÃO DO USUÁRIO
// (Um usuário pode ter apenas uma organização)
// ========================================

// Buscar a organização do usuário
router.get(
  "/",
  organizationsController.getOrganization.bind(organizationsController)
);

// Criar uma nova organização (apenas se não tiver uma)
router.post(
  "/",
  organizationsController.createOrganization.bind(organizationsController)
);

// Atualizar a organização do usuário
router.put(
  "/",
  organizationsController.updateOrganization.bind(organizationsController)
);

// Atualizar apenas as properties da organização
router.patch(
  "/properties",
  organizationsController.updateOrganizationProperties.bind(
    organizationsController
  )
);

// Deletar a organização do usuário (soft delete)
router.delete(
  "/",
  organizationsController.deleteOrganization.bind(organizationsController)
);

// Restaurar a organização deletada
router.post(
  "/restore",
  organizationsController.restoreOrganization.bind(organizationsController)
);

// ========================================
// ROTAS DE GERENCIAMENTO DE MEMBROS
// ========================================

// Listar todos os membros da organização
router.get(
  "/members",
  organizationsController.getMembers.bind(organizationsController)
);

// Adicionar um membro à organização
router.post(
  "/members",
  organizationsController.addMember.bind(organizationsController)
);

// Remover um membro da organização
router.delete(
  "/members/:memberId",
  organizationsController.removeMember.bind(organizationsController)
);

// ========================================
// ROTAS DE UPLOAD DE IMAGENS
// ========================================

// Upload do logo da organização
router.post(
  "/logo",
  upload.single("image"),
  validateImageMVP,
  organizationsController.uploadLogo.bind(organizationsController)
);

// Upload do banner da organização
router.post(
  "/banner",
  upload.single("image"),
  validateImageMVP,
  organizationsController.uploadBanner.bind(organizationsController)
);

module.exports = router;
