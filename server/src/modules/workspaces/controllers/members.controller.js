/**
 * @typedef {import('express').Request} Request
 * @typedef {import('express').Response} Response
 * @typedef {import('./base-controller').AuthenticatedRequest} AuthenticatedRequest
 */

const { AppError, fromUnknown } = require("@/errors");
const WorkspacesBaseController = require("./base-controller");
const SearchUsersRepository = require("@/modules/users/repositories/users.repository");
const { memberListResponseSchema } = require("../schemas/members.schema");

const { send_workspace_invite } = require("@/services/email/templates/invite-member");
const { getUserEmailLocale } = require("@/services/email/i18n");
const teamsRepository = require("../repositories/teams.repository");
const membersRepository = require("../repositories/members.repository");

class WorkspaceMembersController extends WorkspacesBaseController {
  constructor() {
    super();
    this.membersRepository = membersRepository;
    this.workspacesRepository = membersRepository;
    this.teamsRepository = teamsRepository;
  }

  async _ensureCanManageMembers(currentWorkspace, res) {
    if (
      !this._ensureWorkspacePermission(
        currentWorkspace,
        this._workspacePermissions.MANAGE_MEMBERS,
        res
      )
    ) {
      return false;
    }
    return true;
  }

  /**
   * Update a member's role in the workspace
   * @param {Request & AuthenticatedRequest} req
   * @param {Response} res
   * @returns {Promise<void|Response>}
   */
  async updateMemberRole(req, res, next) {
    try {
      const authUserId = this._validateAuthentication(req, res);
      if (!authUserId) return;

      const { memberId } = req.params;
      const { roles } = req.body;

      const currentWorkspace = await this._getUserWorkspace(authUserId);
      if (!currentWorkspace) {
        throw AppError.notFound("Workspace not found");
      }

      if (!(await this._ensureCanManageMembers(currentWorkspace, res))) {
        return;
      }

      if (currentWorkspace.user_id === memberId) {
        throw AppError.badRequest("Cannot change the workspace owner's role");
      }

      await this.workspacesRepository.updateMemberRole(currentWorkspace.id, memberId, roles);

      res.status(200).json({
        data: { roles },
        message: "Role updated successfully",
        success: true,
      });
    } catch (error) {
      console.error("Error updating member role:", error);
      return next(fromUnknown(error));
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
        throw AppError.notFound("Workspace not found");
      }

      if (!(await this._ensureCanManageMembers(currentWorkspace, res))) {
        return;
      }

      if (String(currentWorkspace.user_id) === String(memberId)) {
        throw AppError.badRequest("Cannot remove the workspace owner");
      }

      // Administrators cannot be removed directly.
      // We rely on the repository's `removeWorkspaceMember` returning nothing if the member has `manage_workspace`.
      const targetMember = await this.workspacesRepository.getWorkspaceMember(
        currentWorkspace.id,
        memberId
      );
      if (!targetMember) {
        throw AppError.notFound("Member not found");
      }

      const removed = await this.workspacesRepository.removeWorkspaceMember(
        currentWorkspace.id,
        memberId
      );
      if (!removed) {
        throw AppError.notFound("Member not found");
      }

      res.status(200).json({
        data: removed,
        message: "Member removed successfully",
        success: true,
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
  async getMembers(req, res, next) {
    try {
      const userId = this._validateAuthentication(req, res);
      if (!userId) return;

      const currentWorkspace = await this._getUserWorkspace(userId);
      if (!currentWorkspace) {
        throw AppError.notFound("Workspace not found");
      }

      if (
        !this._ensureWorkspacePermission(
          currentWorkspace,
          this._workspacePermissions.VIEW_MEMBER_DIRECTORY,
          res
        )
      ) {
        return;
      }

      const { page = 1, limit = 50, search = "", role_id = null, status = null } = req.query;
      const parsedPage = parseInt(page, 10);
      const parsedLimit = parseInt(limit, 10);

      const members = await this.workspacesRepository.getWorkspaceMembers(currentWorkspace.id, {
        limit: parsedLimit,
        page: parsedPage,
        role_id,
        search,
        status,
      });

      const totalCount = members.length > 0 ? parseInt(members[0].total_count, 10) : 0;
      const totalPages = Math.ceil(totalCount / parsedLimit);

      const parsedMembers = memberListResponseSchema.parse(members);
      const countByRole = members.reduce((acc, member) => {
        (member.roles || []).forEach((role) => {
          acc[role] = (acc[role] || 0) + 1;
        });
        return acc;
      }, {});
      const countByStatus = members.reduce((acc, member) => {
        acc[member.status] = (acc[member.status] || 0) + 1;
        return acc;
      }, {});

      const payload = {
        count: members.length,
        count_by_role: countByRole,
        count_by_status: countByStatus,
        current_page: parsedPage,
        list_workspace_members: parsedMembers,
        list_workspace_members: parsedMembers,
        total_count: totalCount,
        total_pages: totalPages,
      };

      res.status(200).json({
        ...payload,
        data: payload,
        status: "OK",
        success: true,
        workspace_id: currentWorkspace.id,
      });
    } catch (error) {
      console.error("Error fetching members:", error);
      return next(fromUnknown(error));
    }
  }

  /**
   * List pending invites in the workspace
   */
  async listInvites(req, res, next) {
    try {
      const userId = this._validateAuthentication(req, res);
      if (!userId) return;

      const currentWorkspace = await this._getUserWorkspace(userId);
      if (!currentWorkspace) {
        throw AppError.notFound("Workspace not found");
      }

      const pendingUsers = await prisma.workspace_members.findMany({
        include: {
          users_workspace_members_user_idTousers: {
            select: {
              avatar_url: true,
              email: true,
              name: true,
              status: true,
              user_id: true,
              username: true,
            },
          },
          workspace_member_roles: {
            include: {
              workspace_roles: true,
            },
          },
        },
        where: {
          deleted: false,
          users_workspace_members_user_idTousers: {
            status: "PENDING_INVITE",
          },
          workspace_id: currentWorkspace.id,
        },
      });

      const formatted = pendingUsers.map((m) => ({
        created_at: m.created_at,
        email: m.users_workspace_members_user_idTousers.email,
        id: m.id,
        name: m.users_workspace_members_user_idTousers.name,
        roles: m.workspace_member_roles.map((r) => r.workspace_roles?.name).filter(Boolean),
        status: "pending",
        user_id: m.user_id,
      }));

      res.status(200).json({
        data: formatted,
        invites: formatted,
        status: "OK",
        success: true,
      });
    } catch (error) {
      next(fromUnknown(error));
    }
  }

  /**
   * Invite a new member to the workspace
   * @param {Request & AuthenticatedRequest} req
   * @param {Response} res
   * @returns {Promise<void|Response>}
   */
  async inviteMember(req, res, next) {
    try {
      const authUserId = this._validateAuthentication(req, res);
      if (!authUserId) return;

      const { email, roles, name, username, target_teams = [] } = req.body;

      // `inviteMemberSchema` accepts a list of workspace role UUIDs.  Reading the
      // old singular `role` property caused an empty role to reach the repository,
      // so the membership (and consequently the pending account used by SSO) was
      // never persisted.
      const normalizedRoles = roles.map((roleId) => roleId.trim());

      const currentWorkspace = await this._getUserWorkspace(authUserId);
      if (!currentWorkspace) {
        throw AppError.notFound("Workspace not found");
      }

      if (!(await this._ensureCanManageMembers(currentWorkspace, res))) {
        return;
      }

      const validTargetTeams = [];
      for (const tArea of target_teams) {
        if (!tArea.team_id) continue;
        const team = await this.teamsRepository.getTeamById(tArea.team_id, currentWorkspace.id);
        if (!team) throw AppError.notFound(`Team not found: ${tArea.team_id}`);

        validTargetTeams.push({
          role: tArea.role,
          team_id: tArea.team_id,
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
          throw AppError.badRequest("This user is already a member of the workspace");
        }
      }

      const usedName = name.trim();
      const invite = await this.workspacesRepository.createWorkspaceInvite(
        currentWorkspace.id,
        email,
        normalizedRoles,
        authUserId,
        usedName,
        username || null,
        validTargetTeams
      );

      const inviter = await SearchUsersRepository.findById(authUserId);
      const inviterLocale = await getUserEmailLocale({ userId: authUserId });

      // Send the invite email
      const emailResult = await send_workspace_invite(
        email,
        currentWorkspace.workspace_name,
        inviter.name || inviter.username,
        invite.invite_id,
        normalizedRoles[0],
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
          // Keep the legacy singular field for clients that display only the
          // primary role, while exposing every persisted workspace role.
          role: normalizedRoles[0],
          roles: invite.roles,
          target_teams: invite.target_teams,
        },
        message: "Invite sent successfully.",
        success: true,
      });
    } catch (error) {
      console.error("Error inviting member:", error);
      return next(fromUnknown(error));
    }
  }

  /**
   * Bulk invite members
   * @param {Request & AuthenticatedRequest} req
   * @param {Response} res
   */
  async inviteMembersBulk(req, res, next) {
    try {
      const authUserId = this._validateAuthentication(req, res);
      if (!authUserId) return;

      const { invites } = req.body;

      const currentWorkspace = await this._getUserWorkspace(authUserId);
      if (!currentWorkspace) {
        throw AppError.notFound("Workspace not found");
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
        const { email, roles, name, username, target_teams = [] } = inviteData;

        try {
          const normalizedRoles = roles.map((roleId) => roleId.trim());

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
          const validTargetTeams = [];
          for (const tArea of target_teams) {
            if (!tArea.team_id) continue;
            const team = await this.teamsRepository.getTeamById(tArea.team_id, currentWorkspace.id);
            if (team) {
              validTargetTeams.push({
                role: tArea.role,
                team_id: tArea.team_id,
              });
            }
          }

          const invite = await this.workspacesRepository.createWorkspaceInvite(
            currentWorkspace.id,
            email,
            normalizedRoles,
            authUserId,
            name?.trim() || null,
            username || null,
            validTargetTeams
          );

          await send_workspace_invite(
            email,
            currentWorkspace.workspace_name,
            inviter.name || inviter.username,
            invite.invite_id,
            normalizedRoles[0],
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
        success: true,
      });
    } catch (error) {
      console.error("Error in bulk invite:", error);
      return next(fromUnknown(error));
    }
  }
}

module.exports = new WorkspaceMembersController();
