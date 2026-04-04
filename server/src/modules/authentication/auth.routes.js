const express = require("express");

const { verifyToken } = require("@/middlewares/verify-token");
const { authLimiter } = require("@/middlewares/request-limiters");
const toString = require("@/utils/data/stringfy");

const AuthController = require("@/modules/authentication/auth.controller");
const { loginValidation } = require("@/utils/data/input-validation");

const router = express.Router();

router.post(
  "/signin",
  authLimiter,
  loginValidation(),
  toString,
  AuthController.userSignin.bind(AuthController)
);

router.get(
  "/signin/sso/google",
  AuthController.googleAuth.bind(AuthController)
);

router.get(
  "/signin/sso/google/callback",
  AuthController.googleCallback.bind(AuthController)
);

router.get(
  "/signin/sso/github",
  AuthController.githubAuth.bind(AuthController)
);

router.get(
  "/signin/sso/github/callback",
  AuthController.githubCallback.bind(AuthController)
);

router.post("/logout", verifyToken, AuthController.logout.bind(AuthController));

//router.post(
//  "/refresh",
//  AuthController.refreshToken.bind(AuthController)
//);

module.exports = router;
