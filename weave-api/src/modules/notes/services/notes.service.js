const notesRepository = require("@/modules/notes/notes.repository");

const projectsRepository = require("@/modules/projects/repositories/projects.repository");
const organizationsRepository = require("@/modules/organizations/repositories/organizations.repository");
const taskPrioritiesRepository = require("@/modules/task-priorities/repositories/task-priorities.repository");
const PlansService = require("@/modules/plans/services/plans.service");
const PlansRepository = require("@/modules/plans/repositories/plans.repository");
const spacesService = require("@/services/storage");
const { AppError, ERROR_CODES } = require("@/errors");
const {
  orgRoleHasPermission,
  ORG_PERMISSIONS,
} = require("@/modules/organizations/organization-role-policy");
const { PLAN_PATHS } = require("@/modules/plans/utils/plan-paths.util");
const {
  ALLOWED_NOTE_STATUSES,
  normalizeNoteStatus,
} = require("@/utils/patterns/product-patterns");
const { normalizeBlocksTree } = require("../block-normalizer");
const {
  resolveNoteTitle,
  deriveTitleFromBlocks,
} = require("@/modules/notes/utils/derive-note-title");
const {
  resolveProjectIdToUuid,
} = require("@/modules/projects/utils/project-id-lookup.util");

class PlanLimitError extends Error {
  constructor(message, limitKey, resource) {
    super(message);
    this.name = "PlanLimitError";
    this.limitKey = limitKey;
    this.resource = resource;
  }
}

class NoteConflictError extends Error {
  constructor(message, conflictFields, currentRevision, serverNote, noteId) {
    super(message);
    this.name = "NoteConflictError";
    this.conflictFields = conflictFields;
    this.currentRevision = currentRevision;
    this.serverNote = serverNote;
    this.noteId = noteId;
  }
}

class NotesService {
  constructor() {
    this.notesRepository = notesRepository;
  }

  _canAccessAllOrganizationProjects(membership) {
    if (!membership?.id) return false;
    return orgRoleHasPermission(
      membership.member_role,
      ORG_PERMISSIONS.ACCESS_ALL_ORG_PROJECTS
    );
  }

  async _hasOrgWideAccessToProjectNote(note, userId) {
    if (!note?.project_id) return false;
    const membership =
      await organizationsRepository.getActiveOrganizationWithMembership(userId);
    if (!this._canAccessAllOrganizationProjects(membership) || !membership.id)
      return false;
    const rows = await projectsRepository.getProjectByIdWithOrgScope(
      String(note.project_id),
      membership.id
    );
    return Boolean(rows?.length);
  }

  async _getOrgWideNotesScopeOrganizationId(userId) {
    const membership =
      await organizationsRepository.getActiveOrganizationWithMembership(userId);
    if (this._canAccessAllOrganizationProjects(membership) && membership.id)
      return membership.id;
    return null;
  }

  async _validateNoteAccess(noteId, userId) {
    if (!noteId) throw AppError.badRequest("Note ID is required");
    const note = await this.notesRepository.getNoteById(noteId);
    if (!note)
      throw AppError.notFound("Note not found", ERROR_CODES.NOTE_NOT_FOUND);

    const isOwner = note.user_id === userId;
    const isCollaborator = await this.notesRepository.isCollaborator(
      noteId,
      userId
    );

    if (isOwner || isCollaborator) {
      return { hasOrgProjectAccess: false, isCollaborator, isOwner, note };
    }

    const hasOrgProjectAccess = await this._hasOrgWideAccessToProjectNote(
      note,
      userId
    );
    if (hasOrgProjectAccess) {
      return {
        hasOrgProjectAccess: true,
        isCollaborator: false,
        isOwner: false,
        note,
      };
    }

    throw AppError.forbidden("Access denied");
  }

