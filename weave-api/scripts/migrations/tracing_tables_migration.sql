-- Tabela para gerenciar configurações de tracing por organização
CREATE TABLE IF NOT EXISTS organization_tracing_settings (
    organization_id UUID PRIMARY KEY REFERENCES organizations(id) ON DELETE CASCADE,
    enabled BOOLEAN NOT NULL DEFAULT false,
    retention_days INT DEFAULT NULL,
    export_target VARCHAR(50) DEFAULT 'local',
    otlp_endpoint VARCHAR(255) DEFAULT NULL,
    otlp_headers JSONB DEFAULT '{}'::jsonb,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de Traces principais
CREATE TABLE IF NOT EXISTS traces (
    id UUID PRIMARY KEY,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(user_id) ON DELETE SET NULL,
    project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
    session_id VARCHAR(255) DEFAULT NULL,
    name VARCHAR(255) NOT NULL,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE,
    status VARCHAR(50) DEFAULT 'running',
    total_tokens INT DEFAULT 0,
    total_cost DECIMAL(10, 6) DEFAULT 0.000000,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices vitais para particionamento e limpeza do traces
CREATE INDEX IF NOT EXISTS idx_traces_organization_id ON traces(organization_id);
CREATE INDEX IF NOT EXISTS idx_traces_created_at ON traces(created_at);

-- Tabela de Spans (A Árvore de Execução)
CREATE TABLE IF NOT EXISTS spans (
    id UUID PRIMARY KEY,
    trace_id UUID NOT NULL REFERENCES traces(id) ON DELETE CASCADE,
    parent_span_id UUID REFERENCES spans(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    span_type VARCHAR(50) NOT NULL, -- 'agent', 'llm', 'tool', 'retriever', 'chain'
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE,
    status VARCHAR(50) DEFAULT 'running',
    input JSONB DEFAULT '{}'::jsonb,
    output JSONB DEFAULT '{}'::jsonb,
    error_message TEXT DEFAULT NULL,
    prompt_tokens INT DEFAULT 0,
    completion_tokens INT DEFAULT 0,
    model VARCHAR(255) DEFAULT NULL,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices vitais para os spans
CREATE INDEX IF NOT EXISTS idx_spans_trace_id ON spans(trace_id);
CREATE INDEX IF NOT EXISTS idx_spans_organization_id ON spans(organization_id);
CREATE INDEX IF NOT EXISTS idx_spans_parent_span_id ON spans(parent_span_id);
