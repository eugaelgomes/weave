-- Adiciona coluna data_to_update na tabela tokens para armazenar dados temporários durante validação
-- Usado principalmente para mudança de email que requer validação por token

ALTER TABLE tokens 
ADD COLUMN IF NOT EXISTS data_to_update JSONB DEFAULT NULL;

COMMENT ON COLUMN tokens.data_to_update IS 'Dados temporários aguardando validação (ex: novo email)';
