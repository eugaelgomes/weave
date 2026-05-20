export class ApiError extends Error {
  status: number;
  code?: string;
  data?: unknown;
  userMessage: string;

  constructor(message: string, status: number, data?: unknown, code?: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.data = data;
    this.userMessage = message;
  }
}

type ErrorLikeObject = Record<string, unknown>;

const STATUS_FALLBACK_MESSAGE: Record<number, string> = {
  0: "Network connection error. Please try again.",
  400: "Invalid request. Please review your data and try again.",
  401: "Your session could not be validated. Please sign in again.",
  403: "You do not have permission to perform this action.",
  404: "The requested resource was not found.",
  409: "This action conflicts with existing data.",
  422: "Could not process this request. Please review your input.",
  429: "Too many requests. Please wait a moment and try again.",
  500: "Unexpected server error. Please try again in a few minutes.",
  502: "Service is temporarily unavailable. Please try again.",
  503: "Service is temporarily unavailable. Please try again.",
  504: "Request timeout. Please try again.",
};

const GENERIC_FALLBACK_MESSAGE = "Unable to complete this request right now.";

const getFallbackMessageByStatus = (status: number): string =>
  STATUS_FALLBACK_MESSAGE[status] ?? GENERIC_FALLBACK_MESSAGE;

const getCodeFromData = (data: unknown): string | undefined => {
  if (!data || typeof data !== "object") return undefined;
  const maybeCode = (data as ErrorLikeObject).code;
  return typeof maybeCode === "string" && maybeCode.trim() ? maybeCode.trim() : undefined;
};

const getMessageFromData = (data: unknown): string | undefined => {
  if (!data || typeof data !== "object") return undefined;
  const obj = data as ErrorLikeObject;
  if (typeof obj.message === "string" && obj.message.trim()) return obj.message.trim();
  if (typeof obj.error === "string" && obj.error.trim()) return obj.error.trim();
  if (obj.error && typeof obj.error === "object") {
    const nestedMessage = (obj.error as ErrorLikeObject).message;
    if (typeof nestedMessage === "string" && nestedMessage.trim()) {
      return nestedMessage.trim();
    }
  }
  return undefined;
};

const shouldRedactMessage = (message: string): boolean => {
  if (!message) return true;
  if (message.length > 240) return true;
  if (/^[A-Z0-9_]+$/.test(message)) return true;
  if (message.toLowerCase().includes("stack trace")) return true;
  return false;
};

export const getSafeApiErrorMessage = (
  status: number,
  candidateMessage?: string,
  forceGenericInProduction = false
): string => {
  const fallback = getFallbackMessageByStatus(status);
  if (!candidateMessage) return fallback;
  const normalized = candidateMessage.trim();
  if (!normalized) return fallback;
  if (process.env.NODE_ENV === "development" && !forceGenericInProduction) {
    return normalized;
  }
  if (shouldRedactMessage(normalized) || forceGenericInProduction) {
    return fallback;
  }
  return normalized;
};

type BuildApiErrorInput = {
  status: number;
  statusText?: string;
  data?: unknown;
  textPayload?: string;
};

export const buildApiError = ({
  status,
  statusText,
  data,
  textPayload,
}: BuildApiErrorInput): ApiError => {
  const candidateMessage =
    getMessageFromData(data) ||
    (typeof textPayload === "string" && textPayload.trim() ? textPayload.trim() : undefined) ||
    (statusText?.trim() ? `HTTP ${status}: ${statusText.trim()}` : undefined);
  const code = getCodeFromData(data);
  const message = getSafeApiErrorMessage(status, candidateMessage);
  return new ApiError(message, status, data, code);
};
