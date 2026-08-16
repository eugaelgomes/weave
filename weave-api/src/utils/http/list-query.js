/**
 * Shared helpers for list endpoints: pagination, sorting, envelopes, CSV parsing.
 */

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * @param {unknown} value
 * @returns {boolean}
 */
function isUuid(value) {
  return typeof value === "string" && UUID_REGEX.test(value);
}

/**
 * @param {string} raw
 * @param {{ maxItems?: number }} [opts]
 * @returns {string[]}
 */
function parseCsvStrings(raw, opts = {}) {
  const maxItems = opts.maxItems ?? 50;
  if (!raw || typeof raw !== "string") return [];
  const parts = raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, maxItems);
  return parts;
}

/**
 * @param {string} raw
 * @param {{ maxItems?: number }} [opts]
 * @returns {string[]}
 */
function parseCsvUuid(raw, opts = {}) {
  const items = parseCsvStrings(raw, opts);
  return items.filter(isUuid);
}

/**
 * @param {string} raw
 * @param {string[]} allowed
 * @param {{ maxItems?: number }} [opts]
 * @returns {string[]}
 */
function parseCsvEnum(raw, allowed, opts = {}) {
  const upperAllowed = new Set(allowed.map((e) => String(e).toUpperCase()));
  const items = parseCsvStrings(raw, opts).map((s) => s.toUpperCase());
  return items.filter((x) => upperAllowed.has(x));
}

/**
 * @param {string|undefined} raw
 * @param {number} maxLen
 * @returns {string|null}
 */
function trimSearch(raw, maxLen) {
  if (raw === null || raw === undefined || typeof raw !== "string") return null;
  const t = raw.trim();
  if (!t) return null;
  return t.slice(0, maxLen);
}

/**
 * @param {string|undefined} raw
 * @returns {Date|null}
 */
function parseIsoDateTime(raw) {
  if (!raw || typeof raw !== "string") return null;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * @param {string|undefined} raw
 * @returns {string|null} YYYY-MM-DD fragment for date columns
 */
function parseIsoDateOnly(raw) {
  if (!raw || typeof raw !== "string") return null;
  const m = /^(\d{4}-\d{2}-\d{2})$/.exec(raw.trim());
  return m ? m[1] : null;
}

/**
 * @param {string} sortRaw
 * @param {string[]} allowedFields
 * @param {{ field: string, order: 'asc'|'desc' }} [defaults]
 * @returns {{ field: string, order: 'asc'|'desc' }}
 */
function parseSort(sortRaw, allowedFields, defaults) {
  const allowed = new Set(allowedFields);
  const defField = defaults?.field ?? allowedFields[0] ?? "created_at";
  const defOrder = defaults?.order ?? "desc";

  if (!sortRaw || typeof sortRaw !== "string") {
    return { field: defField, order: defOrder };
  }

  const parts = sortRaw.trim().split(":");
  const field = parts[0]?.trim() || defField;
  const orderRaw = (parts[1]?.trim() || defOrder).toLowerCase();
  const order = orderRaw === "asc" ? "asc" : "desc";

  if (!allowed.has(field)) {
    return { field: defField, order: defOrder };
  }

  return { field, order };
}

/**
 * @param {number|string|undefined} page
 * @param {number|string|undefined} limit
 * @param {{ defaultLimit?: number, maxLimit?: number }} [opts]
 * @returns {{ page: number, limit: number, offset: number }}
 */
function parsePagination(page, limit, opts = {}) {
  const defaultLimit = opts.defaultLimit ?? 20;
  const maxLimit = opts.maxLimit ?? 100;

  let p = parseInt(String(page), 10);
  let l = parseInt(String(limit), 10);

  if (!Number.isFinite(p) || p < 1) p = 1;
  if (!Number.isFinite(l) || l < 1) l = defaultLimit;
  l = Math.min(l, maxLimit);

  const offset = (p - 1) * l;
  return { limit: l, offset, page: p };
}

/**
 * @param {object} params
 * @param {unknown[]} params.data
 * @param {number} params.page
 * @param {number} params.limit
 * @param {number} params.total
 * @param {{ field: string, order: string }} params.sort
 * @param {Record<string, unknown>} params.filters
 * @param {string} params.legacyKey - e.g. "projects", "notes"
 * @returns {Record<string, unknown>}
 */
function buildListEnvelope({ data, page, limit, total, sort, filters, legacyKey }) {
  const totalPages = limit > 0 ? Math.max(1, Math.ceil(Number(total) / limit)) : 1;
  const hasNext = page * limit < Number(total);

  return {
    data,
    filters_applied: filters,
    [legacyKey]: data,
    pagination: {
      has_next: hasNext,
      limit,
      next_cursor: null,
      page,
      total: Number(total),
      total_pages: totalPages,
    },
    sort: {
      field: sort.field,
      order: sort.order,
    },
  };
}

/**
 * Returns true if client sent any query key that opts into list/filter behavior.
 *
 * @param {Record<string, unknown>} query - req.query
 * @param {string[]} keys
 * @returns {boolean}
 */
function hasAnyQueryKey(query, keys) {
  if (!query || typeof query !== "object") return false;
  return keys.some((k) => {
    const v = query[k];
    if (v === undefined || v === null) return false;
    if (typeof v === "string" && v.trim() === "") return false;
    return true;
  });
}

module.exports = {
  buildListEnvelope,
  hasAnyQueryKey,
  isUuid,
  parseCsvEnum,
  parseCsvStrings,
  parseCsvUuid,
  parseIsoDateOnly,
  parseIsoDateTime,
  parsePagination,
  parseSort,
  trimSearch,
};
