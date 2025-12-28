const express = require("express");
const { body } = require("express-validator");

const { verifyToken } = require("@/middlewares/auth/auth-middleware");
const { loginLimiter } = require("@/middlewares/security/limiters");
const toString = require("@/middlewares/data/stringfy");

const AuthController = require("@/controllers/authentication/auth-controller");

const router = express.Router();

router.post(
  "/signin",
  loginLimiter,
  [body("username").trim().escape(), body("password").trim()],
  toString,
  AuthController.login.bind(AuthController)
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
