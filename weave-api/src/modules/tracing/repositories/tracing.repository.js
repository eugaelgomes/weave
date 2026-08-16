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
      where: { organization_id: organizationId },
      update: {
        enabled: payload.enabled,
        retention_days: payload.retention_days,
        export_target: payload.export_target,
        otlp_endpoint: payload.otlp_endpoint,
        otlp_headers: payload.otlp_headers || {},
        updated_at: new Date(),
      },
      create: {
        organization_id: organizationId,
        enabled: payload.enabled,
        retention_days: payload.retention_days,
        export_target: payload.export_target,
        otlp_endpoint: payload.otlp_endpoint,
        otlp_headers: payload.otlp_headers || {},
      },
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
        where: { id: trace.id },
        update: {
          end_time: trace.end_time ? new Date(trace.end_time) : null,
          status: trace.status || "running",
          total_tokens: trace.total_tokens || 0,
          total_cost: trace.total_cost || 0.0,
          metadata: trace.metadata || {},
        },
        create: {
          id: trace.id,
          organization_id: trace.organization_id,
          user_id: trace.user_id || null,
          project_id: trace.project_id || null,
          session_id: trace.session_id || null,
          name: trace.name,
          start_time: trace.start_time ? new Date(trace.start_time) : new Date(),
          end_time: trace.end_time ? new Date(trace.end_time) : null,
          status: trace.status || "running",
          total_tokens: trace.total_tokens || 0,
          total_cost: trace.total_cost || 0.0,
          metadata: trace.metadata || {},
        },
      });
    });

    await prisma.$transaction(ops);
  }

  async insertSpansBatch(spansArray) {
    if (!spansArray || spansArray.length === 0) return [];

    const ops = spansArray.map((span) => {
      return prisma.spans.upsert({
        where: { id: span.id },
        update: {
          end_time: span.end_time ? new Date(span.end_time) : null,
          status: span.status || "running",
          output: span.output || {},
          error_message: span.error_message || null,
          prompt_tokens: span.prompt_tokens || 0,
          completion_tokens: span.completion_tokens || 0,
          model: span.model || null,
          metadata: span.metadata || {},
        },
        create: {
          id: span.id,
          trace_id: span.trace_id,
          parent_span_id: span.parent_span_id || null,
          organization_id: span.organization_id,
          name: span.name,
          span_type: span.span_type,
          start_time: span.start_time ? new Date(span.start_time) : new Date(),
          end_time: span.end_time ? new Date(span.end_time) : null,
          status: span.status || "running",
          input: span.input || {},
          output: span.output || {},
          error_message: span.error_message || null,
          prompt_tokens: span.prompt_tokens || 0,
          completion_tokens: span.completion_tokens || 0,
          model: span.model || null,
          metadata: span.metadata || {},
        },
      });
    });

    await prisma.$transaction(ops);
  }
}

module.exports = new TracingRepository();
