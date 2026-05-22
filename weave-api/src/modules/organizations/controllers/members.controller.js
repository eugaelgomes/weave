/**
 * @typedef {import('express').Request} Request
 * @typedef {import('express').Response} Response
 * @typedef {import('./base-controller').AuthenticatedRequest} AuthenticatedRequest
 */

const { fromUnknown } = require("@/errors");
const OrganizationsBaseController = require("./base-controller");
const CreateUsersRepository = require("@/modules/users/repositories/create-users.repository");
const UserDataRepository = require("@/modules/users/repositories/user-data.repository");
const SearchUsersRepository = require("@/modules/users/repositories/search-users.repository");
const UserTokensRepository = require("@/modules/users/repositories/user-tokens.repository");
const DeleteUsersRepository = require("@/modules/users/repositories/delete-users.repository");
const NotificationsRepository = require("@/modules/notifications/repositories/notifications.repository");
const areasRepository = require("@/modules/organizations/repositories/areas.repository");
const spacesService = require("@/services/storage");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const {
  send_organization_invite,
} = require("@/services/email/templates/invite-member");
const {
  send_organization_invite_accepted,
} = require("@/services/email/templates/invite-member-accepted");
const { getUserEmailLocale } = require("@/services/email/i18n");
const { validRoles } = require("../normalizer");
const { hasPlusAliasInLocalPart } = require("@/utils/data/email-rules");
const {
  ORG_ROLES,
} = require("@/modules/organizations/organization-role-policy");
const {
  buildUniqueConflictPayload,
  getUniqueFieldFromPgError,
} = require("@/modules/users/utils/unique-conflicts");

const PROJECT_MEMBER_ROLES = [
  "PROJECT_MANAGER",
  "CONTRIBUTOR",
  "COMMENTER",
  "VIEWER",
];
const MAX_SUPER_ADMINS = 3;

class OrganizationMembersController extends OrganizationsBaseController {
  constructor() {
    super();
    this.areasRepository = areasRepository;
  }

  async _ensureCanManageMembers(currentOrg, res) {
    if (
      !this._ensureOrgPermission(
        currentOrg,
        this._orgPermissions.MANAGE_MEMBERS,
        res
      )
    ) {
      return false;
    }
    return true;
  }

  async _ensureSuperAdminLimit(orgId, nextRole, res) {
    if (nextRole !== ORG_ROLES.SUPER_ADMIN) return true;
    const total = await this.organizationsRepository.countActiveMembersByRole(
      orgId,
      ORG_ROLES.SUPER_ADMIN
    );
    if (total >= MAX_SUPER_ADMINS) {
      res.status(400).json({
        error: `Limite de ${MAX_SUPER_ADMINS} super administradores por workspace foi atingido`,
      });
      return false;
    }
    return true;
  }

  _resolveProjectMemberRole(rawRole) {
    if (!rawRole || typeof rawRole !== "string") {
      return "CONTRIBUTOR";
    }
    return rawRole.trim().toUpperCase();
  }

  _mapProjectRoleToAreaRole(projectRole) {
    const normalizedRole = this._resolveProjectMemberRole(projectRole);
    if (normalizedRole === "PROJECT_MANAGER") return ORG_ROLES.ADMIN;
    if (normalizedRole === "CONTRIBUTOR") return ORG_ROLES.MEMBER;
    return ORG_ROLES.GUEST;
  }

  /**
   * Update a member's role in the organization
   * @param {Request & AuthenticatedRequest} req
   * @param {Response} res
   * @returns {Promise<void|Response>}
   */
  async updateMemberRole(req, res) {
    try {
      const authUserId = this._validateAuthentication(req, res);
      if (!authUserId) return;

      const { memberId } = req.params;
      const { role } = req.body;

      if (!validRoles.includes(role)) {
        return res.status(400).json({ error: "Invalid role" });
      }

      const currentOrg = await this._getUserOrganization(authUserId);
      if (!currentOrg) {
        return res.status(404).json({ error: "Organization not found" });
      }

      if (!(await this._ensureCanManageMembers(currentOrg, res))) {
        return;
      }

      if (!(await this._ensureSuperAdminLimit(currentOrg.id, role, res))) {
        return;
      }

      if (currentOrg.user_id === memberId) {
        return res
          .status(400)
          .json({ error: "Cannot change the organization owner's role" });
      }

      await this.organizationsRepository.updateMemberRole(
        currentOrg.id,
        memberId,
        role
      );

      res.status(200).json({
        status: "OK",
        message: "Role updated successfully",
        data: { role },
      });
    } catch (error) {
      console.error("Error updating member role:", error);
      res.status(500).json({ error: "Error updating member role" });
    }
  }

