const fs = require("fs").promises;
const path = require("path");

class JobManager {
  constructor() {
    this.jobs = new Map(); // Armazena jobs ativos em memória
    this.jobsDir = path.join(process.cwd(), "temp", "jobs");
    this.ensureJobsDirectory();
  }

  /**
   * Garante que o diretório de jobs temporários existe
   */
  async ensureJobsDirectory() {
    try {
      await fs.mkdir(this.jobsDir, { recursive: true });
    } catch (error) {
      console.error("Erro ao criar diretório de jobs:", error);
    }
  }

  /**
   * Cria um novo job
   * @param {string} jobId - ID único do job
   * @param {string} type - Tipo do job (backup_export)
   * @param {string} userId - ID do usuário
   * @param {Object} metadata - Metadados adicionais
   */
  async createJob(jobId, type, userId, metadata = {}) {
    const job = {
      id: jobId,
      type,
      userId,
      status: "pending",
      createdAt: new Date().toISOString(),
      startedAt: null,
      completedAt: null,
      progress: 0,
      error: null,
      result: null,
      metadata
    };

    // Armazenar em memória
    this.jobs.set(jobId, job);

    // Salvar em arquivo para persistência
    await this.saveJobToFile(job);

    return job;
  }

  /**
   * Atualiza status de um job
   * @param {string} jobId - ID do job
   * @param {Object} updates - Atualizações
   */
  async updateJob(jobId, updates) {
    const job = this.jobs.get(jobId);
    if (!job) {
      throw new Error("Job não encontrado");
    }

    // Aplicar atualizações
    Object.assign(job, updates);

    // Marcar timestamps
    if (updates.status === "processing" && !job.startedAt) {
      job.startedAt = new Date().toISOString();
    }
    if (["completed", "failed"].includes(updates.status) && !job.completedAt) {
      job.completedAt = new Date().toISOString();
    }

    // Atualizar em memória
    this.jobs.set(jobId, job);

    // Salvar em arquivo
    await this.saveJobToFile(job);

    return job;
  }

  /**
   * Busca job por ID
   * @param {string} jobId - ID do job
   * @returns {Object|null} Job encontrado
   */
  getJob(jobId) {
    return this.jobs.get(jobId) || null;
  }

  /**
   * Lista jobs de um usuário
   * @param {string} userId - ID do usuário
   * @returns {Array} Lista de jobs
   */
  getUserJobs(userId) {
    return Array.from(this.jobs.values())
      .filter(job => job.userId === userId)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  /**
   * Remove job da memória e arquivo (cleanup)
   * @param {string} jobId - ID do job
   */
  async deleteJob(jobId) {
    // Remover da memória
    this.jobs.delete(jobId);

    // Remover arquivo
    try {
      const filePath = path.join(this.jobsDir, `${jobId}.json`);
      await fs.unlink(filePath);
    } catch (error) {
      // Arquivo pode não existir, ignorar erro
    }
  }

  /**
   * Salva job em arquivo para persistência
   * @param {Object} job - Dados do job
   */
  async saveJobToFile(job) {
    try {
      const filePath = path.join(this.jobsDir, `${job.id}.json`);
      await fs.writeFile(filePath, JSON.stringify(job, null, 2));
    } catch (error) {
      console.error(`Erro ao salvar job ${job.id}:`, error);
    }
  }

  /**
   * Carrega jobs salvos ao inicializar (recuperação após restart)
   */
  async loadJobsFromFiles() {
    try {
      const files = await fs.readdir(this.jobsDir);
      const jsonFiles = files.filter(file => file.endsWith(".json"));

      for (const file of jsonFiles) {
        try {
          const filePath = path.join(this.jobsDir, file);
          const data = await fs.readFile(filePath, "utf8");
          const job = JSON.parse(data);
          
          // Só carregar jobs não finalizados
          if (!["completed", "failed"].includes(job.status)) {
            this.jobs.set(job.id, job);
          }
        } catch (error) {
          console.error(`Erro ao carregar job do arquivo ${file}:`, error);
        }
      }
    } catch (error) {
      console.error("Erro ao carregar jobs salvos:", error);
    }
  }

  /**
   * Cleanup de jobs antigos (executar periodicamente)
   * Remove jobs finalizados há mais de 24 horas
   */
  async cleanupOldJobs() {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const jobsToDelete = [];

    for (const [jobId, job] of this.jobs.entries()) {
      if (["completed", "failed"].includes(job.status) && job.completedAt) {
        const completedAt = new Date(job.completedAt);
        if (completedAt < oneDayAgo) {
          jobsToDelete.push(jobId);
        }
      }
    }

    // Deletar jobs antigos
    for (const jobId of jobsToDelete) {
      await this.deleteJob(jobId);
    }

    console.log(`Cleanup executado: ${jobsToDelete.length} jobs antigos removidos`);
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

// Carregar jobs salvos na inicialização
jobManager.loadJobsFromFiles();

// Cleanup automático a cada 6 horas
setInterval(() => {
  jobManager.cleanupOldJobs();
}, 6 * 60 * 60 * 1000);

module.exports = jobManager;