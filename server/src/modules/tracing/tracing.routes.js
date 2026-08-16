const express = require("express");
const TracingRepository = require("./repositories/tracing.repository");
// Assume standard auth/rbac middleware exists
const requireAuth = require("@/middlewares/requireAuth");
const requireOrgMember = require("@/middlewares/requireOrgMember");
const requireOrgAdmin = require("@/middlewares/requireOrgAdmin");

const router = express.Router();

router.use(requireAuth);
router.use(requireOrgMember);

// Get tracing settings
router.get("/:organizationId/tracing/settings", async (req, res) => {
  try {
    const { organizationId } = req.params;
    let settings = await TracingRepository.getSettings(organizationId);
    if (!settings) {
      settings = { enabled: false, retention_days: 7, export_target: "local" };
    }
    return res.status(200).json(settings);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

// Update tracing settings (admin only)
router.put("/:organizationId/tracing/settings", requireOrgAdmin, async (req, res) => {
  try {
    const { organizationId } = req.params;
    const { enabled, retention_days, export_target, otlp_endpoint, otlp_headers } = req.body;

    const updated = await TracingRepository.upsertSettings(organizationId, {
      enabled,
      retention_days,
      export_target,
      otlp_endpoint,
      otlp_headers,
    });

    return res.status(200).json(updated);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal server error" });
  }
});

module.exports = router;