  /**
   * Remove a member from the organization
   * @param {Request & AuthenticatedRequest} req
   * @param {Response} res
   * @returns {Promise<void|Response>}
   */
  async removeMember(req, res, next) {
    try {
      const userId = this._validateAuthentication(req, res);
      if (!userId) return;

      const { memberId } = req.params;

      const currentOrg = await this._getUserOrganization(userId);
      if (!currentOrg) {
        return res
          .status(404)
          .json({ success: false, error: "Organization not found" });
      }

      if (!(await this._ensureCanManageMembers(currentOrg, res))) {
        return;
      }

      if (String(currentOrg.user_id) === String(memberId)) {
        return res.status(400).json({
          success: false,
          error: "Cannot remove the organization owner",
        });
      }

      const removed =
        await this.organizationsRepository.removeOrganizationMember(
          currentOrg.id,
          memberId
        );
      if (!removed) {
        return res
          .status(404)
          .json({ success: false, error: "Member not found" });
      }

      res.status(200).json({
        status: "OK",
        message: "Member removed successfully",
        data: removed,
      });
    } catch (error) {
      console.error("Error removing member:", error);
      return next(fromUnknown(error));
    }
  }

  /**
   * Get all members of the organization
   * @param {Request & AuthenticatedRequest} req
   * @param {Response} res
   * @returns {Promise<void|Response>}
   */
  async getMembers(req, res) {
    try {
      const userId = this._validateAuthentication(req, res);
      if (!userId) return;

      const currentOrg = await this._getUserOrganization(userId);
      if (!currentOrg) {
        return res
          .status(404)
          .json({ success: false, error: "Organization not found" });
      }

      if (
        !this._ensureOrgPermission(
          currentOrg,
          this._orgPermissions.VIEW_MEMBER_DIRECTORY,
          res
        )
      ) {
        return;
      }

      const members = await this.organizationsRepository.getOrganizationMembers(
        currentOrg.id
      );

      res.status(200).json({
        status: "OK",
        organization_id: currentOrg.id,
        count: members.length,
        count_by_role: members.reduce((acc, member) => {
          acc[member.role] = (acc[member.role] || 0) + 1;
          return acc;
        }, {}),
        count_by_status: members.reduce((acc, member) => {
          acc[member.status] = (acc[member.status] || 0) + 1;
          return acc;
        }, {}),
        count_by_suspended: members.reduce((acc, member) => {
          const key = member.suspended || false ? "suspended" : "active";
          acc[key] = (acc[key] || 0) + 1;
          return acc;
        }, {}),
        list_org_members: members.map((member) => ({
          member_data: {
            id: member.user_id,
            name: member.name,
            username: member.username,
            email: member.email,
            avatar_url: member.avatar_url || null,
            membership: {
              role: member.role,
              status: member.status,
              suspended: member.suspended,
              created_at: member.created_at,
              updated_at: member.updated_at,
            },
            activity: {
              notes_count: parseInt(member.notes_count, 10) || 0,
              projects: member.projects || [],
              areas: member.areas || [],
              last_login_at: member.last_login_at || null,
            },
            invited_by: member.invited_by
              ? {
                  id: member.invited_by,
                  name: member.inviter_name,
                  username: member.inviter_username,
                  avatar_url: member.inviter_avatar_url || null,
                }
              : null,
          },
        })),
      });
    } catch (error) {
      console.error("Error fetching members:", error);
      res
        .status(500)
        .json({ status: "ERROR", error: "Error fetching members" });
    }
  }

