const { executeQuery } = require("../../database/connection");
const { logger } = require("../../config/logger");
const { createMailService } = require("../../mail/sender");
const {
  buildDueReminderTemplate,
} = require("../../mail/templates/template.due-reminder");

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

class DueDateReminderProcessor {
  constructor() {
    this.isRunning = false;
    this.intervalId = null;
    this.mailService = createMailService();
  }

  async start() {
    if (this.isRunning) return;
    this.isRunning = true;

    const enabled = process.env.DUE_DATE_REMINDER_ENABLED !== "false";
    if (!enabled) {
      logger.info("Due date reminder processor disabled by env");
      return;
    }

    const initialDelay = this.getDelayUntilNextRun();
    setTimeout(() => {
      this.run().catch((error) => {
        logger.error("Due date reminder first run failed", {
          error: error.message,
        });
      });
      this.intervalId = setInterval(() => {
        this.run().catch((error) => {
          logger.error("Due date reminder periodic run failed", {
            error: error.message,
          });
        });
      }, ONE_DAY_MS);
    }, initialDelay);

    logger.info("Due date reminder processor scheduled", {
      hourUtc: this.getHourUtc(),
    });
  }

  getHourUtc() {
    return Math.min(
      23,
      Math.max(
        0,
        parseInt(process.env.DUE_DATE_REMINDER_HOUR_UTC || "8", 10) || 8
      )
    );
  }

  getDelayUntilNextRun() {
    const now = new Date();
    const next = new Date(
      Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate(),
        this.getHourUtc(),
        0,
        0,
        0
      )
    );
    if (next.getTime() <= now.getTime()) {
      next.setUTCDate(next.getUTCDate() + 1);
    }
    return next.getTime() - now.getTime();
  }

  async run() {
    if (!this.mailService) {
      logger.warn("Skipping due reminders: email service unavailable");
      return;
    }

    const notes = await executeQuery(
      `
        SELECT
          n.id::text,
          n.public_note_id,
          n.title,
          n.due_date,
          n.properties,
          n.user_id::text,
          u.email AS owner_email,
          u.name AS owner_name,
          u.user_preference AS owner_preference
        FROM notes n
        INNER JOIN users u ON n.user_id = u.user_id
        WHERE n.deleted = false
          AND n.due_date IS NOT NULL
          AND (n.due_date AT TIME ZONE 'UTC')::date =
              ((CURRENT_TIMESTAMP AT TIME ZONE 'UTC')::date + INTERVAL '1 day')::date
          AND (
            NULLIF(btrim(n.properties #>> '{due_reminder,eve_sent_for_due_epoch}'), '') IS NULL
            OR (NULLIF(btrim(n.properties #>> '{due_reminder,eve_sent_for_due_epoch}'), ''))::bigint
              IS DISTINCT FROM (floor(extract(epoch FROM n.due_date)))::bigint
          )
      `
    );

    if (!notes.length) return;

    for (const note of notes) {
      await this.processNoteReminder(note);
    }
  }

  async processNoteReminder(note) {
    const recipients = [];
    if (note.owner_email) {
      recipients.push({
        email: String(note.owner_email).trim(),
        name: note.owner_name,
        user_preference: note.owner_preference,
      });
    }

    const collaborators = await executeQuery(
      `
        SELECT DISTINCT u.email, u.name, u.user_preference
        FROM note_collaborators nc
        INNER JOIN users u ON nc.user_id = u.user_id
        WHERE nc.note_id = $1
          AND nc.removed = false
          AND u.email IS NOT NULL
          AND btrim(u.email) <> ''
      `,
      [note.id]
    );

    for (const collaborator of collaborators) {
      recipients.push({
        email: String(collaborator.email).trim(),
        name: collaborator.name,
        user_preference: collaborator.user_preference,
      });
    }

    const sentAny = await this.sendNoteReminders(note, recipients);
    if (!sentAny) return;

    const epoch = String(Math.floor(new Date(note.due_date).getTime() / 1000));
    await executeQuery(
      `
        UPDATE notes
        SET properties = COALESCE(properties, '{}'::jsonb) || $2::jsonb,
            updated_at = NOW()
        WHERE id = $1
      `,
      [
        note.id,
        JSON.stringify({
          due_reminder: {
            eve_sent_for_due_epoch: epoch,
          },
        }),
      ]
    );
  }

  async sendNoteReminders(note, recipients) {
    const title = note.title || null;
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
    const notePath = note.public_note_id
      ? `/app/notes/${note.public_note_id}`
      : "/app/notes";
    const noteUrl = `${frontendUrl}/auth/?redirect=${encodeURIComponent(notePath)}`;

    const dedup = new Set();
    let sentAny = false;
    for (const recipient of recipients) {
      if (!recipient?.email) continue;
      const emailLower = recipient.email.toLowerCase();
      if (dedup.has(emailLower)) continue;
      dedup.add(emailLower);

      try {
        const { subject, html, text } = buildDueReminderTemplate({
          dueDate: note.due_date,
          noteTitle: title,
          noteUrl,
          recipientName: recipient.name,
          userPreference: recipient.user_preference,
        });

        await this.mailService.sendMail({
          html,
          subject,
          text,
          to: recipient.email,
        });
        sentAny = true;
      } catch (error) {
        logger.error("Failed to send due reminder email", {
          email: recipient.email,
          error: error.message,
          noteId: note.id,
        });
      }
    }

    return sentAny;
  }

  stop() {
    this.isRunning = false;
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }
}

module.exports = new DueDateReminderProcessor();
