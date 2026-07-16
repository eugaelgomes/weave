const NotesBaseController = require("./base.controller");
const projectsRepository = require("@/modules/projects/repositories/projects.repository");
const PlanUsageManager = require("@/modules/plans/controllers/plans.controller");
const PlansRepository = require("@/modules/plans/repositories/plans.repository");
const taskPrioritiesRepository = require("@/modules/task-priorities/repositories/task-priorities.repository");
const {
  ALLOWED_NOTE_STATUSES,
  normalizeNoteStatus,
} = require("@/utils/patterns/product-patterns");
const spacesService = require("@/services/storage");
const { normalizeBlocksTree } = require("../block-normalizer");
const {
  resolveNoteTitle,
  deriveTitleFromBlocks,
} = require("@/modules/notes/utils/derive-note-title");
const { sendPlanLimitExceeded } = require("@/utils/plan-limit-http");
const { PLAN_PATHS } = require("@/services/plans/plan-paths");
const { resolveProjectIdToUuid } = require("@/utils/project-id-lookup");

/**
 * Creation, update, and deletion of notes.
 */
class NotesWriteController extends NotesBaseController {
  _parseBaseRevision(rawValue) {
    if (rawValue === undefined || rawValue === null || rawValue === "") {
      return null;
    }
    const parsed = Number(rawValue);
    if (!Number.isInteger(parsed) || parsed < 1) {
      throw new Error("Invalid baseRevision");
    }
    return parsed;
  }

  _isSameFieldValue(fieldName, currentValue, incomingValue) {
    if (fieldName === "due_date") {
      const currentDate = currentValue
        ? new Date(currentValue).toISOString()
        : null;
      const incomingDate = incomingValue
        ? new Date(incomingValue).toISOString()
        : null;
      return currentDate === incomingDate;
    }
    if (fieldName === "tags") {
      return (
        JSON.stringify(currentValue || []) ===
        JSON.stringify(incomingValue || [])
      );
    }
    if (fieldName === "properties") {
      if (!incomingValue || typeof incomingValue !== "object") return true;
      if (!currentValue || typeof currentValue !== "object") return false;
      return Object.entries(incomingValue).every(([key, value]) => {
        return JSON.stringify(currentValue[key]) === JSON.stringify(value);
      });
    }
    return currentValue === incomingValue;
  }

  _buildConflictPayload({ incomingData, latestNote, noteId }) {
    const conflictFields = Object.keys(incomingData).filter((fieldName) => {
      return !this._isSameFieldValue(
        fieldName,
        latestNote?.[fieldName],
        incomingData[fieldName]
      );
    });
    return {
      code: "NOTE_CONFLICT",
      conflictFields,
      currentRevision:
        latestNote?.revision === undefined || latestNote?.revision === null
          ? null
          : Number(latestNote.revision),
      error: "Edit conflict detected",
      noteId,
      serverNote: this._formatNoteResponse(latestNote || {}, [], {
        includeBlocks: false,
      }),
    };
  }

