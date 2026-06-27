const express = require("express");

// Controllers
const CreateUsersController = require("@/modules/users/controllers/create-users.controller");
const DeleteUsersController = require("@/modules/users/controllers/delete-users.controller");
const SearchUsersController = require("@/modules/users/controllers/search-users.controllers");
const UserDataController = require("@/modules/users/controllers/user-data.controller");

// Middlewares
const {
  structuralLimiter,
  standardTrafficLimiter,
  highTrafficLimiter,
} = require("@/middlewares/security/request-limiters");
const { verifyToken } = require("@/middlewares/auth/verify-token");
const { requireScope } = require("@/middlewares/auth/require-scope");
const { validate } = require("@/middlewares/validation/validate");
const {
  createAccountSchema,
  activateAccountSchema,
  checkUsernamePublicSchema,
  checkAvailabilitySchema,
  updateProfileSchema,
  searchUsersSchema,
  confirmDeleteAccountSchema,
} = require("./schemas/users.schema");

// Utils
const upload = require("@/utils/data/profile-img");
const validateCompressedImageSize = require("@/utils/image-validator");

const router = express.Router();

// Routes

// Create User
router.post(
  "/create-account",
  structuralLimiter,
  upload.single("profileImage"),
  validateCompressedImageSize,
  validate(createAccountSchema, "body"),
  CreateUsersController.createUser.bind(CreateUsersController)
);

// Activate User
router.post(
  "/activate-account",
  standardTrafficLimiter,
  validate(activateAccountSchema, "body"),
  CreateUsersController.activateAccount.bind(CreateUsersController)
);

// User Data
router.get(
  "/me",
  verifyToken,
  highTrafficLimiter,
  UserDataController.getProfile.bind(UserDataController)
);

// Check Username Availability (Authenticated)
router.get(
  "/check-availability",
  verifyToken,
  standardTrafficLimiter,
  validate(checkAvailabilitySchema, "query"),
  UserDataController.checkAvailability.bind(UserDataController)
);

// Check Username Availability (Public)
router.get(
  "/check-username",
  standardTrafficLimiter,
  validate(checkUsernamePublicSchema, "query"),
  UserDataController.checkUsernamePublic.bind(UserDataController)
);

// Update Profile
router.put(
  "/me/update-profile",
  verifyToken,
  standardTrafficLimiter,
  upload.single("profilePicture"),
  validateCompressedImageSize,
  validate(updateProfileSchema, "body"),
  UserDataController.updateProfile.bind(UserDataController)
);

// Search Users
router.get(
  "/search",
  verifyToken,
  highTrafficLimiter,
  requireScope("users:read"),
  validate(searchUsersSchema, "query"),
  (req, res, next) => {
    SearchUsersController.searchUsers(req, res, next);
  }
);

// Get Profile Image
router.get(
  "/my-profile-image",
  verifyToken,
  UserDataController.getProfileImage.bind(UserDataController)
);

// Get Profile Image Info
router.get(
  "/my-profile-image-info",
  verifyToken,
  UserDataController.getProfileImageInfo.bind(UserDataController)
);

// Delete User
router.delete(
  "/delete-my-account",
  verifyToken,
  DeleteUsersController.requestDeleteUser.bind(DeleteUsersController)
);

// Confirm Delete User
router.post(
  "/confirm-delete-account",
  validate(confirmDeleteAccountSchema, "body"),
  DeleteUsersController.confirmDeleteUser.bind(DeleteUsersController)
);

module.exports = router;
