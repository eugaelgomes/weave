const crypto = require("crypto");
const bcrypt = require("bcrypt");

const { AppError } = require("@/errors/app-error");
const AuthBaseController = require("./base.controller");
const CredentialsRepository = require("@/modules/authentication/repositories/credentials.repository");
const UserTokensRepository = require("@/modules/users/repositories/user-tokens.repository");
const authLogs = require("../utils/auth-logs.util");
const storageFileUtils = require("@/utils/storage.util");
const { buildJwtPayload } = require("@/modules/authentication/schemas/session.schema");
const { mail_login_code } = require("@/services/email/templates/login-code");

const presignObjectFields = storageFileUtils.presignObjectFields;

/**
 * Login with username/email and password.
 */
class CredentialsController extends AuthBaseController {
  /**
   * @param {import('express').Request} req
   * @param {import('express').Response} res
   * @param {import('express').NextFunction} next
   * @param {object} user
   * @param {string} [message]
   * @returns {Promise<unknown>}
   */
  async _finalizeSignin(req, res, next, user, message = "Successfully performed user signin.") {
    try {
      const workspace = this._normalizeWorkspace(user.workspace);
      const defaultArea = this._normalizeDefaultTeam(user.default_area || user.default_team);

      const payload = buildJwtPayload(user, workspace, defaultArea);

      req.session.user = payload;
      req.session.userId = user.user_id;

      authLogs.createLog(user.user_id, "auth_login", req, "success");

      const protectedUser = await presignObjectFields(user, ["avatar_url"], {
        expiresIn: 12 * 60 * 60,
        userId: user.user_id,
      });
      const protectedOrg = workspace
        ? await presignObjectFields(workspace, ["logo_url"], {
            expiresIn: 12 * 60 * 60,
            userId: user.user_id,
          })
        : null;

      await new Promise((resolve, reject) => {
        req.session.save((err) => {
          if (err) return reject(err);
          return resolve();
        });
      });

      return res.status(200).json({
        auth: {
          expires_in: 12 * 60 * 60,
          login_time: new Date(),
        },
        message,
        status: "OK",
        user: {
          onboarding_state: user.onboarding_state || {},
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
          user_workspace: {
            default_area: defaultArea,
            id: protectedOrg?.id || null,
            logo_url: protectedOrg?.logo_url || null,
            member_since: protectedOrg?.member_since || null,
            name: protectedOrg?.name || null,
            public_id: protectedOrg?.public_id || null,
            role: protectedOrg?.member_role || null,
            unique_name: protectedOrg?.unique_name || null,
          },
        },
      });
    } catch (error) {
      return next(error);
    }
  }

  /**
   * Signin user with email and password.
   * @param {import('express').Request} req
   * @param {import('express').Response} res
   * @param {import('express').NextFunction} next
   * @returns {Promise<unknown>}
   */
  async userSignin(req, res, next) {
    const email = (req.body.email || req.body.login || "").trim().toLowerCase();
    const { password } = req.body;

    try {
      const user = await CredentialsRepository.findUserByEmail(email);

      if (!user) {
        return next(AppError.unauthorized("Invalid credentials."));
      }

      if (user.auth_with_google && !user.password) {
        return next(AppError.unauthorized("This account uses SSO authentication."));
      }

      const verifiedAccount = user.email_verified;
      if (!verifiedAccount) {
        return next(
          new AppError("EMAIL_NOT_VERIFIED", "Please verify your email before logging in.", 403, {
            body: { email: user.email },
          })
        );
      }

      const comparePassword = await bcrypt.compare(password, user.password);
      if (!comparePassword) {
        return next(AppError.unauthorized("Invalid credentials."));
      }

      if (req.body.verify_only) {
        return res.status(200).json({ message: "Credentials verified.", status: "OK" });
      }

      return await this._finalizeSignin(req, res, next, user);
    } catch (error) {
      next(error);
    }
  }

  /**
   * Request a one-time login code for a user.
   * @param {import('express').Request} req
   * @param {import('express').Response} res
   * @param {import('express').NextFunction} next
   * @returns {Promise<unknown>}
   */
  async requestSigninCode(req, res, next) {
    const email = (req.body.email || req.body.login || "").trim().toLowerCase();

    try {
      const user = await CredentialsRepository.findUserByEmail(email);

      if (!user) {
        return res.status(200).json({
          message: "If the account exists, a login code was sent.",
          status: "OK",
        });
      }

      if (user.auth_with_google && !user.password) {
        return next(AppError.unauthorized("This account uses SSO authentication."));
      }

      const code = crypto.randomInt(0, 1000000).toString().padStart(6, "0");
      const token = crypto.randomBytes(24).toString("hex");

      await UserTokensRepository.deactivateOldLoginCodeTokens(user.user_id);
      await UserTokensRepository.createLoginCodeToken(user.user_id, token, code, new Date());

      const emailResult = await mail_login_code(
        user.email,
        code,
        user.user_name || user.name || user.username,
        user.user_preference?.language?.interface
      );

      if (!emailResult.success) {
        return next(new AppError("LOGIN_CODE_EMAIL_FAILED", "Unable to send login code.", 502));
      }

      return res.status(200).json({
        message: "If the account exists, a login code was sent.",
        status: "OK",
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Signin user with email and a one-time login code.
   * @param {import('express').Request} req
   * @param {import('express').Response} res
   * @param {import('express').NextFunction} next
   * @returns {Promise<unknown>}
   */
  async userSigninWithCode(req, res, next) {
    const email = (req.body.email || req.body.login || "").trim().toLowerCase();
    const { code } = req.body;

    try {
      const user = await CredentialsRepository.findUserByEmail(email);

      if (!user) {
        return next(AppError.unauthorized("Invalid credentials."));
      }

      if (user.auth_with_google && !user.password) {
        return next(AppError.unauthorized("This account uses SSO authentication."));
      }

      const tokenRecord = await UserTokensRepository.findLoginCodeTokenByCodeAndUserId(
        code,
        user.user_id
      );

      if (!tokenRecord) {
        return next(AppError.unauthorized("Invalid or expired login code."));
      }

      await UserTokensRepository.consumeLoginCodeToken(tokenRecord.token);

      if (!user.email_verified) {
        await UserTokensRepository.verifyUserEmail(user.user_id);
        user.email_verified = true;
        user.email_verified_at = new Date();
      }

      if (req.body.verify_only) {
        return res.status(200).json({ message: "Credentials verified.", status: "OK" });
      }

      return await this._finalizeSignin(
        req,
        res,
        next,
        user,
        "Successfully performed user signin."
      );
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new CredentialsController();
