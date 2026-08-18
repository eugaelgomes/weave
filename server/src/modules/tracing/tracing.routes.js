const express = require("express");
const TracingRepository = require("./repositories/tracing.repository");
const { verifyToken } = require("@/middlewares/auth/verify-token");
const { requireOrgPermission } = require("@/middlewares/auth/require-org-permission");
const { ORG_PERMISSIONS } = require("@/modules/organizations/organization-role-policy");

const router = express.Router();

router.use(verifyToken);
// We use a basic org permission for viewing settings
router.use(requireOrgPermission(ORG_PERMISSIONS.VIEW_MEMBER_DIRECTORY));

// Get tracing settings
router.get("/:organizationId/tracing/settings", async (req, res) => {
  try {
    const { organizationId } = req.params;
    let settings = await TracingRepository.getSettings(organizationId);
    if (!settings) {
      settings = { enabled: false, export_target: "local", retention_days: 7 };
    }
    return res.status(200).json(settings);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

// Update tracing settings (admin only)
router.put("/:organizationId/tracing/settings", requireOrgPermission(ORG_PERMISSIONS.MANAGE_GLOBAL_INTEGRATIONS), async (req, res) => {
  try {
    const { organizationId } = req.params;
    const { enabled, retention_days, export_target, otlp_endpoint, otlp_headers } = req.body;

    const updated = await TracingRepository.upsertSettings(organizationId, {
      enabled,
      export_target,
      otlp_endpoint,
      otlp_headers,
      retention_days,
    });

    return res.status(200).json(updated);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

module.exports = router;
