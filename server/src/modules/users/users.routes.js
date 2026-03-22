const express = require("express");
const userController = require("@/modules/users/users.controller");
const {
  structuralLimiter,
  standardTrafficLimiter,
  highTrafficLimiter,
} = require("@/middlewares/request-limiters");
const { inputValidation } = require("@/utils/data/input-validation");
const upload = require("@/utils/data/profile-img");
const validateCompressedImageSize = require("@/utils/image-validator");
const { verifyToken } = require("@/middlewares/verify-token");

const router = express.Router();

router.post(
  "/create-account",
  structuralLimiter,
  upload.single("profileImage"),
  validateCompressedImageSize,
  inputValidation(),
  userController.createUser.bind(userController)
);

router.post(
  "/activate-account",
  standardTrafficLimiter,
  userController.activateAccount.bind(userController)
);

router.get(
  "/me",
  verifyToken,
  highTrafficLimiter,
  userController.getProfile.bind(userController)
);

router.put(
  "/me/update-profile",
  verifyToken,
  standardTrafficLimiter,
  upload.single("profilePicture"),
  validateCompressedImageSize,
  userController.updateProfile.bind(userController)
);

router.get("/search", verifyToken, highTrafficLimiter, (req, res, next) => {
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
