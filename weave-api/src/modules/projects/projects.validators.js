const { query, param, body, validationResult } = require("express-validator");
const {
  parseCsvEnum,
  parseCsvUuid,
  parseCsvStrings,
  parseIsoDateOnly,
  parseIsoDateTime,
  parsePagination,
  parseSort,
  trimSearch,
} = require("@/utils/http/list-query");

/** Route param names validated as UUID — invalid values yield HTTP 400. */
const UUID_PARAM_NAMES = new Set([
  "id",
  "projectId",
  "noteId",
  "stageId",
  "sprintId",
  "reasoningId",
  "collaboratorId",
  "itemId",
]);

/**
 * Query/body validation → 422; invalid UUID route params → 400.
 *
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
function validateRequest(req, res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const arr = errors.array();
    const paramErr = arr.some((e) => UUID_PARAM_NAMES.has(String(e.path)));
    const status = paramErr ? 400 : 422;
    return res.status(status).json({
      error: {
        message: paramErr ? "Invalid path parameters" : "Validation failed",
        details: arr.map((e) => ({
          path: e.path,
          msg: e.msg,
        })),
      },
    });
  }
  next();
}

function isUuid(v) {
  return (
    typeof v === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      v
    )
  );
}

const PROJECT_STATUSES = [
  "OPEN",
  "IN_PROGRESS",
  "PAUSED",
  "COMPLETED",
  "ARCHIVED",
];
const METHODOLOGIES = ["KANBAN", "SCRUM"];
const VISIBILITIES = ["PRIVATE", "ORG_WIDE", "PUBLIC"];
const OWNERSHIPS = ["owned", "collaborating", "all"];
const PROJECT_SORT_FIELDS = [
  "created_at",
  "updated_at",
  "title",
  "progress",
  "start_date",
  "target_end_date",
];
const PRIORITIES = ["alta", "media", "baixa"];
const PROJECT_MEMBER_ROLES = [
  "PROJECT_MANAGER",
  "CONTRIBUTOR",
  "COMMENTER",
  "VIEWER",
];
const NOTES_STATUSES = ["VISIBLE", "SECURE", "ARCHIVED"];
const NOTE_SORT_FIELDS = ["updated_at", "created_at", "due_date", "title"];
const STAGE_SORT_FIELDS = ["position", "name", "created_at"];
const SPRINT_SORT_FIELDS = ["start_date", "end_date", "sprint_number"];
const REASONING_SORT_FIELDS = ["created_at", "updated_at"];

const INCLUDE_PROJECT_LIST = ["collaborators", "notes", "subprojects"];

/**
 * @param {import('express').Request} req
 */
function attachParsedProjectsList(req) {
  const q = req.query;
  const pagination = parsePagination(q.page, q.limit);
  const sort = parseSort(q.sort, PROJECT_SORT_FIELDS, {
    field: "created_at",
    order: "desc",
  });

  const includeRaw = typeof q.include === "string" ? q.include : "";
  const includeParts = parseCsvStrings(includeRaw, { maxItems: 10 }).map((s) =>
    s.toLowerCase()
  );
  const include = INCLUDE_PROJECT_LIST.filter((k) => includeParts.includes(k));
  if (include.length === 0)
    include.push("collaborators", "notes", "subprojects");

  let parentOnly = true;
  if (q.parent_only !== undefined && q.parent_only !== "") {
    parentOnly = String(q.parent_only).toLowerCase() !== "false";
  }

  let hasParent = false;
  if (q.has_parent !== undefined && q.has_parent !== "") {
    hasParent = String(q.has_parent).toLowerCase() === "true";
  }

  let activeFilter = null;
  if (q.active !== undefined && q.active !== "") {
    activeFilter = String(q.active).toLowerCase() === "true";
  }

  const ownership =
    q.ownership && OWNERSHIPS.includes(String(q.ownership).toLowerCase())
      ? String(q.ownership).toLowerCase()
      : "all";

  req.parsedQuery = {
    pagination,
    sort,
    include,
    filters: {
      search: trimSearch(q.search, 120),
      status: parseCsvEnum(q.status, PROJECT_STATUSES, { maxItems: 10 }),
      methodology: parseCsvEnum(q.methodology, METHODOLOGIES, {
        maxItems: 10,
      }),
      visibility: parseCsvEnum(q.visibility, VISIBILITIES, { maxItems: 10 }),
      ownership,
      owner_user_id:
        q.owner_user_id && isUuid(q.owner_user_id) ? q.owner_user_id : null,
      collaborator_user_id:
        q.collaborator_user_id && isUuid(q.collaborator_user_id)
          ? q.collaborator_user_id
          : null,
      organization_id:
        q.organization_id && isUuid(q.organization_id)
          ? q.organization_id
          : null,
      parent_only: parentOnly,
      has_parent: hasParent,
      created_from: parseIsoDateTime(q.created_from),
      created_to: parseIsoDateTime(q.created_to),
      updated_from: parseIsoDateTime(q.updated_from),
      updated_to: parseIsoDateTime(q.updated_to),
      start_from: parseIsoDateOnly(q.start_from),
      start_to: parseIsoDateOnly(q.start_to),
      target_end_from: parseIsoDateOnly(q.target_end_from),
      target_end_to: parseIsoDateOnly(q.target_end_to),
      progress_min:
        q.progress_min !== undefined && q.progress_min !== ""
          ? Number(q.progress_min)
          : null,
      progress_max:
        q.progress_max !== undefined && q.progress_max !== ""
          ? Number(q.progress_max)
          : null,
      priority: parseCsvEnum(q.priority, PRIORITIES, { maxItems: 10 }).map(
        (p) => p.toLowerCase()
      ),
      tags: parseCsvStrings(q.tags, { maxItems: 50 }),
      active: activeFilter,
    },
  };
}

