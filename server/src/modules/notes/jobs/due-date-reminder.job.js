const notesRepository = require("@/modules/notes/notes.repository");
const mutateNotesRepository = require("@/modules/notes/repositories/mutate-notes.repository");
const {
  sendDueReminderEmail,
} = require("@/services/email/templates/due-reminder");

/**
 * Envia e-mails de véspera (prazo amanhã em UTC) e marca controle em properties.
 *
 * @returns {Promise<void>}
 */
async function runDueDateReminderEmails() {
  const enabled = process.env.DUE_DATE_REMINDER_ENABLED !== "false";
  if (!enabled) {
    return;
  }

  let rows;
  try {
    rows = await notesRepository.findNotesForDueDateEveReminder();
  } catch (e) {
    console.error("[due-date-reminder] Falha ao listar notas:", e);
    return;
  }

  if (!rows?.length) {
    return;
  }

  for (const row of rows) {
    const noteId = row.id;
    const dueDate = row.due_date;
    const title = row.title || "Nota";
    let rawProps = row.properties;
    if (typeof rawProps === "string") {
      try {
        rawProps = JSON.parse(rawProps);
      } catch {
        rawProps = {};
      }
    }
    const props =
      rawProps && typeof rawProps === "object" && !Array.isArray(rawProps)
        ? rawProps
        : {};

    const recipients = [];
    if (row.owner_email) {
      recipients.push({
        email: String(row.owner_email).trim(),
        name: row.owner_name || "",
      });
    }

    try {
      const collabs = await notesRepository.getActiveCollaboratorEmails(noteId);
      for (const c of collabs) {
        if (c.email) {
          recipients.push({
            email: String(c.email).trim(),
            name: c.name || "",
          });
        }
      }
    } catch (e) {
      console.error(`[due-date-reminder] Colaboradores note=${noteId}:`, e);
    }

    const seen = new Set();
    let anySent = false;

    for (const r of recipients) {
      const em = r.email.toLowerCase();
      if (!r.email || seen.has(em)) continue;
      seen.add(em);

      const result = await sendDueReminderEmail(
        r.email,
        r.name,
        title,
        dueDate,
        noteId
      );
      if (result.success) {
        anySent = true;
      } else {
        console.error(
          `[due-date-reminder] Falha e-mail para ${r.email} note=${noteId}:`,
          result.error
        );
      }
    }

    if (!anySent) {
      continue;
    }

    const epoch = String(Math.floor(new Date(dueDate).getTime() / 1000));
    const nextProps = {
      ...props,
      due_reminder: {
        ...(props.due_reminder && typeof props.due_reminder === "object"
          ? props.due_reminder
          : {}),
        eve_sent_for_due_epoch: epoch,
      },
    };

    try {
      await mutateNotesRepository.updateNoteById(noteId, {
        properties: nextProps,
      });
    } catch (e) {
      console.error(
        `[due-date-reminder] Falha ao marcar properties note=${noteId}:`,
        e
      );
    }
  }
}

/**
 * Agenda execução diária à hora UTC configurável (padrão 8).
 */
function scheduleDueDateReminderEmails() {
  const hourUtc = Math.min(
    23,
    Math.max(
      0,
      parseInt(process.env.DUE_DATE_REMINDER_HOUR_UTC || "8", 10) || 8
    )
  );

  const msUntilNextRun = () => {
    const now = new Date();
    const next = new Date(
      Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate(),
        hourUtc,
        0,
        0,
        0
      )
    );
    if (next.getTime() <= now.getTime()) {
      next.setUTCDate(next.getUTCDate() + 1);
    }
    return next.getTime() - now.getTime();
  };

  const schedule = () => {
    const delay = msUntilNextRun();
    setTimeout(() => {
      runDueDateReminderEmails().catch((e) =>
        console.error("[due-date-reminder] Erro na execução agendada:", e)
      );
      setInterval(
        () =>
          runDueDateReminderEmails().catch((e) =>
            console.error("[due-date-reminder] Erro na execução periódica:", e)
          ),
        24 * 60 * 60 * 1000
      );
    }, delay);
  };

  schedule();
  console.log(
    `[due-date-reminder] Agendado (UTC ${hourUtc}:00). DUE_DATE_REMINDER_ENABLED=${process.env.DUE_DATE_REMINDER_ENABLED !== "false"}`
  );
}

module.exports = {
  runDueDateReminderEmails,
  scheduleDueDateReminderEmails,
};
