const { Router } = require("express");
const tagsController = require("./tags.controller");
const { verifyToken } = require("@/middlewares/verify-token");

const router = Router({ mergeParams: true });

router.use(verifyToken);

router.post("/:project_id/tags", tagsController.createTag);
router.get("/:project_id/tags", tagsController.getTags);
router.patch("/:project_id/tags/:tag_id", tagsController.updateTag);
router.delete("/:project_id/tags/:tag_id", tagsController.deleteTag);

// Backward compatibility during migration from org-scoped tags to project-scoped tags.
router.post("/:org_id/tags", tagsController.createTag);
router.get("/:org_id/tags", tagsController.getTags);
router.patch("/:org_id/tags/:tag_id", tagsController.updateTag);
router.delete("/:org_id/tags/:tag_id", tagsController.deleteTag);

module.exports = router;
