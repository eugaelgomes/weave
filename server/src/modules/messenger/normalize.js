const ROLE_LABELS = {
  admin: "admin",
  guest: "guest",
  member: "member",
  super_admin: "super admin",
  viewer: "viewer",
};

const RESERVED_CONTEXT_KEYS = new Set(["message", "summary", "description", "preview"]);

const ensureObject = (value) => {
  if (!value) {
    return {};
  }

  if (typeof value === "object") {
    return value;
  }

  if (typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch {
      return {};
    }
  }

  return {};
};

const sanitizeValue = (value) => {
  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return null;
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (typeof value === "bigint") {
    return value.toString();
  }

  if (Array.isArray(value)) {
    return value.map((item) => sanitizeValue(item)).filter((item) => item !== undefined);
  }

  if (typeof value === "object") {
    return Object.entries(value).reduce((acc, [key, nestedValue]) => {
      const sanitized = sanitizeValue(nestedValue);
      if (sanitized !== undefined) {
        acc[key] = sanitized;
      }
      return acc;
    }, {});
  }

  return value;
};

const sanitizeContext = (source) => {
  if (!source || typeof source !== "object") {
    return {};
  }

  return Object.entries(source).reduce((acc, [key, value]) => {
    if (RESERVED_CONTEXT_KEYS.has(key) || key === "action") {
      return acc;
    }

    const sanitized = sanitizeValue(value);
    if (sanitized !== undefined) {
      acc[key] = sanitized;
    }

    return acc;
  }, {});
};

const formatRole = (role) => {
  if (!role || typeof role !== "string") {
    return null;
  }

  const normalized = role.toLowerCase();
  return ROLE_LABELS[normalized] || normalized;
};

const cleanSentence = (text) => {
  if (!text) {
    return "";
  }

  return String(text).replace(/\s+/g, " ").trim();
};

const formatDateTime = (value) => {
  if (!value) {
    return null;
  }

  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date;
};

const buildContentKey = (type, actionKey) => {
  const normalizedType = type || "notification";
  const normalizedAction = actionKey || "generic";

  return `${normalizedType}.${normalizedAction}`;
};

const createBaseContent = (payload, options = {}) => {
  const rawContent = ensureObject(payload.content);
  const rawActionKey = rawContent.action;

  const actionKey = options.actionKey || rawActionKey || null;
  const sanitizedContext = sanitizeContext(rawContent);
  const extraContext = sanitizeContext(options.contextExtras || {});
  const context = { ...sanitizedContext, ...extraContext };

  if (actionKey && !context.event_key) {
    context.event_key = actionKey;
  }

  const resolvedMessage =
    cleanSentence(options.message) ||
    cleanSentence(rawContent.message) ||
    payload.title ||
    "You have a new notification.";

  const resolvedSummary =
    cleanSentence(options.summary) || cleanSentence(rawContent.summary) || resolvedMessage;

  const resolvedDescription =
    cleanSentence(options.description) || cleanSentence(rawContent.description) || resolvedSummary;

  const normalizedContent = {
    action: options.actionText || null,
    description: resolvedDescription,
    key: buildContentKey(payload.type, actionKey),
    message: resolvedMessage,
    preview: cleanSentence(rawContent.preview) || resolvedSummary,
    summary: resolvedSummary,
  };

  const resolvedUrl = options.url || rawContent.url;
  if (resolvedUrl) {
    normalizedContent.url = resolvedUrl;
  }

  const entityName =
    options.entityName ||
    rawContent.entity_name ||
    rawContent.organization_name ||
    rawContent.project_title ||
    rawContent.note_title ||
    null;

  if (payload.entityType || payload.entityId || entityName) {
    normalizedContent.entity = {
      id: payload.entityId || null,
      name: entityName,
      type: payload.entityType || null,
    };
  }

  if (Object.keys(context).length > 0) {
    normalizedContent.context = context;
  }

  return normalizedContent;
};

const buildOrganizationActionContent = (payload) => {
  const actionKey = payload.content?.action;
  const organizationName = payload.content?.organization_name;
  const roleLabel = formatRole(payload.content?.role);

  if (actionKey === "member_added") {
    const message =
      payload.content?.message ||
      `You have been added to the workspace ${
        organizationName || "Weave"
      }${roleLabel ? ` as ${roleLabel}` : ""}.`;

    return createBaseContent(payload, {
      actionKey,
      entityName: organizationName,
      message,
    });
  }

  return null;
};

const buildOrganizationInviteContent = (payload) => {
  const actionKey = payload.content?.action;
  const organizationName = payload.content?.organization_name;
  const roleLabel = formatRole(payload.content?.role);

  if (actionKey === "invite_sent") {
    const inviterName = payload.content?.inviter_name;
    const message =
      payload.content?.message ||
      `${inviterName || "A member"} invited you to the workspace ${
        organizationName || "Weave"
      }${roleLabel ? ` as ${roleLabel}` : ""}.`;

    return createBaseContent(payload, {
      actionKey,
      actionText: "Access your workspaces to accept or decline the invite.",
      entityName: organizationName,
      message,
    });
  }

  if (actionKey === "invite_accepted") {
    const newMemberName = payload.content?.new_member_name;
    const message =
      payload.content?.message ||
      `${newMemberName || "A new member"} accepted your invite and is now part of the workspace ${organizationName || "Weave"}.`;

    return createBaseContent(payload, {
      actionKey,
      entityName: organizationName,
      message,
    });
  }

  return null;
};

