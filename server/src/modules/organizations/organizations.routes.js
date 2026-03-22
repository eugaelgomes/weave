const express = require("express");
const organizationsController = require("@/modules/organizations/controllers/organizations.controller");
const organizationMembersController = require("@/modules/organizations/controllers/members.controller");
const organizationAreasController = require("@/modules/organizations/controllers/areas.controller");
const { verifyToken } = require("@/middlewares/verify-token");
const upload = require("@/utils/data/profile-img");
const validateImages = require("@/utils/image-validator");
const {
  structuralLimiter,
  standardTrafficLimiter,
  highTrafficLimiter,
} = require("@/middlewares/request-limiters");

const router = express.Router();

router.post(
  "/invites/accept",
  standardTrafficLimiter,
  upload.single("profileImage"),
  validateImages,
  organizationMembersController.acceptInvite.bind(organizationMembersController)
);

router.use(verifyToken);

router.get(
  "/",
  highTrafficLimiter,
  organizationsController.getOrganization.bind(organizationsController)
);

router.get(
  "/areas",
  highTrafficLimiter,
  organizationAreasController.listAreas.bind(organizationAreasController)
);

router.post(
  "/areas",
  structuralLimiter,
  organizationAreasController.createArea.bind(organizationAreasController)
);

router.get(
  "/areas/:areaId",
  highTrafficLimiter,
  organizationAreasController.getArea.bind(organizationAreasController)
);

router.put(
  "/areas/:areaId",
  structuralLimiter,
  organizationAreasController.updateArea.bind(organizationAreasController)
);

router.delete(
  "/areas/:areaId",
  structuralLimiter,
  organizationAreasController.deleteArea.bind(organizationAreasController)
);

router.get(
  "/areas/:areaId/members",
  highTrafficLimiter,
  organizationAreasController.listAreaMembers.bind(organizationAreasController)
);

router.post(
  "/areas/:areaId/members",
  structuralLimiter,
  organizationAreasController.addAreaMember.bind(organizationAreasController)
);

router.patch(
  "/areas/:areaId/members/:memberId",
  structuralLimiter,
  organizationAreasController.updateAreaMember.bind(organizationAreasController)
);

router.delete(
  "/areas/:areaId/members/:memberId",
  structuralLimiter,
  organizationAreasController.removeAreaMember.bind(organizationAreasController)
);

router.post(
  "/",
  structuralLimiter,
  organizationsController.createOrganization.bind(organizationsController)
);

router.put(
  "/",
  structuralLimiter,
  organizationsController.updateOrganization.bind(organizationsController)
);

router.patch(
  "/properties",
  organizationsController.updateOrganizationProperties.bind(
    organizationsController
  )
);

router.delete(
  "/",
  organizationsController.deleteOrganization.bind(organizationsController)
);

router.post(
  "/restore",
  organizationsController.restoreOrganization.bind(organizationsController)
);

router.get(
  "/members",
  organizationMembersController.getMembers.bind(organizationMembersController)
);

router.post(
  "/members",
  organizationMembersController.addMember.bind(organizationMembersController)
);

router.delete(
  "/members/:memberId",
  organizationMembersController.removeMember.bind(organizationMembersController)
);

router.post(
  "/invites",
  organizationMembersController.inviteMember.bind(organizationMembersController)
);

router.get(
  "/invites",
  organizationMembersController.getPendingInvites.bind(
    organizationMembersController
  )
);

router.delete(
  "/invites/:invite_id",
  organizationMembersController.cancelInvite.bind(organizationMembersController)
);

router.put(
  "/logo",
  upload.single("image"),
  validateImages,
  organizationsController.uploadLogo.bind(organizationsController)
);

router.put(
  "/banner",
  upload.single("image"),
  validateImages,
  organizationsController.uploadBanner.bind(organizationsController)
);

router.get(
  "/organization-projects",
  organizationsController.organizationProjects.bind(organizationsController)
);

module.exports = router;