  async _validateNoteOwnership(noteId, userId) {
    if (!noteId) throw AppError.badRequest("Note ID is required");
    const note = await this.notesRepository.getNoteById(noteId);
    if (!note)
      throw AppError.notFound("Note not found", ERROR_CODES.NOTE_NOT_FOUND);

    if (note.user_id === userId) return note;

    const hasOrgProjectAccess = await this._hasOrgWideAccessToProjectNote(
      note,
      userId
    );
    if (hasOrgProjectAccess) return note;

    throw AppError.forbidden("Access denied");
  }

  _formatNoteResponse(note, blocks = [], options = {}) {
    const { includeBlocks = true } = options;
    const projectId = note.project_id ? String(note.project_id) : null;
    return {
      associated_project: projectId
        ? {
            id: projectId,
            name: note.project_name || "",
            stage_id: note.project_stage_id
              ? String(note.project_stage_id)
              : null,
            stage_name: note.project_stage_name || null,
          }
        : null,
      blocks: includeBlocks && Array.isArray(blocks) ? blocks : [],
      created_at: note.created_at,
      description: note.description,
      due_date: note.due_date ?? null,
      id: note.id === undefined || note.id === null ? "" : String(note.id),
      priority_color: note.priority_color ?? null,
      priority_id: note.priority_id ?? null,
      priority_name: note.priority_name ?? null,
      properties: note.properties || {},
      public_id: note.public_note_id || null,
      revision:
        note.revision === undefined || note.revision === null
          ? null
          : Number(note.revision),
      status: note.status,
      tags: note.tags || [],
      title: note.title,
      updated_at: note.updated_at,
    };
  }

  // ==========================================
  // CRUD Operations
  // ==========================================

  async getNoteById(noteId, userId) {
    const { note, isOwner, isCollaborator, hasOrgProjectAccess } =
      await this._validateNoteAccess(noteId, userId);
    const blocks = await this.notesRepository.findNoteBlocksTreeByNoteId(
      String(note.id)
    );

    const completeNote = {
      access: {
        canDelete: isOwner || hasOrgProjectAccess,
        canEdit: isOwner || isCollaborator || hasOrgProjectAccess,
        canShare: isOwner || hasOrgProjectAccess,
        hasOrgProjectAccess,
        isCollaborator,
        isOwner,
      },
      associated_organization: note.org_id
        ? {
            id: note.org_id,
            logo_url: note.org_logo_url,
            name: note.org_name,
            unique_name: note.org_unique_name,
          }
        : null,
      associated_project: note.project_id
        ? {
            id: note.project_id,
            name: note.project_name,
            stage_color: note.project_stage_color || null,
            stage_id: note.project_stage_id || null,
            stage_name: note.project_stage_name || null,
          }
        : null,
      blocks,
      collaborators: note.collaborators || [],
      created_at: note.created_at,
      deleted: note.deleted,
      description: note.description || null,
      due_date: note.due_date ?? null,
      id: note.id,
      priority_color: note.priority_color ?? null,
      priority_id: note.priority_id ?? null,
      priority_name: note.priority_name ?? null,
      properties: note.properties || {},
      public_id: note.public_note_id || null,
      revision:
        note.revision === undefined || note.revision === null
          ? null
          : Number(note.revision),
      status: note.status || null,
      tags: note.tags || [] || null,
      title: note.title,
      updated_at: note.updated_at,
      user: {
        avatar_url: note.user_avatar_url,
        email: note.user_email,
        id: note.user_id,
        name: note.user_name,
        username: note.user_username,
      },
    };

    return completeNote;
  }

