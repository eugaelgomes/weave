const express = require("express");
const { authLimiter } = require("@/middlewares/security/request-limiters");
const { validate } = require("@/middlewares/validation/validate");

const SigninController = require("@/modules/authentication/controllers/signin.controller");
const GoogleOauthController = require("@/modules/authentication/controllers/google-oauth.controller");
const GithubOauthController = require("@/modules/authentication/controllers/github-oauth.controller");
const MicrosoftOauthController = require("@/modules/authentication/controllers/microsoft-oauth.controller");
const LogoutController = require("@/modules/authentication/controllers/logout.controller");
const PasswordController = require("@/modules/authentication/controllers/password.controller");
const {
  forgotPasswordSchema,
  resetPasswordSchema,
} = require("@/modules/authentication/schemas/password.schema");
const {
  oauthCallbackSchema,
  signinSchema,
} = require("@/modules/authentication/schemas/auth.schema");

const router = express.Router();

router.post(
  "/signin",
  authLimiter,
  validate(signinSchema, "body"),
  SigninController.userSignin.bind(SigninController)
);

router.get(
  "/signin/sso/google",
  GoogleOauthController.googleAuth.bind(GoogleOauthController)
);

router.get(
  "/signin/sso/google/callback",
  authLimiter,
  validate(oauthCallbackSchema, "query"),
  GoogleOauthController.googleCallback.bind(GoogleOauthController)
);

router.get(
  "/signin/sso/github",
  GithubOauthController.githubAuth.bind(GithubOauthController)
);

router.get(
  "/signin/sso/github/callback",
  authLimiter,
  validate(oauthCallbackSchema, "query"),
  GithubOauthController.githubCallback.bind(GithubOauthController)
);

router.get(
  "/signin/sso/microsoft",
  MicrosoftOauthController.microsoftAuth.bind(MicrosoftOauthController)
);

router.get(
  "/signin/sso/microsoft/callback",
  authLimiter,
  validate(oauthCallbackSchema, "query"),
  MicrosoftOauthController.microsoftCallback.bind(MicrosoftOauthController)
);

router.post("/logout", LogoutController.logout.bind(LogoutController));

router.post(
  "/forgot-password",
  validate(forgotPasswordSchema, "body"),
  PasswordController.forgotPassword.bind(PasswordController)
);

router.post(
  "/reset-password",
  validate(resetPasswordSchema, "body"),
  PasswordController.resetPassword.bind(PasswordController)
);

module.exports = router;
