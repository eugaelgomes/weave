const express = require("express");

// Controllers
const { workspacesController } = require("@/modules/workspaces/controllers/base-controller");
const workspaceMembersController = require("@/modules/workspaces/controllers/members.controller");
const workspaceTeamsController = require("@/modules/workspaces/controllers/teams.controller");
const workspaceSettingsController = require("@/modules/workspaces/controllers/settings.controller");
const workspaceRolesController = require("@/modules/workspaces/controllers/roles.controller");
const userDataController = require("@/modules/users/controllers/user-data.controller");

// Middlewares
const { verifyToken } = require("@/middlewares/auth/verify-token");
const {
  structuralLimiter,
  standardTrafficLimiter,
  highTrafficLimiter,
} = require("@/middlewares/security/request-limiters");

// Utils
const { multipartImageUpload } = require("@/utils/middlewares.util");
const { validateImageMimeAndSize } = require("@/utils/middlewares.util");
const { validate } = require("@/middlewares/validation/validate");

// Schemas
const {
  createOrganizationSchema,
  updateOrganizationSchema,
} = require("./schemas/workspaces.schema");
const {
  inviteMemberSchema,
  inviteMembersBulkSchema,
  updateMemberRoleSchema,
} = require("./schemas/members.schema");
const {
  createAreaSchema,
  updateAreaSchema,
  addAreaMemberSchema,
  updateAreaMemberSchema,
} = require("./schemas/teams.schema");
const { createDomainSchema, updateSsoSettingsSchema } = require("./schemas/domains.schema");
const { saveStepOneSchema } = require("./schemas/creation-steps.schema");

const router = express.Router();

router.use(verifyToken);

router.get(
  "/my-workspaces",
  highTrafficLimiter,
  userDataController.listMyOrganizations.bind(userDataController)
);

router.post(
  "/switch",
  standardTrafficLimiter,
  userDataController.switchOrganization.bind(userDataController)
);

router.get(
  "/",
  highTrafficLimiter,
  workspacesController.getOrganization.bind(workspacesController)
);

router.get(
  "/domains",
  structuralLimiter,
  workspaceSettingsController.listDomains.bind(workspaceSettingsController)
);

router.post(
  "/domains",
  structuralLimiter,
  validate(createDomainSchema, "body"),
  workspaceSettingsController.createDomain.bind(workspaceSettingsController)
);

router.post(
  "/domains/:domainId/verify",
  structuralLimiter,
  workspaceSettingsController.verifyDomain.bind(workspaceSettingsController)
);

router.delete(
  "/domains/:domainId",
  structuralLimiter,
  workspaceSettingsController.deleteDomain.bind(workspaceSettingsController)
);

router.patch(
  "/domains/:domainId/sso",
  structuralLimiter,
  validate(updateSsoSettingsSchema, "body"),
  workspaceSettingsController.updateSsoSettings.bind(workspaceSettingsController)
);

// ------ Teams Routes ------
router.get(
  "/teams",
  highTrafficLimiter,
  workspaceTeamsController.listTeams.bind(workspaceTeamsController)
);

router.post(
  "/teams",
  structuralLimiter,
  validate(createAreaSchema, "body"), // TODO rename schema validations to team
  workspaceTeamsController.createTeam.bind(workspaceTeamsController)
);

router.get(
  "/teams/:teamId",
  highTrafficLimiter,
  workspaceTeamsController.getTeam.bind(workspaceTeamsController)
);

router.put(
  "/teams/:teamId",
  structuralLimiter,
  validate(updateAreaSchema, "body"),
  workspaceTeamsController.updateTeam.bind(workspaceTeamsController)
);

router.delete(
  "/teams/:teamId",
  structuralLimiter,
  workspaceTeamsController.deleteTeam.bind(workspaceTeamsController)
);

router.get(
  "/teams/:teamId/members",
  highTrafficLimiter,
  workspaceTeamsController.listTeamMembers.bind(workspaceTeamsController)
);

router.post(
  "/teams/:teamId/members",
  structuralLimiter,
  validate(addAreaMemberSchema, "body"),
  workspaceTeamsController.addTeamMember.bind(workspaceTeamsController)
);

router.patch(
  "/teams/:teamId/members/:memberId",
  structuralLimiter,
  validate(updateAreaMemberSchema, "body"),
  workspaceTeamsController.updateTeamMember.bind(workspaceTeamsController)
);

router.delete(
  "/teams/:teamId/members/:memberId",
  structuralLimiter,
  workspaceTeamsController.removeTeamMember.bind(workspaceTeamsController)
);

router.post(
  "/",
  structuralLimiter,
  validate(createOrganizationSchema, "body"),
  workspaceSettingsController.saveStepOne.bind(workspaceSettingsController)
);

router.get(
  "/creation-steps/step-1",
  highTrafficLimiter,
  workspaceSettingsController.getStepOne.bind(workspaceSettingsController)
);

router.post(
  "/creation-steps/step-1",
  structuralLimiter,
  validate(saveStepOneSchema, "body"),
  workspaceSettingsController.saveStepOne.bind(workspaceSettingsController)
);

router.post(
  "/creation-steps/step-1/complete",
  structuralLimiter,
  workspaceSettingsController.completeStepOne.bind(workspaceSettingsController)
);

router.put(
  "/",
  structuralLimiter,
  validate(updateOrganizationSchema, "body"),
  workspacesController.updateOrganization.bind(workspacesController)
);

router.patch(
  "/properties",
  workspacesController.updateOrganizationProperties.bind(workspacesController)
);

router.delete("/", workspacesController.deleteOrganization.bind(workspacesController));

router.post("/restore", workspacesController.restoreOrganization.bind(workspacesController));

// ------ Roles Routes (RBAC) ------
router.get(
  "/roles/catalog",
  highTrafficLimiter,
  workspaceRolesController.getPermissionsCatalog.bind(workspaceRolesController)
);

router.get(
  "/roles",
  highTrafficLimiter,
  workspaceRolesController.listRoles.bind(workspaceRolesController)
);

router.post(
  "/roles",
  structuralLimiter,
  workspaceRolesController.createRole.bind(workspaceRolesController)
);

router.put(
  "/roles/:roleId",
  structuralLimiter,
  workspaceRolesController.updateRole.bind(workspaceRolesController)
);

router.delete(
  "/roles/:roleId",
  structuralLimiter,
  workspaceRolesController.deleteRole.bind(workspaceRolesController)
);

router.get(
  "/members",
  workspaceMembersController.getMembers.bind(workspaceMembersController)
);

router.patch(
  "/members/:memberId",
  validate(updateMemberRoleSchema, "body"),
  workspaceMembersController.updateMemberRole.bind(workspaceMembersController)
);

router.delete(
  "/members/:memberId",
  workspaceMembersController.removeMember.bind(workspaceMembersController)
);

router.post(
  "/invites",
  validate(inviteMemberSchema, "body"),
  workspaceMembersController.inviteMember.bind(workspaceMembersController)
);

router.post(
  "/invites/bulk",
  validate(inviteMembersBulkSchema, "body"),
  workspaceMembersController.inviteMembersBulk.bind(workspaceMembersController)
);

router.put(
  "/logo",
  multipartImageUpload.single("image"),
  validateImageMimeAndSize,
  workspacesController.uploadLogo.bind(workspacesController)
);

router.put(
  "/banner",
  multipartImageUpload.single("image"),
  validateImageMimeAndSize,
  workspacesController.uploadBanner.bind(workspacesController)
);

router.get(
  "/workspace-projects",
  workspacesController.organizationProjects.bind(workspacesController)
);

module.exports = router;
