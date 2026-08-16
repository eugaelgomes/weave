/**
 * @module weave-engine/providers/utils/streaming
 * @description Helpers for handling SSE streams and accumulating tool calls.
 */

import type { ToolCallResult } from "@theweave/shared";

export function parseAccumulatedToolCalls(
  finalToolCalls: Array<{
    id?: string;
    type: string;
    function: { name: string; arguments: string };
    extra_content?: string;
  }>
): ToolCallResult[] {
  const safeParse = (str: string): Record<string, unknown> => {
    if (!str) return {};
    try {
      return JSON.parse(str);
    } catch {
      try {
        if (str.includes("}{")) {
          return JSON.parse(str.split("}{")[0] + "}");
        }
      } catch {
        /* ignore */
      }
      return {};
    }
  };

  return finalToolCalls.map((tc) => {
    const result: ToolCallResult = {
      id: tc.id,
      name: tc.function.name,
      arguments: safeParse(tc.function.arguments),
    };
    if (tc.extra_content) result.extra_content = tc.extra_content;
    return result;
  });
}
