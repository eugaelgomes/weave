const express = require("express");
const organizationsController = require("@/modules/organizations/organizations.controller");
const { verifyToken } = require("@/middlewares/verify-token");
const upload = require("@/utils/data/profile-img");
const validateImages = require("@/utils/image-validator");
const { structuralLimiter, standardTrafficLimiter, highTrafficLimiter } = require("@/middlewares/request-limiters");

const router = express.Router();

router.post(
  "/invites/accept",
  standardTrafficLimiter,
  upload.single("profileImage"),
  validateImages,
  organizationsController.acceptInvite.bind(organizationsController)
);

router.use(verifyToken);

router.get(
  "/",
  highTrafficLimiter,
  organizationsController.getOrganization.bind(organizationsController)
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
  organizationsController.getMembers.bind(organizationsController)
);

router.post(
  "/members",
  organizationsController.addMember.bind(organizationsController)
);

router.delete(
  "/members/:memberId",
  organizationsController.removeMember.bind(organizationsController)
);

router.post(
  "/invites",
  organizationsController.inviteMember.bind(organizationsController)
);

router.get(
  "/invites",
  organizationsController.getPendingInvites.bind(organizationsController)
);

router.delete(
  "/invites/:invite_id",
  organizationsController.cancelInvite.bind(organizationsController)
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
