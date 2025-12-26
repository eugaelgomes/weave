const getAllDataRepository = require("@/repositories/backups");
const userRepository = require("@/repositories/users");
const jobManager = require("@/services/jobs/index");
const {
  sendBackupEmail,
} = require("@/services/email/templates/backup/backup-notification");

class BackupController {
  constructor() {
    this.getAllDataRepository = getAllDataRepository;
    this.userRepository = userRepository;
  }
  /**
   * Valida autenticação
   * @param {Object} req - Request object
   * @param {Object} res - Response object
   * @returns {Object|null} - Retornar ID Usário ou Erro se nulo
   */
  _validateAuthentication(req, res) {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({ error: "Usuário não autenticado" });
      return null;
    }
    return userId;
  }

  /**
   * Validação de ID do usuário
   * @param {string} userId
   * @returns {boolean} - true se válido, false se contrário
   */
  _validateUserId(userId) {
    // Verificar se é um número ou UUID válido
    const isNumeric = /^\d+$/.test(userId);
    const isUUID =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        userId
      );
    return isNumeric || isUUID;
  }

  // BakcUp Job - Assíncrono
  /**
   * @param {string} jobId - ID do job
   * @param {string} userId - ID do usuário
   */
  async _executeBackupJob(jobId, userId) {
    try {
      // Atualizar status para processando no banco/tabela de jobs
      await jobManager.updateJob(jobId, {
        status: "processing",
        progress: 10,
      });

      // Buscar dados do usuário para email
      const user = await this.userRepository.getUserById(userId);
      if (!user) {
        throw new Error("Usuário não encontrado");
      }

      await jobManager.updateJob(jobId, { progress: 20 });

      // Buscar todos os dados com timeout
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(
          () => reject(new Error("Timeout: Backup demorou mais que 5 minutos")),
          5 * 60 * 1000
        );
      });

      const dataPromise = this.getAllDataRepository.getAllData(userId);
      const rawData = await Promise.race([dataPromise, timeoutPromise]);

      await jobManager.updateJob(jobId, { progress: 60 });

      // Verificar se usuário tem muitos dados (proteção)
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

      // Formatação em CSV
      const backupData = this._formatBackupDataCSV(rawData);

      await jobManager.updateJob(jobId, { progress: 80 });

      // Enviar por email
      const emailResult = await sendBackupEmail(
        user.email,
        user.name || user.username,
        backupData
      );

      if (!emailResult.success) {
        throw new Error(`Falha ao enviar email: ${emailResult.error}`);
      }

      await jobManager.updateJob(jobId, {
        status: "completed",
        progress: 100,
        result: {
          totalNotes: totalNotes,
          fileSize: emailResult.fileSize,
          sentAsAttachment: emailResult.sentAsAttachment,
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

  /**
   * Trata erros específicos e retorna resposta HTTP apropriada
   * @param {Error} error - Erro capturado
   * @param {Object} res - Response object
   * @param {Function} next - Next middleware function
   */
  _handleError(error, res, next) {
    const errorMessage = error.message;

    // Erros de validação (400 Bad Request)
    if (
      errorMessage.includes("obrigatório") ||
      errorMessage.includes("inválido")
    ) {
      return res.status(400).json({ error: errorMessage });
    }

    // Erros de autorização e não encontrado (404 Not Found)
    if (
      errorMessage.includes("não encontrada") ||
      errorMessage.includes("Acesso negado")
    ) {
      return res.status(404).json({ error: errorMessage });
    }

    // Erro de muitos dados (413 Payload Too Large)
    if (errorMessage.includes("Muitos dados")) {
      return res.status(413).json({ error: errorMessage });
    }

    // Outros erros passam para o middleware de erro global
    next(error);
  }

  /**
   * Converte dados para formato CSV
   * @param {Array} rawData - Dados brutos do banco
   * @returns {string} - String CSV
   */
  _formatBackupDataCSV(rawData) {
    const lines = [];

    // Cabeçalho
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

    // Processar cada nota e seus blocos
    rawData.forEach((note) => {
      const activeBlocks = note.blocks?.filter((block) => !block.deleted) || [];
      const collaborators =
        note.collaborators
          ?.filter((c) => !c.removed)
          .map((c) => c.username || c.name)
          .join(";") || "";

      if (activeBlocks.length === 0) {
        // Nota sem blocos
        lines.push(
          [
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
            "", // block_id
            "", // block_type
            "", // block_text
            "", // block_position
            "", // block_done
            "", // block_created_at
          ].join(",")
        );
      } else {
        // Nota com blocos (uma linha por bloco)
        activeBlocks.forEach((block) => {
          lines.push(
            [
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

  /**
   * Escapa valores para CSV (RFC 4180)
   * @param {any} value - Valor a ser escapado
   * @returns {string} - Valor escapado
   */
  _escapeCsv(value) {
    if (value === null || value === undefined) {
      return "";
    }

    const str = String(value);

    // Se contém vírgula, aspas ou quebra de linha, envolver em aspas
    if (
      str.includes(",") ||
      str.includes('"') ||
      str.includes("\n") ||
      str.includes("\r")
    ) {
      // Duplicar aspas internas
      return '"' + str.replace(/"/g, '""') + '"';
    }

    return str;
  }

  /**
   * Formata os dados de backup removendo informações sensíveis
   * @param {Array} rawData - Dados brutos do banco
   * @returns {Object} - Dados formatados para backup
   */
  _formatBackupData(rawData) {
    const backupData = {
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
        // email removido por segurança
      },
      notes: rawData.map((note) => {
        // Remove informações sensíveis dos colaboradores (emails)
        const collaborators =
          note.collaborators?.map((collab) => ({
            id: collab.collaborator_id,
            name: collab.name,
            username: collab.username,
            avatar_url: collab.avatar_url,
            added_at: collab.added_at,
            removed: collab.removed,
            removed_at: collab.removed_at,
            // email removido por segurança
          })) || [];

        // Remove informações sensíveis do proprietário (email)
        const owner = {
          id: note.owner_id,
          name: note.owner?.name,
          username: note.owner?.username,
          avatar_url: note.owner?.avatar_url,
          // email removido por segurança
        };

        // Filtrar blocos não deletados
        const activeBlocks =
          note.blocks?.filter((block) => !block.deleted) || [];

        return {
          id: note.note_id,
          title: note.title,
          description: note.description,
          tags: note.tags || [],
          created_at: note.created_at,
          updated_at: note.updated_at,
          owner: owner,
          collaborators: collaborators,
          blocks: activeBlocks.map((block) => ({
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
          })),
        };
      }),
    };

    return backupData;
  }

  async requestBackup(req, res, next) {
    try {
      // Validação de autenticação
      const userId = this._validateAuthentication(req, res);
      if (!userId) return;

      // Validação de entrada
      if (!this._validateUserId(userId)) {
        return res.status(400).json({ error: "ID de usuário inválido" });
      }

      // Verificar se já existe backup em andamento para este usuário
      const existingJobs = await jobManager.getUserJobs(userId);
      const activeJob = existingJobs.find(
        (job) =>
          job.type === "backup_export" &&
          ["pending", "processing"].includes(job.status)
      );

      if (activeJob) {
        return res.status(409).json({
          error: "Backup já em andamento",
          job_id: activeJob.id,
          status: activeJob.status,
          progress: activeJob.progress,
        });
      }

      // Buscar dados básicos do usuário
      const user = await this.userRepository.getUserById(userId);
      if (!user) {
        return res.status(404).json({ error: "Usuário não encontrado" });
      }

      // Criar novo job
      const jobId = jobManager.generateJobId("backup");
      const job = await jobManager.createJob(jobId, "backup_export", userId, {
        userEmail: user.email,
        userName: user.name || user.username,
        requestedAt: new Date().toISOString(),
      });

      // Iniciar processamento em background (não bloquear resposta)
      setTimeout(() => {
        this._executeBackupJob(jobId, userId);
      }, 100);

      // Resposta imediata
      res.status(202).json({
        message:
          "Backup solicitado com sucesso! Você receberá um email quando estiver pronto.",
        job_id: jobId,
        status: "pending",
        estimated_time: "2-5 minutos",
        user_email: user.email,
        created_at: job.createdAt,
      });
    } catch (error) {
      this._handleError(error, res, next);
    }
  }

  /**
   * GET /api/backup/status/:jobId - Verificar status de backup
   * Retorna o progresso de um job de backup específico
   */
  async getBackupStatus(req, res, next) {
    try {
      const { jobId } = req.params;

      // Validação de autenticação
      const userId = this._validateAuthentication(req, res);
      if (!userId) return;

      // Buscar job
      const job = await jobManager.getJob(jobId);
      if (!job) {
        return res.status(404).json({ error: "Job não encontrado" });
      }

      // Verificar se o job pertence ao usuário
      if (job.userId !== userId) {
        return res.status(403).json({ error: "Acesso negado a este job" });
      }

      // Calcular tempo decorrido
      const createdAt = new Date(job.createdAt);
      const now = new Date();
      const elapsedMinutes = Math.floor((now - createdAt) / (1000 * 60));

      const response = {
        job_id: job.id,
        status: job.status,
        progress: job.progress,
        created_at: job.createdAt,
        started_at: job.startedAt,
        completed_at: job.completedAt,
        elapsed_time: `${elapsedMinutes} minuto${elapsedMinutes !== 1 ? "s" : ""}`,
        error: job.error,
        result: job.result,
      };

      res.status(200).json(response);
    } catch (error) {
      this._handleError(error, res, next);
    }
  }

  /**
   * GET /api/backup/jobs - Listar jobs de backup do usuário
   * Lista histórico de backups solicitados
   */
  async getUserBackupJobs(req, res, next) {
    try {
      // Validação de autenticação
      const userId = this._validateAuthentication(req, res);
      if (!userId) return;

      // Buscar jobs do usuário
      const jobs = (await jobManager.getUserJobs(userId))
        .filter((job) => job.type === "backup_export")
        .slice(0, 10); // Limitar a 10 mais recentes

      const response = {
        total: jobs.length,
        jobs: jobs.map((job) => ({
          job_id: job.id,
          status: job.status,
          progress: job.progress,
          created_at: job.createdAt,
          completed_at: job.completedAt,
          error: job.error ? job.error.substring(0, 100) : null, // Truncar erro
          result: job.result
            ? {
                totalNotes: job.result.totalNotes,
                fileSize: job.result.fileSize,
              }
            : null,
        })),
      };

      res.status(200).json(response);
    } catch (error) {
      this._handleError(error, res, next);
    }
  }

  /**
   * GET /api/backup/summary - Resumo dos dados para backup
   * Retorna informações estatísticas sobre os dados do usuário
   *
   * RESPOSTA:
   * - summary: estatísticas gerais (total de notas, blocos, colaborações)
   * - notes_by_month: distribuição de notas por mês
   * - recent_activity: atividade recente
   */
  async getBackupSummary(req, res, next) {
    try {
      // Validação de Autenticação do Usuário
      const userId = this._validateAuthentication(req, res);
      if (!userId) return;

      // Buscar todos os dados do usuário
      const rawData = await this.getAllDataRepository.getAllData(userId);

      // Calcular estatísticas dos dados
      const summary = {
        total_notes: rawData.length,
        owned_notes: rawData.filter((note) => note.owner_id === userId).length,
        collaborated_notes: rawData.filter((note) => note.owner_id !== userId)
          .length,
        total_blocks: rawData.reduce(
          (sum, note) =>
            sum + (note.blocks?.filter((b) => !b.deleted).length || 0),
          0
        ),
        total_collaborators: new Set(
          rawData.flatMap(
            (note) =>
              note.collaborators
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

      // Distribuição por mês (últimos 12 meses)
      const notesByMonth = {};
      const now = new Date();
      for (let i = 11; i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
        notesByMonth[key] = 0;
      }

      rawData.forEach((note) => {
        const createdDate = new Date(note.created_at);
        const key = `${createdDate.getFullYear()}-${String(createdDate.getMonth() + 1).padStart(2, "0")}`;
        if (notesByMonth.hasOwnProperty(key)) {
          notesByMonth[key]++;
        }
      });

      // Atividade recente (últimos 30 dias)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const recentActivity = {
        notes_created: rawData.filter(
          (note) => new Date(note.created_at) > thirtyDaysAgo
        ).length,
        notes_updated: rawData.filter(
          (note) => new Date(note.updated_at) > thirtyDaysAgo
        ).length,
      };

      const response = {
        generated_at: new Date().toISOString(),
        summary,
        notes_by_month: notesByMonth,
        recent_activity: recentActivity,
      };

      res.status(200).json(response);
    } catch (error) {
      this._handleError(error, res, next);
    }
  }
}

module.exports = new BackupController();
