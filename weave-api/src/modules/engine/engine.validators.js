const { validate } = require("@/middlewares/validation/validate");
const schemas = require("./schemas/engine.schema");
const {
  parseCsvStrings,
  parseIsoDateOnly,
  parseIsoDateTime,
  parsePagination,
  parseSort,
} = require("@/utils/http/list-query");

function isUuid(v) {
  return (
    typeof v === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      v
    )
  );
}

const SPRINT_SORT_FIELDS = ["start_date", "end_date", "sprint_number"];
const REASONING_SORT_FIELDS = ["created_at", "updated_at"];

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
    pagination = { limit: lim, offset: 0, page: 1 };
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
    filters: {
      end_from: parseIsoDateOnly(q.end_from) || parseIsoDateTime(q.end_from),
      end_to: parseIsoDateOnly(q.end_to) || parseIsoDateTime(q.end_to),
      start_from:
        parseIsoDateOnly(q.start_from) || parseIsoDateTime(q.start_from),
      start_to: parseIsoDateOnly(q.start_to) || parseIsoDateTime(q.start_to),
      status: statusFilter,
    },
    pagination,
    sort,
    useOffsetPagination: hasPaging,
  };
}

const validateGetSprints = [
  validate(schemas.engineContextParamSchema, "params"),
  validate(schemas.getSprintsSchema, "query"),
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
    pagination = { limit: lim, offset: 0, page: 1 };
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
    filters: {
      created_by: q.created_by && isUuid(q.created_by) ? q.created_by : null,
      from: parseIsoDateTime(q.from),
      is_dismissed: isDismissed,
      is_pinned: isPinned,
      is_read: isRead,
      reasoningType:
        q.reasoningType && typeof q.reasoningType === "string"
          ? q.reasoningType.trim().slice(0, 64)
          : null,
      sprintId: q.sprintId && isUuid(q.sprintId) ? q.sprintId : null,
      to: parseIsoDateTime(q.to),
    },
    pagination,
    sort,
    useOffsetPagination: hasPaging,
  };
}

const validateGetReasonings = [
  validate(schemas.engineContextParamSchema, "params"),
  validate(schemas.getReasoningsSchema, "query"),
  (req, res, next) => {
    attachParsedReasonings(req);
    next();
  },
];

/** GET /engine/:projectId/sprints */
const ENGINE_SPRINTS_LIST_TRIGGER_KEYS = [
  "page",
  "limit",
  "sort",
  "status",
  "start_from",
  "start_to",
  "end_from",
  "end_to",
];

/** GET /engine/:projectId/reasonings */
const ENGINE_REASONINGS_LIST_TRIGGER_KEYS = [
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

const validateEngineContextParam = [
  validate(schemas.engineContextParamSchema, "params"),
];

const validateReasoningParams = [
  validate(schemas.reasoningParamsSchema, "params"),
];

module.exports = {
  attachParsedReasonings,
  attachParsedSprints,
  ENGINE_REASONINGS_LIST_TRIGGER_KEYS,
  ENGINE_SPRINTS_LIST_TRIGGER_KEYS,
  validateEngineContextParam,
  validateGetReasonings,
  validateGetSprints,
  validateReasoningParams,
};
