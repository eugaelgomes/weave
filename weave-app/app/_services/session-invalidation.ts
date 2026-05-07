/**
 * Single hook point for invalid HttpOnly session (401). Registered from AuthProvider.
 * Keep this module free of React to avoid circular imports with api-methods / auth-service.
 */

export type UnauthorizedHandler = () => void;

let unauthorizedHandler: UnauthorizedHandler | null = null;

export function setUnauthorizedHandler(handler: UnauthorizedHandler | null): void {
  unauthorizedHandler = handler;
}

export function notifyUnauthorized(): void {
  unauthorizedHandler?.();
}
