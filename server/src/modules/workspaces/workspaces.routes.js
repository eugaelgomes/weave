const express = require("express");

// Controllers
const { workspacesController } = require("@/modules/workspaces/controllers/base-controller");
const workspaceMembersController = require("@/modules/workspaces/controllers/members.controller");
const workspaceTeamsController = require("@/modules/workspaces/controllers/teams.controller");
const workspaceSettingsController = require("@/modules/workspaces/controllers/settings.controller");
const workspaceRolesController = require("@/modules/workspaces/controllers/roles.controller");
const WorkspaceTokensController = require("@/modules/workspaces/controllers/workspace-tokens.controller");
const UsersController = require("@/modules/users/controllers/users.controller");

// Middlewares
const { verifyToken } = require("@/middlewares/auth/verify-token");
const requireOnboarding = require("@/middlewares/auth/require-onboarding");
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
const { createWorkspaceSchema, updateWorkspaceSchema } = require("./schemas/base.schema");
const {
  inviteMemberSchema,
  inviteMembersBulkSchema,
  updateMemberRoleSchema,
} = require("./schemas/members.schema");
const {
  createTeamSchema,
  updateTeamSchema,
  addTeamMemberSchema,
  updateTeamMemberSchema,
} = require("./schemas/teams.schema");
const {
  createDomainSchema,
  updateSsoSettingsSchema,
  saveStepOneSchema,
} = require("./schemas/settings.schema");
const { createRoleSchema, updateRoleSchema } = require("./schemas/roles.schema");
const {
  workspaceTokenParamsSchema,
  createWorkspaceTokenSchema,
} = require("./schemas/workspace-tokens.schema");

const router = express.Router();

router.use(verifyToken, requireOnboarding);

router.get(
  ["/my-workspaces", "/my-workspaces"],
  highTrafficLimiter,
  UsersController.listMyWorkspaces.bind(UsersController)
);

router.post(
  "/switch",
  standardTrafficLimiter,
  UsersController.switchWorkspace.bind(UsersController)
);

router.get("/", highTrafficLimiter, workspacesController.getWorkspace.bind(workspacesController));

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

// ------ Workspace Tokens Routes ------
router.get(
  "/api-tokens/scopes",
  WorkspaceTokensController.getScopesInfo.bind(WorkspaceTokensController)
);
router.get(
  "/api-tokens/get-tokens",
  WorkspaceTokensController.listTokens.bind(WorkspaceTokensController)
);
router.post(
  "/api-tokens/create-token",
  validate(createWorkspaceTokenSchema, "body"),
  WorkspaceTokensController.createToken.bind(WorkspaceTokensController)
);
router.post(
  "/api-tokens/:id/revoke",
  validate(workspaceTokenParamsSchema, "params"),
  WorkspaceTokensController.revokeToken.bind(WorkspaceTokensController)
);

// ------ Teams Routes ------
router.get(
  ["/teams", "/areas"],
  highTrafficLimiter,
  workspaceTeamsController.listTeams.bind(workspaceTeamsController)
);

router.post(
  ["/teams", "/areas"],
  structuralLimiter,
  validate(createTeamSchema, "body"), // TODO rename schema validations to team
  workspaceTeamsController.createTeam.bind(workspaceTeamsController)
);

router.get(
  ["/teams/:teamId", "/areas/:teamId"],
  highTrafficLimiter,
  workspaceTeamsController.getTeam.bind(workspaceTeamsController)
);

router.put(
  ["/teams/:teamId", "/areas/:teamId"],
  structuralLimiter,
  validate(updateTeamSchema, "body"),
  workspaceTeamsController.updateTeam.bind(workspaceTeamsController)
);

router.delete(
  ["/teams/:teamId", "/areas/:teamId"],
  structuralLimiter,
  workspaceTeamsController.deleteTeam.bind(workspaceTeamsController)
);

router.get(
  ["/teams/:teamId/members", "/areas/:teamId/members"],
  highTrafficLimiter,
  workspaceTeamsController.listTeamMembers.bind(workspaceTeamsController)
);

router.post(
  ["/teams/:teamId/members", "/areas/:teamId/members"],
  structuralLimiter,
  validate(addTeamMemberSchema, "body"),
  workspaceTeamsController.addTeamMember.bind(workspaceTeamsController)
);

router.patch(
  ["/teams/:teamId/members/:memberId", "/areas/:teamId/members/:memberId"],
  structuralLimiter,
  validate(updateTeamMemberSchema, "body"),
  workspaceTeamsController.updateTeamMember.bind(workspaceTeamsController)
);

router.delete(
  ["/teams/:teamId/members/:memberId", "/areas/:teamId/members/:memberId"],
  structuralLimiter,
  workspaceTeamsController.removeTeamMember.bind(workspaceTeamsController)
);

router.post(
  "/",
  structuralLimiter,
  validate(createWorkspaceSchema, "body"),
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
  validate(updateWorkspaceSchema, "body"),
  workspacesController.updateWorkspace.bind(workspacesController)
);

router.patch(
  "/properties",
  workspacesController.updateWorkspaceProperties.bind(workspacesController)
);

router.delete("/", workspacesController.deleteWorkspace.bind(workspacesController));

router.post("/restore", workspacesController.restoreWorkspace.bind(workspacesController));

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
  validate(createRoleSchema, "body"),
  workspaceRolesController.createRole.bind(workspaceRolesController)
);

router.put(
  "/roles/:roleId",
  structuralLimiter,
  validate(updateRoleSchema, "body"),
  workspaceRolesController.updateRole.bind(workspaceRolesController)
);

router.delete(
  "/roles/:roleId",
  structuralLimiter,
  workspaceRolesController.deleteRole.bind(workspaceRolesController)
);

router.get("/members", workspaceMembersController.getMembers.bind(workspaceMembersController));

router.patch(
  "/members/:memberId",
  validate(updateMemberRoleSchema, "body"),
  workspaceMembersController.updateMemberRole.bind(workspaceMembersController)
);

router.delete(
  "/members/:memberId",
  workspaceMembersController.removeMember.bind(workspaceMembersController)
);

router.get("/invites", workspaceMembersController.listInvites.bind(workspaceMembersController));

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
  workspacesController.workspaceProjects.bind(workspacesController)
);

router.get(
  "/:workspacePublicId",
  highTrafficLimiter,
  workspacesController.getWorkspace.bind(workspacesController)
);

module.exports = router;
