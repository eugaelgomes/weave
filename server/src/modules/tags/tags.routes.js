const { Router } = require("express");
const TagsController = require("@/modules/tags/controllers/tags.controller");
const { verifyToken } = require("@/middlewares/auth/verify-token");
const { requireOrgPermission } = require("@/middlewares/auth/require-org-permission");
const { ORG_PERMISSIONS } = require("@/modules/organizations/organization-role-policy");

const router = Router({ mergeParams: true });

const requireManageTags = requireOrgPermission(ORG_PERMISSIONS.MANAGE_TAGS);

router.use(verifyToken);

router.post(
  "/:project_id/tags",
  requireManageTags,
  TagsController.createTag.bind(TagsController)
);
router.get("/:project_id/tags", TagsController.getTags.bind(TagsController));
router.patch(
  "/:project_id/tags/:tag_id",
  requireManageTags,
  TagsController.updateTag.bind(TagsController)
);
router.delete(
  "/:project_id/tags/:tag_id",
  requireManageTags,
  TagsController.deleteTag.bind(TagsController)
);

// Backward compatibility during migration from org-scoped tags to project-scoped tags.
router.post(
  "/:org_id/tags",
  requireManageTags,
  TagsController.createTag.bind(TagsController)
);
router.get("/:org_id/tags", TagsController.getTags.bind(TagsController));
router.patch(
  "/:org_id/tags/:tag_id",
  requireManageTags,
  TagsController.updateTag.bind(TagsController)
);
router.delete(
  "/:org_id/tags/:tag_id",
  requireManageTags,
  TagsController.deleteTag.bind(TagsController)
);

module.exports = router;
