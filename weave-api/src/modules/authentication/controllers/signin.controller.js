/* eslint-disable sort-keys */
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const { AppError } = require("@/errors/app-error");
const AuthBaseController = require("./base.controller");
const SigninRepository = require("@/modules/authentication/repositories/signin.repository");
const cookieHelper = require("@/utils/cookie-helper");
const authLogs = require("@/utils/system_logs/auth-logs");
const storageFileUtils = require("@/utils/data/presign-storage-files");
const secretsService = require("@/services/secrets");
const {
  buildJwtPayload,
} = require("@/modules/authentication/jwt-payload.schema");

const setAuthCookie = cookieHelper.setAuthCookie;
const presignObjectFields = storageFileUtils.presignObjectFields;
const secretsManager = secretsService.secretsManager;

/**
 * Login com usuário/e-mail e senha.
 */
class SigninController extends AuthBaseController {
  /**
   * Signin user with email/username and password.
   * @param {import('express').Request} req
   * @param {import('express').Response} res
   * @param {import('express').NextFunction} next
   * @returns {Promise<unknown>}
   */
  async userSignin(req, res, next) {
    const { login: username, password } = req.body;

    try {
      const user = await SigninRepository.findUserByUsername(username);

      if (!user) {
        return next(AppError.unauthorized("Invalid credentials."));
      }

      if (user.auth_with_google && !user.password) {
        return next(
          AppError.unauthorized("This account uses SSO authentication.")
        );
      }

      const verifiedAccount = user.email_verified;
      if (!verifiedAccount) {
        return next(
          new AppError(
            "EMAIL_NOT_VERIFIED",
            "Please verify your email before logging in.",
            403,
            {
              body: { email: user.email },
            }
          )
        );
      }

      const comparePassword = await bcrypt.compare(password, user.password);
      if (!comparePassword) {
        return next(AppError.unauthorized("Invalid credentials."));
      }

      const organization = this._normalizeOrganization(user.organization);
      const defaultArea = this._normalizeDefaultArea(user.default_area);

      const payload = buildJwtPayload(user, organization, defaultArea);

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
            public_id: protectedUser.public_user_id,
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
            public_id: protectedOrg?.public_id || null,
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
      next(error);
    }
  }
}

module.exports = new SigninController();
