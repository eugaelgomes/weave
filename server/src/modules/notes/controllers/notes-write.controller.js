const NotesBaseController = require("./base.controller");
const PlanUsageManager = require("@/modules/plans/plans.controller");
const PlansRepository = require("@/modules/plans/plans.repository");
const taskPrioritiesRepository = require("@/modules/task_priorities/repositories/task-priorities.repository");
const {
  ALLOWED_NOTE_STATUSES,
  normalizeNoteStatus,
} = require("@/utils/patterns/product-patterns");
const spacesService = require("@/services/storage");
const {
  cloneDefaultNoteDocumentState,
  normalizeNoteDocumentPayload,
} = require("../document-normalizer");
const { documentToBlocks } = require("../document-blocks-adapter");

/**
 * Criação, atualização e exclusão de notas.
 */
class NotesWriteController extends NotesBaseController {
  _injectUploadedDocumentImages(documentState, uploadedImages = []) {
    if (!documentState?.document || uploadedImages.length === 0) {
      return documentState;
    }

    const nextDocument = structuredClone(documentState);
    const byOriginalName = new Map(
      uploadedImages.map((item) => [item.originalName, item])
    );
    const byIndex = new Map(
      uploadedImages.map((item, index) => [String(index), item])
    );
    let cursor = 0;

    const resolveUpload = (token) => {
      if (!token) {
        const next = uploadedImages[cursor];
        cursor += 1;
        return next || null;
      }

      if (byIndex.has(token)) {
        return byIndex.get(token);
      }

      if (byOriginalName.has(token)) {
        return byOriginalName.get(token);
      }

      return null;
    };

    const walk = (node, path = "document.document") => {
      if (!node || typeof node !== "object") return;

      if (node.type === "image" && node.attrs?.src?.startsWith?.("upload://")) {
        const token = String(node.attrs.src).replace("upload://", "").trim();
        const upload = resolveUpload(token);
        if (!upload) {
          throw new Error(
            `${path}: placeholder '${node.attrs.src}' sem arquivo correspondente em documentImages`
          );
        }
        node.attrs.src = upload.path;
      }

      if (Array.isArray(node.content)) {
        node.content.forEach((child, index) =>
          walk(child, `${path}.content[${index}]`)
        );
      }
    };

    walk(nextDocument.document);
    return nextDocument;
  }

  _assertNoDocumentUploadPlaceholders(documentState) {
    const walk = (node, path = "document.document") => {
      if (!node || typeof node !== "object") return;

      if (node.type === "image" && node.attrs?.src?.startsWith?.("upload://")) {
        throw new Error(
          `${path}: placeholder de upload pendente em image.attrs.src`
        );
      }

      if (Array.isArray(node.content)) {
        node.content.forEach((child, index) =>
          walk(child, `${path}.content[${index}]`)
        );
      }
    };

    walk(documentState?.document);
  }

  async createNote(req, res, next) {
    try {
      const {
        title,
        description,
        tags = [],
        status,
        project_id,
        document,
      } = req.body;

      // 1. Validação de autenticação
      const userId = this._validateAuthentication(req, res);
      if (!userId) return;

      // 2. BUSCAR/CRIAR O REGISTRO DE USO (USANDO O MANAGER)
      const usageRecord = await PlanUsageManager.managePlanUsage(userId);
      const getUserPlan = await PlansRepository.getUserAndPlan(userId);

      // 3. BUSCAR DETALHES DO PLANO (LIMITES E NOME)
      const planDetails = await PlansRepository.getPlanById(
        getUserPlan.plan_id
      );

      if (!usageRecord || !planDetails) {
        return res.status(404).json({
          error: "Configuração de plano não encontrada para este usuário.",
        });
      }

      // 4. VALIDAR LIMITE DE NOTAS
      const canCreate = PlanUsageManager.checkLimit(
        planDetails.details,
        usageRecord.usage_details,
        "usage_summary.notes_total",
        "limits.max_notes"
      );

      if (!canCreate) {
        return res.status(403).json({
          error: "Limite de notas atingido",
          message: `Seu plano (${planDetails.name}) permite apenas ${planDetails.details.limits.max_notes} notas.`,
        });
      }

      // 5. Validação de dados obrigatórios
      if (!title) {
        return res.status(400).json({
          error: "Título é obrigatório",
        });
      }

      const noteStatus = normalizeNoteStatus(status);
      if (!noteStatus || !ALLOWED_NOTE_STATUSES.includes(noteStatus)) {
        return res.status(400).json({
          error: `Status inválido. Permitidos: ${ALLOWED_NOTE_STATUSES.join(", ")}`,
        });
      }

      let normalizedDocument;
      try {
        normalizedDocument =
          document === undefined
            ? cloneDefaultNoteDocumentState()
            : normalizeNoteDocumentPayload(document);
        this._assertNoDocumentUploadPlaceholders(normalizedDocument);
      } catch (error) {
        return res.status(400).json({ error: error.message });
      }

      // 6. Criação da nota no banco
      const newNote = await this.notesRepository.createNotesQuery(
        userId,
        title,
        description,
        tags,
        noteStatus,
        project_id,
        null,
        null,
        normalizedDocument
      );

      // 7. INCREMENTAR O USO
      await PlanUsageManager.consumeNoteCreation(usageRecord.id);

      // 8. Formata e retorna a nota criada
      const formattedNote = this._formatNoteResponse(newNote);
      res.status(201).json(formattedNote);
    } catch (error) {
      this._handleError(error, res, next);
    }
  }

