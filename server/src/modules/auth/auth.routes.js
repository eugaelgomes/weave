const express = require("express");

const { verifyToken } = require("@/middlewares/authentication");
const { requestLimiter } = require("@/middlewares/security/limiters");
const toString = require("@/middlewares/data/stringfy");

const AuthController = require("@/modules/auth/auth.controller");
const { loginValidation } = require("../../middlewares/data/input-validation");

const router = express.Router();

router.post(
  "/signin",
  requestLimiter,
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

router.post("/logout", verifyToken, AuthController.logout.bind(AuthController));

//router.post(
//  "/refresh",
//  AuthController.refreshToken.bind(AuthController)
//);

module.exports = router;