  async getAllNotes(userId, queryParams = {}) {
    const {
      page = 1,
      limit = 10,
      search = "",
      tags = "",
      sortBy = "updated_at",
      sortOrder = "desc",
    } = queryParams;

    const paginationOptions = {
      limit: Math.min(parseInt(limit) || 10, 50),
      page: parseInt(page) || 1,
      search: search.trim(),
      sortBy,
      sortOrder: sortOrder.toLowerCase(),
      tags: tags
        ? Array.isArray(tags)
          ? tags
          : tags
              .split(",")
              .map((t) => t.trim())
              .filter(Boolean)
        : [],
    };

    const orgWideOrganizationId =
      await this._getOrgWideNotesScopeOrganizationId(userId);

    let result;
    if (
      queryParams.page ||
      queryParams.limit ||
      queryParams.search ||
      queryParams.tags
    ) {
      result = await this.notesRepository.getAllNotesWithPagination(userId, {
        ...paginationOptions,
        orgWideOrganizationId,
      });
    } else {
      const notes = await this.notesRepository.getAllNotesFormatted(
        userId,
        orgWideOrganizationId
      );
      result = { notes, pagination: null };
    }

    const notesWithBlocks = result.notes.map((note) => ({
      associated_organization: note.org_id
        ? {
            id: note.org_id,
            logo_url: note.org_logo_url,
            name: note.org_name,
            unique_name: note.org_unique_name,
          }
        : null,
      associated_project: note.project_id
        ? {
            id: note.project_id,
            name: note.project_name,
            stage_color: note.project_stage_color || null,
            stage_id: note.project_stage_id || null,
            stage_name: note.project_stage_name || null,
          }
        : null,
      author: {
        avatar_url: note.user_avatar_url,
        email: note.user_email,
        id: note.user_id,
        name: note.user_name,
        username: note.user_username,
      },
      blocks: [],
      collaborators: note.collaborators || [],
      created_at: note.created_at,
      deleted: note.deleted,
      description: note.description || null,
      due_date: note.due_date ?? null,
      id: note.id,
      parent_id: note.parent_id ?? null,
      priority_color: note.priority_color ?? null,
      priority_id: note.priority_id ?? null,
      priority_name: note.priority_name ?? null,
      properties: note.properties || {},
      public_id: note.public_note_id || null,
      resolved_tags: Array.isArray(note.resolved_tags)
        ? note.resolved_tags
        : [],
      revision:
        note.revision === undefined || note.revision === null
          ? null
          : Number(note.revision),
      status: note.status || null,
      tags: note.tags || [] || null,
      title: note.title,
      updated_at: note.updated_at,
    }));

    return { notes: notesWithBlocks, pagination: result.pagination };
  }

  async getNotesStats(userId) {
    const orgWideOrganizationId =
      await this._getOrgWideNotesScopeOrganizationId(userId);
    const stats = await this.notesRepository.getAllNotesStats(
      userId,
      orgWideOrganizationId
    );
    return {
      mostUsedTags: (stats.top_tags || []).map((tag) => ({
        count: parseInt(tag.count) || 0,
        tag: tag.tag_name,
      })),
      statusDistribution: stats.status_distribution || {},
      totalNotes: parseInt(stats.total_notes) || 0,
      totalTags: parseInt(stats.unique_tags_count) || 0,
    };
  }