  async createNote(req, res, next) {
    try {
      let blocksPayload = req.body.blocks;
      if (typeof blocksPayload === "string") {
        try {
          blocksPayload = JSON.parse(blocksPayload);
        } catch {
          return res.status(400).json({ error: "blocks must be a valid JSON" });
        }
      }

      const { title, description, tags = [], status, project_id } = req.body;

      // 1. Authentication validation
      const userId = this._validateAuthentication(req, res);
      if (!userId) return;

      // 2. FETCH/CREATE USAGE RECORD (USING MANAGER)
      const usageRecord = await PlanUsageManager.managePlanUsage(userId);
      const getUserPlan = await PlansRepository.getUserAndPlan(userId);

      // 3. FETCH PLAN DETAILS (LIMITS AND NAME)
      const planDetails = await PlansRepository.getPlanById(
        getUserPlan.plan_id
      );

      if (!usageRecord || !planDetails) {
        return res.status(404).json({
          error: "Plan configuration not found for this user.",
        });
      }

      // 4. VALIDATE NOTES LIMIT
      const canCreate = PlanUsageManager.checkLimit(
        planDetails.details,
        usageRecord.usage_details,
        "usage_summary.notes_total",
        "limits.max_notes"
      );

      if (!canCreate) {
        return sendPlanLimitExceeded(res, {
          error: "Notes limit reached",
          limit_key: PLAN_PATHS.LIMITS.MAX_NOTES,
          message: `Your plan (${planDetails.name}) allows only ${planDetails.details.limits.max_notes} notes.`,
          resource: "notes",
        });
      }

      const noteStatus = normalizeNoteStatus(status);
      if (!noteStatus || !ALLOWED_NOTE_STATUSES.includes(noteStatus)) {
        return res.status(400).json({
          error: `Invalid status. Allowed: ${ALLOWED_NOTE_STATUSES.join(", ")}`,
        });
      }

      let normalizedBlocks = null;
      if (blocksPayload !== undefined && blocksPayload !== null) {
        try {
          if (!Array.isArray(blocksPayload)) {
            return res.status(400).json({ error: "blocks must be an array" });
          }
          normalizedBlocks = normalizeBlocksTree(blocksPayload);
        } catch (error) {
          return this._handleError(error, res, next);
        }
      }

      const resolvedTitle = resolveNoteTitle({
        blocks: normalizedBlocks,
        description,
        title,
      });
      if (!resolvedTitle) {
        return res.status(400).json({
          error: "Provide a title or text in the description or blocks.",
        });
      }

      // 6. Create note in the database
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

      // 7. INCREMENT USAGE
      await PlanUsageManager.consumeNoteCreation(usageRecord.id);

      // 8. Format and return the created note
      const blocks = await this.notesRepository.findNoteBlocksTreeByNoteId(
        String(newNote.id)
      );
      const formattedNote = this._formatNoteResponse(newNote, blocks);
      res.status(201).json(formattedNote);
    } catch (error) {
      this._handleError(error, res, next);
    }
  }

  async createCompleteNote(req, res, next) {
    try {
      let blocksPayload = req.body.blocks;
      if (typeof blocksPayload === "string") {
        try {
          blocksPayload = JSON.parse(blocksPayload);
        } catch {
          return res.status(400).json({ error: "blocks must be a valid JSON" });
        }
      }

      const {
        title,
        description,
        tags = [],
        initialBlockContent = "",
        status,
        project_id,
      } = req.body;

      // Authentication validation
      const userId = this._validateAuthentication(req, res);
      if (!userId) return;

      // Fetch/Create usage record
      const usageRecord = await PlanUsageManager.managePlanUsage(userId);
      const getUserPlan = await PlansRepository.getUserAndPlan(userId);

      // Fetch plan details
      const planDetails = await PlansRepository.getPlanById(
        getUserPlan.plan_id
      );

      if (!usageRecord || !planDetails) {
        return res.status(404).json({
          error: "Plan configuration not found for this user.",
        });
      }

      // Validate notes limit
      const canCreate = PlanUsageManager.checkLimit(
        planDetails.details,
        usageRecord.usage_details,
        "usage_summary.notes_total",
        "limits.max_notes"
      );

      if (!canCreate) {
        return sendPlanLimitExceeded(res, {
          error: "Notes limit reached",
          limit_key: PLAN_PATHS.LIMITS.MAX_NOTES,
          message: `Your plan (${planDetails.name}) allows only ${planDetails.details.limits.max_notes} notes.`,
          resource: "notes",
        });
      }

      const noteStatus = normalizeNoteStatus(status);
      if (!noteStatus || !ALLOWED_NOTE_STATUSES.includes(noteStatus)) {
        return res.status(400).json({
          error: `Invalid status. Allowed: ${ALLOWED_NOTE_STATUSES.join(", ")}`,
        });
      }

      let normalizedBlocks = null;
      if (blocksPayload !== undefined && blocksPayload !== null) {
        try {
          if (!Array.isArray(blocksPayload)) {
            return res.status(400).json({ error: "blocks must be an array" });
          }
          normalizedBlocks = normalizeBlocksTree(blocksPayload);
        } catch (error) {
          return this._handleError(error, res, next);
        }
      }

      const resolvedTitle = resolveNoteTitle({
        blocks: normalizedBlocks,
        description,
        plainFallback: initialBlockContent,
        title,
      });
      if (!resolvedTitle) {
        return res.status(400).json({
          error:
            "Provide a title or text in the description, initial block or blocks.",
        });
      }

      // Note creation + user (without document jsonb)
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
        await this.notesRepository.insertDefaultNoteBlock(
          result.note_id,
          userId
        );
      }

      // Increment notes usage
      await PlanUsageManager.consumeNoteCreation(usageRecord.id);

      const blocks = await this.notesRepository.findNoteBlocksTreeByNoteId(
        String(result.note_id)
      );

      // Assemble the complete note structure with all related table data
      const completeNote = {
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

      // Returns the newly created complete note
      res.status(201).json(completeNote);
    } catch (error) {
      this._handleError(error, res, next);
    }
  }

