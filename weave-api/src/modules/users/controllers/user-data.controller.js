const spacesService = require("@/services/storage");

const BaseController = require("./base.controller");
const bcrypt = require("bcrypt");
const crypto = require("crypto");
const UserDataRepository = require("@/modules/users/repositories/user-data.repository");
const SearchUsersRepository = require("@/modules/users/repositories/search-users.repository");
const UserTokensRepository = require("@/modules/users/repositories/user-tokens.repository");
const { presignObjectFields } = require("@/utils/data/presign-storage-files");
const updateProfileLogs = require("@/utils/system-logs/update-profile-logs");
const { normalizeAppPreferences } = require("@/modules/users/normalize");
const UserDataService = require("@/services/users/user-data.service");
const {
  buildUniqueConflictPayload,
  normalizeEmail,
  normalizeUsername,
  normalizePhoneNumber,
} = require("@/modules/users/utils/unique-conflicts");

/**
 * @typedef {import('express').Request & {
 *   user: { userId: string|number, username: string },
 *   body?: Record<string, unknown>,
 *   file?: { buffer: Buffer, mimetype: string }
 * }} UserDataRequest
 */

/**
 * @param {Record<string, unknown>|null|undefined} defaultAreaData
 * @returns {null|{
 *   id: unknown,
 *   name: unknown,
 *   slug: unknown,
 *   role: unknown,
 *   member_since: unknown,
 *   description: unknown,
 *   properties: Record<string, unknown>
 * }}
 */
const mapDefaultAreaInfo = (defaultAreaData) => {
  if (!defaultAreaData) return null;
  return {
    id: defaultAreaData.org_default_area_id,
    name: defaultAreaData.org_default_area_name,
    slug: defaultAreaData.org_default_area_slug,
    role: defaultAreaData.org_default_area_role,
    member_since: defaultAreaData.org_default_area_member_since,
    description: defaultAreaData.org_default_area_description,
    properties: defaultAreaData.org_default_area_properties || {},
  };
};

/**
 * @param {Record<string, unknown>|null|undefined} organizationData
 * @returns {null|{
 *   id: unknown,
 *   unique_name: unknown,
 *   name: unknown,
 *   logo_url: unknown,
 *   member_role: unknown,
 *   member_since: unknown
 * }}
 */
const mapOrganizationInfo = (organizationData) => {
  if (!organizationData) return null;
  return {
    id: organizationData.org_id,
    public_id: organizationData.org_public_id,
    unique_name: organizationData.org_unique_name,
    name: organizationData.org_name,
    logo_url: organizationData.org_logo_url,
    member_role: organizationData.org_member_role,
    member_since: organizationData.org_member_since,
  };
};

/**
 * @param {Record<string, unknown>|null|undefined} usageData
 * @returns {null|{
 *   plan_id: unknown,
 *   plan_name: unknown,
 *   client_type: unknown,
 *   period_start: unknown,
 *   period_end: unknown,
 *   details: Record<string, unknown>
 * }}
 */
const mapPlanUsageInfo = (usageData) => {
  if (!usageData) return null;
  return {
    plan_id: usageData.usage_plan_id,
    plan_name: usageData.usage_plan_name,
    client_type: usageData.usage_client_type,
    period_start: usageData.period_start,
    period_end: usageData.period_end,
    details: usageData.usage_details || {},
  };
};

/**
 * Authenticated user profile: read, update and image.
 */
class UserDataController extends BaseController {
  /**
   * Redirects to the logged user's profile image URL.
   *
   * @param {UserDataRequest} req
   * @param {import('express').Response} res
   * @returns {Promise<void>}
   */
  async getProfileImage(req, res, next) {
    try {
      // Uses logged user's userId
      const userId = req.user.userId;

      this._validateAuthentication(req, res, next);

      const user = await UserDataRepository.getProfileImage(userId);

      if (!user || !user.avatar_url) {
        return res.status(404).send("Profile image not found.");
      }

      // Redirects to the image URL
      return res.redirect(user.avatar_url);
    } catch (error) {
      console.error("Error retrieving profile image:", error);
      this._handleError(error, res, next);
    }
  }

  /**
   * Returns profile image metadata (without redirecting).
   *
   * @param {UserDataRequest} req
   * @param {import('express').Response} res
   * @returns {Promise<void>}
   */
  async getProfileImageInfo(req, res, next) {
    try {
      const userId = req.user.userId;

      this._validateAuthentication(req, res, next);

      const user = await UserDataRepository.getProfileImage(userId);

      if (!user || !user.avatar_url) {
        return res.status(404).json({
          error: "Profile image not found",
          hasImage: false,
        });
      }

      res.json({
        hasImage: true,
        userName: user.name,
        imageInfo: {
          url: user.avatar_url,
          isExternal: true,
          provider: "Digital Ocean Spaces",
        },
      });
    } catch (error) {
      console.error("Error retrieving profile image info:", error);
      this._handleError(error, res, next);
    }
  }

