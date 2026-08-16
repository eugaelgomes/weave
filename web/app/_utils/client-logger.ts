/**
 * Client-side logger with production-safe defaults.
 * Keeps technical details available in development only.
 */
const isDevelopment = process.env.NODE_ENV === "development";

export const logClientError = (scope: string, error: unknown): void => {
  if (!isDevelopment) return;
  if (error instanceof Error) {
    console.error(`[${scope}] ${error.message}`, error);
    return;
  }
  console.error(`[${scope}]`, error);
};