  /**
   * Invite a new member to the organization
   * @param {Request & AuthenticatedRequest} req
   * @param {Response} res
   * @returns {Promise<void|Response>}
   */
  async inviteMember(req, res) {
    try {
      const authUserId = this._validateAuthentication(req, res);
      if (!authUserId) return;

      const {
        email,
        role = ORG_ROLES.MEMBER,
        name,
        username,
        area_id,
        project_member_role,
      } = req.body;

      if (!email) {
        return res.status(400).json({ error: "Email is required" });
      }

      if (hasPlusAliasInLocalPart(email)) {
        return res.status(400).json({
          error:
            "Email addresses using a plus (+) alias in the local part are not allowed.",
        });
      }

      if (!name || typeof name !== "string" || !name.trim()) {
        return res.status(400).json({ error: "Name is required" });
      }

      const normalizedRole =
        typeof role === "string" ? role.trim().toUpperCase() : "";
      if (!validRoles.includes(normalizedRole)) {
        return res.status(400).json({
          error:
            "Invalid role. Valid roles: SUPER_ADMIN, ADMIN, BILLING_MANAGER, MEMBER, GUEST",
        });
      }

      const currentOrg = await this._getUserOrganization(authUserId);
      if (!currentOrg) {
        return res.status(404).json({ error: "Organization not found" });
      }

      if (!(await this._ensureCanManageMembers(currentOrg, res))) {
        return;
      }

      if (
        !(await this._ensureSuperAdminLimit(currentOrg.id, normalizedRole, res))
      ) {
        return;
      }

      const trimmedAreaId =
        typeof area_id === "string" ? area_id.trim() : "";
      if (!trimmedAreaId) {
        return res.status(400).json({ error: "area_id is required" });
      }

      let resolvedProjectMemberRole = null;
      if (trimmedAreaId) {
        const area = await this.areasRepository.getAreaById(
          trimmedAreaId,
          currentOrg.id
        );
        if (!area) return res.status(404).json({ error: "Area not found" });
        if (
          normalizedRole === ORG_ROLES.ADMIN ||
          normalizedRole === ORG_ROLES.SUPER_ADMIN
        ) {
          resolvedProjectMemberRole = "PROJECT_MANAGER";
        } else {
          resolvedProjectMemberRole =
            this._resolveProjectMemberRole(project_member_role);
          if (!PROJECT_MEMBER_ROLES.includes(resolvedProjectMemberRole)) {
            return res.status(400).json({
              error:
                "Invalid project_member_role. Use: PROJECT_MANAGER, CONTRIBUTOR, COMMENTER, VIEWER",
            });
          }
        }
      }

      const pending = await this.organizationsRepository.checkExistingInvite(
        currentOrg.id,
        email
      );
      if (pending) {
        return res.status(400).json({
          error: "There is already a pending invite for this email",
        });
      }

      const existingUsers = await SearchUsersRepository.findByUsernameOrEmail(
        "",
        email
      );
      const targetUser = existingUsers.find((u) => u.email === email);

      if (targetUser) {
        const isMember = await this.organizationsRepository.isMember(
          currentOrg.id,
          targetUser.user_id
        );
        if (isMember) {
          return res.status(400).json({
            error: "This user is already a member of the organization",
          });
        }
      }

      const usedName = name.trim();
      const invite = await this.organizationsRepository.createOrgInvite(
        currentOrg.id,
        email,
        normalizedRole,
        authUserId,
        usedName,
        username || null,
        trimmedAreaId,
        resolvedProjectMemberRole
      );

      const inviter = await SearchUsersRepository.findById(authUserId);
      const inviterLocale = await getUserEmailLocale({ userId: authUserId });

      // Send the invite email
      const emailResult = await send_organization_invite(
        email,
        currentOrg.org_name,
        inviter.name || inviter.username,
        invite.invite_id,
        normalizedRole,
        inviterLocale
      );

      if (!emailResult.success) {
        console.warn("Failed to send invite email:", emailResult.error);
      }

      res.status(201).json({
        status: "OK",
        message: "Invite sent successfully.",
        data: {
          invite_id: invite.invite_id,
          email: invite.email,
          role: invite.role,
          expires_at: invite.expires_at,
          area_id: invite.area_id || null,
          project_member_role: invite.project_member_role || null,
        },
      });
    } catch (error) {
      console.error("Error inviting member:", error);
      res.status(500).json({ error: "Error processing member" });
    }
  }

