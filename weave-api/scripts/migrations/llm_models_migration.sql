DROP TABLE IF EXISTS ai_llm_models CASCADE;

CREATE TABLE ai_llm_models (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    identifier VARCHAR(100) UNIQUE NOT NULL,
    provider_id VARCHAR(50) NOT NULL,
    provider_name VARCHAR(100) NOT NULL,
    logo_url VARCHAR(255),
    name VARCHAR(100) NOT NULL,
    version VARCHAR(50),
    description TEXT,
    context_window INTEGER,
    max_output_tokens INTEGER,
    supported_for_agents BOOLEAN DEFAULT true,
    features JSONB DEFAULT '[]'::jsonb,
    tags JSONB DEFAULT '[]'::jsonb,
    reasoning_levels JSONB DEFAULT '["none"]'::jsonb,
    deprecated BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert initial models based on previous hardcoded llm-catalog
INSERT INTO ai_llm_models (identifier, provider_id, provider_name, logo_url, name, version, description, context_window, max_output_tokens, supported_for_agents, features, tags, reasoning_levels, deprecated)
VALUES
('gemini-3.5-flash', 'gemini', 'Google Gemini', '/ai-models/gemini.svg', 'Gemini 3.5 Flash', '3.5', 'Fast and versatile model for general tasks.', 1048576, 8192, true, '["vision", "function_calling", "system_instructions"]'::jsonb, '["fast", "cost-effective"]'::jsonb, '["none"]'::jsonb, false),
('gemini-3.1-pro-preview', 'gemini', 'Google Gemini', '/ai-models/gemini.svg', 'Gemini 3.1 Pro (Preview)', '3.1 Pro', 'Highly capable model for complex reasoning tasks.', 2097152, 8192, true, '["vision", "function_calling", "system_instructions"]'::jsonb, '["advanced", "reasoning"]'::jsonb, '["none"]'::jsonb, false),
('gpt-4.1-mini', 'openai', 'OpenAI', '/ai-models/openai.svg', 'GPT-4.1 Mini', '4.1 Mini', 'Small, fast and cost-effective intelligence model.', 128000, 16384, true, '["vision", "function_calling", "system_instructions"]'::jsonb, '["fast", "efficient"]'::jsonb, '["none"]'::jsonb, false),
('gpt-5.1', 'openai', 'OpenAI', '/ai-models/openai.svg', 'GPT-5.1', '5.1', 'Advanced intelligence model.', 128000, 4096, true, '["vision", "function_calling", "system_instructions"]'::jsonb, '["advanced"]'::jsonb, '["none"]'::jsonb, false),
('gpt-5.4', 'openai', 'OpenAI', '/ai-models/openai.svg', 'GPT-5.4', '5.4', 'Advanced intelligence model.', 128000, 4096, true, '["vision", "function_calling", "system_instructions"]'::jsonb, '["advanced"]'::jsonb, '["none"]'::jsonb, false),
('gpt-5.4-mini', 'openai', 'OpenAI', '/ai-models/openai.svg', 'GPT-5.4 Mini', '5.4 Mini', 'Small, fast and cost-effective advanced intelligence model.', 128000, 16384, true, '["vision", "function_calling", "system_instructions"]'::jsonb, '["fast", "efficient"]'::jsonb, '["none"]'::jsonb, false)
ON CONFLICT (identifier) DO NOTHING;
