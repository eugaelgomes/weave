const crypto = require("crypto");
const fs = require("fs");

const BaseController = require("./base.controller");
const UsersService = require("../services/users.service");
const UserTokensRepository = require("@/modules/users/repositories/user-tokens.repository");
const UsersRepository = require("@/modules/users/repositories/users.repository");

const spacesService = require("@/services/storage.service");
const { presignObjectFields } = require("@/utils/storage.util");
const updateProfileLogs = require("../utils/user-logs.util");
const { normalizeAppPreferences } = require("@/modules/users/utils/normalize");
const {
  buildUniqueConflictPayload,
  normalizeEmail,
  normalizeUsername,
  normalizePhoneNumber,
} = require("@/modules/users/utils/unique-conflicts.util");

const workspacesBaseRepository = require("@/modules/workspaces/repositories/base.repository");
const workspacesMembersRepository = require("@/modules/workspaces/repositories/members.repository");
const workspacesTeamsRepository = require("@/modules/workspaces/repositories/teams.repository");
const credentialsRepository = require("@/modules/authentication/repositories/credentials.repository");
const { buildJwtPayload } = require("@/modules/authentication/schemas/session.schema");

const {
  delete_account_notification,
} = require("@/services/email/templates/delete-account-message");
const { delete_account_request } = require("@/services/email/templates/delete-account-request");

const mapDefaultTeamInfo = (defaultTeamData) => {
  if (!defaultTeamData) return null;
  return {
    description: defaultTeamData.workspace_default_team_description,
    id: defaultTeamData.workspace_default_team_id,
    name: defaultTeamData.workspace_default_team_name,
    properties: defaultTeamData.workspace_default_team_properties || {},
    slug: defaultTeamData.workspace_default_team_slug,
  };
};

const mapWorkspaceInfo = (workspaceData) => {
  if (!workspaceData) return null;
  return {
    active_modules: workspaceData.active_modules,
    id: workspaceData.workspace_id,
    logo_url: workspaceData.workspace_logo_url,
    member_role: workspaceData.workspace_member_role,
    member_since: workspaceData.workspace_member_since,
    name: workspaceData.workspace_name,
    public_id: workspaceData.workspace_public_id,
    unique_name: workspaceData.workspace_unique_name,
  };
};

const mapPlanUsageInfo = (usageData) => {
  if (!usageData) return null;
  return {
    client_type: usageData.usage_client_type,
    details: usageData.usage_details || {},
    period_end: usageData.period_end,
    period_start: usageData.period_start,
    plan_id: usageData.usage_plan_id,
    plan_name: usageData.usage_plan_name,
  };
};

class UsersController extends BaseController {
  // ==========================================
  // CREATE & ACTIVATE ACCOUNT
  // ==========================================

  async createUser(req, res, next) {
    try {
      const { timezone } = req.body;

      if (timezone && !this._isValidTimezone(timezone)) {
        const allTimezones = Intl.supportedValuesOf("timeZone");
        return res.status(400).json({
          isValidTimezones: allTimezones,
          message: "Invalid timezone provided.",
          status: "error",
        });
      }

      const result = await UsersService.createUser(req.body);

      if (result.conflict) {
        return res.status(409).json(buildUniqueConflictPayload(result.conflict));
      }

      const { user } = result;

      let profileImageUrl = null;
      if (req.file && req.file.path) {
        try {
          const fileStream = fs.createReadStream(req.file.path);

          const saveResult = await spacesService.uploadProfileImage(
            fileStream,
            req.file.mimetype,
            user.userId
          );

          fs.unlink(req.file.path, (err) => {
            if (err) console.error("Failed to delete temp file:", err);
          });

          if (saveResult.success) {
            profileImageUrl = saveResult.key;
            await UsersRepository.updateProfileImage(user.userId, profileImageUrl);
          } else {
            console.error("Image upload failed:", saveResult.error);
          }
        } catch (imageError) {
          console.error("Error processing image:", imageError);
        }
      }

      return res.status(201).json({
        message: "Welcome to Weave! Check your email to activate your account.",
        redirect: "/auth/",
        status: "OK",
        user: {
          avatar_url: profileImageUrl,
          created_at: user.createdAt,
          email: user.email,
          id: user.userId,
          name: user.userName,
          username: user.username,
        },
      });
    } catch (error) {
      if (error.message === "CORPORATE_DOMAIN_INVITE_REQUIRED") {
        return res.status(403).json({
          message:
            "This email belongs to a verified corporate domain. You need an invitation from the workspace to create an account.",
          status: "error",
        });
      }
      console.error("An error occurred during registration:", error);
      return this._handleError(error, res, next);
    }
  }