const validateGetProjects = [
  query("page").optional().isInt({ min: 1 }).toInt(),
  query("limit").optional().isInt({ min: 1, max: 100 }).toInt(),
  query("sort").optional().isString().trim().isLength({ max: 64 }),
  query("include").optional().isString().trim().isLength({ max: 200 }),
  query("search").optional().isString().trim().isLength({ max: 120 }),
  query("status").optional().isString().trim().isLength({ max: 200 }),
  query("methodology").optional().isString().trim().isLength({ max: 120 }),
  query("visibility").optional().isString().trim().isLength({ max: 120 }),
  query("ownership")
    .optional()
    .isIn(["owned", "collaborating", "all", "OWNED", "COLLABORATING", "ALL"]),
  query("owner_user_id").optional().isUUID(),
  query("collaborator_user_id").optional().isUUID(),
  query("organization_id").optional().isUUID(),
  query("parent_only").optional().isIn(["true", "false"]),
  query("has_parent").optional().isIn(["true", "false"]),
  query("created_from").optional().isISO8601(),
  query("created_to").optional().isISO8601(),
  query("updated_from").optional().isISO8601(),
  query("updated_to").optional().isISO8601(),
  query("start_from")
    .optional()
    .matches(/^\d{4}-\d{2}-\d{2}$/),
  query("start_to")
    .optional()
    .matches(/^\d{4}-\d{2}-\d{2}$/),
  query("target_end_from")
    .optional()
    .matches(/^\d{4}-\d{2}-\d{2}$/),
  query("target_end_to")
    .optional()
    .matches(/^\d{4}-\d{2}-\d{2}$/),
  query("progress_min").optional().isFloat({ min: 0, max: 100 }),
  query("progress_max").optional().isFloat({ min: 0, max: 100 }),
  query("priority").optional().isString().trim().isLength({ max: 80 }),
  query("tags").optional().isString().trim().isLength({ max: 2000 }),
  query("active").optional().isIn(["true", "false"]),
  validateRequest,
  (req, res, next) => {
    try {
      attachParsedProjectsList(req);
      const { filters } = req.parsedQuery;
      if (filters.parent_only && filters.has_parent) {
        return res.status(422).json({
          error: {
            message: "Validation failed",
            details: [
              {
                path: "has_parent",
                msg: "cannot combine parent_only=true with has_parent=true",
              },
            ],
          },
        });
      }
      if (
        filters.progress_min !== null &&
        filters.progress_min !== undefined &&
        filters.progress_max !== null &&
        filters.progress_max !== undefined &&
        filters.progress_min > filters.progress_max
      ) {
        return res.status(422).json({
          error: {
            message: "Validation failed",
            details: [
              {
                path: "progress_max",
                msg: "progress_max must be >= progress_min",
              },
            ],
          },
        });
      }
      next();
    } catch (e) {
      next(e);
    }
  },
];

/**
 * @param {import('express').Request} req
 */
function attachParsedProjectDetail(req) {
  const q = req.query;
  const includeRaw = typeof q.include === "string" ? q.include : "";
  const parts = parseCsvStrings(includeRaw, { maxItems: 10 }).map((s) =>
    s.toLowerCase()
  );
  const allowed = ["collaborators", "notes", "subprojects", "stages"];
  let include = allowed.filter((k) => parts.includes(k));
  if (include.length === 0) {
    include = ["collaborators", "notes"];
  }
  req.parsedQuery = { include };
}

