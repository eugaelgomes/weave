CREATE TABLE IF NOT EXISTS system_settings (
  id SERIAL PRIMARY KEY,
  storage_config JSONB DEFAULT '{}'::jsonb,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Inserir registro inicial vazio caso não exista
INSERT INTO system_settings (id, storage_config) 
SELECT 1, '{}'::jsonb
WHERE NOT EXISTS (SELECT 1 FROM system_settings WHERE id = 1);
