const express = require("express");

const { verifyToken } = require("@/middlewares/auth/verify-token");
const { authLimiter } = require("@/middlewares/security/request-limiters");
const toString = require("@/utils/data/stringfy");

const SigninController = require("@/modules/authentication/controllers/signin.controller");
const GoogleOauthController = require("@/modules/authentication/controllers/google-oauth.controller");
const GithubOauthController = require("@/modules/authentication/controllers/github-oauth.controller");
const LogoutController = require("@/modules/authentication/controllers/logout.controller");
const { loginValidation } = require("@/utils/data/input-validation");

const router = express.Router();

router.post(
  "/signin",
  authLimiter,
  loginValidation(),
  toString,
  SigninController.userSignin.bind(SigninController)
);

router.get(
  "/signin/sso/google",
  GoogleOauthController.googleAuth.bind(GoogleOauthController)
);

router.get(
  "/signin/sso/google/callback",
  GoogleOauthController.googleCallback.bind(GoogleOauthController)
);

router.get(
  "/signin/sso/github",
  GithubOauthController.githubAuth.bind(GithubOauthController)
);

router.get(
  "/signin/sso/github/callback",
  GithubOauthController.githubCallback.bind(GithubOauthController)
);

router.post("/logout", verifyToken, LogoutController.logout.bind(LogoutController));

module.exports = router;
