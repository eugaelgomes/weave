const express = require("express");
const SystemAuthController = require("@/modules/system-auth/system-auth.controller");
const { requireSystemAdmin } = require("@/modules/system-auth/system-auth.middleware");

const router = express.Router();

router.post(
    "/signin",
    SystemAuthController.systemAdminLogin.bind(SystemAuthController)
);

router.post(
    "/logout",
    SystemAuthController.systemAdminLogout.bind(SystemAuthController)
);

router.get(
    "/profile",
    requireSystemAdmin, SystemAuthController.getProfile.bind(SystemAuthController)
);

module.exports = router;
