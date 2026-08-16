-- 1. Cria a função que preenche ou limpa o deleted_at automaticamente
CREATE OR REPLACE FUNCTION set_deleted_at()
RETURNS TRIGGER AS $$
BEGIN
    -- Se marcou como deletado, seta a data
    IF NEW.deleted = true AND OLD.deleted = false THEN
        NEW.deleted_at = NOW();
    -- Se restaurou (undelete), limpa a data
    ELSIF NEW.deleted = false AND OLD.deleted = true THEN
        NEW.deleted_at = NULL;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. Cria a função que atualiza o updated_at automaticamente em qualquer UPDATE
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    -- Só atualiza o updated_at se a coluna realmente existe na tabela
    -- (o trigger só será atrelado a tabelas que têm updated_at)
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 3. Bloco anônimo dinâmico que varre o banco de dados e aplica os Triggers
DO $$
DECLARE
    rec RECORD;
BEGIN
    -------------------------------------------------------------------
    -- A) Aplicar Trigger de SOFT DELETE (deleted / deleted_at)
    -------------------------------------------------------------------
    FOR rec IN 
        SELECT c1.table_name
        FROM information_schema.columns c1
        JOIN information_schema.columns c2 ON c1.table_name = c2.table_name
        WHERE c1.column_name = 'deleted' AND c2.column_name = 'deleted_at'
          AND c1.table_schema = 'public' AND c2.table_schema = 'public'
    LOOP
        EXECUTE format(
            'DROP TRIGGER IF EXISTS trg_set_deleted_at ON %I;
             CREATE TRIGGER trg_set_deleted_at
             BEFORE UPDATE ON %I
             FOR EACH ROW
             EXECUTE FUNCTION set_deleted_at();', 
            rec.table_name, rec.table_name
        );
    END LOOP;

    -------------------------------------------------------------------
    -- B) Aplicar Trigger de UPDATED_AT (updated_at)
    -------------------------------------------------------------------
    FOR rec IN 
        SELECT table_name
        FROM information_schema.columns
        WHERE column_name = 'updated_at' AND table_schema = 'public'
    LOOP
        EXECUTE format(
            'DROP TRIGGER IF EXISTS trg_set_updated_at ON %I;
             CREATE TRIGGER trg_set_updated_at
             BEFORE UPDATE ON %I
             FOR EACH ROW
             EXECUTE FUNCTION set_updated_at();', 
            rec.table_name, rec.table_name
        );
    END LOOP;
END;
$$ LANGUAGE plpgsql;
