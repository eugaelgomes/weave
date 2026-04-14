const { Router } = require("express");
const tagsController = require("./tags.controller");
const { verifyToken } = require("@/middlewares/verify-token");
const { requireOrgPermission } = require("@/middlewares/require-org-permission");
const { ORG_PERMISSIONS } = require("@/modules/organizations/organization-role-policy");

const router = Router({ mergeParams: true });

const requireManageTags = requireOrgPermission(ORG_PERMISSIONS.MANAGE_TAGS);

router.use(verifyToken);

router.post("/:project_id/tags", requireManageTags, tagsController.createTag);
router.get("/:project_id/tags", tagsController.getTags);
router.patch(
  "/:project_id/tags/:tag_id",
  requireManageTags,
  tagsController.updateTag
);
router.delete(
  "/:project_id/tags/:tag_id",
  requireManageTags,
  tagsController.deleteTag
);

// Backward compatibility during migration from org-scoped tags to project-scoped tags.
router.post("/:org_id/tags", requireManageTags, tagsController.createTag);
router.get("/:org_id/tags", tagsController.getTags);
router.patch(
  "/:org_id/tags/:tag_id",
  requireManageTags,
  tagsController.updateTag
);
router.delete(
  "/:org_id/tags/:tag_id",
  requireManageTags,
  tagsController.deleteTag
);

module.exports = router;