  async createNote(userId, payload) {
    const { title, description, status, project_id } = payload;
    const { tags = [] } = payload;
    let { blocks: blocksPayload } = payload;

    if (typeof blocksPayload === "string") {
      try {
        blocksPayload = JSON.parse(blocksPayload);
      } catch {
        throw AppError.badRequest("blocks must be a valid JSON");
      }
    }

    const usageRecord = await PlansService.managePlanUsage(userId);
    const getUserPlan = await PlansRepository.getUserAndPlan(userId);
    const planDetails = await PlansRepository.getPlanById(getUserPlan.plan_id);

    if (!usageRecord || !planDetails) {
      throw AppError.notFound("Plan configuration not found for this user.");
    }

    const canCreate = PlansService.checkLimit(
      planDetails.details,
      usageRecord.usage_details,
      "usage_summary.notes_total",
      "limits.max_notes"
    );
    if (!canCreate) {
      throw new PlanLimitError(
        `Your plan (${planDetails.name}) allows only ${planDetails.details.limits.max_notes} notes.`,
        PLAN_PATHS.LIMITS.MAX_NOTES,
        "notes"
      );
    }

    const noteStatus = normalizeNoteStatus(status);
    if (!noteStatus || !ALLOWED_NOTE_STATUSES.includes(noteStatus)) {
      throw AppError.badRequest(
        `Invalid status. Allowed: ${ALLOWED_NOTE_STATUSES.join(", ")}`
      );
    }

    let normalizedBlocks = null;
    if (blocksPayload !== undefined && blocksPayload !== null) {
      if (!Array.isArray(blocksPayload))
        throw AppError.badRequest("blocks must be an array");
      normalizedBlocks = normalizeBlocksTree(blocksPayload);
    }

    const resolvedTitle = resolveNoteTitle({
      blocks: normalizedBlocks,
      description,
      title,
    });
    if (!resolvedTitle)
      throw AppError.badRequest(
        "Provide a title or text in the description or blocks."
      );

    const newNote = await this.notesRepository.createNotesQuery(
      userId,
      resolvedTitle,
      description,
      tags,
      noteStatus,
      project_id,
      null,
      null
    );

    if (normalizedBlocks?.length) {
      await this.notesRepository.bulkInsertNoteBlocks(
        newNote.id,
        userId,
        normalizedBlocks
      );
    } else {
      await this.notesRepository.insertDefaultNoteBlock(newNote.id, userId);
    }

    await PlansService.consumeNoteCreation(usageRecord.id);

    const blocks = await this.notesRepository.findNoteBlocksTreeByNoteId(
      String(newNote.id)
    );
    return this._formatNoteResponse(newNote, blocks);
  }

  async createCompleteNote(userId, payload) {
    const {
      title,
      description,
      initialBlockContent = "",
      status,
      project_id,
    } = payload;
    const { tags = [] } = payload;
    let { blocks: blocksPayload } = payload;

    if (typeof blocksPayload === "string") {
      try {
        blocksPayload = JSON.parse(blocksPayload);
      } catch {
        throw AppError.badRequest("blocks must be a valid JSON");
      }
    }

    const usageRecord = await PlansService.managePlanUsage(userId);
    const getUserPlan = await PlansRepository.getUserAndPlan(userId);
    const planDetails = await PlansRepository.getPlanById(getUserPlan.plan_id);

    if (!usageRecord || !planDetails) {
      throw AppError.notFound("Plan configuration not found for this user.");
    }

    const canCreate = PlansService.checkLimit(
      planDetails.details,
      usageRecord.usage_details,
      "usage_summary.notes_total",
      "limits.max_notes"
    );
    if (!canCreate) {
      throw new PlanLimitError(
        `Your plan (${planDetails.name}) allows only ${planDetails.details.limits.max_notes} notes.`,
        PLAN_PATHS.LIMITS.MAX_NOTES,
        "notes"
      );
    }

    const noteStatus = normalizeNoteStatus(status);
    if (!noteStatus || !ALLOWED_NOTE_STATUSES.includes(noteStatus)) {
      throw AppError.badRequest(
        `Invalid status. Allowed: ${ALLOWED_NOTE_STATUSES.join(", ")}`
      );
    }

    let normalizedBlocks = null;
    if (blocksPayload !== undefined && blocksPayload !== null) {
      if (!Array.isArray(blocksPayload))
        throw AppError.badRequest("blocks must be an array");
      normalizedBlocks = normalizeBlocksTree(blocksPayload);
    }

    const resolvedTitle = resolveNoteTitle({
      blocks: normalizedBlocks,
      description,
      plainFallback: initialBlockContent,
      title,
    });
    if (!resolvedTitle)
      throw AppError.badRequest(
        "Provide a title or text in the description, initial block or blocks."
      );

    const result = await this.notesRepository.createCompleteNote(
      userId,
      resolvedTitle,
      description,
      tags,
      initialBlockContent,
      noteStatus,
      project_id
    );

    if (normalizedBlocks?.length) {
      await this.notesRepository.bulkInsertNoteBlocks(
        result.note_id,
        userId,
        normalizedBlocks
      );
    } else {
      await this.notesRepository.insertDefaultNoteBlock(result.note_id, userId);
    }

    await PlansService.consumeNoteCreation(usageRecord.id);

    const blocks = await this.notesRepository.findNoteBlocksTreeByNoteId(
      String(result.note_id)
    );

    return {
      blocks,
      created_at: result.note_created_at,
      description: result.description,
      id: result.note_id,
      project_id: result.project_id,
      properties: result.properties || {},
      public_id: result.public_note_id || null,
      revision:
        result.note_revision === undefined || result.note_revision === null
          ? 1
          : Number(result.note_revision),
      status: result.status,
      tags: result.tags || [],
      title: result.title,
      updated_at: result.note_updated_at,
      user: {
        avatar_url: result.user_avatar_url,
        email: result.user_email,
        id: result.user_id,
        name: result.user_name,
        username: result.user_username,
      },
      user_id: result.user_id,
    };
  }