  async createCompleteNote(req, res, next) {
    try {
      const {
        title,
        description,
        tags = [],
        initialBlockContent = "",
        status,
        project_id,
        document,
      } = req.body;

      // Validação de autenticação
      const userId = this._validateAuthentication(req, res);
      if (!userId) return;

      // Buscar/Criar registro de uso
      const usageRecord = await PlanUsageManager.managePlanUsage(userId);
      const getUserPlan = await PlansRepository.getUserAndPlan(userId);

      // Buscar detalhes do plano
      const planDetails = await PlansRepository.getPlanById(
        getUserPlan.plan_id
      );

      if (!usageRecord || !planDetails) {
        return res.status(404).json({
          error: "Configuração de plano não encontrada para este usuário.",
        });
      }

      // Validar limite de notas
      const canCreate = PlanUsageManager.checkLimit(
        planDetails.details,
        usageRecord.usage_details,
        "usage_summary.notes_total",
        "limits.max_notes"
      );

      if (!canCreate) {
        return res.status(403).json({
          error: "Limite de notas atingido",
          message: `Seu plano (${planDetails.name}) permite apenas ${planDetails.details.limits.max_notes} notas.`,
        });
      }

      // Validação de dados obrigatórios
      if (!title) {
        throw new Error("Título é obrigatório");
      }

      const noteStatus = normalizeNoteStatus(status);
      if (!noteStatus || !ALLOWED_NOTE_STATUSES.includes(noteStatus)) {
        return res.status(400).json({
          error: `Status inválido. Permitidos: ${ALLOWED_NOTE_STATUSES.join(", ")}`,
        });
      }

      let normalizedDocument;
      try {
        normalizedDocument =
          document === undefined
            ? cloneDefaultNoteDocumentState()
            : normalizeNoteDocumentPayload(document);
        this._assertNoDocumentUploadPlaceholders(normalizedDocument);
      } catch (error) {
        return res.status(400).json({ error: error.message });
      }

      // Criação da nota completa (nota + bloco inicial) em uma única transação
      const result = await this.notesRepository.createCompleteNote(
        userId,
        title,
        description,
        tags,
        initialBlockContent,
        noteStatus,
        project_id,
        normalizedDocument
      );

      // Incrementar o uso de notas
      await PlanUsageManager.consumeNoteCreation(usageRecord.id);

      // Montar estrutura completa da nota com todos os dados das tabelas relacionadas
      const completeNote = {
        id: result.note_id,
        user_id: result.user_id,
        project_id: result.project_id,
        title: result.title,
        description: result.description,
        properties: result.properties || {},
        document: result.document || cloneDefaultNoteDocumentState(),
        tags: result.tags || [],
        status: result.status,
        created_at: result.note_created_at,
        updated_at: result.note_updated_at,
        user: {
          id: result.user_id,
          name: result.user_name,
          username: result.user_username,
          email: result.user_email,
          avatar_url: result.user_avatar_url,
        },
        blocks: documentToBlocks(
          result.document || cloneDefaultNoteDocumentState(),
          result.note_id
        ),
      };

      // Retorna a nota completíssima criada
      res.status(201).json(completeNote);
    } catch (error) {
      this._handleError(error, res, next);
    }
  }