  /**
   * Public: load invite details for the accept-invite UI (token is the secret).
   * @param {Request} req
   * @param {Response} res
   * @returns {Promise<void|Response>}
   */
  async previewInvite(req, res) {
    try {
      let token = req.query.token;
      if (!token || typeof token !== "string") {
        return res.status(400).json({ error: "Token is required" });
      }

      // Extract the UUID part from the token to be forgiving of extra garbage characters (e.g. trailing quotes)
      const uuidMatch = token.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
      if (!uuidMatch) {
        return res.status(400).json({ error: "Invalid token format" });
      }
      token = uuidMatch[0];

      const invite =
        await this.organizationsRepository.findOrgInviteByToken(token);
      if (!invite) {
        return res.status(400).json({ error: "Invalid or expired invite" });
      }

      const existingUsers = await SearchUsersRepository.findByUsernameOrEmail(
        "",
        invite.email
      );
      const has_account = existingUsers.some((u) => u.email === invite.email);

      return res.status(200).json({
        status: "OK",
        data: {
          org_name: invite.org_name,
          org_logo_url: invite.logo_url ? spacesService.getFileUrl(invite.logo_url) : null,
          email: invite.email,
          role: invite.role,
          expires_at: invite.expires_at,
          has_account,
          invited_name: invite.name || null,
          area_id: invite.area_id || null,
          area_name: invite.area_name || null,
          project_member_role: invite.project_member_role || null,
        },
      });
    } catch (error) {
      console.error("Error previewing invite:", error);
      res.status(500).json({ error: "Error loading invite" });
    }
  }

  /**
   * Accept an organization invite
   * @param {Request & AuthenticatedRequest} req
   * @param {Response} res
   * @returns {Promise<void|Response>}
   */
  async acceptInvite(req, res) {
    try {
      let { token, name, username, password } = req.body;
      const authUserId = req.user?.userId;

      if (!token) {
        return res.status(400).json({ error: "Token is required" });
      }

      // Extract the UUID part from the token to be forgiving of extra garbage characters
      const uuidMatch = token.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i);
      if (!uuidMatch) {
        return res.status(400).json({ error: "Invalid token format" });
      }
      token = uuidMatch[0];

      const invite =
        await this.organizationsRepository.findOrgInviteByToken(token);
      if (!invite) {
        return res.status(400).json({ error: "Invalid or expired invite" });
      }

      const existingUsers = await SearchUsersRepository.findByUsernameOrEmail(
        "",
        invite.email
      );
      let targetUser = existingUsers.find((u) => u.email === invite.email);

      let targetUserId;

      if (!targetUser) {
        // User doesn't exist, we must create them now
        if (!name || !username || !password) {
          return res.status(400).json({
            error:
              "Name, username and password are required to accept the invite and create your account",
          });
        }

        const usernameAvailability =
          await SearchUsersRepository.checkUniqueAvailability({
            username,
          });
        if (!usernameAvailability.username.available) {
          return res.status(409).json(buildUniqueConflictPayload("username"));
        }

        const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS, 10) || 12;
        const hashedPassword = await bcrypt.hash(password, saltRounds);

        const createdUser = await CreateUsersRepository.createUser({
          name,
          username,
          email: invite.email,
          password: hashedPassword,
          private_profile: false,
        });

        targetUserId = createdUser[0].user_id;
        await UserTokensRepository.verifyUserEmail(targetUserId);

        if (req.file && req.file.buffer) {
          try {
            const saveResult = await spacesService.uploadProfileImage(
              req.file.buffer,
              req.file.mimetype,
              targetUserId
            );
            if (saveResult.success) {
              await UserDataRepository.updateProfileImage(
                targetUserId,
                saveResult.key
              );
            }
          } catch (imageError) {
            console.error("Error uploading image:", imageError);
          }
        }
      } else {
        // User already exists
        targetUserId = targetUser.user_id;

        if (authUserId && authUserId !== targetUserId) {
          return res.status(403).json({
            error:
              "You are logged in with a different account than the invited one.",
          });
        }

        if (!targetUser.email_verified && password) {
          // Verify their email if it wasn't, perhaps update their account
          const saltRounds = parseInt(process.env.BCRYPT_SALT_ROUNDS, 10) || 12;
          const hashedPassword = await bcrypt.hash(password, saltRounds);
          await UserDataRepository.updateUserPassword(
            targetUserId,
            hashedPassword
          );
          await UserTokensRepository.verifyUserEmail(targetUserId);
        }
      }

