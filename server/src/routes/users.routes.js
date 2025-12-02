const express = require("express");
const UserController = require("@/controllers/users-manager/user-controller");
const NotesController = require("@/controllers/notes-manager/notes-controller");
const dataValidator = require("@/middlewares/data/data-validator");
const upload = require("@/middlewares/data/profile-img");
const validateCompressedImageSize = require("@/middlewares/data/image-validator");
const { verifyToken } = require("@/middlewares/auth/auth-middleware");

const router = express.Router();

router.post(
  "/create-account",
  upload.single("profileImage"),
  validateCompressedImageSize,
  dataValidator(),
  UserController.createUser.bind(UserController)
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
