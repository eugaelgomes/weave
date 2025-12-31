const express = require("express");
const UserController = require("@/controllers/users");
const NotesController = require("@/controllers/notes");
const dataValidator = require("@/middlewares/data/data-validator");
const upload = require("@/middlewares/data/profile-img");
const validateCompressedImageSize = require("@/utils/image-validator");
const { verifyToken } = require("@/middlewares/authentication");

const router = express.Router();

router.post(
  "/create-account",
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
  UserController.searchUsers(req, res, next);
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