const validateGetProjectById = [
  param("id").isUUID().withMessage("id must be a valid UUID"),
  query("include").optional().isString().trim().isLength({ max: 200 }),
  validateRequest,
  (req, res, next) => {
    attachParsedProjectDetail(req);
    next();
  },
];

/**
 * @param {import('express').Request} req
 */
function attachParsedStages(req) {
  const q = req.query;
  const pagination = parsePagination(q.page, q.limit);
  const sort = parseSort(q.sort, STAGE_SORT_FIELDS, {
    field: "position",
    order: "asc",
  });

  let includeDone = true;
  if (q.include_done !== undefined && q.include_done !== "") {
    includeDone = String(q.include_done).toLowerCase() !== "false";
  }

  req.parsedQuery = {
    pagination,
    sort,
    filters: {
      include_done: includeDone,
      search: trimSearch(q.search, 80),
    },
  };
}

const validateGetProjectStages = [
  param("id").isUUID().withMessage("id must be a valid UUID"),
  query("page").optional().isInt({ min: 1 }).toInt(),
  query("limit").optional().isInt({ min: 1, max: 100 }).toInt(),
  query("sort").optional().isString().trim().isLength({ max: 64 }),
  query("include_done").optional().isIn(["true", "false"]),
  query("search").optional().isString().trim().isLength({ max: 80 }),
  validateRequest,
  (req, res, next) => {
    attachParsedStages(req);
    next();
  },
];

/**
 * @param {import('express').Request} req
 */
function attachParsedNotes(req) {
  const q = req.query;
  const pagination = parsePagination(q.page, q.limit);
  const sort = parseSort(q.sort, NOTE_SORT_FIELDS, {
    field: "updated_at",
    order: "desc",
  });

  req.parsedQuery = {
    pagination,
    sort,
    filters: {
      search: trimSearch(q.search, 120),
      status: parseCsvEnum(q.status, NOTES_STATUSES, { maxItems: 10 }),
      priority_id: parseCsvUuid(q.priority_id, { maxItems: 20 }),
      tags: parseCsvUuid(q.tags, { maxItems: 50 }),
      stage_id: parseCsvUuid(q.stage_id, { maxItems: 20 }),
      created_by: parseCsvUuid(q.created_by, { maxItems: 20 }),
      collaborator_user_id: parseCsvUuid(q.collaborator_user_id, {
        maxItems: 20,
      }),
      due_from: parseIsoDateTime(q.due_from),
      due_to: parseIsoDateTime(q.due_to),
      created_from: parseIsoDateTime(q.created_from),
      created_to: parseIsoDateTime(q.created_to),
      updated_from: parseIsoDateTime(q.updated_from),
      updated_to: parseIsoDateTime(q.updated_to),
    },
  };
}

const validateGetProjectNotes = [
  param("projectId").isUUID().withMessage("projectId must be a valid UUID"),
  query("page").optional().isInt({ min: 1 }).toInt(),
  query("limit").optional().isInt({ min: 1, max: 100 }).toInt(),
  query("sort").optional().isString().trim().isLength({ max: 64 }),
  query("search").optional().isString().trim().isLength({ max: 120 }),
  query("status").optional().isString().trim().isLength({ max: 120 }),
  query("priority_id").optional().isString().trim().isLength({ max: 800 }),
  query("tags").optional().isString().trim().isLength({ max: 4000 }),
  query("stage_id").optional().isString().trim().isLength({ max: 800 }),
  query("created_by").optional().isString().trim().isLength({ max: 800 }),
  query("collaborator_user_id")
    .optional()
    .isString()
    .trim()
    .isLength({ max: 800 }),
  query("due_from").optional().isISO8601(),
  query("due_to").optional().isISO8601(),
  query("created_from").optional().isISO8601(),
  query("created_to").optional().isISO8601(),
  query("updated_from").optional().isISO8601(),
  query("updated_to").optional().isISO8601(),
  validateRequest,
  (req, res, next) => {
    attachParsedNotes(req);
    next();
  },
];

/**
 * @param {import('express').Request} req
 */
function attachParsedCollaborators(req) {
  const q = req.query;
  const pagination = parsePagination(q.page, q.limit);
  const sort = parseSort(q.sort, ["created_at", "role", "name"], {
    field: "created_at",
    order: "desc",
  });
  req.parsedQuery = {
    pagination,
    sort,
    filters: {
      role: parseCsvEnum(q.role, PROJECT_MEMBER_ROLES, { maxItems: 10 }),
      search: trimSearch(q.search, 80),
      added_from: parseIsoDateTime(q.added_from),
      added_to: parseIsoDateTime(q.added_to),
    },
  };
}

