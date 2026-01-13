const backupRepository = require("@/modules/backup/backup.repository");
const userRepository = require("@/modules/users/users.repository");
const jobManager = require("@/services/jobs/index");
const {
  sendBackupEmail,
} = require("@/services/email/templates/backup/backup-notification");
const PlansRepository = require("@/modules/plans/plans.repository");
const PlanUsageManager = require("@/modules/plans/plans.controller");
const { PLAN_PATHS, USAGE_PATHS } = require("@/services/plans/plan-paths");
const storageService = require("@/services/storage/index");
const crypto = require("crypto");

class BackupController {
  constructor() {
    this.backupRepository = backupRepository;
    this.userRepository = userRepository;
  }

  _validateAuthentication(req, res) {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({
        status: "Unauthorized",
        error: "Autenticação necessária",
        message: "Usuário não autenticado",
      });
      return null;
    }
    return userId;
  }

  _validateUserId(userId) {
    const isNumeric = /^\d+$/.test(userId);
    const isUUID =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        userId
      );
    return isNumeric || isUUID;
  }

  async _executeBackupJob(jobId, userId) {
    try {
      const usageBackupsJobs = await jobManager.getUserJobs(userId);
      const activeUsageJob = usageBackupsJobs.find(
        (job) =>
          job.type === "backup_export_usage" &&
          ["pending", "processing"].includes(job.status)
      );

      if (activeUsageJob) {
        throw new Error(
          "Já existe um job de backup de uso em andamento. Aguarde a conclusão antes de iniciar outro."
        );
      }

      await jobManager.updateJob(jobId, {
        status: "processing",
        progress: 10,
      });

      const user = await this.userRepository.getUserById(userId);
      if (!user) throw new Error("Usuário não encontrado");

      await jobManager.updateJob(jobId, { progress: 20 });

      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(
          () => reject(new Error("Timeout: Backup demorou mais que 5 minutos")),
          5 * 60 * 1000
        );
      });

      const dataPromise = this.backupRepository.getAllData(userId);
      const rawData = await Promise.race([dataPromise, timeoutPromise]);

      await jobManager.updateJob(jobId, { progress: 60 });

      const totalNotes = rawData.length;
      const totalBlocks = rawData.reduce(
        (sum, note) => sum + (note.blocks?.length || 0),
        0
      );

      if (totalNotes > 1000 || totalBlocks > 5000) {
        throw new Error(
          `Muitos dados para backup: ${totalNotes} notas, ${totalBlocks} blocos. Contate o suporte.`
        );
      }

      const backupData = this._formatBackupDataCSV(rawData);

      await jobManager.updateJob(jobId, { progress: 70 });

      // Upload do backup para o storage
      const uploadResult = await storageService.uploadBackup(
        backupData,
        userId,
        `backup_${userId}_${Date.now()}.csv`
      );

      if (!uploadResult.success) {
        throw new Error("Falha ao fazer upload do backup para o storage");
      }

      await jobManager.updateJob(jobId, { progress: 80 });

      // Gerar token de download com validade de 48h
      const downloadToken = crypto.randomBytes(32).toString("hex");
      const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000); // 48 horas

      await this.backupRepository.createDownloadToken(
        downloadToken,
        userId,
        "backup_download",
        expiresAt
      );

      await jobManager.updateJob(jobId, { progress: 90 });

      // Enviar email com link de download
      const downloadUrl = `${process.env.API_URL || "http://localhost:8080"}/api/backup/download/${downloadToken}`;
      const emailResult = await sendBackupEmail(
        user.email,
        user.name || user.username,
        downloadUrl,
        expiresAt
      );

      if (!emailResult.success) {
        throw new Error(
          `Falha ao enviar email: ${emailResult.error || "Erro desconhecido"}`
        );
      }

      await jobManager.updateJob(jobId, {
        status: "completed",
        progress: 100,
        result: {
          totalNotes,
          fileSize: uploadResult.size,
          storageKey: uploadResult.key,
          downloadToken: downloadToken,
          expiresAt: expiresAt.toISOString(),
          emailSent: emailResult.success,
          completedAt: new Date().toISOString(),
        },
      });

      console.log(`Backup job ${jobId} concluído para usuário ${userId}`);
    } catch (error) {
      console.error(`Erro no backup job ${jobId}:`, error);
      await jobManager.updateJob(jobId, {
        status: "failed",
        error: error.message,
        progress: 0,
      });
    }
  }

  _handleError(error, res, next) {
    const { message } = error;

    if (message.includes("obrigatório") || message.includes("inválido")) {
      return res.status(400).json({
        status: "Bad Request",
        error: message,
      });
    }

    if (
      message.includes("não encontrada") ||
      message.includes("Acesso negado")
    ) {
      return res.status(404).json({
        status: "Not Found",
        error: message,
      });
    }

    if (message.includes("Muitos dados")) {
      return res.status(413).json({
        status: "Payload Too Large",
        error: message,
        message: "Volume de dados excede o limite suportado",
      });
    }

    if (message.includes("limite") || message.includes("Limite")) {
      return res.status(429).json({
        status: "Too Many Requests",
        error: message,
      });
    }

    next(error);
  }

  _formatBackupDataCSV(rawData) {
    const lines = [];

    lines.push(
      [
        "note_id",
        "title",
        "description",
        "tags",
        "created_at",
        "updated_at",
        "owner_id",
        "owner_name",
        "owner_username",
        "collaborators",
        "block_id",
        "block_type",
        "block_text",
        "block_position",
        "block_done",
        "block_created_at",
      ].join(",")
    );

    rawData.forEach((note) => {
      const activeBlocks = note.blocks?.filter((block) => !block.deleted) || [];
      const collaborators =
        note.collaborators
          ?.filter((c) => !c.removed)
          .map((c) => c.username || c.name)
          .join(";") || "";

      const baseNoteData = [
        this._escapeCsv(note.note_id),
        this._escapeCsv(note.title || ""),
        this._escapeCsv(note.description || ""),
        this._escapeCsv(note.tags?.join(";") || ""),
        this._escapeCsv(note.created_at),
        this._escapeCsv(note.updated_at),
        this._escapeCsv(note.owner_id),
        this._escapeCsv(note.owner?.name || ""),
        this._escapeCsv(note.owner?.username || ""),
        this._escapeCsv(collaborators),
      ];

      if (activeBlocks.length === 0) {
        lines.push([...baseNoteData, "", "", "", "", "", ""].join(","));
      } else {
        activeBlocks.forEach((block) => {
          lines.push(
            [
              ...baseNoteData,
              this._escapeCsv(block.block_id),
              this._escapeCsv(block.type || ""),
              this._escapeCsv(block.text || ""),
              this._escapeCsv(block.position?.toString() || ""),
              this._escapeCsv(block.done?.toString() || ""),
              this._escapeCsv(block.created_at || ""),
            ].join(",")
          );
        });
      }
    });

    return lines.join("\n");
  }

  _escapeCsv(value) {
    if (value === null || value === undefined) return "";
    const str = String(value);
    if (/[,"\n\r]/.test(str)) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  }

  _formatBackupData(rawData) {
    return {
      backup_info: {
        generated_at: new Date().toISOString(),
        total_notes: rawData.length,
        data_version: "1.0",
      },
      user_info: {
        user_id: rawData[0]?.owner_id || null,
        name: rawData[0]?.owner?.name || null,
        username: rawData[0]?.owner?.username || null,
        avatar_url: rawData[0]?.owner?.avatar_url || null,
      },
      notes: rawData.map((note) => ({
        id: note.note_id,
        title: note.title,
        description: note.description,
        tags: note.tags || [],
        created_at: note.created_at,
        updated_at: note.updated_at,
        owner: {
          id: note.owner_id,
          name: note.owner?.name,
          username: note.owner?.username,
          avatar_url: note.owner?.avatar_url,
        },
        collaborators:
          note.collaborators?.map((collab) => ({
            id: collab.collaborator_id,
            name: collab.name,
            username: collab.username,
            avatar_url: collab.avatar_url,
            added_at: collab.added_at,
            removed: collab.removed,
            removed_at: collab.removed_at,
          })) || [],
        blocks: (note.blocks?.filter((block) => !block.deleted) || []).map(
          (block) => ({
            id: block.block_id,
            user_id: block.user_id,
            parent_id: block.parent_id,
            type: block.type,
            text: block.text,
            properties: block.properties,
            done: block.done,
            position: block.position,
            created_at: block.created_at,
            updated_at: block.updated_at,
          })
        ),
      })),
    };
  }

  async requestBackup(req, res, next) {
    try {
      const userId = this._validateAuthentication(req, res);
      if (!userId) return;

      if (!this._validateUserId(userId)) {
        return res.status(400).json({
          status: "Bad Request",
          error: "ID de usuário inválido",
          message: "O formato do ID de usuário não é válido",
        });
      }

      // Verificar plano e limites de uso
      const userPlan = await PlansRepository.getUserWithPlan(userId);
      if (!userPlan || !userPlan.plan_id) {
        return res.status(403).json({
          status: "Forbidden",
          error: "Plano não encontrado",
          message: "Você precisa ter um plano ativo para solicitar backups",
        });
      }

      const planDetails = await PlansRepository.getPlanById(userPlan.plan_id);
      const usageRecord = await PlanUsageManager.managePlanUsage(userId);

      const canBackup = PlanUsageManager.checkLimit(
        planDetails.details,
        usageRecord.usage_details,
        USAGE_PATHS.MONTHLY.EXPORTS.BACKUPS_COUNT,
        PLAN_PATHS.LIMITS.EXPORTS.BACKUPS_MONTHLY
      );

      if (!canBackup) {
        const currentUsage = PlanUsageManager.getNestedValue(
          usageRecord.usage_details,
          USAGE_PATHS.MONTHLY.EXPORTS.BACKUPS_COUNT
        );
        const limit = PlanUsageManager.getNestedValue(
          planDetails.details,
          PLAN_PATHS.LIMITS.EXPORTS.BACKUPS_MONTHLY
        );

        return res.status(406).json({
          status: "Too Many Requests",
          message: `Você atingiu o limite de ${limit} backup(s) por mês do seu plano ${planDetails.name}`,
          details: {
            current_usage: currentUsage,
            monthly_limit: limit,
            plan_name: planDetails.name,
            period_end: PlanUsageManager.getNestedValue(
              usageRecord.usage_details,
              USAGE_PATHS.MONTHLY.PERIOD_END
            ),
          },
        });
      }

      const existingJobs = await jobManager.getUserJobs(userId);
      const activeJob = existingJobs.find(
        (job) =>
          job.type === "backup_export" &&
          ["pending", "processing"].includes(job.status)
      );

      if (activeJob) {
        return res.status(409).json({
          status: "Conflict",
          error: "Backup já em andamento",
          message: "Aguarde a conclusão do backup atual antes de solicitar outro",
          details: {
            job_id: activeJob.id,
            backup_status: activeJob.status,
            progress: activeJob.progress,
          },
        });
      }

      const user = await this.userRepository.getUserById(userId);
      if (!user)
        return res.status(404).json({
          status: "Not Found",
          error: "Usuário não encontrado",
        });

      const job = await jobManager.createJob("backup_export", userId, {
        email: user.email,
        username: user.name || user.username,
        requestedAt: new Date().toISOString(),
      });

      // Consumir uso de backup após criar o job com sucesso
      await PlanUsageManager.consumeExport(usageRecord.id, "backup");

      setTimeout(() => this._executeBackupJob(job.id, userId), 100);

      const updatedUsage = PlanUsageManager.getNestedValue(
        usageRecord.usage_details,
        USAGE_PATHS.MONTHLY.EXPORTS.BACKUPS_COUNT
      ) + 1;
      const monthlyLimit = PlanUsageManager.getNestedValue(
        planDetails.details,
        PLAN_PATHS.LIMITS.EXPORTS.BACKUPS_MONTHLY
      );

      res.status(202).json({
        status: "OK",
        job_id: job.id,
        message: "Backup solicitado com sucesso! Você receberá um email quando estiver pronto.",
        details: {
          backup_status: "pending",
          estimated_time: "2-5 minutos",
          user_email: user.email,
          created_at: job.createdAt,
          usage: {
            backups_used: updatedUsage,
            backups_limit: monthlyLimit,
            remaining: monthlyLimit - updatedUsage,
          },
        },
      });
    } catch (error) {
      this._handleError(error, res, next);
    }
  }

  async getBackupStatus(req, res, next) {
    try {
      const { jobId } = req.params;
      const userId = this._validateAuthentication(req, res);
      if (!userId) return;

      const job = await jobManager.getJob(jobId);
      if (!job) return res.status(404).json({
        status: "Not Found",
        error: "Job não encontrado",
        message: "O job solicitado não existe ou expirou",
      });

      if (job.userId !== userId) {
        return res.status(403).json({
          status: "Forbidden",
          error: "Acesso negado a este job",
          message: "Você não tem permissão para acessar este job",
        });
      }

      const elapsedMinutes = Math.floor(
        (new Date() - new Date(job.createdAt)) / (1000 * 60)
      );

      res.status(200).json({
        status: "OK",
        job_id: job.id,
        message: "Status do backup recuperado com sucesso",
        details: {
          backup_status: job.status,
          progress: job.progress,
          created_at: job.createdAt,
          started_at: job.startedAt,
          completed_at: job.completedAt,
          elapsed_time: `${elapsedMinutes} minuto${elapsedMinutes !== 1 ? "s" : ""}`,
          error: job.error,
          result: job.result,
        },
      });
    } catch (error) {
      this._handleError(error, res, next);
    }
  }

  async getUserBackupJobs(req, res, next) {
    try {
      const userId = this._validateAuthentication(req, res);
      if (!userId) return;

      const jobs = (await jobManager.getUserJobs(userId))
        .filter((job) => job.type === "backup_export")
        .slice(0, 10);

      res.status(200).json({
        status: "OK",
        message: "Histórico de backups recuperado com sucesso",
        total: jobs.length,
        details: {
          jobs: jobs.map((job) => ({
            job_id: job.id,
            status: job.status,
            progress: job.progress,
            created_at: job.createdAt,
            completed_at: job.completedAt,
            error: job.error ? job.error.substring(0, 100) : null,
            result: job.result
              ? {
                  totalNotes: job.result.totalNotes,
                  fileSize: job.result.fileSize,
                }
              : null,
          })),
        },
      });
    } catch (error) {
      this._handleError(error, res, next);
    }
  }

  async getBackupSummary(req, res, next) {
    try {
      const userId = this._validateAuthentication(req, res);
      if (!userId) return;

      const rawData = await this.backupRepository.getAllData(userId);

      const summary = {
        total_notes: rawData.length,
        owned_notes: rawData.filter((n) => n.owner_id === userId).length,
        collaborated_notes: rawData.filter((n) => n.owner_id !== userId).length,
        total_blocks: rawData.reduce(
          (sum, n) => sum + (n.blocks?.filter((b) => !b.deleted).length || 0),
          0
        ),
        total_collaborators: new Set(
          rawData.flatMap(
            (n) =>
              n.collaborators
                ?.filter((c) => !c.removed)
                .map((c) => c.collaborator_id) || []
          )
        ).size,
        oldest_note:
          rawData.length > 0
            ? Math.min(...rawData.map((n) => new Date(n.created_at)))
            : null,
        newest_note:
          rawData.length > 0
            ? Math.max(...rawData.map((n) => new Date(n.created_at)))
            : null,
        last_updated:
          rawData.length > 0
            ? Math.max(...rawData.map((n) => new Date(n.updated_at)))
            : null,
      };

      const notesByMonth = {};
      const now = new Date();
      for (let i = 11; i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
        notesByMonth[key] = 0;
      }

      rawData.forEach((note) => {
        const key = `${new Date(note.created_at).getFullYear()}-${String(new Date(note.created_at).getMonth() + 1).padStart(2, "0")}`;
        if (notesByMonth.hasOwnProperty(key)) notesByMonth[key]++;
      });

      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      res.status(200).json({
        status: "OK",
        message: "Resumo de backup gerado com sucesso",
        generated_at: new Date().toISOString(),
        details: {
          summary,
          notes_by_month: notesByMonth,
          recent_activity: {
            notes_created: rawData.filter(
              (n) => new Date(n.created_at) > thirtyDaysAgo
            ).length,
            notes_updated: rawData.filter(
              (n) => new Date(n.updated_at) > thirtyDaysAgo
            ).length,
          },
        },
      });
    } catch (error) {
      this._handleError(error, res, next);
    }
  }

  async downloadBackup(req, res, next) {
    try {
      const { token } = req.params;

      if (!token) {
        return res.status(400).json({
          status: "Bad Request",
          error: "Token não fornecido",
        });
      }

      // Buscar token no banco com job relacionado
      const tokenRecord = await this.backupRepository.getTokenWithJob(token);

      if (!tokenRecord) {
        return res.status(404).json({
          status: "Not Found",
          error: "Token inválido ou já utilizado",
          message: "O link de download não é válido ou já foi usado",
        });
      }

      // Verificar expiração
      if (new Date() > new Date(tokenRecord.expires_at)) {
        return res.status(410).json({
          status: "Gone",
          error: "Token expirado",
          message: "O link de download expirou. Solicite um novo backup.",
        });
      }

      // Verificar se é o dono (se usuário estiver autenticado)
      if (req.user?.userId && req.user.userId !== tokenRecord.user_id) {
        return res.status(403).json({
          status: "Forbidden",
          error: "Acesso negado",
          message: "Você não tem permissão para acessar este backup",
        });
      }

      const result = tokenRecord.result;
      if (!result || !result.storageKey) {
        return res.status(500).json({
          status: "Internal Server Error",
          error: "Backup não encontrado no storage",
          message: "Não foi possível localizar o arquivo de backup",
        });
      }

      const storageKey = result.storageKey;
      const fileName = `backup_${tokenRecord.user_id}_${Date.now()}.csv`;

      // Fazer download do storage
      const fileContent = await storageService.downloadFile(storageKey);

      if (!fileContent) {
        return res.status(500).json({
          status: "Internal Server Error",
          error: "Falha ao recuperar arquivo do storage",
        });
      }

      // Marcar token como usado
      await this.backupRepository.markTokenAsUsed(token);

      // Enviar arquivo
      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
      res.setHeader("Content-Length", fileContent.length);
      res.send(fileContent);

    } catch (error) {
      console.error("Erro no download de backup:", error);
      this._handleError(error, res, next);
    }
  }
}

module.exports = new BackupController();