  /**
   * Complete profile (`/me`): profile, organization, plan data and pre-signed URLs.
   *
   * @param {UserDataRequest} req
   * @param {import('express').Response} res
   * @returns {Promise<void>}
   */
  async getProfile(req, res, next) {
    try {
      this._validateAuthentication(req, res, next);

      const user = await this.signinRepository.findUserByUsername(
        req.user.username
      );

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      const organization = mapOrganizationInfo(user.organization);
      const defaultArea = mapDefaultAreaInfo(user.default_area);
      const planUsage = mapPlanUsageInfo(user.current_usage);

      // Generate pre-signed URLs to prevent unauthorized and direct access to S3
      // The 12-hour duration keeps the image visible in the frontend for the same lifespan as a normal session (although it uses next/auth cookies)
      const protectedUser = await presignObjectFields(user, ["avatar_url"], {
        expiresIn: 12 * 60 * 60,
        userId: req.user.userId,
      });
      const protectedOrg = organization
        ? await presignObjectFields(organization, ["logo_url"], {
            expiresIn: 12 * 60 * 60,
            userId: req.user.userId,
          })
        : null;

      return res.status(200).json({
        user: {
          user_profile: {
            id: protectedUser.user_id,
            public_id: protectedUser.public_user_id,
            user_name: protectedUser.user_name,
            username: protectedUser.username,
            email: protectedUser.email,
            avatar_url: protectedUser.avatar_url,
            birth_date: protectedUser.birth_date,
            phone_number: protectedUser.phone_number,
            created_at: protectedUser.created_at,
            updated_at: protectedUser.updated_at,
          },
          user_settings: {
            theme_mode: protectedUser.theme_mode,
            private_profile: protectedUser.private_profile,
            auth_with_google: protectedUser.auth_with_google,
          },
          user_organization: {
            id: protectedOrg?.id || null,
            public_id: protectedOrg?.public_id || null,
            unique_name: protectedOrg?.unique_name || null,
            name: protectedOrg?.name || null,
            logo_url: protectedOrg?.logo_url || null,
            member_role: protectedOrg?.member_role || null,
            member_since: protectedOrg?.member_since || null,
            default_area: defaultArea,
          },
          current_plan: {
            id: user.plan_id,
            plan_name: user.plan_name,
            client_type: planUsage?.client_type || null,
            details: user.plan_details || {},
          },
          current_plan_usage: planUsage,
          usage_preference: normalizeAppPreferences(user.user_preference || {}),
        },
      });
    } catch (error) {
      console.error("Error fetching profile:", error);
      this._handleError(error, res, next);
    }
  }

  /**
   * Public: check username availability without requiring authentication.
   * Only checks the `username` field. Used in the invite-accept flow.
   *
   * @param {import('express').Request} req
   * @param {import('express').Response} res
   * @returns {Promise<void>}
   */
  async checkUsernamePublic(req, res) {
    try {
      const username = normalizeUsername(req.query?.username);
      if (!username) {
        return res
          .status(400)
          .json({ error: "username query param is required" });
      }
      const availability = await SearchUsersRepository.checkUniqueAvailability({
        username,
      });
      return res.status(200).json({ availability });
    } catch (error) {
      console.error("Error checking username availability (public):", error);
      res.status(500).json({ error: "Error checking username" });
    }
  }

  /**
   * Checks availability of `email`, `username` and `phone_number` for the authenticated user.
   *
   * @param {UserDataRequest} req
   * @param {import('express').Response} res
   * @returns {Promise<void>}
   */
  async checkAvailability(req, res, next) {
    try {
      this._validateAuthentication(req);

      const email = normalizeEmail(req.query?.email);
      const username = normalizeUsername(req.query?.username);
      const phone_number = normalizePhoneNumber(req.query?.phone_number);

      const availability = await SearchUsersRepository.checkUniqueAvailability(
        { email, username, phone_number },
        { excludeUserId: req.user.userId }
      );

      return res.status(200).json({
        availability,
      });
    } catch (error) {
      console.error("Error checking user unique availability:", error);
      this._handleError(error, res, next);
    }
  }

  /**
   * Updates profile, preferences, email (with validation flow), password and optional avatar (`profilePicture`).
   *
   * @param {UserDataRequest} req
   * @param {import('express').Response} res
   * @returns {Promise<void>}
   */
  async updateProfile(req, res, next) {
    const {
      name,
      username,
      email,
      emailValidationToken,
      currentPassword,
      newPassword,
      theme_mode,
      birth_date,
      phone_number,
      private_profile,
      usage_preference,
      user_preference,
    } = req.body;

    const auditChanges = {};

    try {
      const currentUser = await this.signinRepository.findUserByUsername(
        req.user.username
      );

      if (!currentUser) {
        return res.status(404).json({ message: "User not found" });
      }

      const { updatedUser, emailPendingValidation, pendingEmail } =
        await UserDataService.updateProfile(
          req.user.userId,
          currentUser,
          req.body,
          req.file,
          req // required for updateProfileLogs inside service
        );

      const mockUserForPresign = { avatar_url: updatedUser.avatar_url };
      const protectedMock = await presignObjectFields(
        mockUserForPresign,
        ["avatar_url"],
        {
          expiresIn: 12 * 60 * 60,
          userId: req.user.userId,
        }
      );

      const response = {
        user: {
          user_profile: {
            id: updatedUser.user_id,
            public_id: updatedUser.public_user_id,
            user_name: updatedUser.user_name || updatedUser.name,
            username: updatedUser.username,
            email: updatedUser.email,
            avatar_url: protectedMock.avatar_url,
            birth_date: updatedUser.birth_date,
            phone_number: updatedUser.phone_number,
          },
          user_settings: {
            theme_mode: updatedUser.theme_mode,
            private_profile: updatedUser.private_profile,
          },
          usage_preference: updatedUser.user_preference || {},
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
        return res
          .status(401)
          .json({ message: "Current password is incorrect" });
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

      updateProfileLogs.createLog(
        req.user?.userId,
        "system_error",
        req,
        "failure",
        {
          error: error.message,
          context: "updateProfile",
        }
      );

      this._handleError(error, res, next);
    }
  }
}
module.exports = new UserDataController();
