const { validate } = require("@/middlewares/validation/validate");
const schemas = require("./schemas/projects.schema");
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
  validate(schemas.getProjectsSchema, "query"),
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
  validate(schemas.projectIdParamSchema, "params"),
  validate(schemas.getProjectByIdSchema, "query"),
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
  validate(schemas.projectIdParamSchema, "params"),
  validate(schemas.getProjectStagesSchema, "query"),
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
  validate(schemas.projectIdParamSchema, "params"),
  validate(schemas.getProjectNotesSchema, "query"),
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
  validate(schemas.projectIdParamSchema, "params"),
  validate(schemas.getProjectCollaboratorsSchema, "query"),
  (req, res, next) => {
    attachParsedCollaborators(req);
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



const validateProjectIdParam = [
  validate(schemas.projectIdParamSchema, "params"),
];



const validateGetMyViewPref = [
  validate(schemas.projectIdParamSchema, "params"),
];

const validateSetMyViewPref = [
  validate(schemas.projectIdParamSchema, "params"),
  validate(schemas.setMyViewPrefSchema, "body"),
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
  PROJECT_STAGES_LIST_TRIGGER_KEYS,
  PROJECTS_LIST_TRIGGER_KEYS,
  attachParsedProjectsList,
  validateGetProjectById,
  validateGetProjectCollaborators,
  validateGetProjectNotes,
  validateGetProjects,
  validateGetProjectStages,
  validateGetMyViewPref,
  validateProjectIdParam,
  validateSetMyViewPref,
};
