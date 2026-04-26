const express = require("express");
const CreateUsersController = require("@/modules/users/controllers/create-users.controller");
const DeleteUsersController = require("@/modules/users/controllers/delete-users.controller");
const SearchUsersController = require("@/modules/users/controllers/search-users.controllers");
const UserDataController = require("@/modules/users/controllers/user-data.controller");
const {
  structuralLimiter,
  standardTrafficLimiter,
  highTrafficLimiter,
} = require("@/middlewares/security/request-limiters");
const { inputValidation } = require("@/utils/data/input-validation");
const upload = require("@/utils/data/profile-img");
const validateCompressedImageSize = require("@/utils/image-validator");
const { verifyToken } = require("@/middlewares/auth/verify-token");

const router = express.Router();

router.post(
  "/create-account",
  structuralLimiter,
  upload.single("profileImage"),
  validateCompressedImageSize,
  inputValidation(),
  CreateUsersController.createUser.bind(CreateUsersController)
);

router.post(
  "/activate-account",
  standardTrafficLimiter,
  CreateUsersController.activateAccount.bind(CreateUsersController)
);

router.get(
  "/me",
  verifyToken,
  highTrafficLimiter,
  UserDataController.getProfile.bind(UserDataController)
);

router.put(
  "/me/update-profile",
  verifyToken,
  standardTrafficLimiter,
  upload.single("profilePicture"),
  validateCompressedImageSize,
  UserDataController.updateProfile.bind(UserDataController)
);

router.get("/search", verifyToken, highTrafficLimiter, (req, res, next) => {
  SearchUsersController.searchUsers(req, res, next);
});

router.get(
  "/my-profile-image",
  verifyToken,
  UserDataController.getProfileImage.bind(UserDataController)
);

router.get(
  "/my-profile-image-info",
  verifyToken,
  UserDataController.getProfileImageInfo.bind(UserDataController)
);

router.delete(
  "/delete-my-account",
  verifyToken,
  DeleteUsersController.requestDeleteUser.bind(DeleteUsersController)
);

router.post(
  "/confirm-delete-account",
  DeleteUsersController.confirmDeleteUser.bind(DeleteUsersController)
);

module.exports = router;
