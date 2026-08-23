import { getRequestId } from "../context";

export const logger = {
  info: (message: string, meta: Record<string, any> = {}) => {
    const requestId = getRequestId();
    const finalMeta = requestId && !meta.requestId ? { ...meta, requestId } : meta;
    const metaStr = Object.keys(finalMeta).length > 0 ? ` ${JSON.stringify(finalMeta)}` : "";
    console.info(`[${new Date().toISOString()}] [INFO] ${message}${metaStr}`);
  },
  error: (message: string, meta: Record<string, any> = {}) => {
    const requestId = getRequestId();
    const finalMeta = requestId && !meta.requestId ? { ...meta, requestId } : meta;
    const metaStr = Object.keys(finalMeta).length > 0 ? ` ${JSON.stringify(finalMeta)}` : "";
    console.error(`[${new Date().toISOString()}] [ERROR] ${message}${metaStr}`);
  },
  warn: (message: string, meta: Record<string, any> = {}) => {
    const requestId = getRequestId();
    const finalMeta = requestId && !meta.requestId ? { ...meta, requestId } : meta;
    const metaStr = Object.keys(finalMeta).length > 0 ? ` ${JSON.stringify(finalMeta)}` : "";
    console.warn(`[${new Date().toISOString()}] [WARN] ${message}${metaStr}`);
  },
  debug: (message: string, meta: Record<string, any> = {}) => {
    const requestId = getRequestId();
    const finalMeta = requestId && !meta.requestId ? { ...meta, requestId } : meta;
    const metaStr = Object.keys(finalMeta).length > 0 ? ` ${JSON.stringify(finalMeta)}` : "";
    console.debug(`[${new Date().toISOString()}] [DEBUG] ${message}${metaStr}`);
  }
};
