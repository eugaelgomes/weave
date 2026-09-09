const express = require("express");

// Controllers
const UsersController = require("@/modules/users/controllers/users.controller");
const OnboardingController = require("@/modules/users/controllers/onboarding.controller");

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
  resendActivationCodeSchema,
  checkUsernamePublicSchema,
  checkAvailabilitySchema,
  updateProfileSchema,
  searchUsersSchema,
  confirmDeleteAccountSchema,
} = require("./schemas/users.schema");
const { submitStepOneSchema, submitStepTwoSchema } = require("./schemas/onboarding.schema");

// Utils
const { multipartImageUpload } = require("@/utils/middlewares.util");
const {
  validateImageMimeAndSize: validateCompressedImageSize,
} = require("@/utils/middlewares.util");

const router = express.Router();

// Routes

// Create User
router.post(
  "/create-account",
  structuralLimiter,
  multipartImageUpload.single("profileImage"),
  validateCompressedImageSize,
  validate(createAccountSchema, "body"),
  UsersController.createUser.bind(UsersController)
);

// Activate User
router.post(
  "/activate-account",
  standardTrafficLimiter,
  validate(activateAccountSchema, "body"),
  UsersController.activateAccount.bind(UsersController)
);

router.post(
  "/resend-activation-code",
  standardTrafficLimiter,
  validate(resendActivationCodeSchema, "body"),
  UsersController.resendActivationCode.bind(UsersController)
);

// User Data
router.get(
  "/me",
  verifyToken,
  highTrafficLimiter,
  UsersController.getProfile.bind(UsersController)
);

// Onboarding Routes

router.post(
  "/me/onboarding/step-1",
  verifyToken,
  standardTrafficLimiter,
  validate(submitStepOneSchema, "body"),
  OnboardingController.submitStepOneProfile.bind(OnboardingController)
);

router.post(
  "/me/onboarding/step-2",
  verifyToken,
  standardTrafficLimiter,
  validate(submitStepTwoSchema, "body"),
  OnboardingController.submitStepTwoWorkspace.bind(OnboardingController)
);

router.post(
  "/me/onboarding/step-3-complete",
  verifyToken,
  standardTrafficLimiter,
  OnboardingController.completeOnboarding.bind(OnboardingController)
);

// Check Username Availability (Authenticated)
router.get(
  "/check-availability",
  verifyToken,
  standardTrafficLimiter,
  validate(checkAvailabilitySchema, "query"),
  UsersController.checkAvailability.bind(UsersController)
);

// Check Username Availability (Public)
router.get(
  "/check-username",
  standardTrafficLimiter,
  validate(checkUsernamePublicSchema, "query"),
  UsersController.checkUsernamePublic.bind(UsersController)
);

// Update Profile
router.put(
  "/me/update-profile",
  verifyToken,
  standardTrafficLimiter,
  multipartImageUpload.single("profilePicture"),
  validateCompressedImageSize,
  validate(updateProfileSchema, "body"),
  UsersController.updateProfile.bind(UsersController)
);

// Search Users
router.get(
  "/search",
  verifyToken,
  highTrafficLimiter,
  requireScope("users:read"),
  validate(searchUsersSchema, "query"),
  (req, res, next) => {
    UsersController.searchUsers(req, res, next);
  }
);

// Get Profile Image
router.get("/my-profile-image", verifyToken, UsersController.getProfileImage.bind(UsersController));

// Get Profile Image Info
router.get(
  "/my-profile-image-info",
  verifyToken,
  UsersController.getProfileImageInfo.bind(UsersController)
);

// Delete User
router.delete(
  "/delete-my-account",
  verifyToken,
  UsersController.requestDeleteUser.bind(UsersController)
);

// Confirm Delete User
router.post(
  "/confirm-delete-account",
  validate(confirmDeleteAccountSchema, "body"),
  UsersController.confirmDeleteUser.bind(UsersController)
);

module.exports = router;