  async updateNote(userId, noteId, payload) {
    const {
      title,
      description,
      status,
      deleted,
      project_id,
      priority_id,
      due_date,
      baseRevision,
      files: uploads = {},
    } = payload;
    let { tags, properties } = payload;

    if (typeof properties === "string") {
      try {
        properties = JSON.parse(properties);
      } catch {
        throw AppError.badRequest("properties must be a valid JSON");
      }
    }
    if (typeof tags === "string") {
      try {
        tags = JSON.parse(tags);
      } catch {
        tags = tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean);
      }
    }

    const parsedBaseRevision = baseRevision ? Number(baseRevision) : null;
    const occEnforced =
      String(process.env.ENABLE_NOTES_OCC_REQUIRED || "false").toLowerCase() ===
      "true";
    if (occEnforced && parsedBaseRevision === null) {
      throw AppError.badRequest("baseRevision is required to update the note");
    }

    const { note, isOwner, isCollaborator, hasOrgProjectAccess } =
      await this._validateNoteAccess(noteId, userId);

    if (priority_id !== undefined) {
      const pid = priority_id ? String(priority_id) : null;
      if (pid) {
        const tp = await taskPrioritiesRepository.findActiveById(pid);
        if (!tp) throw AppError.badRequest("Invalid priority");
        const scopeOrg = note.scope_org_id || null;
        const noteProjectId = note.project_id || null;
        if (tp.project_id && tp.project_id !== noteProjectId)
          throw AppError.badRequest(
            "Priority does not belong to the project of this note"
          );
        if (tp.org_id && (!scopeOrg || tp.org_id !== scopeOrg))
          throw AppError.badRequest(
            "Priority does not belong to the organization of this note"
          );
      }
    }

    if (due_date) {
      if (Number.isNaN(new Date(due_date).getTime()))
        throw AppError.badRequest("Invalid due_date");
    }

    if (deleted !== undefined && !isOwner && !hasOrgProjectAccess) {
      throw AppError.forbidden("Only the owner can delete the note");
    }

