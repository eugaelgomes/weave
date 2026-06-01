const REQUEST_ID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const { getI18n, getLangFromReq } = require("./weave-ai-i18n.util");

class ChatParserUtil {
  /**
   * Validates authenticated user and returns user id.
   *
   * @param {import("express").Request} req - The Express request object.
   * @returns {string} The authenticated user's ID.
   * @throws {Error} If user is not authenticated (401).
   */
  validateAuthentication(req) {
    const userId = req.user?.userId;
    if (!userId) {
      const lang = getLangFromReq(req);
      const t = getI18n(lang);
      const error = new Error(t.unauthenticated);
      error.code = "CHAT_UNAUTHENTICATED";
      error.statusCode = 401;
      throw error;
    }
    return userId;
  }

  /**
   * Parses boolean values that can arrive as string in multipart requests.
   *
   * @param {unknown} value - Value to check.
   * @param {boolean} fallback - Fallback boolean if parsing fails.
   * @returns {boolean} Parsed boolean.
   */
  parseBoolean(value, fallback = false) {
    if (typeof value === "boolean") {
      return value;
    }

    if (typeof value === "string") {
      if (value.toLowerCase() === "true") {
        return true;
      }
      if (value.toLowerCase() === "false") {
        return false;
      }
    }

    return fallback;
  }

  /**
   * Parses nullable arrays from body payloads.
   *
   * @param {unknown} value - Value to check.
   * @param {string} fieldName - Name of the field for error messages.
   * @param {string} [lang="pt"] - User language for error messages.
   * @returns {string[]|null} Parsed string array or null.
   * @throws {Error} If value is not a valid array of strings.
   */
  parseNullableStringArray(value, fieldName, lang = "pt") {
    if (value === undefined || value === null || value === "") {
      return null;
    }

    if (typeof value === "string") {
      if (value.toLowerCase() === "null") {
        return null;
      }

      try {
        const parsed = JSON.parse(value);
        if (parsed === null) {
          return null;
        }
        if (
          Array.isArray(parsed) &&
          parsed.every((item) => typeof item === "string")
        ) {
          return parsed;
        }
      } catch {
        // Keep parsing below for non-JSON strings.
      }
    }

    if (
      Array.isArray(value) &&
      value.every((item) => typeof item === "string")
    ) {
      return value;
    }

    const t = getI18n(lang);
    const parseError = new Error(
      typeof t.invalidArrayField === "function"
        ? t.invalidArrayField(fieldName)
        : t.invalidArrayField
    );
    parseError.code = "CHAT_INVALID_ARRAY_FIELD";
    parseError.statusCode = 400;
    throw parseError;
  }

  /**
   * Parses nullable object values from body payloads.
   *
   * @param {unknown} value - Value to check.
   * @param {string} fieldName - Name of the field for error messages.
   * @param {string} [lang="pt"] - User language for error messages.
   * @returns {Record<string, unknown>|null} Parsed object or null.
   * @throws {Error} If value is not a valid JSON object.
   */
  parseNullableObject(value, fieldName, lang = "pt") {
    if (value === undefined || value === null || value === "") {
      return null;
    }

    const t = getI18n(lang);
    let parsed = value;
    if (typeof value === "string") {
      if (value.toLowerCase() === "null") {
        return null;
      }

      try {
        parsed = JSON.parse(value);
      } catch {
        const parseError = new Error(
          typeof t.invalidJsonField === "function"
            ? t.invalidJsonField(fieldName)
            : t.invalidJsonField
        );
        parseError.code = "CHAT_INVALID_OBJECT_FIELD";
        parseError.statusCode = 400;
        throw parseError;
      }
    }

    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      const parseError = new Error(
        typeof t.invalidObjectField === "function"
          ? t.invalidObjectField(fieldName)
          : t.invalidObjectField
      );
      parseError.code = "CHAT_INVALID_OBJECT_FIELD";
      parseError.statusCode = 400;
      throw parseError;
    }

    return parsed;
  }

  /**
   * Parses and validates model payload.
   *
   * @param {unknown} value - Value to check.
   * @param {string} [lang="pt"] - User language for error messages.
   * @returns {{ name: string, version: string }} Resolved model object.
   * @throws {Error} If model structure is invalid.
   */
  parseModel(value, lang = "pt") {
    const t = getI18n(lang);
    let model = value;
    if (typeof model === "string") {
      try {
        model = JSON.parse(model);
      } catch {
        const parseError = new Error(t.invalidModel);
        parseError.code = "CHAT_INVALID_MODEL";
        parseError.statusCode = 400;
        throw parseError;
      }
    }

    const isValidModel =
      model &&
      typeof model === "object" &&
      typeof model.name === "string" &&
      model.name.trim() &&
      typeof model.version === "string" &&
      model.version.trim();

    if (!isValidModel) {
      const validationError = new Error(t.invalidModelValues);
      validationError.code = "CHAT_INVALID_MODEL";
      validationError.statusCode = 400;
      throw validationError;
    }

    return {
      name: model.name.trim(),
      version: model.version.trim(),
    };
  }

  /**
   * Normalizes and validates chat payload.
   *
   * @param {import("express").Request} req - The Express request object.
   * @returns {object} Parsed chat request payload.
   * @throws {Error} If payload is invalid.
   */
  parseChatPayload(req) {
    const lang = getLangFromReq(req);
    const t = getI18n(lang);

    const {
      message,
      model,
      allowEdit,
      allowWebSearch,
      noteIds,
      projectIds,
      agentId,
      sessionId,
      requestId,
      useCase,
      context,
    } = req.body;

    if (typeof message !== "string" || !message.trim()) {
      const error = new Error(t.messageRequired);
      error.code = "CHAT_MESSAGE_REQUIRED";
      error.statusCode = 400;
      throw error;
    }

    const parsedModel = this.parseModel(model, lang);
    const parsedAgentId =
      agentId === undefined ||
      agentId === null ||
      agentId === "" ||
      agentId === "null"
        ? null
        : String(agentId);
    const parsedSessionId =
      sessionId === undefined ||
      sessionId === null ||
      sessionId === "" ||
      sessionId === "null"
        ? null
        : String(sessionId);
    const parsedRequestId =
      requestId === undefined ||
      requestId === null ||
      requestId === "" ||
      requestId === "null"
        ? null
        : String(requestId).trim();
    if (parsedRequestId && !REQUEST_ID_REGEX.test(parsedRequestId)) {
      const requestError = new Error(t.invalidRequestId);
      requestError.code = "CHAT_INVALID_REQUEST_ID";
      requestError.statusCode = 400;
      throw requestError;
    }
    const parsedUseCase =
      useCase === undefined ||
      useCase === null ||
      useCase === "" ||
      useCase === "null"
        ? null
        : String(useCase).trim() || null;

    return {
      message: message.trim(),
      model: parsedModel,
      allowEdit: this.parseBoolean(allowEdit, true),
      allowWebSearch: this.parseBoolean(allowWebSearch, false),
      noteIds: this.parseNullableStringArray(noteIds, "noteIds", lang),
      projectIds: this.parseNullableStringArray(projectIds, "projectIds", lang),
      agentId: parsedAgentId,
      sessionId: parsedSessionId,
      requestId: parsedRequestId,
      useCase: parsedUseCase,
      context: this.parseNullableObject(context, "context", lang),
    };
  }
}

module.exports = new ChatParserUtil();
