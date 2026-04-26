const express = require("express");

const { verifyToken } = require("@/middlewares/auth/verify-token");
const { authLimiter } = require("@/middlewares/security/request-limiters");

const SigninController = require("@/modules/authentication/controllers/signin.controller");
const GoogleOauthController = require("@/modules/authentication/controllers/google-oauth.controller");
const GithubOauthController = require("@/modules/authentication/controllers/github-oauth.controller");
const LogoutController = require("@/modules/authentication/controllers/logout.controller");
const {
  enforceSigninBodyShape,
  handleAuthPayloadValidation,
  validateOauthCallbackPayload,
  validateSigninPayload,
} = require("@/modules/authentication/payload-validation");

const router = express.Router();

router.post(
  "/signin",
  authLimiter,
  enforceSigninBodyShape,
  validateSigninPayload(),
  handleAuthPayloadValidation,
  SigninController.userSignin.bind(SigninController)
);

router.get(
  "/signin/sso/google",
  GoogleOauthController.googleAuth.bind(GoogleOauthController)
);

router.get(
  "/signin/sso/google/callback",
  authLimiter,
  validateOauthCallbackPayload(),
  handleAuthPayloadValidation,
  GoogleOauthController.googleCallback.bind(GoogleOauthController)
);

router.get(
  "/signin/sso/github",
  GithubOauthController.githubAuth.bind(GithubOauthController)
);

router.get(
  "/signin/sso/github/callback",
  authLimiter,
  validateOauthCallbackPayload(),
  handleAuthPayloadValidation,
  GithubOauthController.githubCallback.bind(GithubOauthController)
);

router.post(
  "/logout",
  verifyToken,
  LogoutController.logout.bind(LogoutController)
);

module.exports = router;
