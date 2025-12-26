const express = require("express");
const { body } = require("express-validator");
const UserController = require("@/controllers/users-manager/user-controller");
const NotesController = require("@/controllers/notes-manager/notes-controller");
const dataValidator = require("@/middlewares/data/data-validator");
const upload = require("@/middlewares/data/profile-img");
const validateCompressedImageSize = require("@/middlewares/data/image-validator");
const { verifyToken } = require("@/middlewares/auth/auth-middleware");

const router = express.Router();

router.post(
  "/create-account",
  [
    body("name").trim().escape(),
    body("username").trim().escape(),
    body("email").isEmail().normalizeEmail(),
    body("password").trim(),
  ],
  upload.single("profileImage"),
  validateCompressedImageSize,
  dataValidator(),
  UserController.createUser.bind(UserController)
);

router.post(
  "/activate-account",
  UserController.activateAccount.bind(UserController)
);

router.get("/me", verifyToken, UserController.getProfile.bind(UserController));

router.put(
  "/me/update-profile",
  verifyToken,
  upload.single("profilePicture"),
  validateCompressedImageSize,
  UserController.updateProfile.bind(UserController)
);

router.get("/search", verifyToken, (req, res, next) => {
  NotesController.searchUsers(req, res, next);
});

router.get(
  "/my-profile-image",
  verifyToken,
  UserController.getProfileImage.bind(UserController)
);

router.get(
  "/my-profile-image-info",
  verifyToken,
  UserController.getProfileImageInfo.bind(UserController)
);

router.delete(
  "/delete-my-account",
  verifyToken,
  UserController.deleteUser.bind(UserController)
);

module.exports = router;
