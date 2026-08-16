const express = require("express");

// Controllers
const organizationsController = require("@/modules/organizations/controllers/organizations.controller");
const organizationMembersController = require("@/modules/organizations/controllers/members.controller");
const organizationAreasController = require("@/modules/organizations/controllers/areas.controller");
const organizationDomainsController = require("@/modules/organizations/controllers/domains.controller");
const organizationCreationStepsController = require("@/modules/organizations/controllers/creation-steps.controller");

// Middlewares
const { verifyToken } = require("@/middlewares/auth/verify-token");
const {
  structuralLimiter,
  standardTrafficLimiter,
  highTrafficLimiter,
} = require("@/middlewares/security/request-limiters");

// Utils
const upload = require("@/utils/data/profile-img");
const validateImages = require("@/utils/image-validator");
const { validate } = require("@/middlewares/validation/validate");

// Schemas
const {
  createOrganizationSchema,
  updateOrganizationSchema,
} = require("./schemas/organizations.schema");
const {
  inviteMemberSchema,
  inviteMembersBulkSchema,
  acceptInviteSchema,
  updateMemberRoleSchema,
} = require("./schemas/members.schema");
const {
  createAreaSchema,
  updateAreaSchema,
  addAreaMemberSchema,
  updateAreaMemberSchema,
} = require("./schemas/areas.schema");
const { createDomainSchema, updateSsoSettingsSchema } = require("./schemas/domains.schema");
const { saveStepOneSchema } = require("./schemas/creation-steps.schema");

const router = express.Router();

router.get(
  "/invites/preview",
  standardTrafficLimiter,
  organizationMembersController.previewInvite.bind(organizationMembersController)
);

router.post(
  "/invites/accept",
  standardTrafficLimiter,
  upload.single("profileImage"),
  validateImages,
  validate(acceptInviteSchema, "body"),
  organizationMembersController.acceptInvite.bind(organizationMembersController)
);

router.use(verifyToken);

router.get(
  "/",
  highTrafficLimiter,
  organizationsController.getOrganization.bind(organizationsController)
);

router.get(
  "/domains",
  structuralLimiter,
  organizationDomainsController.listDomains.bind(organizationDomainsController)
);

router.post(
  "/domains",
  structuralLimiter,
  validate(createDomainSchema, "body"),
  organizationDomainsController.createDomain.bind(organizationDomainsController)
);

router.post(
  "/domains/:domainId/verify",
  structuralLimiter,
  organizationDomainsController.verifyDomain.bind(organizationDomainsController)
);

router.delete(
  "/domains/:domainId",
  structuralLimiter,
  organizationDomainsController.deleteDomain.bind(organizationDomainsController)
);

router.patch(
  "/domains/:domainId/sso",
  structuralLimiter,
  validate(updateSsoSettingsSchema, "body"),
  organizationDomainsController.updateSsoSettings.bind(organizationDomainsController)
);

// ------ Areas Routes ------
router.get(
  "/areas",
  highTrafficLimiter,
  organizationAreasController.listAreas.bind(organizationAreasController)
);

router.post(
  "/areas",
  structuralLimiter,
  validate(createAreaSchema, "body"),
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
  validate(updateAreaSchema, "body"),
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
  validate(addAreaMemberSchema, "body"),
  organizationAreasController.addAreaMember.bind(organizationAreasController)
);

router.patch(
  "/areas/:areaId/members/:memberId",
  structuralLimiter,
  validate(updateAreaMemberSchema, "body"),
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
  validate(createOrganizationSchema, "body"),
  // Keep POST /organizations aligned with step-1 onboarding contract.
  organizationCreationStepsController.saveStepOne.bind(organizationCreationStepsController)
);

router.get(
  "/creation-steps/step-1",
  highTrafficLimiter,
  organizationCreationStepsController.getStepOne.bind(organizationCreationStepsController)
);

router.post(
  "/creation-steps/step-1",
  structuralLimiter,
  validate(saveStepOneSchema, "body"),
  organizationCreationStepsController.saveStepOne.bind(organizationCreationStepsController)
);

router.post(
  "/creation-steps/step-1/complete",
  structuralLimiter,
  organizationCreationStepsController.completeStepOne.bind(organizationCreationStepsController)
);

router.put(
  "/",
  structuralLimiter,
  validate(updateOrganizationSchema, "body"),
  organizationsController.updateOrganization.bind(organizationsController)
);

router.patch(
  "/properties",
  organizationsController.updateOrganizationProperties.bind(organizationsController)
);

router.delete("/", organizationsController.deleteOrganization.bind(organizationsController));

router.post("/restore", organizationsController.restoreOrganization.bind(organizationsController));

router.get(
  "/members",
  organizationMembersController.getMembers.bind(organizationMembersController)
);

router.patch(
  "/members/:memberId",
  validate(updateMemberRoleSchema, "body"),
  organizationMembersController.updateMemberRole.bind(organizationMembersController)
);

router.delete(
  "/members/:memberId",
  organizationMembersController.removeMember.bind(organizationMembersController)
);

router.post(
  "/invites",
  validate(inviteMemberSchema, "body"),
  organizationMembersController.inviteMember.bind(organizationMembersController)
);

router.post(
  "/invites/bulk",
  validate(inviteMembersBulkSchema, "body"),
  organizationMembersController.inviteMembersBulk.bind(organizationMembersController)
);

router.post(
  "/invites/:invite_id/resend",
  organizationMembersController.resendInvite.bind(organizationMembersController)
);

router.get(
  "/invites",
  organizationMembersController.getPendingInvites.bind(organizationMembersController)
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