  async updateNote(req, res, next) {
    try {
      const { id } = req.params;

      // Quando multipart/form-data, campos texto vêm como strings
      // Parsear properties se vier como string JSON
      let {
        title,
        description,
        tags,
        status,
        deleted,
        project_id,
        properties,
        document,
        priority_id,
        due_date,
      } = req.body;

      if (typeof properties === "string") {
        try {
          properties = JSON.parse(properties);
        } catch {
          return res
            .status(400)
            .json({ error: "properties deve ser um JSON válido" });
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

      // Validação de autenticação
      const userId = this._validateAuthentication(req, res);
      if (!userId) return;

      // Validação de acesso à nota (proprietário ou colaborador pode editar)
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
            return res.status(400).json({ error: "Prioridade inválida" });
          }
          const scopeOrg = note.scope_org_id || null;
          const noteProjectId = note.project_id || null;
          if (tp.project_id) {
            if (tp.project_id !== noteProjectId) {
              return res.status(400).json({
                error: "Prioridade não pertence ao projeto desta nota",
              });
            }
          } else if (tp.org_id) {
            if (!scopeOrg || tp.org_id !== scopeOrg) {
              return res.status(400).json({
                error: "Prioridade não pertence à organização desta nota",
              });
            }
          } else {
            return res.status(400).json({ error: "Prioridade inválida" });
          }
        }
      }

      if (due_date !== undefined && due_date !== null && due_date !== "") {
        const t = new Date(due_date).getTime();
        if (Number.isNaN(t)) {
          return res.status(400).json({ error: "due_date inválida" });
        }
      }

      if (deleted !== undefined && !isOwner && !hasOrgProjectAccess) {
        throw new Error("Apenas o proprietário pode excluir a nota");
      }

      if (status !== undefined) {
        const normalized = normalizeNoteStatus(status);
        if (!normalized || !ALLOWED_NOTE_STATUSES.includes(normalized)) {
          return res.status(400).json({
            error: `Status inválido. Permitidos: ${ALLOWED_NOTE_STATUSES.join(", ")}`,
          });
        }
      }

      // Prepara os dados para atualização (apenas campos fornecidos)
      const updateData = {};
      if (title !== undefined) updateData.title = title;
      if (description !== undefined) updateData.description = description;
      if (tags !== undefined) updateData.tags = tags;
      if (status !== undefined) updateData.status = normalizeNoteStatus(status);
      if (deleted !== undefined) updateData.deleted = deleted;
      if (project_id !== undefined) {
        const nextProjectId =
          project_id === null || project_id === undefined || project_id === ""
            ? null
            : String(project_id);
        updateData.project_id = nextProjectId;
        const prevProjectId = note.project_id ? String(note.project_id) : null;
        if (nextProjectId !== prevProjectId) {
          updateData.project_stage_id = null;
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
      // Processar properties (campos JSON) e arquivos enviados
      const propertiesUpdate = properties || {};
      const uploadedDocumentImages = [];

      // Coletar todos os arquivos que serão enviados para validação de plano
      const allUploadedFiles = [
        ...(req.files?.icon || []),
        ...(req.files?.banner || []),
        ...(req.files?.files || []),
        ...(req.files?.documentImages || []),
      ];

      // Validar limites do plano antes de fazer qualquer upload
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
            error: "Configuração de plano não encontrada para este usuário.",
          });
        }

        const maxFileSizeMb =
          planDetails.details?.limits?.storage?.max_file_size_mb;
        const totalMonthlyUploadMb =
          planDetails.details?.limits?.storage?.total_monthly_upload_mb;

        // Validar tamanho individual de cada arquivo
        if (maxFileSizeMb) {
          for (const file of allUploadedFiles) {
            const fileSizeMb = file.size / (1024 * 1024);
            if (fileSizeMb > maxFileSizeMb) {
              return res.status(413).json({
                error: "Arquivo excede o tamanho máximo permitido",
                message: `O arquivo "${file.originalname}" tem ${fileSizeMb.toFixed(2)} MB. Seu plano (${planDetails.name}) permite arquivos de até ${maxFileSizeMb} MB.`,
              });
            }
          }
        }

        // Calcular total a ser enviado
        totalUploadSizeMb = allUploadedFiles.reduce(
          (sum, file) => sum + file.size / (1024 * 1024),
          0
        );