const validateGetProjectCollaborators = [
  param("projectId").isUUID().withMessage("projectId must be a valid UUID"),
  query("page").optional().isInt({ min: 1 }).toInt(),
  query("limit").optional().isInt({ min: 1, max: 100 }).toInt(),
  query("sort").optional().isString().trim().isLength({ max: 64 }),
  query("role").optional().isString().trim().isLength({ max: 120 }),
  query("search").optional().isString().trim().isLength({ max: 80 }),
  query("added_from").optional().isISO8601(),
  query("added_to").optional().isISO8601(),
  validateRequest,
  (req, res, next) => {
    attachParsedCollaborators(req);
    next();
  },
];

/**
 * Legacy: no `page` → cap limit at 50 (previous behavior). With `page` → offset pagination.
 *
 * @param {import('express').Request} req
 */
function attachParsedSprints(req) {
  const q = req.query;
  const hasPaging =
    q.page !== undefined && q.page !== null && String(q.page).trim() !== "";

  let pagination;
  if (hasPaging) {
    pagination = parsePagination(q.page, q.limit);
  } else {
    const lim = Math.min(parseInt(String(q.limit ?? 20), 10) || 20, 50);
    pagination = { page: 1, limit: lim, offset: 0 };
  }

  const sort = parseSort(q.sort, SPRINT_SORT_FIELDS, {
    field: "sprint_number",
    order: "desc",
  });

  const statusCsv = parseCsvStrings(q.status || "", { maxItems: 10 }).map((s) =>
    s.toLowerCase()
  );
  const allowedSprint = ["active", "completed", "planned", "cancelled"];
  const statusFilter = statusCsv.filter((s) => allowedSprint.includes(s));

  req.parsedQuery = {
    pagination,
    sort,
    useOffsetPagination: hasPaging,
    filters: {
      status: statusFilter,
      start_from:
        parseIsoDateOnly(q.start_from) || parseIsoDateTime(q.start_from),
      start_to: parseIsoDateOnly(q.start_to) || parseIsoDateTime(q.start_to),
      end_from: parseIsoDateOnly(q.end_from) || parseIsoDateTime(q.end_from),
      end_to: parseIsoDateOnly(q.end_to) || parseIsoDateTime(q.end_to),
    },
  };
}

const validateGetProjectSprints = [
  param("id").isUUID().withMessage("id must be a valid UUID"),
  query("page").optional().isInt({ min: 1 }).toInt(),
  query("limit").optional().isInt({ min: 1, max: 100 }).toInt(),
  query("sort").optional().isString().trim().isLength({ max: 64 }),
  query("status").optional().isString().trim().isLength({ max: 120 }),
  query("start_from").optional().isString().trim(),
  query("start_to").optional().isString().trim(),
  query("end_from").optional().isString().trim(),
  query("end_to").optional().isString().trim(),
  validateRequest,
  (req, res, next) => {
    attachParsedSprints(req);
    next();
  },
];

/**
 * @param {import('express').Request} req
 */
function attachParsedReasonings(req) {
  const q = req.query;
  const hasPaging =
    q.page !== undefined && q.page !== null && String(q.page).trim() !== "";

  let pagination;
  if (hasPaging) {
    pagination = parsePagination(q.page, q.limit);
  } else {
    const lim = Math.min(parseInt(String(q.limit ?? 20), 10) || 20, 50);
    pagination = { page: 1, limit: lim, offset: 0 };
  }

  const sort = parseSort(q.sort, REASONING_SORT_FIELDS, {
    field: "created_at",
    order: "desc",
  });

  let isRead = null;
  if (q.is_read !== undefined && q.is_read !== "") {
    isRead = String(q.is_read).toLowerCase() === "true";
  }
  let isPinned = null;
  if (q.is_pinned !== undefined && q.is_pinned !== "") {
    isPinned = String(q.is_pinned).toLowerCase() === "true";
  }
  let isDismissed = null;
  if (q.is_dismissed !== undefined && q.is_dismissed !== "") {
    isDismissed = String(q.is_dismissed).toLowerCase() === "true";
  }

  req.parsedQuery = {
    pagination,
    sort,
    useOffsetPagination: hasPaging,
    filters: {
      sprintId: q.sprintId && isUuid(q.sprintId) ? q.sprintId : null,
      reasoningType:
        q.reasoningType && typeof q.reasoningType === "string"
          ? q.reasoningType.trim().slice(0, 64)
          : null,
      from: parseIsoDateTime(q.from),
      to: parseIsoDateTime(q.to),
      is_read: isRead,
      is_pinned: isPinned,
      is_dismissed: isDismissed,
      created_by: q.created_by && isUuid(q.created_by) ? q.created_by : null,
    },
  };
}

