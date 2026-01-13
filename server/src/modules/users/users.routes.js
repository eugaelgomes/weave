const express = require("express");
const userController = require("@/modules/users/users.controller");
const { requestLimiter } = require("@/middlewares/security/limiters");
const { inputValidation } = require("@/middlewares/data/input-validation");
const upload = require("@/middlewares/data/profile-img");
const validateCompressedImageSize = require("@/utils/image-validator");
const { verifyToken } = require("@/middlewares/authentication");

const router = express.Router();

router.post(
  "/create-account",
  upload.single("profileImage"),
  requestLimiter,
  validateCompressedImageSize,
  inputValidation(),
  userController.createUser.bind(userController)
);

router.post(
  "/activate-account",
  requestLimiter,
  userController.activateAccount.bind(userController)
);

router.get("/me", verifyToken, userController.getProfile.bind(userController));

router.put(
  "/me/update-profile",
  verifyToken,
  upload.single("profilePicture"),
  validateCompressedImageSize,
  userController.updateProfile.bind(userController)
);

router.get("/search", verifyToken, (req, res, next) => {
  userController.searchUsers(req, res, next);
});

router.get(
  "/my-profile-image",
  verifyToken,
  userController.getProfileImage.bind(userController)
);

router.get(
  "/my-profile-image-info",
  verifyToken,
  userController.getProfileImageInfo.bind(userController)
);

router.delete(
  "/delete-my-account",
  verifyToken,
  userController.requestDeleteUser.bind(userController)
);

router.post(
  "/confirm-delete-account",
  userController.confirmDeleteUser.bind(userController)
);

module.exports = router;