    const updateData = {};
    if (title !== undefined) {
      const trimmed = title ? String(title).trim() : "";
      if (trimmed === "") {
        const blocksFromDb =
          await this.notesRepository.findNoteBlocksTreeByNoteId(noteId);
        updateData.title = deriveTitleFromBlocks(blocksFromDb) || "Untitled";
      } else {
        updateData.title = title;
      }
    }
    if (description !== undefined) updateData.description = description;
    if (tags !== undefined) updateData.tags = tags;
    if (status !== undefined) updateData.status = normalizeNoteStatus(status);
    if (deleted !== undefined) updateData.deleted = deleted;
    if (project_id !== undefined) {
      let nextProjectId = project_id ? String(project_id) : null;
      if (nextProjectId) {
        const resolvedProjectId = await resolveProjectIdToUuid(nextProjectId);
        if (!resolvedProjectId) throw AppError.notFound("Project not found");
        nextProjectId = resolvedProjectId;
      }
      updateData.project_id = nextProjectId;
      const prevProjectId = note.project_id ? String(note.project_id) : null;
      if (nextProjectId !== prevProjectId) {
        if (nextProjectId) {
          const firstStageId =
            await projectsRepository.getFirstProjectStageId(nextProjectId);
          if (!firstStageId)
            throw AppError.badRequest(
              "The project has no stages. Create at least one stage before associating tasks."
            );
          updateData.project_stage_id = firstStageId;
        } else {
          updateData.project_stage_id = null;
        }
      }
    }
    if (priority_id !== undefined)
      updateData.priority_id = priority_id ? String(priority_id) : null;
    if (due_date !== undefined)
      updateData.due_date = due_date ? new Date(due_date).toISOString() : null;

    // Process files and properties
    const propertiesUpdate = properties || {};
    const uploadedDocumentImages = [];
    const allUploadedFiles = [
      ...(uploads.icon || []),
      ...(uploads.banner || []),
      ...(uploads.files || []),
      ...(uploads.documentImages || []),
    ];
    let usageRecord = null;
    let totalUploadSizeMb = 0;

    if (allUploadedFiles.length > 0) {
      usageRecord = await PlansService.managePlanUsage(userId);
      const getUserPlan = await PlansRepository.getUserAndPlan(userId);
      const planDetails = await PlansRepository.getPlanById(
        getUserPlan.plan_id
      );

      if (!usageRecord || !planDetails)
        throw AppError.notFound("Plan configuration not found for this user.");

      const maxFileSizeMb =
        planDetails.details?.limits?.storage?.max_file_size_mb;
      const totalMonthlyUploadMb =
        planDetails.details?.limits?.storage?.total_monthly_upload_mb;

      if (maxFileSizeMb) {
        for (const file of allUploadedFiles) {
          const fileSizeMb = file.size / (1024 * 1024);
          if (fileSizeMb > maxFileSizeMb) {
            const err = new Error("File exceeds maximum allowed size");
            err.statusCode = 413;
            err.details = `The file "${file.originalname}" is ${fileSizeMb.toFixed(2)} MB. Your plan allows files up to ${maxFileSizeMb} MB.`;
            throw err;
          }
        }
      }

      totalUploadSizeMb = allUploadedFiles.reduce(
        (sum, file) => sum + file.size / (1024 * 1024),
        0
      );

      if (totalMonthlyUploadMb) {
        const currentUsageMb =
          PlansService.getNestedValue(
            usageRecord.usage_details,
            "monthly_cycle.storage.total_uploaded_mb"
          ) || 0;
        if (currentUsageMb + totalUploadSizeMb > totalMonthlyUploadMb) {
          throw new PlanLimitError(
            `Your plan (${planDetails.name}) allows ${totalMonthlyUploadMb} MB of upload per month. Current usage: ${currentUsageMb.toFixed(2)} MB.`,
            PLAN_PATHS.LIMITS.STORAGE.TOTAL_MONTHLY_UPLOAD,
            "storage"
          );
        }
      }
    }

    if (uploads.icon?.[0]) {
      const iconFile = uploads.icon[0];
      const currentNote = await this.notesRepository.getNoteById(noteId);
      if (currentNote?.properties?.icon?.path)
        await spacesService.deleteImage(currentNote.properties.icon.path);
      const result = await spacesService.uploadNoteIcon(
        iconFile.buffer,
        iconFile.mimetype,
        noteId,
        userId
      );
      propertiesUpdate.icon = {
        name: iconFile.originalname,
        path: result.path || result.key || "",
        type: iconFile.mimetype,
      };
    }

