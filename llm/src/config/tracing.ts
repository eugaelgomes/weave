import { v4 as uuidv4 } from "uuid";
import { redis } from "@theweave/database";

export const TRACING_EVENTS_QUEUE_KEY = "weave:tracing:events:queue";

export interface TraceContext {
  traceId: string;
  organizationId: string;
  userId?: string | null;
  projectId?: string | null;
  sessionId?: string | null;
}

export class Tracer {
  static async emitEvent(type: string, payload: Record<string, any>) {
    try {
      if (redis) {
        await redis.lpush(TRACING_EVENTS_QUEUE_KEY, JSON.stringify({ type, payload }));
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
      organization_id: context.organizationId,
      user_id: context.userId,
      project_id: context.projectId,
      session_id: context.sessionId,
      name,
      start_time: now,
      status: "running",
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
      id: traceId,
      organization_id: context.organizationId,
      end_time: new Date().toISOString(),
      status: options.status || "success",
      total_tokens: options.totalTokens || 0,
      total_cost: options.totalCost || 0,
      metadata: options.error ? { error: options.error } : {},
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
      trace_id: context.traceId,
      parent_span_id: context.parentSpanId || null,
      organization_id: context.organizationId,
      name,
      span_type: spanType,
      start_time: now,
      status: "running",
      input,
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
      id: spanId,
      trace_id: context.traceId,
      organization_id: context.organizationId,
      end_time: new Date().toISOString(),
      status: options.status || "success",
      output: options.output || {},
      error_message: options.error_message || null,
      prompt_tokens: options.prompt_tokens || 0,
      completion_tokens: options.completion_tokens || 0,
      model: options.model || null,
      metadata: options.metadata || {},
    });
  }
}