  async activateAccount(req, res, next) {
    const { token, code, email } = req.body;

    if (!token && (!code || !email)) {
      return res.status(400).json({
        message: "Activation token or both verification code and email are required",
      });
    }

    try {
      let tokenRecord;
      if (token) {
        tokenRecord = await UserTokensRepository.findEmailActivationToken(token);
      } else {
        tokenRecord = await UserTokensRepository.findEmailActivationTokenByCodeAndEmail(
          code,
          email
        );
      }

      if (!tokenRecord) {
        return res.status(400).json({
          message: "Invalid or expired activation token or verification code",
        });
      }

      const verifiedUser = await UserTokensRepository.verifyUserEmail(tokenRecord.user_id);

      if (!verifiedUser) {
        return res.status(404).json({ message: "User not found" });
      }

      await UserTokensRepository.deactivateEmailToken(tokenRecord.token);

      return res.status(200).json({
        message: "Email verified successfully",
        user: {
          email: verifiedUser.email,
          email_verified: verifiedUser.email_verified,
          email_verified_at: verifiedUser.email_verified_at,
          id: verifiedUser.user_id,
        },
      });
    } catch (error) {
      console.error("Error activating account:", error);
      this._handleError(error, res, next);
    }
  }

  async resendActivationCode(req, res, next) {
    try {
      const { email } = req.body;
      const result = await UsersService.resendActivationCode(email);

      if (!result.success) {
        return res.status(502).json({
          message: "Unable to resend the verification code. Please try again.",
          status: "error",
        });
      }

      return res.status(200).json({
        message: "A new verification code was sent if the account is pending activation.",
        status: "OK",
      });
    } catch (error) {
      console.error("Error resending activation code:", error);
      return this._handleError(error, res, next);
    }
  }

  // ==========================================
  // READ & UPDATE PROFILE
  // ==========================================

  async getProfileImage(req, res, next) {
    try {
      const userId = req.user.userId;
      this._validateAuthentication(req, res, next);
      const user = await UsersRepository.getProfileImage(userId);

      if (!user || !user.avatar_url) {
        return res.status(404).send("Profile image not found.");
      }
      return res.redirect(user.avatar_url);
    } catch (error) {
      console.error("Error retrieving profile image:", error);
      this._handleError(error, res, next);
    }
  }

  async getProfileImageInfo(req, res, next) {
    try {
      const userId = req.user.userId;
      this._validateAuthentication(req, res, next);
      const user = await UsersRepository.getProfileImage(userId);

      if (!user || !user.avatar_url) {
        return res.status(404).json({
          error: "Profile image not found",
          hasImage: false,
        });
      }

      res.json({
        hasImage: true,
        imageInfo: {
          isExternal: true,
          provider: "Digital Ocean Spaces",
          url: user.avatar_url,
        },
        userName: user.name,
      });
    } catch (error) {
      console.error("Error retrieving profile image info:", error);
      this._handleError(error, res, next);
    }
  }

