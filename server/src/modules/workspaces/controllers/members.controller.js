/**
 * @typedef {import('express').Request} Request
 * @typedef {import('express').Response} Response
 * @typedef {import('./base-controller').AuthenticatedRequest} AuthenticatedRequest
 */

const { fromUnknown } = require("@/errors");
const WorkspacesBaseController = require("./base-controller");
const SearchUsersRepository = require("@/modules/users/repositories/search-users.repository");
const { memberListResponseSchema } = require("../schemas/members.schema");

const { send_workspace_invite } = require("@/services/email/templates/invite-member");
const { getUserEmailLocale } = require("@/services/email/i18n");

const { WORKSPACE_ROLES } = require("@/modules/workspaces/workspace-role-policy");

const MAX_SUPER_ADMINS = 3;

class WorkspaceMembersController extends WorkspacesBaseController {
  constructor() {
    super();
    this.areasRepository = areasRepository;
  }

  async _ensureCanManageMembers(currentWorkspace, res) {
    if (
      !this._ensureOrgPermission(currentWorkspace, this._workspacePermissions.MANAGE_MEMBERS, res)
    ) {
      return false;
    }
    return true;
  }

  async _ensureSuperAdminLimit(workspaceId, nextRole, res) {
    if (nextRole !== WORKSPACE_ROLES.SUPER_ADMIN) return true;
    const total = await this.workspacesRepository.countActiveMembersByRole(
      workspaceId,
      WORKSPACE_ROLES.SUPER_ADMIN
    );
    if (total >= MAX_SUPER_ADMINS) {
      res.status(400).json({
        error: `Limit of ${MAX_SUPER_ADMINS} super admins per workspace reached`,
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
    if (normalizedRole === "PROJECT_MANAGER") return WORKSPACE_ROLES.ADMIN;
    if (normalizedRole === "CONTRIBUTOR") return WORKSPACE_ROLES.MEMBER;
    return WORKSPACE_ROLES.GUEST;
  }

  /**
   * Update a member's role in the workspace
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

      const currentWorkspace = await this._getUserWorkspace(authUserId);
      if (!currentWorkspace) {
        return res.status(404).json({ error: "Workspace not found" });
      }

      if (!(await this._ensureCanManageMembers(currentWorkspace, res))) {
        return;
      }

      if (!(await this._ensureSuperAdminLimit(currentWorkspace.id, role, res))) {
        return;
      }

      if (currentWorkspace.user_id === memberId) {
        return res.status(400).json({ error: "Cannot change the workspace owner's role" });
      }

      await this.workspacesRepository.updateMemberRole(currentWorkspace.id, memberId, role);

      res.status(200).json({
        data: { role },
        message: "Role updated successfully",
        status: "OK",
      });
    } catch (error) {
      console.error("Error updating member role:", error);
      res.status(500).json({ error: "Error updating member role" });
    }
  }

  /**
   * Remove a member from the workspace
   * @param {Request & AuthenticatedRequest} req
   * @param {Response} res
   * @returns {Promise<void|Response>}
   */
  async removeMember(req, res, next) {
    try {
      const userId = this._validateAuthentication(req, res);
      if (!userId) return;

      const { memberId } = req.params;

      const currentWorkspace = await this._getUserWorkspace(userId);
      if (!currentWorkspace) {
        return res.status(404).json({ error: "Workspace not found", success: false });
      }

      if (!(await this._ensureCanManageMembers(currentWorkspace, res))) {
        return;
      }

      if (String(currentWorkspace.user_id) === String(memberId)) {
        return res.status(400).json({
          error: "Cannot remove the workspace owner",
          success: false,
        });
      }

      // ADMIN/SUPER_ADMIN must always keep their workspace-level record.
      // They need to be demoted first before removal.
      const targetMember = await this.workspacesRepository.getWorkspaceMember(
        currentWorkspace.id,
        memberId
      );
      if (targetMember && ["ADMIN", "SUPER_ADMIN"].includes(targetMember.role)) {
        return res.status(400).json({
          error: "Cannot remove an administrator. Change role to MEMBER before removing.",
          success: false,
        });
      }

      const removed = await this.workspacesRepository.removeWorkspaceMember(
        currentWorkspace.id,
        memberId
      );
      if (!removed) {
        return res.status(404).json({ error: "Member not found", success: false });
      }

      res.status(200).json({
        data: removed,
        message: "Member removed successfully",
        status: "OK",
      });
    } catch (error) {
      console.error("Error removing member:", error);
      return next(fromUnknown(error));
    }
  }

  /**
   * Get all members of the workspace
   * @param {Request & AuthenticatedRequest} req
   * @param {Response} res
   * @returns {Promise<void|Response>}
   */
  async getMembers(req, res) {
    try {
      const userId = this._validateAuthentication(req, res);
      if (!userId) return;

      const currentWorkspace = await this._getUserWorkspace(userId);
      if (!currentWorkspace) {
        return res.status(404).json({ error: "Workspace not found", success: false });
      }

      if (
        !this._ensureOrgPermission(
          currentWorkspace,
          this._workspacePermissions.VIEW_MEMBER_DIRECTORY,
          res
        )
      ) {
        return;
      }

      const members = await this.workspacesRepository.getWorkspaceMembers(currentWorkspace.id);

      res.status(200).json({
        count: members.length,
        count_by_role: members.reduce((acc, member) => {
          acc[member.role] = (acc[member.role] || 0) + 1;
          return acc;
        }, {}),
        count_by_status: members.reduce((acc, member) => {
          acc[member.status] = (acc[member.status] || 0) + 1;
          return acc;
        }, {}),
        list_workspace_members: memberListResponseSchema.parse(members),
        status: "OK",

        workspace_id: currentWorkspace.id,
      });
    } catch (error) {
      console.error("Error fetching members:", error);
      res.status(500).json({ error: "Error fetching members", status: "ERROR" });
    }
  }

  /**
   * Invite a new member to the workspace
   * @param {Request & AuthenticatedRequest} req
   * @param {Response} res
   * @returns {Promise<void|Response>}
   */
  async inviteMember(req, res) {
    try {
      const authUserId = this._validateAuthentication(req, res);
      if (!authUserId) return;

      const { email, role = WORKSPACE_ROLES.MEMBER, name, username, target_areas = [] } = req.body;

      const normalizedRole = typeof role === "string" ? role.trim().toUpperCase() : "";

      const currentWorkspace = await this._getUserWorkspace(authUserId);
      if (!currentWorkspace) {
        return res.status(404).json({ error: "Workspace not found" });
      }

      if (!(await this._ensureCanManageMembers(currentWorkspace, res))) {
        return;
      }

      if (!(await this._ensureSuperAdminLimit(currentWorkspace.id, normalizedRole, res))) {
        return;
      }

      const validTargetAreas = [];
      for (const tArea of target_areas) {
        if (!tArea.area_id) continue;
        const team = await this.teamsRepository.getAreaById(tArea.area_id, currentWorkspace.id);
        if (!team) return res.status(404).json({ error: `Team not found: ${tArea.area_id}` });

        const resolvedProjectRole = this._resolveProjectMemberRole(tArea.role);
        validTargetAreas.push({
          area_id: tArea.area_id,
          role: resolvedProjectRole,
        });
      }

      const existingUsers = await SearchUsersRepository.findByUsernameOrEmail("", email);
      const targetUser = existingUsers.find((u) => u.email === email);

      if (targetUser) {
        const isMember = await this.workspacesRepository.isMember(
          currentWorkspace.id,
          targetUser.user_id
        );
        if (isMember) {
          return res.status(400).json({
            error: "This user is already a member of the workspace",
          });
        }
      }

      const usedName = name.trim();
      const invite = await this.workspacesRepository.createOrgInvite(
        currentWorkspace.id,
        email,
        normalizedRole,
        authUserId,
        usedName,
        username || null,
        validTargetAreas
      );

      const inviter = await SearchUsersRepository.findById(authUserId);
      const inviterLocale = await getUserEmailLocale({ userId: authUserId });

      // Send the invite email
      const emailResult = await send_workspace_invite(
        email,
        currentWorkspace.workspace_name,
        inviter.name || inviter.username,
        invite.invite_id,
        normalizedRole,
        inviterLocale
      );

      if (!emailResult.success) {
        console.warn("Failed to send invite email:", emailResult.error);
      }

      res.status(201).json({
        data: {
          email: invite.email,
          expires_at: invite.expires_at,
          invite_id: invite.invite_id,
          role: invite.role,
          target_areas: invite.target_areas,
        },
        message: "Invite sent successfully.",
        status: "OK",
      });
    } catch (error) {
      console.error("Error inviting member:", error);
      res.status(500).json({ error: "Error processing member" });
    }
  }

  /**
   * Bulk invite members
   * @param {Request & AuthenticatedRequest} req
   * @param {Response} res
   */
  async inviteMembersBulk(req, res) {
    try {
      const authUserId = this._validateAuthentication(req, res);
      if (!authUserId) return;

      const { invites } = req.body;

      const currentWorkspace = await this._getUserWorkspace(authUserId);
      if (!currentWorkspace) {
        return res.status(404).json({ error: "Workspace not found" });
      }

      if (!(await this._ensureCanManageMembers(currentWorkspace, res))) {
        return;
      }

      const inviter = await SearchUsersRepository.findById(authUserId);
      const inviterLocale = await getUserEmailLocale({ userId: authUserId });

      const results = {
        failed: [],
        successful: [],
      };

      for (const inviteData of invites) {
        const {
          email,
          role = WORKSPACE_ROLES.MEMBER,
          name,
          username,
          target_areas = [],
        } = inviteData;

        try {
          const normalizedRole = typeof role === "string" ? role.trim().toUpperCase() : "";

          const existingUsers = await SearchUsersRepository.findByUsernameOrEmail("", email);
          const targetUser = existingUsers.find((u) => u.email === email);
          if (targetUser) {
            const isMember = await this.workspacesRepository.isMember(
              currentWorkspace.id,
              targetUser.user_id
            );
            if (isMember) {
              throw new Error("Already a member");
            }
          }

          // Validate teams
          const validTargetAreas = [];
          for (const tArea of target_areas) {
            if (!tArea.area_id) continue;
            const team = await this.teamsRepository.getAreaById(tArea.area_id, currentWorkspace.id);
            if (team) {
              const resolvedRole = this._resolveProjectMemberRole(tArea.role);
              validTargetAreas.push({
                area_id: tArea.area_id,
                role: resolvedRole,
              });
            }
          }

          const invite = await this.workspacesRepository.createOrgInvite(
            currentWorkspace.id,
            email,
            normalizedRole,
            authUserId,
            name?.trim() || null,
            username || null,
            validTargetAreas
          );

          await send_workspace_invite(
            email,
            currentWorkspace.workspace_name,
            inviter.name || inviter.username,
            invite.invite_id,
            normalizedRole,
            inviterLocale
          );

          results.successful.push({ email, invite_id: invite.invite_id });
        } catch (err) {
          results.failed.push({ email, reason: err.message });
        }
      }

      res.status(201).json({
        data: results,
        message: "Bulk invite processed",
        status: "OK",
      });
    } catch (error) {
      console.error("Error in bulk invite:", error);
      res.status(500).json({ error: "Error processing bulk invites" });
    }
  }
}

module.exports = new WorkspaceMembersController();