const buildProjectInviteContent = (payload) => {
  const actionKey = payload.content?.action;
  const projectTitle = payload.content?.project_title;
  const roleLabel = formatRole(payload.content?.role);

  if (actionKey === "collaborator_added") {
    const message =
      payload.content?.message ||
      `You have been added to the project ${projectTitle || "untitled"}${
        roleLabel ? ` as ${roleLabel}` : ""
      }.`;

    return createBaseContent(payload, {
      actionKey,
      actionText: "Open the project to start collaborating.",
      entityName: projectTitle,
      message,
    });
  }

  return null;
};

const buildProjectActionContent = (payload) => {
  const actionKey = payload.content?.action;
  const projectTitle = payload.content?.project_title;
  const roleLabel = formatRole(payload.content?.role);

  if (actionKey === "collaborator_updated") {
    const message =
      payload.content?.message ||
      `Your permission in the project ${projectTitle || "untitled"} was updated to ${roleLabel || "a new role"}.`;

    return createBaseContent(payload, {
      actionKey,
      entityName: projectTitle,
      message,
    });
  }

  return null;
};

const buildNoteSharedContent = (payload) => {
  const actionKey = payload.content?.action;
  const noteTitle = payload.content?.note_title;

  if (actionKey === "collaborator_added") {
    const sharedByName = payload.content?.shared_by_name;
    const message =
      payload.content?.message ||
      `${sharedByName || "The owner"} shared the note ${noteTitle || "untitled"} with you.`;

    return createBaseContent(payload, {
      actionKey,
      actionText: "Open the note and start collaborating.",
      entityName: noteTitle,
      message,
    });
  }

  if (actionKey === "note_updated") {
    const updatedByName = payload.content?.updated_by_name;
    const changedFields = payload.content?.changed_fields || [];

    let changesText = "";
    if (changedFields.length > 0) {
      if (changedFields.length === 1) {
        changesText = ` (changed: ${changedFields[0]})`;
      } else {
        changesText = ` (changed: ${changedFields.slice(0, -1).join(", ")} and ${changedFields[changedFields.length - 1]})`;
      }
    }

    const message =
      payload.content?.message ||
      `${updatedByName || "A collaborator"} updated the note ${noteTitle || "untitled"}${changesText}.`;

    return createBaseContent(payload, {
      actionKey,
      actionText: "Review the changes in the note.",
      entityName: noteTitle,
      message,
    });
  }

  if (actionKey === "comment_added") {
    const commenterName = payload.content?.commenter_name;
    const message =
      payload.content?.message ||
      `${commenterName || "A collaborator"} commented on the note ${noteTitle || "untitled"}.`;

    return createBaseContent(payload, {
      actionKey,
      actionText: "Read and reply to the comment.",
      entityName: noteTitle,
      message,
    });
  }

  return null;
};

const buildJobActionContent = (payload) => {
  const actionKey = payload.content?.action;

  if (actionKey === "backup_completed") {
    const expiresAt = payload.content?.expires_at;
    const formattedExpiration = formatDateTime(expiresAt);
    const baseMessage = "Your backup is ready for download.";
    const message =
      payload.content?.message ||
      `${baseMessage}${formattedExpiration ? ` The link expires at ${formattedExpiration}.` : ""}`;

    return createBaseContent(payload, {
      actionKey,
      actionText: "Download the backup within 48 hours to avoid expiration.",
      entityName: payload.content?.job_name || null,
      message,
      url: payload.content?.download_url,
    });
  }

  return null;
};

const builders = {
  job_action: buildJobActionContent,
  note_shared: buildNoteSharedContent,
  organization_action: buildOrganizationActionContent,
  organization_invite: buildOrganizationInviteContent,
  project_action: buildProjectActionContent,
  project_invite: buildProjectInviteContent,
};

const defaultBuilder = (payload) => createBaseContent(payload);

const normalizeNotificationPayload = (payload = {}) => {
  const safePayload = {
    ...payload,
    title:
      typeof payload.title === "string" && payload.title.trim().length > 0
        ? payload.title.trim()
        : "Notification",
  };

  safePayload.content = ensureObject(payload.content);

  const builder = builders[safePayload.type];
  const normalizedContent = builder
    ? builder(safePayload) || defaultBuilder(safePayload)
    : defaultBuilder(safePayload);

  return {
    ...payload,
    content: normalizedContent,
    title: safePayload.title,
  };
};

module.exports = {
  normalizeNotificationPayload,
};
