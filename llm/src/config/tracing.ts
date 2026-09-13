import { v4 as uuidv4 } from "uuid";
import { redis } from "@theweave/database";

export const TRACING_EVENTS_QUEUE_KEY = "weave:tracing:events:queue";

export interface TraceContext {
  traceId: string;
  workspaceId: string;
  userId?: string | null;
  projectId?: string | null;
  sessionId?: string | null;
}

export class Tracer {
  static async emitEvent(type: string, payload: Record<string, any>) {
    try {
      if (redis) {
        await redis.lpush(TRACING_EVENTS_QUEUE_KEY, JSON.stringify({ payload, type }));
      }
    } catch (error) {
      console.error("[Tracer] Failed to emit tracing event:", error);
    }
  }

  static async startTrace(context: TraceContext, name: string) {
    const traceId = context.traceId || uuidv4();
    const now = new Date().toISOString();

    await this.emitEvent("trace_start", {
      id: traceId,
      name,
      workspace_id: context.workspaceId,
      project_id: context.projectId,
      session_id: context.sessionId,
      start_time: now,
      status: "running",
      user_id: context.userId,
    });

    return traceId;
  }

  static async endTrace(
    traceId: string,
    context: TraceContext,
    options: {
      status?: "success" | "error";
      totalTokens?: number;
      totalCost?: number;
      error?: string;
    } = {}
  ) {
    await this.emitEvent("trace_end", {
      end_time: new Date().toISOString(),
      id: traceId,
      metadata: options.error ? { error: options.error } : {},
      workspace_id: context.workspaceId,
      status: options.status || "success",
      total_cost: options.totalCost || 0,
      total_tokens: options.totalTokens || 0,
    });
  }

  static async startSpan(
    context: TraceContext & { parentSpanId?: string },
    name: string,
    spanType: "agent" | "llm" | "tool" | "retriever" | "chain",
    input: any = {}
  ) {
    const spanId = uuidv4();
    const now = new Date().toISOString();

    await this.emitEvent("span_start", {
      id: spanId,
      input,
      name,
      workspace_id: context.workspaceId,
      parent_span_id: context.parentSpanId || null,
      span_type: spanType,
      start_time: now,
      status: "running",
      trace_id: context.traceId,
    });

    return spanId;
  }

  static async endSpan(
    spanId: string,
    context: TraceContext,
    options: {
      status?: "success" | "error";
      output?: any;
      error_message?: string;
      prompt_tokens?: number;
      completion_tokens?: number;
      model?: string;
      metadata?: Record<string, any>;
    } = {}
  ) {
    await this.emitEvent("span_end", {
      completion_tokens: options.completion_tokens || 0,
      end_time: new Date().toISOString(),
      error_message: options.error_message || null,
      id: spanId,
      metadata: options.metadata || {},
      model: options.model || null,
      workspace_id: context.workspaceId,
      output: options.output || {},
      prompt_tokens: options.prompt_tokens || 0,
      status: options.status || "success",
      trace_id: context.traceId,
    });
  }
}