  async getProfile(req, res, next) {
    try {
      this._validateAuthentication(req, res, next);
      // `username` can change during onboarding while the session still carries its old value.
      // The authenticated UUID is immutable for the session and is the reliable profile lookup key.
      const user = await this.credentialsRepository.findUserByUsername(req.user.userId);

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const workspace = mapWorkspaceInfo(user.workspace);
      const defaultArea = mapDefaultTeamInfo(user.default_area);
      const planUsage = mapPlanUsageInfo(user.current_usage);

      const protectedUser = await presignObjectFields(user, ["avatar_url"], {
        expiresIn: 12 * 60 * 60,
        userId: req.user.userId,
      });
      const protectedOrg = workspace
        ? await presignObjectFields(workspace, ["logo_url"], {
            expiresIn: 12 * 60 * 60,
            userId: req.user.userId,
          })
        : null;

      return res.status(200).json({
        user: {
          current_plan: {
            client_type: planUsage?.client_type || null,
            details: user.plan_details || {},
            id: user.plan_id,
            plan_name: user.plan_name,
          },
          current_plan_usage: planUsage,
          onboarding_state: user.onboarding_state || {},
          usage_preference: normalizeAppPreferences(user.user_preference || {}),
          user_profile: {
            avatar_url: protectedUser.avatar_url,
            birth_date: protectedUser.birth_date,
            created_at: protectedUser.created_at,
            email: protectedUser.email,
            id: protectedUser.user_id,
            phone_number: protectedUser.phone_number,
            public_id: protectedUser.public_user_id,
            updated_at: protectedUser.updated_at,
            user_name: protectedUser.user_name,
            username: protectedUser.username,
          },
          user_settings: {
            auth_with_google: protectedUser.auth_with_google,
            private_profile: protectedUser.private_profile,
            theme_mode: protectedUser.theme_mode,
          },
          user_workspace: {
            active_modules: protectedOrg?.active_modules || {
              agent_house: true,
              calendar: true,
              notes: true,
              projects: true,
              weave_flow: true,
            },
            default_area: defaultArea,
            id: protectedOrg?.id || null,
            logo_url: protectedOrg?.logo_url || null,
            member_role: protectedOrg?.member_role || null,
            member_since: protectedOrg?.member_since || null,
            name: protectedOrg?.name || null,
            public_id: protectedOrg?.public_id || null,
            unique_name: protectedOrg?.unique_name || null,
          },
        },
      });
    } catch (error) {
      console.error("Error fetching profile:", error);
      this._handleError(error, res, next);
    }
  }

  async updateProfile(req, res, next) {
    try {
      const currentUser = await this.credentialsRepository.findUserByUsername(req.user.userId);

      if (!currentUser) {
        return res.status(404).json({ message: "User not found" });
      }

      const { updatedUser, emailPendingValidation, pendingEmail } =
        await UsersService.updateProfile(req.user.userId, currentUser, req.body, req.file, req);

      const mockUserForPresign = { avatar_url: updatedUser.avatar_url };
      const protectedMock = await presignObjectFields(mockUserForPresign, ["avatar_url"], {
        expiresIn: 12 * 60 * 60,
        userId: req.user.userId,
      });

      const response = {
        user: {
          usage_preference: updatedUser.user_preference || {},
          user_profile: {
            avatar_url: protectedMock.avatar_url,
            birth_date: updatedUser.birth_date,
            email: updatedUser.email,
            id: updatedUser.user_id,
            phone_number: updatedUser.phone_number,
            public_id: updatedUser.public_user_id,
            user_name: updatedUser.user_name || updatedUser.name,
            username: updatedUser.username,
          },
          user_settings: {
            private_profile: updatedUser.private_profile,
            theme_mode: updatedUser.theme_mode,
          },
        },
      };

      if (emailPendingValidation) {
        response.email_validation = {
          pending: true,
          pending_email: pendingEmail,
        };
      }

      return res.status(200).json(response);
    } catch (error) {
      if (error.message === "INCORRECT_PASSWORD") {
        return res.status(401).json({ message: "Current password is incorrect" });
      }
      if (error.message === "INVALID_TOKEN") {
        return res.status(400).json({ message: "Invalid or expired token" });
      }
      if (error.message === "CONFLICT_EMAIL") {
        return res.status(409).json(buildUniqueConflictPayload("email"));
      }
      if (error.message === "CONFLICT_USERNAME") {
        return res.status(409).json(buildUniqueConflictPayload("username"));
      }
      if (error.message === "CONFLICT_PHONE") {
        return res.status(409).json(buildUniqueConflictPayload("phone_number"));
      }

      console.error("Error updating profile:", error);

      updateProfileLogs.createLog(req.user?.userId, "system_error", req, "failure", {
        context: "updateProfile",
        error: error.message,
      });

      this._handleError(error, res, next);
    }
  }