  async updateNote(req, res, next) {
    try {
      const { id } = req.params;

      // When multipart/form-data, text fields come as strings
      // Parse properties if it comes as a JSON string
      const {
        title,
        description,
        status,
        deleted,
        project_id,
        priority_id,
        due_date,
        baseRevision,
      } = req.body;
      let { tags, properties } = req.body;

      if (typeof properties === "string") {
        try {
          properties = JSON.parse(properties);
        } catch {
          return res
            .status(400)
            .json({ error: "properties must be a valid JSON" });
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
      const parsedBaseRevision = this._parseBaseRevision(baseRevision);
      const occEnforced =
        String(
          process.env.ENABLE_NOTES_OCC_REQUIRED || "false"
        ).toLowerCase() === "true";
      if (occEnforced && parsedBaseRevision === null) {
        return res.status(400).json({
          error: "baseRevision is required to update the note",
        });
      }

      // Authentication validation
      const userId = this._validateAuthentication(req, res);
      if (!userId) return;

      // Note access validation (owner or collaborator can edit)
      const { note, isOwner, isCollaborator, hasOrgProjectAccess } =
        await this._validateNoteAccess(id, userId);

      if (priority_id !== undefined) {
        const pid =
          priority_id === null ||
          priority_id === undefined ||
          priority_id === ""
            ? null
            : String(priority_id);
        if (pid) {
          const tp = await taskPrioritiesRepository.findActiveById(pid);
          if (!tp) {
            return res.status(400).json({ error: "Invalid priority" });
          }
          const scopeOrg = note.scope_org_id || null;
          const noteProjectId = note.project_id || null;
          if (tp.project_id) {
            if (tp.project_id !== noteProjectId) {
              return res.status(400).json({
                error: "Priority does not belong to the project of this note",
              });
            }
          } else if (tp.org_id) {
            if (!scopeOrg || tp.org_id !== scopeOrg) {
              return res.status(400).json({
                error:
                  "Priority does not belong to the organization of this note",
              });
            }
          } else {
            return res.status(400).json({ error: "Invalid priority" });
          }
        }
      }

      if (due_date !== undefined && due_date !== null && due_date !== "") {
        const t = new Date(due_date).getTime();
        if (Number.isNaN(t)) {
          return res.status(400).json({ error: "Invalid due_date" });
        }
      }

      if (deleted !== undefined && !isOwner && !hasOrgProjectAccess) {
        throw new Error("Only the owner can delete the note");
      }

      if (status !== undefined) {
        const normalized = normalizeNoteStatus(status);
        if (!normalized || !ALLOWED_NOTE_STATUSES.includes(normalized)) {
          return res.status(400).json({
            error: `Invalid status. Allowed: ${ALLOWED_NOTE_STATUSES.join(", ")}`,
          });
        }
      }

      // Prepares the data for update (only provided fields)
      const updateData = {};
      if (title !== undefined) {
        const trimmed =
          title === null || title === undefined ? "" : String(title).trim();
        if (trimmed === "") {
          const blocksFromDb =
            await this.notesRepository.findNoteBlocksTreeByNoteId(id);
          const derived = deriveTitleFromBlocks(blocksFromDb);
          updateData.title = derived || "Untitled";
        } else {
          updateData.title = title;
        }
      }
      if (description !== undefined) updateData.description = description;
      if (tags !== undefined) updateData.tags = tags;
      if (status !== undefined) updateData.status = normalizeNoteStatus(status);
      if (deleted !== undefined) updateData.deleted = deleted;
      if (project_id !== undefined) {
        let nextProjectId =
          project_id === null || project_id === undefined || project_id === ""
            ? null
            : String(project_id);
        if (nextProjectId) {
          const resolvedProjectId = await resolveProjectIdToUuid(nextProjectId);
          if (!resolvedProjectId) {
            return res.status(404).json({ error: "Project not found" });
          }
          nextProjectId = resolvedProjectId;
        }
        updateData.project_id = nextProjectId;
        const prevProjectId = note.project_id ? String(note.project_id) : null;
        if (nextProjectId !== prevProjectId) {
          if (nextProjectId) {
            const firstStageId =
              await projectsRepository.getFirstProjectStageId(nextProjectId);
            if (!firstStageId) {
              return res.status(400).json({
                error:
                  "The project has no stages. Create at least one stage before associating tasks.",
              });
            }
            updateData.project_stage_id = firstStageId;
          } else {
            updateData.project_stage_id = null;
          }
        }
      }
      if (priority_id !== undefined) {
        updateData.priority_id =
          priority_id === null ||
          priority_id === undefined ||
          priority_id === ""
            ? null
            : String(priority_id);
      }
      if (due_date !== undefined) {
        updateData.due_date =
          due_date === null || due_date === undefined || due_date === ""
            ? null
            : new Date(due_date).toISOString();
      }
      // Process properties (JSON fields) and uploaded files
      const propertiesUpdate = properties || {};
      const uploadedDocumentImages = [];

      // Collect all files to be uploaded for plan validation
      const allUploadedFiles = [
        ...(req.files?.icon || []),
        ...(req.files?.banner || []),
        ...(req.files?.files || []),
        ...(req.files?.documentImages || []),
      ];

      // Validate plan limits before making any upload
      let usageRecord = null;
      let totalUploadSizeMb = 0;

      if (allUploadedFiles.length > 0) {
        usageRecord = await PlanUsageManager.managePlanUsage(userId);
        const getUserPlan = await PlansRepository.getUserAndPlan(userId);
        const planDetails = await PlansRepository.getPlanById(
          getUserPlan.plan_id
        );

        if (!usageRecord || !planDetails) {
          return res.status(404).json({
            error: "Plan configuration not found for this user.",
          });
        }

        const maxFileSizeMb =
          planDetails.details?.limits?.storage?.max_file_size_mb;
        const totalMonthlyUploadMb =
          planDetails.details?.limits?.storage?.total_monthly_upload_mb;

        // Validate individual file size
        if (maxFileSizeMb) {
          for (const file of allUploadedFiles) {
            const fileSizeMb = file.size / (1024 * 1024);
            if (fileSizeMb > maxFileSizeMb) {
              return res.status(413).json({
                error: "File exceeds maximum allowed size",
                message: `The file "${file.originalname}" is ${fileSizeMb.toFixed(2)} MB. Your plan (${planDetails.name}) allows files up to ${maxFileSizeMb} MB.`,
              });
            }
          }
        }

        // Calculate total to be uploaded
        totalUploadSizeMb = allUploadedFiles.reduce(
          (sum, file) => sum + file.size / (1024 * 1024),
          0
        );

        // Validate monthly upload limit
        if (totalMonthlyUploadMb) {
          const currentUsageMb =
            PlanUsageManager.getNestedValue(
              usageRecord.usage_details,
              "monthly_cycle.storage.total_uploaded_mb"
            ) || 0;

          if (currentUsageMb + totalUploadSizeMb > totalMonthlyUploadMb) {
            return sendPlanLimitExceeded(res, {
              error: "Monthly storage limit reached",
              limit_key: PLAN_PATHS.LIMITS.STORAGE.TOTAL_MONTHLY_UPLOAD,
              message: `Your plan (${planDetails.name}) allows ${totalMonthlyUploadMb} MB of upload per month. Current usage: ${currentUsageMb.toFixed(2)} MB.`,
              resource: "storage",
            });
          }
        }
      }

      // Process icon upload
      if (req.files?.icon?.[0]) {
        const iconFile = req.files.icon[0];
        // Delete previous icon if exists
        const currentNote = await this.notesRepository.getNoteById(id);
        if (currentNote?.properties?.icon?.path) {
          const oldKey = currentNote.properties.icon.path;
          if (oldKey) await spacesService.deleteImage(oldKey);
        }
        const result = await spacesService.uploadNoteIcon(
          iconFile.buffer,
          iconFile.mimetype,
          id,
          userId
        );
        propertiesUpdate.icon = {
          name: iconFile.originalname,
          path: result.path || result.key || "",
          type: iconFile.mimetype,
        };
      }

      // Process banner upload
      if (req.files?.banner?.[0]) {
        const bannerFile = req.files.banner[0];
        // Delete previous banner if exists
        const currentNote = await this.notesRepository.getNoteById(id);
        if (currentNote?.properties?.banner?.path) {
          const oldKey = currentNote.properties.banner.path;
          if (oldKey) await spacesService.deleteImage(oldKey);
        }
        const result = await spacesService.uploadNoteBanner(
          bannerFile.buffer,
          bannerFile.mimetype,
          id,
          userId
        );
        propertiesUpdate.banner = {
          name: bannerFile.originalname,
          path: result.path || result.key || "",
          type: bannerFile.mimetype,
        };
      }

      // Process files upload
      if (req.files?.files?.length > 0) {
        const currentNote = await this.notesRepository.getNoteById(id);
        const currentFiles = currentNote?.properties?.files || [];
        const newFiles = await Promise.all(
          req.files.files.map(async (file) => {
            const result = await spacesService.uploadNoteFile(
              file.buffer,
              file.mimetype,
              id,
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

      if (req.files?.documentImages?.length > 0) {
        await Promise.all(
          req.files.documentImages.map(async (file) => {
            const result = await spacesService.uploadNoteDocumentImage(
              file.buffer,
              file.mimetype,
              id,
              userId,
              file.originalname
            );
            uploadedDocumentImages.push({
              id: result.fileName,
              originalName: file.originalname,
              path: result.key || result.path || "",
              type: file.mimetype,
            });
            return result;
          })
        );
      }

      // Remove files from storage when removing icon, banner, or files
      // Remove icon
      if (propertiesUpdate.icon && propertiesUpdate.icon.path === "") {
        const currentNote = await this.notesRepository.getNoteById(id);
        if (currentNote?.properties?.icon?.path) {
          const oldKey = currentNote.properties.icon.path;
          if (oldKey) await spacesService.deleteImage(oldKey);
        }
      }
      // Remove banner
      if (propertiesUpdate.banner && propertiesUpdate.banner.path === "") {
        const currentNote = await this.notesRepository.getNoteById(id);
        if (currentNote?.properties?.banner?.path) {
          const oldKey = currentNote.properties.banner.path;
          if (oldKey) await spacesService.deleteImage(oldKey);
        }
      }
      // Remove files
      if (propertiesUpdate.files && Array.isArray(propertiesUpdate.files)) {
        const currentNote = await this.notesRepository.getNoteById(id);
        const currentFiles = currentNote?.properties?.files || [];
        // Find which files were removed
        const removedFiles = currentFiles.filter(
          (f) => !propertiesUpdate.files.find((nf) => nf.id === f.id)
        );
        for (const file of removedFiles) {
          if (file.path) await spacesService.deleteImage(file.path);
        }
      }

      // Register storage consumption in plan after successful uploads
      if (usageRecord && totalUploadSizeMb > 0) {
        await PlanUsageManager.consumeStorage(
          usageRecord.id,
          totalUploadSizeMb
        );
      }

      // Body image: do PATCH in /notes/:noteId/blocks/:blockId after upload (uploadDocumentImages).

      // If there are properties to update
      if (Object.keys(propertiesUpdate).length > 0) {
        updateData.properties = propertiesUpdate;
      }

      const hadOtherUpdates = Object.keys(updateData).length > 0;
      const hadFilesWithoutDbRow =
        !hadOtherUpdates && allUploadedFiles.length > 0;

      if (!hadOtherUpdates && !hadFilesWithoutDbRow) {
        return res.status(400).json({
          error: "No fields provided for update",
        });
      }

      let updatedNote = null;
      if (hadOtherUpdates) {
        updatedNote = await this.notesRepository.updateNoteById(
          id,
          updateData,
          parsedBaseRevision
        );
        if (!updatedNote) {
          const latestNote = await this.notesRepository.getNoteById(id);
          if (!latestNote) {
            return res.status(404).json({ error: "Note not found" });
          }
          console.info("[notes.update.conflict]", {
            baseRevision: parsedBaseRevision,
            noteId: id,
            serverRevision: latestNote.revision ?? null,
            userId,
          });
          return res.status(409).json(
            this._buildConflictPayload({
              incomingData: updateData,
              latestNote,
              noteId: id,
            })
          );
        }
      }

      const refreshed = await this.notesRepository.getNoteById(id);
      const blocks = await this.notesRepository.findNoteBlocksTreeByNoteId(id);
      const formattedNote = this._formatNoteResponse(
        refreshed || updatedNote || note,
        blocks
      );

      if (uploadedDocumentImages.length > 0) {
        formattedNote.uploaded_document_images = uploadedDocumentImages;
      }

      formattedNote.access = {
        canDelete: isOwner || hasOrgProjectAccess,
        canEdit: isOwner || isCollaborator || hasOrgProjectAccess,
        canShare: isOwner || hasOrgProjectAccess,
        hasOrgProjectAccess,
        isCollaborator,
        isOwner,
      };
      res.status(200).json(formattedNote);
    } catch (error) {
      this._handleError(error, res, next);
    }
  }

  async uploadDocumentImages(req, res, next) {
    try {
      const { id } = req.params;
      const userId = this._validateAuthentication(req, res);
      if (!userId) return;

      await this._validateNoteAccess(id, userId);

      const uploads = req.files || [];
      if (!uploads.length) {
        return res.status(400).json({ error: "Nenhum arquivo enviado" });
      }

      const usageRecord = await PlanUsageManager.managePlanUsage(userId);
      const getUserPlan = await PlansRepository.getUserAndPlan(userId);
      const planDetails = await PlansRepository.getPlanById(
        getUserPlan.plan_id
      );

      if (!usageRecord || !planDetails) {
        return res.status(404).json({
          error: "Configuração de plano não encontrada para este usuário.",
        });
      }

      const maxFileSizeMb =
        planDetails.details?.limits?.storage?.max_file_size_mb;
      const totalMonthlyUploadMb =
        planDetails.details?.limits?.storage?.total_monthly_upload_mb;

      if (maxFileSizeMb) {
        for (const file of uploads) {
          const fileSizeMb = file.size / (1024 * 1024);
          if (fileSizeMb > maxFileSizeMb) {
            return res.status(413).json({
              error: "Arquivo excede o tamanho máximo permitido",
              message: `O arquivo "${file.originalname}" tem ${fileSizeMb.toFixed(2)} MB. Seu plano (${planDetails.name}) permite arquivos de até ${maxFileSizeMb} MB.`,
            });
          }
        }
      }

      const totalUploadSizeMb = uploads.reduce(
        (sum, file) => sum + file.size / (1024 * 1024),
        0
      );

      if (totalMonthlyUploadMb) {
        const currentUsageMb =
          PlanUsageManager.getNestedValue(
            usageRecord.usage_details,
            "monthly_cycle.storage.total_uploaded_mb"
          ) || 0;

        if (currentUsageMb + totalUploadSizeMb > totalMonthlyUploadMb) {
          return sendPlanLimitExceeded(res, {
            error: "Limite de armazenamento mensal atingido",
            limit_key: PLAN_PATHS.LIMITS.STORAGE.TOTAL_MONTHLY_UPLOAD,
            message: `Seu plano (${planDetails.name}) permite ${totalMonthlyUploadMb} MB de upload por mês. Uso atual: ${currentUsageMb.toFixed(2)} MB.`,
            resource: "storage",
          });
        }
      }

      const files = await Promise.all(
        uploads.map(async (file) => {
          const result = await spacesService.uploadNoteDocumentImage(
            file.buffer,
            file.mimetype,
            id,
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
        await PlanUsageManager.consumeStorage(
          usageRecord.id,
          totalUploadSizeMb
        );
      }

      return res.status(201).json({ files });
    } catch (error) {
      this._handleError(error, res, next);
    }
  }

  async deleteNote(req, res, next) {
    try {
      const { id } = req.params;
      const { ids } = req.body;

      const userId = this._validateAuthentication(req, res);
      if (!userId) return;

      const usageRecord = await PlanUsageManager.managePlanUsage(userId);

      let noteIds = [];

      if (ids && Array.isArray(ids) && ids.length > 0) {
        noteIds = ids;
      } else if (id) {
        noteIds = [id];
      } else {
        return res.status(400).json({ error: "Nenhum ID recebido." });
      }

      for (const noteId of noteIds) {
        await this._validateNoteOwnership(noteId, userId);
      }

      const affectedRows = await this.notesRepository.deleteNoteById(
        noteIds,
        userId
      );

      if (usageRecord) {
        await PlanUsageManager.decrementNoteUsage(usageRecord.id, affectedRows);
      }

      return res.status(200).json({
        message:
          affectedRows > 1
            ? `${affectedRows} notas deletadas com sucesso`
            : "Nota deletada com sucesso",
      });
    } catch (error) {
      this._handleError(error, res, next);
    }
  }
}

module.exports = new NotesWriteController();