const validateGetProjectReasonings = [
  param("id").isUUID().withMessage("id must be a valid UUID"),
  query("page").optional().isInt({ min: 1 }).toInt(),
  query("limit").optional().isInt({ min: 1, max: 100 }).toInt(),
  query("sort").optional().isString().trim().isLength({ max: 64 }),
  query("sprintId").optional().isUUID(),
  query("reasoningType").optional().isString().trim().isLength({ max: 64 }),
  query("from").optional().isISO8601(),
  query("to").optional().isISO8601(),
  query("is_read").optional().isIn(["true", "false"]),
  query("is_pinned").optional().isIn(["true", "false"]),
  query("is_dismissed").optional().isIn(["true", "false"]),
  query("created_by").optional().isUUID(),
  validateRequest,
  (req, res, next) => {
    attachParsedReasonings(req);
    next();
  },
];

/** Query keys that enable list envelope + filtering for GET /projects/:id/stages */
const PROJECT_STAGES_LIST_TRIGGER_KEYS = [
  "page",
  "limit",
  "sort",
  "include_done",
  "search",
];

/** GET /projects/:projectId/notes */
const PROJECT_NOTES_LIST_TRIGGER_KEYS = [
  "page",
  "limit",
  "sort",
  "search",
  "status",
  "priority_id",
  "tags",
  "stage_id",
  "created_by",
  "collaborator_user_id",
  "due_from",
  "due_to",
  "created_from",
  "created_to",
  "updated_from",
  "updated_to",
];

/** GET /projects/:projectId/collaborators */
const PROJECT_COLLABORATORS_LIST_TRIGGER_KEYS = [
  "page",
  "limit",
  "sort",
  "role",
  "search",
  "added_from",
  "added_to",
];

/** GET /projects/:id/sprints */
const PROJECT_SPRINTS_LIST_TRIGGER_KEYS = [
  "page",
  "limit",
  "sort",
  "status",
  "start_from",
  "start_to",
  "end_from",
  "end_to",
];

/** GET /projects/:id/reasonings */
const PROJECT_REASONINGS_LIST_TRIGGER_KEYS = [
  "page",
  "limit",
  "sort",
  "sprintId",
  "reasoningType",
  "from",
  "to",
  "is_read",
  "is_pinned",
  "is_dismissed",
  "created_by",
];

const validateProjectIdParam = [
  param("id").isUUID().withMessage("id must be a valid UUID"),
  validateRequest,
];

const validateReasoningParams = [
  param("id").isUUID().withMessage("id must be a valid UUID"),
  param("reasoningId").isUUID().withMessage("reasoningId must be a valid UUID"),
  validateRequest,
];

const validateGetMyViewPref = [
  param("id").isUUID().withMessage("id must be a valid UUID"),
  validateRequest,
];

const validateSetMyViewPref = [
  param("id").isUUID().withMessage("id must be a valid UUID"),
  body("view")
    .isIn(["board", "list"])
    .withMessage("view must be board or list"),
  validateRequest,
];

/** Query keys that enable list envelope + filtering for GET /projects */
const PROJECTS_LIST_TRIGGER_KEYS = [
  "page",
  "limit",
  "sort",
  "include",
  "search",
  "status",
  "methodology",
  "visibility",
  "ownership",
  "owner_user_id",
  "collaborator_user_id",
  "organization_id",
  "parent_only",
  "has_parent",
  "created_from",
  "created_to",
  "updated_from",
  "updated_to",
  "start_from",
  "start_to",
  "target_end_from",
  "target_end_to",
  "progress_min",
  "progress_max",
  "priority",
  "tags",
  "active",
];

module.exports = {
  PROJECT_COLLABORATORS_LIST_TRIGGER_KEYS,
  PROJECT_NOTES_LIST_TRIGGER_KEYS,
  PROJECT_REASONINGS_LIST_TRIGGER_KEYS,
  PROJECT_STAGES_LIST_TRIGGER_KEYS,
  PROJECT_SPRINTS_LIST_TRIGGER_KEYS,
  PROJECTS_LIST_TRIGGER_KEYS,
  attachParsedProjectsList,
  validateGetProjectById,
  validateGetProjectCollaborators,
  validateGetProjectNotes,
  validateGetProjectReasonings,
  validateGetProjects,
  validateGetProjectStages,
  validateGetProjectSprints,
  validateGetMyViewPref,
  validateProjectIdParam,
  validateReasoningParams,
  validateRequest,
  validateSetMyViewPref,
};