  // ==========================================
  // SEARCH & AVAILABILITY
  // ==========================================

  async checkUsernamePublic(req, res) {
    try {
      const username = normalizeUsername(req.query?.username);
      if (!username) {
        return res.status(400).json({ error: "username query param is required" });
      }
      const availability = await UsersRepository.checkUniqueAvailability({ username });
      return res.status(200).json({ availability });
    } catch (error) {
      console.error("Error checking username availability (public):", error);
      res.status(500).json({ error: "Error checking username" });
    }
  }

  async checkAvailability(req, res, next) {
    try {
      this._validateAuthentication(req);

      const email = normalizeEmail(req.query?.email);
      const username = normalizeUsername(req.query?.username);
      const phone_number = normalizePhoneNumber(req.query?.phone_number);

      const availability = await UsersRepository.checkUniqueAvailability(
        { email, phone_number, username },
        { excludeUserId: req.user.userId }
      );

      return res.status(200).json({ availability });
    } catch (error) {
      console.error("Error checking user unique availability:", error);
      this._handleError(error, res, next);
    }
  }

  async searchUsers(req, res, next) {
    try {
      const { q, contextType, contextId } = req.query;

      const userId = this._validateAuthentication(req, res);
      if (!userId) return;

      if (!q || q.trim().length < 3) {
        return res.status(400).json({
          error: "The search query must be at least 3 characters long.",
        });
      }

      const searchTerm = q.trim();

      const search_users = await UsersService.searchWithContext(
        searchTerm,
        userId,
        contextType,
        contextId
      );

      const filteredUsers = search_users
        .filter((user) => user && user.id !== userId)
        .map((user) => ({
          avatar_url: user.avatar_url,
          context_info: user.context_info,
          email: user.email,
          id: user.id,
          name: user.name,
          username: user.username,
        }));

      res.status(200).json({
        search_users: filteredUsers,
        search_users_query: searchTerm,
      });
    } catch (error) {
      this._handleError(error, res, next);
    }
  }

  // ==========================================
  // DELETE ACCOUNT
  // ==========================================

  async requestDeleteUser(req, res, next) {
    try {
      const userId = req.user.userId;

      const userData = await UsersRepository.findById(userId);

      if (!userData) {
        return res.status(404).json({
          error: "User not found",
          message: "User does not exist.",
        });
      }

      const token = crypto.randomBytes(12).toString("hex");

      const result = await UserTokensRepository.createDeleteAccountToken(userId, token);

      if (result && result.length > 0) {
        try {
          await delete_account_request(userData.name, userData.email, userData.username, token);
        } catch (emailError) {
          console.error("Failed to send email to:", emailError);
          return res.status(500).json({
            error: "Email error",
            message: "Failed to send confirmation email. Please try again later.",
          });
        }

        res.status(200).json({
          message: "Confirmation email sent. Please check your inbox to confirm account deletion.",
          status: "OK",
        });
      } else {
        res.status(500).json({
          error: "Token error",
          message: "Failed to generate deletion token.",
        });
      }
    } catch (error) {
      console.error("Error requesting account deletion:", error);
      this._handleError(error, res, next);
    }
  }