    if (uploads.banner?.[0]) {
      const bannerFile = uploads.banner[0];
      const currentNote = await this.notesRepository.getNoteById(noteId);
      if (currentNote?.properties?.banner?.path)
        await spacesService.deleteImage(currentNote.properties.banner.path);
      const result = await spacesService.uploadNoteBanner(
        bannerFile.buffer,
        bannerFile.mimetype,
        noteId,
        userId
      );
      propertiesUpdate.banner = {
        name: bannerFile.originalname,
        path: result.path || result.key || "",
        type: bannerFile.mimetype,
      };
    }

    if (uploads.files?.length > 0) {
      const currentNote = await this.notesRepository.getNoteById(noteId);
      const currentFiles = currentNote?.properties?.files || [];
      const newFiles = await Promise.all(
        uploads.files.map(async (file) => {
          const result = await spacesService.uploadNoteFile(
            file.buffer,
            file.mimetype,
            noteId,
            userId,
            file.originalname
          );
          return {
            id: result.fileName,
            name: file.originalname,
            path: result.key || result.path || "",
            type: file.mimetype,
          };
        })
      );
      propertiesUpdate.files = [...currentFiles, ...newFiles];
    }

    if (uploads.documentImages?.length > 0) {
      await Promise.all(
        uploads.documentImages.map(async (file) => {
          const result = await spacesService.uploadNoteDocumentImage(
            file.buffer,
            file.mimetype,
            noteId,
            userId,
            file.originalname
          );
          uploadedDocumentImages.push({
            id: result.fileName,
            originalName: file.originalname,
            path: result.key || result.path || "",
            type: file.mimetype,
          });
        })
      );
    }

    if (propertiesUpdate.icon && propertiesUpdate.icon.path === "") {
      const currentNote = await this.notesRepository.getNoteById(noteId);
      if (currentNote?.properties?.icon?.path)
        await spacesService.deleteImage(currentNote.properties.icon.path);
    }
    if (propertiesUpdate.banner && propertiesUpdate.banner.path === "") {
      const currentNote = await this.notesRepository.getNoteById(noteId);
      if (currentNote?.properties?.banner?.path)
        await spacesService.deleteImage(currentNote.properties.banner.path);
    }
    if (propertiesUpdate.files && Array.isArray(propertiesUpdate.files)) {
      const currentNote = await this.notesRepository.getNoteById(noteId);
      const currentFiles = currentNote?.properties?.files || [];
      const removedFiles = currentFiles.filter(
        (f) => !propertiesUpdate.files.find((nf) => nf.id === f.id)
      );
      for (const file of removedFiles)
        if (file.path) await spacesService.deleteImage(file.path);
    }

    if (usageRecord && totalUploadSizeMb > 0) {
      await PlansService.consumeStorage(usageRecord.id, totalUploadSizeMb);
    }

    if (Object.keys(propertiesUpdate).length > 0)
      updateData.properties = propertiesUpdate;

    const hadOtherUpdates = Object.keys(updateData).length > 0;
    const hadFilesWithoutDbRow =
      !hadOtherUpdates && allUploadedFiles.length > 0;

    if (!hadOtherUpdates && !hadFilesWithoutDbRow)
      throw AppError.badRequest("No fields provided for update");

    let updatedNote = null;
    if (hadOtherUpdates) {
      updatedNote = await this.notesRepository.updateNoteById(
        noteId,
        updateData,
        parsedBaseRevision
      );
      if (!updatedNote) {
        const latestNote = await this.notesRepository.getNoteById(noteId);
        if (!latestNote) throw AppError.notFound("Note not found");
        const conflictFields = Object.keys(updateData).filter(
          (fieldName) =>
            JSON.stringify(latestNote[fieldName]) !==
            JSON.stringify(updateData[fieldName])
        );
        throw new NoteConflictError(
          "Edit conflict detected",
          conflictFields,
          latestNote.revision ? Number(latestNote.revision) : null,
          this._formatNoteResponse(latestNote, [], { includeBlocks: false }),
          noteId
        );
      }
    }

