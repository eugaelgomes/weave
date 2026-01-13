const { executeQuery } = require("../db/index");
const storageService = require("../storage/index");

class JobManager {
  constructor() {
    this.jobs = new Map(); // Cache em memória para performance
    this.cleanupIsRunning = false;

    // Iniciar serviço de limpeza automática
    this.startCleanupService();
  }

  /**
   * Cria um novo job
   * @param {string} type - Tipo do job (backup_export)
   * @param {string} userId - ID do usuário
   * @param {Object} metadata - Metadados adicionais
   */
  async createJob(type, userId, metadata = {}) {
    const query = `
      INSERT INTO jobs (type, user_id, status, progress, metadata)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;

    const [job] = await executeQuery(query, [
      type,
      userId,
      "pending",
      0,
      JSON.stringify(metadata),
    ]);

    // Cache em memória
    const formattedJob = this.formatJob(job);
    this.jobs.set(formattedJob.id, formattedJob);

    return formattedJob;
  }

  /**
   * Atualiza status de um job
   * @param {string} jobId - ID do job
   * @param {Object} updates - Atualizações
   */
  async updateJob(jobId, updates) {
    const setParts = [];
    const values = [];
    let paramIndex = 1;

    // Construir query dinamicamente
    if (updates.status !== undefined) {
      setParts.push(`status = $${paramIndex++}`);
      values.push(updates.status);

      // Marcar timestamps automaticamente
      if (updates.status === "processing") {
        setParts.push("started_at = NOW()");
      }
      if (["completed", "failed"].includes(updates.status)) {
        setParts.push("completed_at = NOW()");
      }
    }
    if (updates.progress !== undefined) {
      setParts.push(`progress = $${paramIndex++}`);
      values.push(updates.progress);
    }
    if (updates.error !== undefined) {
      setParts.push(`error = $${paramIndex++}`);
      values.push(updates.error);
    }
    if (updates.result !== undefined) {
      setParts.push(`result = $${paramIndex++}`);
      values.push(JSON.stringify(updates.result));
    }

    values.push(jobId);

    const query = `
      UPDATE jobs 
      SET ${setParts.join(", ")}
      WHERE job_id = $${paramIndex}
      RETURNING *
    `;

    const [job] = await executeQuery(query, values);

    if (!job) {
      throw new Error("Job não encontrado");
    }

    // Atualizar cache
    const formattedJob = this.formatJob(job);
    this.jobs.set(jobId, formattedJob);

    return formattedJob;
  }

  /**
   * Busca job por ID
   * @param {string} jobId - ID do job
   * @returns {Object|null} Job encontrado
   */
  async getJob(jobId) {
    // Verificar cache primeiro
    if (this.jobs.has(jobId)) {
      return this.jobs.get(jobId);
    }

    // Buscar no banco
    const query = "SELECT * FROM jobs WHERE job_id = $1";
    const [job] = await executeQuery(query, [jobId]);

    if (job) {
      const formattedJob = this.formatJob(job);
      this.jobs.set(jobId, formattedJob);
      return formattedJob;
    }

    return null;
  }

  /**
   * Lista jobs de um usuário
   * @param {string} userId - ID do usuário
   * @returns {Array} Lista de jobs
   */
  async getUserJobs(userId) {
    const query = `
      SELECT * FROM jobs 
      WHERE user_id = $1 
      ORDER BY created_at DESC
    `;

    const jobs = await executeQuery(query, [userId]);
    return jobs.map((job) => this.formatJob(job));
  }

  /**
   * Remove job apenas do cache (mantém no banco)
   * @param {string} jobId - ID do job
   */
  clearJobFromCache(jobId) {
    // Remover apenas do cache
    this.jobs.delete(jobId);
  }

  /**
   * Formata job do banco para o formato esperado
   * @param {Object} dbJob - Job do banco de dados
   * @returns {Object} Job formatado
   */
  formatJob(dbJob) {
    return {
      id: dbJob.job_id,
      type: dbJob.type,
      userId: dbJob.user_id,
      status: dbJob.status,
      createdAt: dbJob.created_at,
      startedAt: dbJob.started_at,
      completedAt: dbJob.completed_at,
      progress: dbJob.progress,
      error: dbJob.error,
      result: dbJob.result,
      metadata: dbJob.metadata,
    };
  }

  /**
   * Limpa apenas o cache em memória (mantém todos os jobs no banco)
   */
  clearCache() {
    // Limpar apenas cache, não remove do banco
    this.jobs.clear();
    console.log("Cache de jobs limpo");
  }

  /**
   * Inicia o serviço de limpeza automática de backups expirados
   */
  startCleanupService() {
    // Executar limpeza a cada 6 horas
    this.cleanupIntervalId = setInterval(
      () => this.cleanupExpiredBackups(),
      6 * 60 * 60 * 1000
    );

    // Executar imediatamente ao iniciar (após 5 segundos)
    setTimeout(() => this.cleanupExpiredBackups(), 5000);

    console.log("Serviço de limpeza de backups iniciado (execução a cada 6h)");
  }

  /**
   * Limpa backups expirados (mais de 48h)
   */
  async cleanupExpiredBackups() {
    if (this.cleanupIsRunning) {
      console.log("Limpeza de backups já está em execução, pulando...");
      return;
    }

    this.cleanupIsRunning = true;

    try {
      console.log("Iniciando limpeza de backups expirados...");

      // Buscar tokens de backup expirados com seus jobs relacionados
      const expiredTokensQuery = `
        SELECT t.token, t.user_id, j.result
        FROM tokens t
        LEFT JOIN jobs j ON j.user_id = t.user_id 
          AND j.type = 'backup_export' 
          AND j.result IS NOT NULL
          AND j.result->>'downloadToken' = t.token
        WHERE t.type = 'backup_download' 
        AND t.expires_at < NOW()
      `;

      const expiredTokens = await executeQuery(expiredTokensQuery);

      if (expiredTokens.length === 0) {
        console.log("Nenhum backup expirado encontrado.");
        return;
      }

      console.log(
        `Encontrados ${expiredTokens.length} backups expirados para limpar.`
      );

      let deletedCount = 0;
      let failedCount = 0;

      for (const token of expiredTokens) {
        try {
          const result = token.result;
          const storageKey = result?.storageKey;

          if (storageKey) {
            // Deletar arquivo do storage
            const deleted = await storageService.deleteImage(storageKey);

            if (deleted) {
              deletedCount++;
              console.log(`Backup deletado: ${storageKey}`);
            } else {
              failedCount++;
              console.error(`Falha ao deletar backup: ${storageKey}`);
            }
          } else {
            console.warn(`Token ${token.token} sem storage_key associado`);
          }

          // Deletar token do banco (mesmo se falhar no storage)
          await executeQuery("DELETE FROM tokens WHERE token = $1", [
            token.token,
          ]);
        } catch (error) {
          failedCount++;
          console.error(
            `Erro ao processar token ${token.token}:`,
            error.message
          );
        }
      }

      console.log(
        `Limpeza concluída: ${deletedCount} backups deletados, ${failedCount} falhas.`
      );
    } catch (error) {
      console.error("Erro durante limpeza de backups:", error);
    } finally {
      this.cleanupIsRunning = false;
    }
  }

  /**
   * Para o serviço de limpeza
   */
  stopCleanupService() {
    if (this.cleanupIntervalId) {
      clearInterval(this.cleanupIntervalId);
      console.log("Serviço de limpeza de backups parado.");
    }
  }
}

// Singleton
const jobManager = new JobManager();

module.exports = jobManager;
