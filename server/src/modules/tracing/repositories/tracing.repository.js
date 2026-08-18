const { prisma } = require("@theweave/shared");

class TracingRepository {
  async getSettings(organizationId) {
    const settings = await prisma.organization_tracing_settings.findUnique({
      where: { organization_id: organizationId },
    });
    return settings;
  }

  async upsertSettings(organizationId, payload) {
    const settings = await prisma.organization_tracing_settings.upsert({
      create: {
        enabled: payload.enabled,
        export_target: payload.export_target,
        organization_id: organizationId,
        otlp_endpoint: payload.otlp_endpoint,
        otlp_headers: payload.otlp_headers || {},
        retention_days: payload.retention_days,
      },
      update: {
        enabled: payload.enabled,
        export_target: payload.export_target,
        otlp_endpoint: payload.otlp_endpoint,
        otlp_headers: payload.otlp_headers || {},
        retention_days: payload.retention_days,
        updated_at: new Date(),
      },
      where: { organization_id: organizationId },
    });
    return settings;
  }

  async insertTracesBatch(tracesArray) {
    if (!tracesArray || tracesArray.length === 0) return [];

    // We use a transaction with upsert for each trace
    // Prisma doesn't have createMany with ON CONFLICT UPDATE in a single query for Postgres,
    // so we use a transaction of upserts.
    const ops = tracesArray.map((trace) => {
      return prisma.traces.upsert({
        create: {
          end_time: trace.end_time ? new Date(trace.end_time) : null,
          id: trace.id,
          metadata: trace.metadata || {},
          name: trace.name,
          organization_id: trace.organization_id,
          project_id: trace.project_id || null,
          session_id: trace.session_id || null,
          start_time: trace.start_time ? new Date(trace.start_time) : new Date(),
          status: trace.status || "running",
          total_cost: trace.total_cost || 0.0,
          total_tokens: trace.total_tokens || 0,
          user_id: trace.user_id || null,
        },
        update: {
          end_time: trace.end_time ? new Date(trace.end_time) : null,
          metadata: trace.metadata || {},
          status: trace.status || "running",
          total_cost: trace.total_cost || 0.0,
          total_tokens: trace.total_tokens || 0,
        },
        where: { id: trace.id },
      });
    });

    await prisma.$transaction(ops);
  }

  async insertSpansBatch(spansArray) {
    if (!spansArray || spansArray.length === 0) return [];

    const ops = spansArray.map((span) => {
      return prisma.spans.upsert({
        create: {
          completion_tokens: span.completion_tokens || 0,
          end_time: span.end_time ? new Date(span.end_time) : null,
          error_message: span.error_message || null,
          id: span.id,
          input: span.input || {},
          metadata: span.metadata || {},
          model: span.model || null,
          name: span.name,
          organization_id: span.organization_id,
          output: span.output || {},
          parent_span_id: span.parent_span_id || null,
          prompt_tokens: span.prompt_tokens || 0,
          span_type: span.span_type,
          start_time: span.start_time ? new Date(span.start_time) : new Date(),
          status: span.status || "running",
          trace_id: span.trace_id,
        },
        update: {
          completion_tokens: span.completion_tokens || 0,
          end_time: span.end_time ? new Date(span.end_time) : null,
          error_message: span.error_message || null,
          metadata: span.metadata || {},
          model: span.model || null,
          output: span.output || {},
          prompt_tokens: span.prompt_tokens || 0,
          status: span.status || "running",
        },
        where: { id: span.id },
      });
    });

    await prisma.$transaction(ops);
  }
}

module.exports = new TracingRepository();
