import { getMCPClient } from "../config/mcp.client";
import { logger } from "../config/logger";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function normalizeUuidList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const uniqueValues = new Set<string>();
  for (const item of value) {
    if (typeof item !== "string") continue;
    const normalized = item.trim();
    if (UUID_REGEX.test(normalized)) {
      uniqueValues.add(normalized);
    }
  }
  return [...uniqueValues];
}

export function normalizeOptionalUuid(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  if (!UUID_REGEX.test(normalized)) return null;
  return normalized;
}

export interface BuildEntityContextPayload {
  userId?: string;
  noteIds?: unknown;
  projectIds?: unknown;
  organizationId?: string | null;
}

export interface BuildEntityContextResult {
  indexedNotes: unknown[];
  indexedProjects: unknown[];
  organizationInfo: unknown | null;
  organizationMembers: unknown[];
}

/**
 * Executes a tool via MCP to fetch context data from weave-api.
 */
async function fetchContextViaMCP(
  toolName: string,
  args: Record<string, unknown>,
  userId: string,
  organizationId: string | null
): Promise<unknown> {
  try {
    const client = await getMCPClient({ organizationId, userId });
    const result = await client.executeTool(toolName, args);

    if (result.isError) {
      logger.warn(`MCP context fetch failed for ${toolName}`);
      return null;
    }

    if (result.content && result.content.length > 0) {
      try {
        return JSON.parse(result.content[0].text);
      } catch {
        return result.content[0].text;
      }
    }

    return null;
  } catch (error: unknown) {
    logger.error(`MCP context fetch exception for ${toolName}`, { error: (error as Error).message });
    return null;
  }
}

/**
 * Orchestrates the fetching of all contextual entities for a given AI task payload via MCP.
 *
 * @param payload - The request context payload.
 * @returns The resolved context map.
 */
export async function buildEntityContext(payload: BuildEntityContextPayload = {}): Promise<BuildEntityContextResult> {
  const userId = typeof payload.userId === "string" ? payload.userId : "";
  const organizationId = normalizeOptionalUuid(payload.organizationId);

  // We delegate the responsibility of resolving public IDs and fetching the actual data
  // to the API via MCP tools.
  const [indexedNotes, indexedProjects, organizationMembers, organizationInfo] =
    await Promise.all([
      fetchContextViaMCP(
        "get_notes_context",
        { noteIds: payload.noteIds },
        userId,
        organizationId
      ).then(res => Array.isArray(res) ? res : []),

      fetchContextViaMCP(
        "get_projects_context",
        { projectIds: payload.projectIds },
        userId,
        organizationId
      ).then(res => Array.isArray(res) ? res : []),

      fetchContextViaMCP(
        "get_organization_members",
        { organizationId },
        userId,
        organizationId
      ).then(res => Array.isArray(res) ? res : []),

      fetchContextViaMCP(
        "get_organization_info",
        { organizationId },
        userId,
        organizationId
      ).then(res => res || null),
    ]);

  return {
    indexedNotes,
    indexedProjects,
    organizationInfo,
    organizationMembers,
  };
}

