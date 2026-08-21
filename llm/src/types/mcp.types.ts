/**
 * Execution Context used by the MCP Client for tracking ownership and authentication
 */
export interface ExecutionContext {
  userId: string | number;
  organizationId?: string | number | null;
}
