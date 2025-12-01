const express = require("express");
const { body } = require("express-validator");

const { verifyToken } = require("@/middlewares/auth/auth-middleware");
const upload = require("@/middlewares/data/profile-img");
const { loginLimiter } = require("@/middlewares/security/limiters");
const validateImage = require("@/middlewares/data/image-validator");
const toString = require("@/middlewares/data/stringfy");

const AuthController = require("@/controllers/authentication/auth-controller");
const authController = require("@/controllers/authentication/auth-controller");

const router = express.Router();

router.post(
  "/signin",
  loginLimiter,
  [body("username").trim().escape(), body("password").trim()],
  toString,
  AuthController.login.bind(AuthController)
);

//router.get(
//  "/signin/sso/google",
//  AuthController.googleAuth.bind(AuthController)
//);
//
//router.get(
//  "/signin/sso/google/callback",
//  AuthController.googleCallback.bind(AuthController)
//);

router.get("/me", verifyToken, AuthController.getProfile.bind(AuthController));

router.put(
  "/me/update-profile",
  verifyToken,
  upload.single("profilePicture"),
  validateImage,
  authController.updateProfile.bind(authController)
);

router.post("/logout", verifyToken, AuthController.logout.bind(AuthController));

//router.post(
//  "/refresh",
//  AuthController.refreshToken.bind(AuthController)
//);

module.exports = router;
