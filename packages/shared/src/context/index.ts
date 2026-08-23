import { AsyncLocalStorage } from "async_hooks";

export interface WeaveContext {
  requestId?: string;
  [key: string]: any;
}

export const requestContext = new AsyncLocalStorage<WeaveContext>();

export function getRequestContext(): WeaveContext | undefined {
  return requestContext.getStore();
}

export function getRequestId(): string | undefined {
  const store = getRequestContext();
  return store ? store.requestId : undefined;
}
