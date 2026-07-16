const { executeQuery } = require("@/database/connection");

class BackupJobsRepository {
  constructor() {
    this.jobs = new Map();
  }

  /**
   * @param {string} type
   * @param {string} userId
   * @param {Object} metadata
   * @returns {Promise<Object>}
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

    const formattedJob = this.formatJob(job);
    this.jobs.set(formattedJob.id, formattedJob);
    return formattedJob;
  }

  /**
   * @param {string} jobId
   * @param {Object} updates
   * @returns {Promise<Object>}
   */
  async updateJob(jobId, updates) {
    const setParts = [];
    const values = [];
    let paramIndex = 1;

    if (updates.status !== undefined) {
      setParts.push(`status = $${paramIndex++}`);
      values.push(updates.status);
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
      throw new Error("Job nao encontrado");
    }

    const formattedJob = this.formatJob(job);
    this.jobs.set(jobId, formattedJob);
    return formattedJob;
  }

  /**
   * @param {string} jobId
   * @returns {Promise<Object|null>}
   */
  async getJob(jobId) {
    if (this.jobs.has(jobId)) {
      return this.jobs.get(jobId);
    }

    const [job] = await executeQuery("SELECT * FROM jobs WHERE job_id = $1", [
      jobId,
    ]);
    if (!job) {
      return null;
    }

    const formattedJob = this.formatJob(job);
    this.jobs.set(jobId, formattedJob);
    return formattedJob;
  }

  /**
   * @param {string} userId
   * @returns {Promise<Object[]>}
   */
  async getUserJobs(userId) {
    const jobs = await executeQuery(
      `
        SELECT *
        FROM jobs
        WHERE user_id = $1
        ORDER BY created_at DESC
      `,
      [userId]
    );
    return jobs.map((job) => this.formatJob(job));
  }

  /**
   * @param {Object} dbJob
   * @returns {Object}
   */
  formatJob(dbJob) {
    return {
      completedAt: dbJob.completed_at,
      createdAt: dbJob.created_at,
      error: dbJob.error,
      id: dbJob.job_id,
      metadata: dbJob.metadata,
      progress: dbJob.progress,
      result: dbJob.result,
      startedAt: dbJob.started_at,
      status: dbJob.status,
      type: dbJob.type,
      userId: dbJob.user_id,
    };
  }
}

module.exports = new BackupJobsRepository();