      await this.organizationsRepository.verifyOrgInvite(invite.invite_id);

      const isMember = await this.organizationsRepository.isMember(
        invite.organization_id,
        targetUserId
      );
      if (!isMember) {
        await this.organizationsRepository.addOrganizationMember(
          invite.organization_id,
          targetUserId,
          invite.role,
          "ACTIVE",
          invite.invited_by
        );
      }

      if (invite.area_id) {
        const areaRole = this._mapProjectRoleToAreaRole(
          invite.project_member_role
        );
        const existingAreaMember = await this.areasRepository.getAreaMember(
          invite.area_id,
          invite.organization_id,
          targetUserId
        );
        if (!existingAreaMember) {
          await this.areasRepository.addAreaMember(
            invite.area_id,
            invite.organization_id,
            targetUserId,
            areaRole,
            invite.invited_by
          );
        }
      }

      const frontendBase = process.env.FRONTEND_URL || "http://localhost:3000";
      const homePath = `${frontendBase}/app/home`;

      const confirmEmail = await send_organization_invite_accepted(
        invite.email,
        invite.org_name,
        homePath
      );
      if (!confirmEmail.success) {
        console.warn(
          "Failed to send invite-accepted email:",
          confirmEmail.error
        );
      }

      res.status(200).json({
        status: "OK",
        message: "Account activated and invite accepted successfully!",
        data: {
          organization: {
            id: invite.organization_id,
            name: invite.org_name,
          },
          role: invite.role,
          area_id: invite.area_id || null,
        },
      });
    } catch (error) {
      console.error("Error accepting invite:", error);
      const uniqueField = getUniqueFieldFromPgError(error);
      if (uniqueField) {
        return res.status(409).json(buildUniqueConflictPayload(uniqueField));
      }
      res.status(500).json({ error: "Error accepting invite" });
    }
  }
  /**
   * Get all invites of the organization
   * @param {Request & AuthenticatedRequest} req
   * @param {Response} res
   * @returns {Promise<void|Response>}
   */
  async getPendingInvites(req, res) {
    try {
      const userId = this._validateAuthentication(req, res);
      if (!userId) return;

      const currentOrg = await this._getUserOrganization(userId);
      if (!currentOrg) {
        return res.status(404).json({ error: "Organization not found" });
      }

      if (!(await this._ensureCanManageMembers(currentOrg, res))) {
        return;
      }

      const invites = await this.organizationsRepository.getAllOrgInvites(
        currentOrg.id
      );

      res.status(200).json({
        status: "OK",
        data: invites,
      });
    } catch (error) {
      console.error("Error fetching invites:", error);
      res.status(500).json({ error: "Error fetching invites" });
    }
  }

  /**
   * Cancel a pending invite
   * @param {Request & AuthenticatedRequest} req
   * @param {Response} res
   * @returns {Promise<void|Response>}
   */
  async cancelInvite(req, res) {
    try {
      const userId = this._validateAuthentication(req, res);
      if (!userId) return;

      const { invite_id } = req.params;
      const currentOrg = await this._getUserOrganization(userId);
      if (!currentOrg) {
        return res.status(404).json({ error: "Organization not found" });
      }

      if (!(await this._ensureCanManageMembers(currentOrg, res))) {
        return;
      }

      const invite =
        await this.organizationsRepository.findOrgInviteByToken(invite_id);
      if (!invite) {
        return res.status(404).json({ error: "Invite not found" });
      }

      if (String(invite.organization_id) !== String(currentOrg.id)) {
        return res
          .status(403)
          .json({ error: "No permission to cancel this invite" });
      }

      await this.organizationsRepository.deleteOrgInvite(invite_id);

      res.status(200).json({
        status: "OK",
        message: "Invite canceled successfully",
      });
    } catch (error) {
      console.error("Error canceling invite:", error);
      res.status(500).json({ error: "Error canceling invite" });
    }
  }
}

module.exports = new OrganizationMembersController();
