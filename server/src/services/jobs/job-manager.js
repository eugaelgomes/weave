const { executeQuery } = require("../db/db-connection");

class JobManager {
  constructor() {
    this.jobs = new Map(); // Cache em memória para performance
  }

  /**
   * Cria um novo job
   * @param {string} jobId - ID único do job
   * @param {string} type - Tipo do job (backup_export)
   * @param {string} userId - ID do usuário
   * @param {Object} metadata - Metadados adicionais
   */
  async createJob(jobId, type, userId, metadata = {}) {
    const query = `
      INSERT INTO jobs (id, type, user_id, status, progress, metadata)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;

    const [job] = await executeQuery(query, [
      jobId,
      type,
      userId,
      "pending",
      0,
      JSON.stringify(metadata),
    ]);

    // Cache em memória
    this.jobs.set(jobId, this.formatJob(job));

    return this.formatJob(job);
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
      WHERE id = $${paramIndex}
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
    const query = "SELECT * FROM jobs WHERE id = $1";
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
   * Remove job do banco e cache
   * @param {string} jobId - ID do job
   */
  async deleteJob(jobId) {
    // Remover do banco
    const query = "DELETE FROM jobs WHERE id = $1";
    await executeQuery(query, [jobId]);

    // Remover do cache
    this.jobs.delete(jobId);
  }

  /**
   * Formata job do banco para o formato esperado
   * @param {Object} dbJob - Job do banco de dados
   * @returns {Object} Job formatado
   */
  formatJob(dbJob) {
    return {
      id: dbJob.id,
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
   * Cleanup de jobs antigos (executar periodicamente)
   * Remove jobs finalizados há mais de 24 horas
   */
  async cleanupOldJobs() {
    const query = `
      DELETE FROM jobs 
      WHERE status IN ('completed', 'failed') 
      AND completed_at < NOW() - INTERVAL '24 hours'
    `;

    const result = await executeQuery(query);

    // Limpar cache também
    this.jobs.clear();

    console.log("Cleanup executado: jobs antigos removidos");
  }

  /**
   * Gera ID único para job
   * @param {string} prefix - Prefixo (ex: backup)
   * @returns {string} ID único
   */
  generateJobId(prefix = "job") {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    return `${prefix}_${timestamp}_${random}`;
  }
}

// Singleton
const jobManager = new JobManager();

// Cleanup automático a cada 6 horas
setInterval(
  () => {
    jobManager.cleanupOldJobs();
  },
  6 * 60 * 60 * 1000
);

module.exports = jobManager;
