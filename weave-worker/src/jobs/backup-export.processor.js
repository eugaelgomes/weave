const crypto = require("crypto");
const redis = require("../config/redis");
const { executeQuery } = require("../database/connection");
const { logger } = require("../lib");
const storageService = require("../services/storage");
const { createMailService } = require("../services/email/sender");
const {
  buildBackupEmailPayload,
} = require("../services/email/templates/backup-notification");
const { getBackupExportQueueRedisKey } = require("../config/redis-queue-keys");

class BackupExportProcessor {
  constructor() {
    this.isRunning = false;
    this.mailService = createMailService();
  }

  async start() {
    if (this.isRunning) return;
    this.isRunning = true;
    this.queueName = getBackupExportQueueRedisKey();

    logger.info("Backup export processor started", { queue: this.queueName });

    while (this.isRunning) {
      try {
        const result = await redis.blpop(this.queueName, 5);
        if (!result) continue;
        const [, payload] = result;
        const job = JSON.parse(payload);
        await this.processJob(job);
      } catch (error) {
        logger.error("Backup export processor loop failed", {
          error: error.message,
        });
      }
    }
  }

  async processJob(job) {
    const jobId = job?.jobId;
    const userId = job?.userId;
    if (!jobId || !userId) {
      logger.warn("Backup export job missing identifiers", { job });
      return;
    }

    try {
      await this.updateJob(jobId, { progress: 10, status: "processing" });
      const user = await this.getUserById(userId);
      if (!user) {
        throw new Error("Usuário não encontrado");
      }

      await this.updateJob(jobId, { progress: 20 });
      const rawData = await this.getBackupDataForUser(userId);
      await this.updateJob(jobId, { progress: 60 });

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

      const backupData = this.formatBackupDataCSV(rawData);
      await this.updateJob(jobId, { progress: 70 });

      const uploadResult = await storageService.uploadBackup(
        backupData,
        userId,
        `backup_${userId}_${Date.now()}.csv`
      );

      if (!uploadResult.success) {
        throw new Error("Falha ao fazer upload do backup para o storage");
      }

      await this.updateJob(jobId, { progress: 80 });
      const downloadToken = crypto.randomBytes(32).toString("hex");
      const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);
      await this.createDownloadToken(downloadToken, userId, expiresAt);
      await this.updateJob(jobId, { progress: 90 });

      const downloadUrl = `${process.env.API_URL || "http://localhost:8080"}/api/backup/download/${downloadToken}`;
      const emailSent = await this.sendBackupEmail({
        downloadUrl,
        expiresAt,
        toEmail: user.email,
        userName: user.name || user.username,
        userPreference: user.user_preference,
      });

      if (!emailSent) {
        throw new Error("Falha ao enviar email de backup");
      }

      await this.createBackupNotification({
        downloadUrl,
        expiresAt,
        jobId,
        userId,
      });

      await this.updateJob(jobId, {
        progress: 100,
        result: {
          completedAt: new Date().toISOString(),
          downloadToken,
          emailSent: true,
          expiresAt: expiresAt.toISOString(),
          fileSize: uploadResult.size,
          storageKey: uploadResult.key,
          totalNotes,
        },
        status: "completed",
      });
    } catch (error) {
      logger.error("Backup export processor failed", {
        error: error.message,
        jobId,
        userId,
      });
      await this.updateJob(jobId, {
        error: error.message,
        progress: 0,
        status: "failed",
      });
    }
  }

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
    await executeQuery(
      `
        UPDATE jobs
        SET ${setParts.join(", ")}
        WHERE job_id = $${paramIndex}
      `,
      values
    );
  }

  async getUserById(userId) {
    const rows = await executeQuery(
      `
        SELECT user_id, email, name, username, user_preference
        FROM users
        WHERE user_id = $1
        LIMIT 1
      `,
      [userId]
    );
    return rows[0] || null;
  }

  async getBackupDataForUser(userId) {
    const rows = await executeQuery(
      `
        SELECT 
            u_owner.user_id::text AS owner_id,
            u_owner.name AS owner_name,
            u_owner.username AS owner_username,
            u_owner.email AS owner_email,
            u_owner.avatar_url AS owner_avatar_url,
            n.id::text AS note_id,
            n.title,
            n.description,
            n.tags,
            n.created_at,
            n.updated_at,
            json_build_object(
                'name', u_owner.name,
                'username', u_owner.username,
                'email', u_owner.email,
                'avatar_url', u_owner.avatar_url
            ) AS owner,
            COALESCE(
                (
                    SELECT json_agg(collab_data ORDER BY collab_data.added_at)
                    FROM (
                        SELECT DISTINCT
                            nc.user_id::text AS collaborator_id,
                            u_collab.name,
                            u_collab.username,
                            u_collab.email,
                            u_collab.avatar_url,
                            nc.added_at,
                            nc.removed,
                            nc.removed_at
                        FROM note_collaborators nc
                        JOIN users u_collab ON u_collab.user_id = nc.user_id
                        WHERE nc.note_id = n.id
                    ) collab_data
                ), '[]'
            ) AS collaborators,
            COALESCE(
                (
                    SELECT json_agg(block_data ORDER BY block_data.position, block_data.created_at)
                    FROM (
                        SELECT DISTINCT
                            b.id::text AS block_id,
                            b.user_id::text AS user_id,
                            b.parent_id::text AS parent_id,
                            b.type,
                            b.text,
                            b.properties,
                            b.done,
                            b.deleted,
                            b.position,
                            b.created_at,
                            b.updated_at
                        FROM blocks b
                        WHERE b.note_id = n.id
                    ) block_data
                ), '[]'
            ) AS blocks
        FROM notes n
        JOIN users u_owner ON n.user_id = u_owner.user_id
        WHERE n.user_id = $1
           OR EXISTS (
               SELECT 1
               FROM note_collaborators nc
               WHERE nc.note_id = n.id
                 AND nc.user_id = $1
           )
        ORDER BY n.created_at ASC
      `,
      [userId]
    );

    return rows;
  }

  async createDownloadToken(token, userId, expiresAt) {
    await executeQuery(
      `
        INSERT INTO tokens (token, user_id, type, expires_at)
        VALUES ($1, $2, $3, $4)
      `,
      [token, userId, "backup_download", expiresAt]
    );
  }

  async createBackupNotification({ downloadUrl, expiresAt, jobId, userId }) {
    await executeQuery(
      `
        INSERT INTO notifications (
          user_id,
          actor_id,
          type,
          entity_type,
          entity_id,
          title,
          content
        )
        VALUES (
          $1::uuid,
          $2::uuid,
          $3::notification_type_enum,
          $4::notification_entity_type_enum,
          $5::uuid,
          $6,
          $7::jsonb
        )
      `,
      [
        userId,
        userId,
        "job_action",
        "job",
        jobId,
        "Seu backup foi concluido com sucesso e esta pronto para download",
        JSON.stringify({
          action: "backup_completed",
          download_url: downloadUrl,
          expires_at: expiresAt,
        }),
      ]
    );
  }

  async sendBackupEmail({
    downloadUrl,
    expiresAt,
    toEmail,
    userName,
    userPreference,
  }) {
    if (!this.mailService) {
      logger.warn("Email service not available for backup email");
      return false;
    }

    const { html, text, subject } = buildBackupEmailPayload({
      userName,
      downloadUrl,
      expiresAt,
      userPreference,
    });

    await this.mailService.sendMail({
      html,
      subject,
      text,
      to: toEmail,
    });
    return true;
  }

  formatBackupDataCSV(rawData) {
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
          ?.filter((collab) => !collab.removed)
          .map((collab) => collab.username || collab.name)
          .join(";") || "";

      const baseNoteData = [
        this.escapeCsv(note.note_id),
        this.escapeCsv(note.title || ""),
        this.escapeCsv(note.description || ""),
        this.escapeCsv(note.tags?.join(";") || ""),
        this.escapeCsv(note.created_at),
        this.escapeCsv(note.updated_at),
        this.escapeCsv(note.owner_id),
        this.escapeCsv(note.owner?.name || ""),
        this.escapeCsv(note.owner?.username || ""),
        this.escapeCsv(collaborators),
      ];

      if (activeBlocks.length === 0) {
        lines.push([...baseNoteData, "", "", "", "", "", ""].join(","));
      } else {
        activeBlocks.forEach((block) => {
          lines.push(
            [
              ...baseNoteData,
              this.escapeCsv(block.block_id),
              this.escapeCsv(block.type || ""),
              this.escapeCsv(block.text || ""),
              this.escapeCsv(block.position?.toString() || ""),
              this.escapeCsv(block.done?.toString() || ""),
              this.escapeCsv(block.created_at || ""),
            ].join(",")
          );
        });
      }
    });

    return lines.join("\n");
  }

  escapeCsv(value) {
    if (value === null || value === undefined) return "";
    const str = String(value);
    if (/[,"\n\r]/.test(str)) {
      return `"${str.replace(/"/g, "\"\"")}"`;
    }
    return str;
  }
}

module.exports = new BackupExportProcessor();
