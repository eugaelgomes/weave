const bcrypt = require("bcrypt");

const { AppError } = require("@/errors/app-error");
const AuthBaseController = require("./base.controller");
const SigninRepository = require("@/modules/authentication/repositories/signin.repository");
const authLogs = require("../utils/auth-logs.util");
const storageFileUtils = require("@/utils/data/presign-storage-files");
const {
  buildJwtPayload,
} = require("@/modules/authentication/schemas/jwt-payload.schema");

const presignObjectFields = storageFileUtils.presignObjectFields;

/**
 * Login with username/email and password.
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

      if (req.body.verify_only) {
        return res
          .status(200)
          .json({ message: "Credentials verified.", status: "OK" });
      }

      const organization = this._normalizeOrganization(user.organization);
      const defaultArea = this._normalizeDefaultArea(user.default_area);

      const payload = buildJwtPayload(user, organization, defaultArea);

      req.session.user = payload;
      req.session.userId = user.user_id;

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

      req.session.save((err) => {
        if (err) return next(err);

        return res.status(200).json({
          auth: {
            expires_in: 12 * 60 * 60,
            login_time: new Date(),
          },
          message: "Successfully performed user signin.",
          status: "OK",
          user: {
            user_organization: {
              default_area: defaultArea,
              id: protectedOrg?.id || null,
              logo_url: protectedOrg?.logo_url || null,
              member_since: protectedOrg?.member_since || null,
              name: protectedOrg?.name || null,
              public_id: protectedOrg?.public_id || null,
              role: protectedOrg?.member_role || null,
              unique_name: protectedOrg?.unique_name || null,
            },
            user_profile: {
              avatar_url: protectedUser.avatar_url,
              email: protectedUser.email,
              id: protectedUser.user_id,
              name: protectedUser.user_name || protectedUser.name,
              public_id: protectedUser.public_user_id,
              username: protectedUser.username,
            },
            user_settings: {
              private_profile: protectedUser.private_profile,
              theme_mode: protectedUser.theme_mode,
            },
            user_subscription: {
              plan_details: user.plan_details || {},
              plan_id: user.plan_id,
              plan_name: user.plan_name,
            },
          },
        });
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new SigninController();
