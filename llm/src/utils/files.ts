/**
 * @module weave-engine/providers/utils/files
 * @description File and attachment normalization for LLM requests.
 */

import type { FileInput } from "@theweave/shared";

export interface NormalizedFile {
  base64Data: string;
  mimeType: string;
  name: string;
}

const MAX_INLINE_FILES = Number.parseInt(process.env.WEAVE_MAX_INLINE_FILES_PER_REQUEST || "3", 10);

export function normalizeBase64(maybeBase64: unknown): string {
  if (typeof maybeBase64 !== "string") return "";
  const trimmed = maybeBase64.trim();
  const dataUrlMatch = trimmed.match(/^data:[^;]+;base64,(.+)$/i);
  return (dataUrlMatch?.[1] || trimmed).replace(/\s+/g, "");
}

export function normalizeFiles(files: unknown): NormalizedFile[] {
  if (!Array.isArray(files) || files.length === 0) return [];
  return files
    .slice(0, MAX_INLINE_FILES)
    .map((f: Record<string, unknown>) => {
      const mimeType =
        (typeof f.mimeType === "string" && f.mimeType) ||
        (typeof f.mimetype === "string" && f.mimetype) ||
        "application/octet-stream";
      const name =
        (typeof f.name === "string" && f.name) ||
        (typeof f.originalName === "string" && f.originalName) ||
        "file";
      const base64Data = normalizeBase64(
        f.base64Data || f.base64 || f.data || f.content || f.buffer
      );
      return base64Data ? { base64Data, mimeType, name } : null;
    })
    .filter((f): f is NormalizedFile => f !== null);
}