        // Validar limite mensal de upload
        if (totalMonthlyUploadMb) {
          const currentUsageMb =
            PlanUsageManager.getNestedValue(
              usageRecord.usage_details,
              "monthly_cycle.storage.total_uploaded_mb"
            ) || 0;

          if (currentUsageMb + totalUploadSizeMb > totalMonthlyUploadMb) {
            return res.status(403).json({
              error: "Limite de armazenamento mensal atingido",
              message: `Seu plano (${planDetails.name}) permite ${totalMonthlyUploadMb} MB de upload por mês. Uso atual: ${currentUsageMb.toFixed(2)} MB.`,
            });
          }
        }
      }

      // Processar upload de ícone
      if (req.files?.icon?.[0]) {
        const iconFile = req.files.icon[0];
        // Deletar ícone anterior se existir
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
          path: result.path || result.key || "",
          name: iconFile.originalname,
          type: iconFile.mimetype,
        };
      }

      // Processar upload de banner
      if (req.files?.banner?.[0]) {
        const bannerFile = req.files.banner[0];
        // Deletar banner anterior se existir
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
          path: result.path || result.key || "",
          name: bannerFile.originalname,
          type: bannerFile.mimetype,
        };
      }

      // Processar upload de arquivos
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
              path: result.key || result.path || "",
              name: file.originalname,
              type: file.mimetype,
            };
          })
        );
        propertiesUpdate.files = [...currentFiles, ...newFiles];
      }

      if (req.files?.documentImages?.length > 0) {
        const uploaded = await Promise.all(
          req.files.documentImages.map(async (file) => {
            const result = await spacesService.uploadNoteDocumentImage(
              file.buffer,
              file.mimetype,
              id,
              userId,
              file.originalname
            );
            return {
              id: result.fileName,
              originalName: file.originalname,
              path: result.key || result.path || "",
              type: file.mimetype,
            };
          })
        );
        uploadedDocumentImages.push(...uploaded);
      }

      // Remover arquivos do storage ao remover icon, banner ou files
      // Remover ícone
      if (propertiesUpdate.icon && propertiesUpdate.icon.path === "") {
        const currentNote = await this.notesRepository.getNoteById(id);
        if (currentNote?.properties?.icon?.path) {
          const oldKey = currentNote.properties.icon.path;
          if (oldKey) await spacesService.deleteImage(oldKey);
        }
      }
      // Remover banner
      if (propertiesUpdate.banner && propertiesUpdate.banner.path === "") {
        const currentNote = await this.notesRepository.getNoteById(id);
        if (currentNote?.properties?.banner?.path) {
          const oldKey = currentNote.properties.banner.path;
          if (oldKey) await spacesService.deleteImage(oldKey);
        }
      }
      // Remover arquivos
      if (propertiesUpdate.files && Array.isArray(propertiesUpdate.files)) {
        const currentNote = await this.notesRepository.getNoteById(id);
        const currentFiles = currentNote?.properties?.files || [];
        // Descobrir quais arquivos foram removidos
        const removedFiles = currentFiles.filter(
          (f) => !propertiesUpdate.files.find((nf) => nf.id === f.id)
        );
        for (const file of removedFiles) {
          if (file.path) await spacesService.deleteImage(file.path);
        }
      }

      // Registrar consumo de storage no plano após uploads bem-sucedidos
      if (usageRecord && totalUploadSizeMb > 0) {
        await PlanUsageManager.consumeStorage(
          usageRecord.id,
          totalUploadSizeMb
        );
      }

      if (document !== undefined) {
        let normalizedDocument;
        try {
          normalizedDocument = normalizeNoteDocumentPayload(document);
          if (uploadedDocumentImages.length > 0) {
            normalizedDocument = this._injectUploadedDocumentImages(
              normalizedDocument,
              uploadedDocumentImages
            );
          }
          this._assertNoDocumentUploadPlaceholders(normalizedDocument);
        } catch (error) {
          return res.status(400).json({ error: error.message });
        }
        updateData.document = normalizedDocument;
      } else if (uploadedDocumentImages.length > 0) {
        return res.status(400).json({
          error:
            "documentImages exige envio do campo document com placeholders 'upload://<nome-do-arquivo>'",
        });
      }

      // Se há properties para atualizar
      if (Object.keys(propertiesUpdate).length > 0) {
        updateData.properties = propertiesUpdate;
      }

      // Verifica se há algo para atualizar
      if (Object.keys(updateData).length === 0) {
        return res.status(400).json({
          error: "Nenhum campo fornecido para atualização",
        });
      }

      const updatedFields = Object.keys(updateData);
      const isDocumentOnlyUpdate =
        updatedFields.length === 1 && updatedFields[0] === "document";

      // Atualização da nota
      const updatedNote = await this.notesRepository.updateNoteById(
        id,
        updateData
      );

      if (!updatedNote) {
        return res.status(400).json({
          error: "Nenhuma atualização foi realizada",
        });
      }

      let formattedNote;
      if (isDocumentOnlyUpdate) {
        formattedNote = this._formatNoteResponse(updatedNote, [], {
          includeBlocks: false,
        });
      } else {
        const refreshed = await this.notesRepository.getNoteById(id);
        formattedNote = this._formatNoteResponse(refreshed || updatedNote);
      }

      formattedNote.access = {
        isOwner,
        isCollaborator,
        hasOrgProjectAccess,
        canEdit: isOwner || isCollaborator || hasOrgProjectAccess,
        canDelete: isOwner || hasOrgProjectAccess,
        canShare: isOwner || hasOrgProjectAccess,
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
          return res.status(403).json({
            error: "Limite de armazenamento mensal atingido",
            message: `Seu plano (${planDetails.name}) permite ${totalMonthlyUploadMb} MB de upload por mês. Uso atual: ${currentUsageMb.toFixed(2)} MB.`,
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