    const refreshed = await this.notesRepository.getNoteById(noteId);
    const blocks =
      await this.notesRepository.findNoteBlocksTreeByNoteId(noteId);
    const formattedNote = this._formatNoteResponse(
      refreshed || updatedNote || note,
      blocks
    );

    if (uploadedDocumentImages.length > 0)
      formattedNote.uploaded_document_images = uploadedDocumentImages;

    formattedNote.access = {
      canDelete: isOwner || hasOrgProjectAccess,
      canEdit: isOwner || isCollaborator || hasOrgProjectAccess,
      canShare: isOwner || hasOrgProjectAccess,
      hasOrgProjectAccess,
      isCollaborator,
      isOwner,
    };

    return formattedNote;
  }

  async uploadDocumentImages(userId, noteId, uploads) {
    await this._validateNoteAccess(noteId, userId);

    const usageRecord = await PlansService.managePlanUsage(userId);
    const getUserPlan = await PlansRepository.getUserAndPlan(userId);
    const planDetails = await PlansRepository.getPlanById(getUserPlan.plan_id);

    if (!usageRecord || !planDetails)
      throw AppError.notFound("Plan configuration not found for this user.");

    const maxFileSizeMb =
      planDetails.details?.limits?.storage?.max_file_size_mb;
    const totalMonthlyUploadMb =
      planDetails.details?.limits?.storage?.total_monthly_upload_mb;

    if (maxFileSizeMb) {
      for (const file of uploads) {
        const fileSizeMb = file.size / (1024 * 1024);
        if (fileSizeMb > maxFileSizeMb) {
          const err = new Error("Arquivo excede o tamanho máximo permitido");
          err.statusCode = 413;
          err.details = `O arquivo "${file.originalname}" tem ${fileSizeMb.toFixed(2)} MB. Seu plano permite até ${maxFileSizeMb} MB.`;
          throw err;
        }
      }
    }

    const totalUploadSizeMb = uploads.reduce(
      (sum, file) => sum + file.size / (1024 * 1024),
      0
    );

    if (totalMonthlyUploadMb) {
      const currentUsageMb =
        PlansService.getNestedValue(
          usageRecord.usage_details,
          "monthly_cycle.storage.total_uploaded_mb"
        ) || 0;
      if (currentUsageMb + totalUploadSizeMb > totalMonthlyUploadMb) {
        throw new PlanLimitError(
          `Seu plano permite ${totalMonthlyUploadMb} MB de upload por mês. Uso atual: ${currentUsageMb.toFixed(2)} MB.`,
          PLAN_PATHS.LIMITS.STORAGE.TOTAL_MONTHLY_UPLOAD,
          "storage"
        );
      }
    }

    const files = await Promise.all(
      uploads.map(async (file) => {
        const result = await spacesService.uploadNoteDocumentImage(
          file.buffer,
          file.mimetype,
          noteId,
          userId,
          file.originalname
        );
        return {
          id: result.fileName,
          name: file.originalname,
          path: result.key || result.path || "",
          size: file.size,
          type: file.mimetype,
        };
      })
    );

    if (totalUploadSizeMb > 0) {
      await PlansService.consumeStorage(usageRecord.id, totalUploadSizeMb);
    }

    return files;
  }

  async deleteNote(userId, noteIdsParam) {
    const usageRecord = await PlansService.managePlanUsage(userId);

    const noteIds = Array.isArray(noteIdsParam) ? noteIdsParam : [noteIdsParam];
    if (noteIds.length === 0) throw AppError.badRequest("No ID provided.");

    for (const noteId of noteIds) {
      await this._validateNoteOwnership(noteId, userId);
    }

    const affectedRows = await this.notesRepository.deleteNoteById(
      noteIds,
      userId
    );

    if (usageRecord) {
      await PlansService.decrementNoteUsage(usageRecord.id, affectedRows);
    }
    return affectedRows;
  }
}

module.exports = {
  NoteConflictError,
  NotesService: new NotesService(),
  PlanLimitError,
};
