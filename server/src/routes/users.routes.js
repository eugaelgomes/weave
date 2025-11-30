const express = require("express");
const UserController = require("@/controllers/users-manager/user-controller");
const NotesController = require("@/controllers/notes-manager/notes-controller");
const dataValidator = require("@/middlewares/data/data-validator");
const upload = require("@/middlewares/data/profile-img");
const validateCompressedImageSize = require("@/middlewares/data/image-validator");
const { verifyToken } = require("@/middlewares/auth/auth-middleware");

const router = express.Router();

// --- Public routes ---
// POST /api/users/create-account - Create a new user account
router.post(
  "/create-account",
  upload.single("profileImage"),
  validateCompressedImageSize,
  dataValidator(),
  UserController.createUser.bind(UserController)
);

// --- Secure routes ---
// --- Routes that use only the logged-in user's token  ---

// GET /api/users/search - Search users for collaboration/social feats
router.get("/search", verifyToken, (req, res, next) => {
  NotesController.searchUsers(req, res, next);
});

// PUT /api/users/update-my-profile - get profile image of logged-in user
router.get(
  "/my-profile-image",
  verifyToken,
  UserController.getProfileImage.bind(UserController)
);

// PUT /api/users/update-my-profile - get profile image info of logged-in user
router.get(
  "/my-profile-image-info",
  verifyToken,
  UserController.getProfileImageInfo.bind(UserController)
);

// PUT /api/users/update-my-profile - delete user (logged-in user)
router.delete(
  "/delete-my-account",
  verifyToken,
  UserController.deleteUser.bind(UserController)
);

module.exports = router;