  async confirmDeleteUser(req, res, next) {
    try {
      const { token } = req.body;

      if (!token) {
        return res.status(400).json({
          error: "Validation error",
          message: "Token is required.",
        });
      }

      const tokenData = await UserTokensRepository.findDeleteAccountToken(token);

      if (!tokenData) {
        return res.status(400).json({
          error: "Invalid token",
          message: "Invalid or expired token.",
        });
      }

      const userId = tokenData.user_id;
      const userData = await UsersRepository.findById(userId);

      if (!userData) {
        return res.status(404).json({
          error: "User not found",
          message: "User does not exist.",
        });
      }

      await UserTokensRepository.deactivateDeleteAccountToken(token);

      const deleteResult = await UsersRepository.deleteUser(userId);

      if (deleteResult && deleteResult.length > 0) {
        try {
          await delete_account_notification(userData.name, userData.email, userData.username);
        } catch (emailError) {
          console.error("Failed to send deletion confirmation email:", emailError);
        }

        res.status(200).json({
          message: "Account deleted successfully.",
          status: "OK",
        });
      } else {
        res.status(500).json({
          error: "Deletion error",
          message: "Failed to delete account.",
        });
      }
    } catch (error) {
      console.error("Error confirming account deletion:", error);
      this._handleError(error, res, next);
    }
  }

  // ==========================================
  // WORKSPACE CONTEXT
  // ==========================================

  async listMyWorkspaces(req, res, next) {
    try {
      const userId = this._validateAuthentication(req);

      const workspaces = await workspacesBaseRepository.getUserWorkspacesWithMembership(userId);

      const protectedWorkspaces = await Promise.all(
        workspaces.map(async (workspace) => {
          const presigned = await presignObjectFields(workspace, ["logo_url"], {
            expiresIn: 12 * 60 * 60,
            userId,
          });
          return {
            id: workspace.id,
            joined_at: workspace.joined_at,
            logo_url: presigned.logo_url || null,
            member_role: workspace.member_role,
            unique_name: workspace.unique_name,
            workspace_name: workspace.workspace_name,
          };
        })
      );

      res.status(200).json({
        data: protectedWorkspaces,
        success: true,
      });
    } catch (error) {
      console.error("Error listing user workspaces:", error);
      next(error);
    }
  }

  async switchWorkspace(req, res, next) {
    try {
      const userId = this._validateAuthentication(req);

      const { workspaceId } = req.body;
      if (!workspaceId) {
        return res.status(400).json({ error: "workspaceId is required", success: false });
      }

      const role = await workspacesMembersRepository.getMembershipRole(workspaceId, userId);
      if (!role) {
        return res.status(403).json({
          error: "You are not an active member of this workspace",
          success: false,
        });
      }

      const user = await credentialsRepository.findUserById(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found", success: false });
      }

      const userWorkspaces = await workspacesBaseRepository.getUserWorkspacesWithMembership(userId);
      const targetOrg = userWorkspaces.find((o) => o.id === workspaceId);

      if (!targetOrg) {
        return res.status(404).json({ error: "Workspace not found", success: false });
      }

      const workspace = {
        id: targetOrg.id,
        logo_url: targetOrg.logo_url,
        member_role: targetOrg.member_role,
        unique_name: targetOrg.unique_name,
        workspace_name: targetOrg.workspace_name,
      };

      let defaultArea = null;
      try {
        defaultArea = await workspacesTeamsRepository.getDefaultArea(workspaceId);
      } catch {}

      const payload = buildJwtPayload(user, workspace, defaultArea);

      req.session.user = payload;
      req.session.userId = user.user_id;

      res.status(200).json({
        message: "Switched workspace successfully",
        success: true,
        user_workspace: {
          id: workspace.id,
          member_role: role,
          name: workspace.workspace_name,
          unique_name: workspace.unique_name,
        },
      });
    } catch (error) {
      console.error("Error switching workspace:", error);
      next(error);
    }
  }
}

module.exports = new UsersController();
