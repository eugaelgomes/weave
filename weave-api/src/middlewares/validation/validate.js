const { ZodError } = require("zod");

const { AppError } = require("@/errors/app-error");

/**
 * Formats a ZodError into a flat array of { field, message } objects.
 *
 * @param {ZodError} zodError
 * @returns {{ field: string; message: string }[]}
 */
function formatZodErrors(zodError) {
  const issues = zodError.issues || zodError.errors || [];
  return issues.map((issue) => ({
    field: issue.path.join(".") || "root",
    message: issue.message,
  }));
}

/**
 * Express middleware factory that validates a specific part of the request
 * against a Zod schema. On success, replaces the source with the parsed
 * (and transformed) output. On failure, forwards an AppError 400.
 *
 * @param {import('zod').ZodTypeAny} schema
 * @param {'body' | 'query' | 'params'} [source='body']
 * @returns {import('express').RequestHandler}
 */
function validate(schema, source = "body") {
  return (req, res, next) => {
    const result = schema.safeParse(req[source]);

    if (!result.success) {
      const errors = formatZodErrors(result.error);
      return next(
        new AppError(
          "VALIDATION_ERROR",
          "Validation failed. Please check the provided data.",
          400,
          {
            details: errors,
          }
        )
      );
    }

    // Replace the source with sanitized, parsed output (trims, coercions, etc.)
    req[source] = result.data;
    return next();
  };
}

module.exports = { validate };
