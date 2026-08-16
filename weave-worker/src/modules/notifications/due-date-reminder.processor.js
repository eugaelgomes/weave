const { executeQuery } = require("../../database/connection");
const { logger } = require("../../config/logger");
const { createMailService } = require("../../mail/sender");
const { buildDueReminderTemplate } = require("../../mail/templates/template.due-reminder");

const ONE_HOUR_MS = 60 * 60 * 1000;

class DueDateReminderProcessor {
  constructor() {
    this.isRunning = false;
    this.intervalId = null;
    this.mailService = createMailService();
  }

  async start() {
    if (this.isRunning) return;
    this.isRunning = true;

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
      }, ONE_HOUR_MS);
    }, initialDelay);

    logger.info("Due date reminder processor scheduled to run hourly");
  }

  getDelayUntilNextRun() {
    const now = new Date();
    const nextHour = new Date(now);
    nextHour.setUTCHours(now.getUTCHours() + 1, 0, 0, 0);
    return nextHour.getTime() - now.getTime();
  }

  getHourInTimezone(date, timezone) {
    try {
      if (!timezone) return date.getUTCHours();
      const parts = new Intl.DateTimeFormat("en-US", {
        hour: "numeric",
        hour12: false,
        timeZone: timezone,
      }).formatToParts(date);
      const hourPart = parts.find((p) => p.type === "hour");
      return parseInt(hourPart.value, 10) % 24;
    } catch (e) {
      return date.getUTCHours();
    }
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
          u.user_preference AS owner_preference,
          p.properties AS project_properties,
          o.settings AS org_settings
        FROM notes n
        INNER JOIN users u ON n.user_id = u.user_id
        LEFT JOIN projects p ON n.project_id = p.id AND p.deleted = false
        LEFT JOIN organizations o ON p.organization_id = o.id AND o.deleted = false
        WHERE n.deleted = false
          AND n.due_date IS NOT NULL
          AND (n.due_date AT TIME ZONE 'UTC')::date =
              ((CURRENT_TIMESTAMP AT TIME ZONE 'UTC')::date + INTERVAL '1 day')::date
      `
    );

    if (!notes.length) return;

    for (const note of notes) {
      await this.processNoteReminder(note);
    }
  }

  async processNoteReminder(note) {
    const projectProps =
      typeof note.project_properties === "string"
        ? JSON.parse(note.project_properties)
        : note.project_properties || {};

    if (projectProps.due_date_reminder_enabled === false) {
      return;
    }

    const reminderTime =
      typeof projectProps.due_date_reminder_time === "string"
        ? projectProps.due_date_reminder_time
        : "1970-01-01T07:00:00.000Z";

    let targetHour = 7;
    try {
      targetHour = new Date(reminderTime).getUTCHours();
    } catch (e) {
      targetHour = 7;
    }

    const orgSettings =
      typeof note.org_settings === "string"
        ? JSON.parse(note.org_settings)
        : note.org_settings || {};
    const orgTimezone = orgSettings.default_timezone || "UTC";

    const recipients = [];
    if (note.owner_email) {
      recipients.push({
        email: String(note.owner_email).trim(),
        id: note.user_id,
        name: note.owner_name,
        user_preference:
          typeof note.owner_preference === "string"
            ? JSON.parse(note.owner_preference)
            : note.owner_preference || {},
      });
    }

    const collaborators = await executeQuery(
      `
        SELECT DISTINCT u.user_id::text, u.email, u.name, u.user_preference
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
        id: collaborator.user_id,
        name: collaborator.name,
        user_preference:
          typeof collaborator.user_preference === "string"
            ? JSON.parse(collaborator.user_preference)
            : collaborator.user_preference || {},
      });
    }

    const epoch = String(Math.floor(new Date(note.due_date).getTime() / 1000));
    const noteProps =
      typeof note.properties === "string" ? JSON.parse(note.properties) : note.properties || {};
    let dueReminder = noteProps.due_reminder || {};

    if (dueReminder.eve_sent_for_due_epoch !== epoch) {
      dueReminder = {
        eve_sent_for_due_epoch: epoch,
        sent_to_users: [],
      };
    }
    const sentToUsers = new Set(dueReminder.sent_to_users || []);
    const now = new Date();
    const sentAnyTo = [];

    for (const recipient of recipients) {
      if (sentToUsers.has(recipient.id)) continue;

      const timezone = recipient.user_preference.timezone || orgTimezone;
      const userHour = this.getHourInTimezone(now, timezone);

      if (userHour === targetHour) {
        sentAnyTo.push(recipient);
      }
    }

    if (sentAnyTo.length === 0) return;

    const sentSuccessfully = await this.sendNoteReminders(note, sentAnyTo);

    if (sentSuccessfully.length > 0) {
      for (const userId of sentSuccessfully) {
        sentToUsers.add(userId);
      }

      dueReminder.sent_to_users = Array.from(sentToUsers);

      await executeQuery(
        `
          UPDATE notes
          SET properties = COALESCE(properties, '{}'::jsonb) || $2::jsonb,
              updated_at = NOW()
          WHERE id = $1
        `,
        [note.id, JSON.stringify({ due_reminder: dueReminder })]
      );
    }
  }

  async sendNoteReminders(note, recipients) {
    const title = note.title || null;
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
    const notePath = note.public_note_id ? `/app/notes/${note.public_note_id}` : "/app/notes";
    const noteUrl = `${frontendUrl}/auth/?redirect=${encodeURIComponent(notePath)}`;

    const dedup = new Set();
    const sentUserIds = [];
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
        sentUserIds.push(recipient.id);
      } catch (error) {
        logger.error("Failed to send due reminder email", {
          email: recipient.email,
          error: error.message,
          noteId: note.id,
        });
      }
    }

    return sentUserIds;
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
