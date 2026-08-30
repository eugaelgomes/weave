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

class WorkspaceMembersController extends WorkspacesBaseController {
  constructor() {
    super();
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
  async updateMemberRole(req, res) {
    try {
      const authUserId = this._validateAuthentication(req, res);
      if (!authUserId) return;

      const { memberId } = req.params;
      const { roles } = req.body;

      const currentWorkspace = await this._getUserWorkspace(authUserId);
      if (!currentWorkspace) {
        return res.status(404).json({ error: "Workspace not found" });
      }

      if (!(await this._ensureCanManageMembers(currentWorkspace, res))) {
        return;
      }

      if (currentWorkspace.user_id === memberId) {
        return res.status(400).json({ error: "Cannot change the workspace owner's role" });
      }

      await this.workspacesRepository.updateMemberRole(currentWorkspace.id, memberId, roles);

      res.status(200).json({
        data: { roles },
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

      // Administrators cannot be removed directly.
      // We rely on the repository's `removeWorkspaceMember` returning nothing if the member has `manage_workspace`.
      const targetMember = await this.workspacesRepository.getWorkspaceMember(
        currentWorkspace.id,
        memberId
      );
      if (!targetMember) {
        return res.status(404).json({ error: "Member not found", success: false });
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

      res.status(200).json({
        count: members.length,
        count_by_role: members.reduce((acc, member) => {
          (member.roles || []).forEach((role) => {
            acc[role] = (acc[role] || 0) + 1;
          });
          return acc;
        }, {}),
        count_by_status: members.reduce((acc, member) => {
          acc[member.status] = (acc[member.status] || 0) + 1;
          return acc;
        }, {}),
        current_page: parsedPage,
        list_workspace_members: memberListResponseSchema.parse(members),
        status: "OK",
        total_count: totalCount,
        total_pages: totalPages,
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

      const { email, role, name, username, target_teams = [] } = req.body;

      const normalizedRole = typeof role === "string" ? role.trim().toUpperCase() : "";

      const currentWorkspace = await this._getUserWorkspace(authUserId);
      if (!currentWorkspace) {
        return res.status(404).json({ error: "Workspace not found" });
      }

      if (!(await this._ensureCanManageMembers(currentWorkspace, res))) {
        return;
      }

      const validTargetTeams = [];
      for (const tArea of target_teams) {
        if (!tArea.team_id) continue;
        const team = await this.teamsRepository.getTeamById(tArea.team_id, currentWorkspace.id);
        if (!team) return res.status(404).json({ error: `Team not found: ${tArea.team_id}` });

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
          return res.status(400).json({
            error: "This user is already a member of the workspace",
          });
        }
      }

      const usedName = name.trim();
      const invite = await this.workspacesRepository.createWorkspaceInvite(
        currentWorkspace.id,
        email,
        normalizedRole,
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
          target_teams: invite.target_teams,
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
        const { email, role, name, username, target_teams = [] } = inviteData;

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
            normalizedRole,
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
