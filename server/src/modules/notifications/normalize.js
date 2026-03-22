const ROLE_LABELS = {
	super_admin: "super admin",
	admin: "admin",
	member: "membro",
	guest: "convidado",
	viewer: "visualizador",
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
		} catch (error) {
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
		return value
			.map((item) => sanitizeValue(item))
			.filter((item) => item !== undefined);
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
		"Você possui uma nova notificação.";

	const resolvedSummary =
		cleanSentence(options.summary) ||
		cleanSentence(rawContent.summary) ||
		resolvedMessage;

	const resolvedDescription =
		cleanSentence(options.description) ||
		cleanSentence(rawContent.description) ||
		resolvedSummary;

	const normalizedContent = {
		key: buildContentKey(payload.type, actionKey),
		message: resolvedMessage,
		preview: cleanSentence(rawContent.preview) || resolvedSummary,
		summary: resolvedSummary,
		description: resolvedDescription,
		action: options.actionText || null,
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
			type: payload.entityType || null,
			id: payload.entityId || null,
			name: entityName,
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
			`Você foi adicionado(a) à organização ${
				organizationName || "Weave Notes"
			}${roleLabel ? ` como ${roleLabel}` : ""}.`;

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
			`${inviterName || "Um membro"} convidou você para a organização ${
				organizationName || "Weave Notes"
			}${roleLabel ? ` como ${roleLabel}` : ""}.`;

		return createBaseContent(payload, {
			actionKey,
			entityName: organizationName,
			message,
			actionText: "Acesse suas organizações para aceitar ou recusar o convite.",
		});
	}

	if (actionKey === "invite_accepted") {
		const newMemberName = payload.content?.new_member_name;
		const message =
			payload.content?.message ||
			`${newMemberName || "Um novo membro"} aceitou seu convite e agora faz parte da organização ${organizationName || "Weave Notes"}.`;

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
			`Você foi adicionado(a) ao projeto ${projectTitle || "sem título"}${
				roleLabel ? ` como ${roleLabel}` : ""
			}.`;

		return createBaseContent(payload, {
			actionKey,
			entityName: projectTitle,
			message,
			actionText: "Abra o projeto para começar a colaborar.",
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
			`Sua permissão no projeto ${projectTitle || "sem título"} foi atualizada para ${roleLabel || "uma nova função"}.`;

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
			`${sharedByName || "O proprietário"} compartilhou a nota ${noteTitle || "sem título"} com você.`;

		return createBaseContent(payload, {
			actionKey,
			entityName: noteTitle,
			message,
			actionText: "Abra a nota e comece a colaborar.",
		});
	}

	return null;
};

const buildJobActionContent = (payload) => {
	const actionKey = payload.content?.action;

	if (actionKey === "backup_completed") {
		const expiresAt = payload.content?.expires_at;
		const formattedExpiration = formatDateTime(expiresAt);
		const baseMessage = "Seu backup está pronto para download.";
		const message =
			payload.content?.message ||
			`${baseMessage}${formattedExpiration ? ` O link expira em ${formattedExpiration}.` : ""}`;

		return createBaseContent(payload, {
			actionKey,
			entityName: payload.content?.job_name || null,
			message,
			actionText: "Baixe o backup em até 48 horas para evitar expiração.",
			url: payload.content?.download_url,
		});
	}

	return null;
};

const builders = {
	organization_action: buildOrganizationActionContent,
	organization_invite: buildOrganizationInviteContent,
	project_invite: buildProjectInviteContent,
	project_action: buildProjectActionContent,
	note_shared: buildNoteSharedContent,
	job_action: buildJobActionContent,
};

const defaultBuilder = (payload) => createBaseContent(payload);

const normalizeNotificationPayload = (payload = {}) => {
	const safePayload = {
		...payload,
		title:
			typeof payload.title === "string" && payload.title.trim().length > 0
				? payload.title.trim()
				: "Notificação",
	};

	safePayload.content = ensureObject(payload.content);

	const builder = builders[safePayload.type];
	const normalizedContent = builder
		? builder(safePayload) || defaultBuilder(safePayload)
		: defaultBuilder(safePayload);

	return {
		...payload,
		title: safePayload.title,
		content: normalizedContent,
	};
};

module.exports = {
	normalizeNotificationPayload,
};
