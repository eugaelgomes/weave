const { AppError, fromUnknown } = require("@/errors");

/**
 * Shared utilities for backup controllers (auth, errors, CSV).
 */
class BackupBaseController {
  /**
   * @param {import('express').Request} req
   * @param {import('express').Response} res
   * @returns {string | null}
   */
  _validateAuthentication(req, res) {
    const userId = req.user?.userId;
    if (!userId) {
      res.status(401).json({
        status: "Unauthorized",
        error: "Authentication required",
        message: "User is not authenticated",
      });
      return null;
    }
    return userId;
  }

  /**
   * @param {string} userId
   * @returns {boolean}
   */
  _validateUserId(userId) {
    const isNumeric = /^\d+$/.test(userId);
    const isUUID =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        userId
      );
    return isNumeric || isUUID;
  }

  /**
   * @param {Error} error
   * @param {import('express').Response} res
   * @param {import('express').NextFunction} next
   * @returns {void}
   */
  _handleError(error, res, next) {
    const { message } = error;

    if (/required|invalid/i.test(message)) {
      return next(AppError.badRequest(message));
    }

    if (/not found|access denied/i.test(message)) {
      return next(AppError.notFound(message));
    }

    if (/too much data|payload too large/i.test(message)) {
      return next(
        new AppError(
          "PAYLOAD_TOO_LARGE",
          "Data volume exceeds the supported limit.",
          413
        )
      );
    }

    if (/limit/i.test(message)) {
      return next(
        new AppError(
          "RATE_LIMIT_EXCEEDED",
          "Too many requests. Please try again later.",
          429
        )
      );
    }

    return next(fromUnknown(error));
  }

  /**
   * @param {Record<string, unknown>[]} rawData
   * @returns {string}
   */
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

  /**
   * @param {unknown} value
   * @returns {string}
   */
  _escapeCsv(value) {
    if (value === null || value === undefined) return "";
    const str = String(value);
    if (/[,"\n\r]/.test(str)) {
      return `"${str.replace(/"/g, "\"\"")}"`;
    }
    return str;
  }
}

module.exports = BackupBaseController;
