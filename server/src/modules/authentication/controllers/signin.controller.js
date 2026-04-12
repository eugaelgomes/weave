/* eslint-disable sort-keys */
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { validationResult } = require("express-validator");

const AuthBaseController = require("./base.controller");
const SigninRepository = require("@/modules/authentication/repositories/signin.repository");
const cookieHelper = require("@/utils/cookie-helper");
const authLogs = require("@/utils/system_logs/auth-logs");
const storageFileUtils = require("@/utils/data/presign-storage-files");
const secretsService = require("@/services/secrets");

const setAuthCookie = cookieHelper.setAuthCookie;
const presignObjectFields = storageFileUtils.presignObjectFields;
const secretsManager = secretsService.secretsManager;

/**
 * Login com usuário/e-mail e senha.
 */
class SigninController extends AuthBaseController {
  /**
   * @param {import('express').Request} req
   * @param {import('express').Response} res
   * @returns {Promise<import('express').Response>}
   */
  async userSignin(req, res) {
    const { login, password } = req.body;
    const username = login;

    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: "Auth data validation failed, please check it and try again.",
        errors: errors.array(),
      });
    }

    try {
      const user = await SigninRepository.findUserByUsername(username);

      if (!user) {
        return res.status(401).json({
          message:
            "Username/email or password invalid. Check it and try again.",
        });
      }

      if (user.auth_with_google && !user.password) {
        return res.status(401).json({
          message:
            "This account uses Google authentication. Please log in with Google.",
        });
      }

      const verifiedAccount = user.email_verified;
      if (!verifiedAccount) {
        return res.status(403).json({
          error_code: "EMAIL_NOT_VERIFIED",
          email: user.email,
          message: "Please verify your email before logging in.",
        });
      }

      const comparePassword = await bcrypt.compare(password, user.password);
      if (!comparePassword) {
        return res.status(401).json({
          message: "Username/password invalid. Check it and try again.",
        });
      }

      const organization = this._normalizeOrganization(user.organization);
      const defaultArea = this._normalizeDefaultArea(user.default_area);

      const payload = {
        userId: user.user_id,
        username: user.username,
        email: user.email,
        plan_id: user.plan_id,
        org_id: organization?.id || null,
        org_unique_name: organization?.unique_name || null,
        org_member_role: organization?.member_role || null,
        org_default_area_id: defaultArea?.id || null,
        org_default_area_slug: defaultArea?.slug || null,
        org_default_area_role: defaultArea?.role || null,
      };

      const token = jwt.sign(payload, secretsManager(), {
        algorithm: "HS256",
        expiresIn: "12h",
      });

      authLogs.createLog(user.user_id, "auth_login", req, "success");

      const protectedUser = await presignObjectFields(user, ["avatar_url"], {
        expiresIn: 12 * 60 * 60,
        userId: user.user_id,
      });
      const protectedOrg = organization
        ? await presignObjectFields(organization, ["logo_url"], {
            expiresIn: 12 * 60 * 60,
            userId: user.user_id,
          })
        : null;

      setAuthCookie(res, req, token, {
        maxAge: 12 * 60 * 60 * 1000,
      });

      return res.status(200).json({
        status: "OK",
        message: "Successfully performed user signin.",
        user: {
          user_profile: {
            id: protectedUser.user_id,
            name: protectedUser.user_name || protectedUser.name,
            username: protectedUser.username,
            email: protectedUser.email,
            avatar_url: protectedUser.avatar_url,
          },
          user_settings: {
            theme_mode: protectedUser.theme_mode,
            private_profile: protectedUser.private_profile,
          },
          user_organization: {
            id: protectedOrg?.id || null,
            unique_name: protectedOrg?.unique_name || null,
            name: protectedOrg?.name || null,
            logo_url: protectedOrg?.logo_url || null,
            role: protectedOrg?.member_role || null,
            member_since: protectedOrg?.member_since || null,
            default_area: defaultArea,
          },
          user_subscription: {
            plan_id: user.plan_id,
            plan_name: user.plan_name,
            plan_details: user.plan_details || {},
          },
        },
        auth: {
          token: token,
          expires_in: 12 * 60 * 60,
          login_time: new Date(),
        },
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: "Internal Server Error" });
    }
  }
}

module.exports = new SigninController();
