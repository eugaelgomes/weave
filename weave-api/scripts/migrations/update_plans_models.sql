UPDATE plans
SET details = jsonb_set(
    details,
    '{weave_ai,config,available_models}',
    COALESCE((SELECT jsonb_agg(identifier) FROM ai_llm_models), '[]'::jsonb)
);
