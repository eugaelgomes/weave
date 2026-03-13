-- ============================================================================
-- WEAVE NOTES - ESTRUTURA DO BANCO DE DADOS
-- ============================================================================
-- PostgreSQL Database Structure
-- Schema: public
-- Gerenciado por: avnadmin (Aiven Cloud)
--
-- Este arquivo documenta toda a estrutura do banco de dados do Weave Notes,
-- incluindo tabelas, tipos enumerados, sequências, índices, constraints,
-- triggers e funções.
--
-- SUMÁRIO:
--   1. SCHEMA
--   2. TIPOS ENUMERADOS (ENUMS)
--      - access_status_enum    : Status de tentativas de acesso
--      - notes_status          : Status de visibilidade das notas
--      - system_users_roles    : Papéis de administradores do sistema
--      - theme_mode_pattern    : Temas de interface (dark/light)
--      - token_type_enum       : Tipos de tokens de autenticação/verificação
--      - user_log_category     : Categorias de log de atividade do usuário
--      - user_role             : Papéis de usuários dentro de organizações/projetos
--   3. SEQUÊNCIAS
--      - aiservermessages_id_seq
--      - tokens_token_id_seq
--   4. TABELAS INDEPENDENTES (sem foreign keys para outras tabelas do app)
--      - aisessions            : Sessões de chat IA (servidor legado)
--      - plans                 : Planos de assinatura
--      - sessions              : Sessões HTTP (express-session/connect-pg-simple)
--      - system_admins         : Administradores do painel interno
--   5. TABELAS DEPENDENTES DE USERS
--      - users                 : Usuários da plataforma
--      - users_logs            : Logs de atividade dos usuários
--      - tokens                : Tokens de verificação e autenticação
--      - jobs                  : Jobs assíncronos (backup, export, etc.)
--      - ai_chat_sessions      : Sessões de chat com IA (por usuário)
--      - ai_user_agent         : Configuração de personalidade do agente IA
--   6. TABELAS DE ORGANIZAÇÕES
--      - organizations         : Organizações/workspaces
--      - organizations_areas   : Áreas/departamentos dentro de organizações
--      - organizations_members : Membros de organizações
--      - invite_org_members    : Convites pendentes para organizações
--   7. TABELAS DE PLANOS E USO
--      - plans_usage           : Uso atual do plano (ciclo mensal)
--      - plan_usage_history    : Histórico mensal de uso
--   8. TABELAS DE PROJETOS
--      - projects              : Projetos de notas
--      - projects_logs         : Logs de auditoria de projetos
--      - projects_members      : Membros de projetos
--   9. TABELAS DE NOTAS E CONTEÚDO
--      - notes                 : Notas dos usuários
--      - blocks                : Blocos de conteúdo das notas (editor block-based)
--      - blocks_logs           : Logs de auditoria de blocos
--      - note_collaborators    : Colaboradores de notas
--      - note_collaborators_logs : Logs de auditoria de colaboradores
--  10. TABELAS DE IA (MENSAGENS E AÇÕES)
--      - aiservermessages      : Mensagens do chat IA (servidor legado)
--      - ai_chat_messages      : Mensagens do chat IA (por usuário)
--      - ai_agent_actions      : Ações executadas pelo agente de IA
--  11. FUNÇÕES (FUNCTIONS)
--      - trigger_audit_log()                   : Auditoria genérica de operações
--      - update_invite_org_members_updated_at() : Auto-update de updated_at em convites
--      - update_updated_at_column()            : Auto-update genérico de updated_at
--      - uuid_generate_v1/v3/v4/v5/nil/ns_*   : Funções da extensão uuid-ossp
--  12. PERMISSÕES DO SCHEMA
--
-- DIAGRAMA DE RELACIONAMENTOS (simplificado):
--
--   plans ──────────┬──────────── users
--                   │              │
--                   │    ┌─────────┼──────────┬──────────────┬──────────┐
--                   │    │         │          │              │          │
--                   │  tokens  users_logs  jobs      ai_user_agent   ai_chat_sessions
--                   │                                                  │
--                   │                                    ┌─────────────┤
--                   │                                    │             │
--                   │                          ai_chat_messages  ai_agent_actions
--                   │
--                   ├──── organizations
--                   │        │
--                   │   ┌────┼──────────────┐
--                   │   │    │              │
--                   │ org_areas  org_members  invite_org_members
--                   │
--                   ├──── projects
--                   │        │
--                   │   ┌────┼────────────┐
--                   │   │    │            │
--                   │ projects_logs  projects_members
--                   │
--                   └──── notes
--                            │
--                       ┌────┼──────────────────┐
--                       │    │                  │
--                     blocks  note_collaborators  note_collaborators_logs
--                       │
--                   blocks_logs
--
-- ============================================================================


-- ============================================================================
-- 1. SCHEMA
-- ============================================================================
-- Schema padrão do PostgreSQL. Todas as tabelas do Weave Notes residem aqui.
-- ============================================================================

-- DROP SCHEMA public;

CREATE SCHEMA public AUTHORIZATION pg_database_owner;

COMMENT ON SCHEMA public IS 'standard public schema';


-- ============================================================================
-- 2. TIPOS ENUMERADOS (ENUMS)
-- ============================================================================
-- Tipos customizados usados como domínios de valores em diversas colunas.
-- Garantem integridade de dados no nível do banco.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- access_status_enum
-- Usado para registrar o resultado de tentativas de acesso/login.
-- Valores:
--   'success' : Acesso bem-sucedido
--   'failure' : Acesso falhou (credenciais inválidas, conta bloqueada, etc.)
-- ----------------------------------------------------------------------------
-- DROP TYPE public."access_status_enum";

CREATE TYPE public."access_status_enum" AS ENUM (
	'success',
	'failure');

-- ----------------------------------------------------------------------------
-- notes_status
-- Define o status de visibilidade de uma nota.
-- Valores:
--   'archived' : Nota arquivada (oculta da listagem principal)
--   'visible'  : Nota visível e acessível normalmente
--   'secure'   : Nota protegida (pode exigir autenticação extra para acesso)
-- ----------------------------------------------------------------------------
-- DROP TYPE public."notes_status";

CREATE TYPE public."notes_status" AS ENUM (
	'archived',
	'visible',
	'secure');

-- ----------------------------------------------------------------------------
-- project_methodology
-- Metodologia de gestão do projeto.
-- Valores:
--   'kanban'    : Quadro Kanban (padrão)
--   'scrum'     : Metodologia Scrum
--   'waterfall' : Metodologia Tradicional/Cascata
--   'custom'    : Personalizado
-- ----------------------------------------------------------------------------
-- DROP TYPE public."project_methodology";

CREATE TYPE public."project_methodology" AS ENUM (
	'kanban',
	'scrum',
	'waterfall',
	'custom');

-- ----------------------------------------------------------------------------
-- project_status
-- Status do ciclo de vida do projeto.
-- Valores:
--   'open'      : Aberto/Em planejamento (padrão)
--   'running'   : Em execução
--   'completed' : Concluído
--   'on-hold'   : Em espera
--   'deleted'   : Deletado logicamente
--   'archived'  : Arquivado
-- ----------------------------------------------------------------------------
-- DROP TYPE public."project_status";

CREATE TYPE public."project_status" AS ENUM (
	'open',
	'running',
	'completed',
	'on-hold',
	'deleted',
	'archived');

-- ----------------------------------------------------------------------------
-- project_view_type
-- Visualização padrão do projeto.
-- Valores:
--   'board'    : Visualização em Quadro (Kanban)
--   'list'     : Visualização em Lista
--   'calendar' : Visualização em Calendário
--   'timeline' : Visualização em Linha do Tempo
--   'gantt'    : Visualização de Gantt
-- ----------------------------------------------------------------------------
-- DROP TYPE public."project_view_type";

CREATE TYPE public."project_view_type" AS ENUM (
	'board',
	'list',
	'calendar',
	'timeline',
	'gantt');

-- ----------------------------------------------------------------------------
-- system_users_roles
-- Papéis dos administradores internos do sistema (painel administrativo).
-- Diferente de user_role, que é para membros de organizações/projetos.
-- Valores:
--   'super_admin' : Acesso total ao sistema
--   'support'     : Acesso para suporte ao cliente
--   'manager'     : Gerente com acesso intermediário
--   'read_only'   : Apenas visualização (padrão para novos admins)
-- ----------------------------------------------------------------------------
-- DROP TYPE public."system_users_roles";

CREATE TYPE public."system_users_roles" AS ENUM (
	'super_admin',
	'support',
	'manager',
	'read_only');

-- ----------------------------------------------------------------------------
-- theme_mode_pattern
-- Preferência de tema da interface do usuário.
-- Valores:
--   'dark'  : Tema escuro (padrão)
--   'light' : Tema claro
-- ----------------------------------------------------------------------------
-- DROP TYPE public."theme_mode_pattern";

CREATE TYPE public."theme_mode_pattern" AS ENUM (
	'dark',
	'light');

-- ----------------------------------------------------------------------------
-- token_type_enum
-- Tipos de tokens gerados pelo sistema para diversas operações.
-- Cada tipo tem um fluxo de uso e expiração específicos.
-- Valores:
--   'password_reset'       : Recuperação de senha via email
--   'email_verification'   : Verificação de email após cadastro
--   'access'               : Token de acesso geral
--   'delete_user_account'  : Confirmação de exclusão de conta
--   'backup_download'      : Autorização para download de backup
-- ----------------------------------------------------------------------------
-- DROP TYPE public."token_type_enum";

CREATE TYPE public."token_type_enum" AS ENUM (
	'password_reset',
	'email_verification',
	'access',
	'delete_user_account',
	'backup_download');

-- ----------------------------------------------------------------------------
-- user_log_category
-- Categorias de eventos registrados no log de atividade do usuário.
-- Usadas na tabela users_logs para classificar ações.
-- Valores:
--   'auth_login'       : Login realizado
--   'auth_logout'      : Logout realizado
--   'profile_update'   : Atualização de dados do perfil
--   'security_change'  : Alteração de segurança (senha, 2FA, etc.)
--   'data_export'      : Exportação de dados solicitada
--   'system_error'     : Erro do sistema associado ao usuário
-- ----------------------------------------------------------------------------
-- DROP TYPE public."user_log_category";

CREATE TYPE public."user_log_category" AS ENUM (
	'auth_login',
	'auth_logout',
	'profile_update',
	'security_change',
	'data_export',
	'system_error');

-- ----------------------------------------------------------------------------
-- user_role
-- Papéis de usuários dentro de organizações e projetos.
-- Usado nas tabelas organizations_members e projects_members.
-- Valores:
--   'admin'       : Administrador da organização/projeto
--   'super_admin' : Super administrador com poderes totais
--   'member'      : Membro regular com acesso padrão
--   'guest'       : Convidado com acesso limitado/somente leitura
-- ----------------------------------------------------------------------------
-- DROP TYPE public."user_role";

CREATE TYPE public."user_role" AS ENUM (
	'admin',
	'super_admin',
	'member',
	'guest');


-- ============================================================================
-- 3. SEQUÊNCIAS
-- ============================================================================
-- Sequências auto-incrementais usadas como geradores de IDs para tabelas
-- que utilizam chaves primárias seriais (inteiros).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- aiservermessages_id_seq
-- Sequência para a coluna `id` da tabela `aiservermessages`.
-- Gera IDs inteiros sequenciais de 1 até 2.147.483.647.
-- ----------------------------------------------------------------------------
-- DROP SEQUENCE aiservermessages_id_seq;

CREATE SEQUENCE aiservermessages_id_seq
	INCREMENT BY 1
	MINVALUE 1
	MAXVALUE 2147483647
	START 1
	CACHE 1
	NO CYCLE;

-- Permissions

ALTER SEQUENCE aiservermessages_id_seq OWNER TO avnadmin;
GRANT ALL ON SEQUENCE aiservermessages_id_seq TO avnadmin;

-- ----------------------------------------------------------------------------
-- tokens_token_id_seq
-- Sequência para a coluna `token_id` da tabela `tokens`.
-- Gera IDs inteiros sequenciais de 1 até 2.147.483.647.
-- ----------------------------------------------------------------------------
-- DROP SEQUENCE tokens_token_id_seq;

CREATE SEQUENCE tokens_token_id_seq
	INCREMENT BY 1
	MINVALUE 1
	MAXVALUE 2147483647
	START 1
	CACHE 1
	NO CYCLE;

-- Permissions

ALTER SEQUENCE tokens_token_id_seq OWNER TO avnadmin;
GRANT ALL ON SEQUENCE tokens_token_id_seq TO avnadmin;


-- ============================================================================
-- 4. TABELAS INDEPENDENTES
-- ============================================================================
-- Tabelas que não possuem FK para outras tabelas do domínio da aplicação,
-- ou que são referenciadas por muitas outras tabelas.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- TABELA: aisessions
-- ----------------------------------------------------------------------------
-- Armazena sessões de conversação do sistema de IA legado (servidor).
-- Cada sessão tem um assunto definido e rastreamento de atividade.
-- Relacionamento: Referenciada por aiservermessages (1:N).
--
-- Colunas:
--   session_id    (PK, varchar)   : Identificador único da sessão
--   subject       (varchar(50))   : Assunto da sessão (ex: codigo, programacao, dados)
--   created_at    (timestamp)     : Data de criação da sessão
--   last_activity (timestamp)     : Timestamp da última atividade na sessão
--
-- Índices:
--   idx_sessions_last_activity : Busca por atividade recente
--   idx_sessions_subject       : Busca por assunto
-- ----------------------------------------------------------------------------
-- DROP TABLE aisessions;

CREATE TABLE aisessions ( session_id varchar(255) NOT NULL, subject varchar(50) NOT NULL, created_at timestamp DEFAULT now() NOT NULL, last_activity timestamp DEFAULT now() NOT NULL, CONSTRAINT aisessions_pkey PRIMARY KEY (session_id));
CREATE INDEX idx_sessions_last_activity ON public.aisessions USING btree (last_activity);
CREATE INDEX idx_sessions_subject ON public.aisessions USING btree (subject);
COMMENT ON TABLE public.aisessions IS 'Armazena informações sobre as sessões de conversação';

-- Column comments

COMMENT ON COLUMN public.aisessions.session_id IS 'Identificador único da sessão';
COMMENT ON COLUMN public.aisessions.subject IS 'Assunto da sessão (codigo, programacao, dados)';
COMMENT ON COLUMN public.aisessions.last_activity IS 'Timestamp da última atividade na sessão';

-- Permissions

ALTER TABLE aisessions OWNER TO avnadmin;
GRANT ALL ON TABLE aisessions TO avnadmin;


-- ----------------------------------------------------------------------------
-- TABELA: blocks_logs
-- ----------------------------------------------------------------------------
-- Log de auditoria para alterações em blocos de conteúdo (tabela blocks).
-- Registra operações de INSERT, UPDATE e DELETE com snapshots dos dados
-- antes e depois da mudança.
--
-- Colunas:
--   log_id     (PK, uuid)      : ID único do registro de log
--   block_id   (uuid, NOT NULL): ID do bloco alterado
--   note_id    (uuid, NOT NULL): ID da nota à qual o bloco pertence
--   user_id    (uuid, NULL)    : ID do usuário que fez a alteração (NULL se sistema)
--   operation  (text, NOT NULL): Tipo de operação (INSERT, UPDATE, DELETE)
--   old_data   (jsonb, NULL)   : Snapshot dos dados antes da alteração
--   new_data   (jsonb, NULL)   : Snapshot dos dados após a alteração
--   changed_at (timestamptz)   : Momento da alteração
--
-- Índices:
--   idx_blocks_logs_block_id : Busca por logs de um bloco específico
--   idx_blocks_logs_note_id  : Busca por logs de todos os blocos de uma nota
--
-- Nota: Esta tabela NÃO possui FKs para blocks ou notes, permitindo
-- que os logs permaneçam após exclusão dos dados originais.
-- ----------------------------------------------------------------------------
-- DROP TABLE blocks_logs;

CREATE TABLE blocks_logs ( log_id uuid DEFAULT uuid_generate_v4() NOT NULL, block_id uuid NOT NULL, note_id uuid NOT NULL, user_id uuid NULL, operation text NOT NULL, old_data jsonb NULL, new_data jsonb NULL, changed_at timestamptz DEFAULT now() NOT NULL, CONSTRAINT blocks_logs_pkey PRIMARY KEY (log_id));
CREATE INDEX idx_blocks_logs_block_id ON public.blocks_logs USING btree (block_id);
CREATE INDEX idx_blocks_logs_note_id ON public.blocks_logs USING btree (note_id);

-- Permissions

ALTER TABLE blocks_logs OWNER TO avnadmin;
GRANT ALL ON TABLE blocks_logs TO avnadmin;


-- ----------------------------------------------------------------------------
-- TABELA: plans
-- ----------------------------------------------------------------------------
-- Define os planos de assinatura disponíveis na plataforma.
-- Cada plano tem limites, preço e ciclo de cobrança configuráveis.
-- Pode ser personalizado para um cliente específico.
--
-- Relacionamentos:
--   Referenciada por: users (user → plan), organizations (org → plan),
--                     plans_usage, plan_usage_history
--
-- Colunas:
--   plan_id                  (PK, uuid)        : ID único do plano
--   name                     (varchar(255))     : Nome do plano (ex: Free, Pro, Enterprise)
--   details                  (jsonb)            : Detalhes e limites do plano em JSON
--   created_at               (timestamp)        : Data de criação
--   deleted                  (bool)             : Soft delete
--   personilized_for_client  (bool)             : Se é um plano customizado para um cliente
--   personilized_client      (varchar(50))      : Nome/ID do cliente para plano personalizado
--   plan_value               (float8)           : Valor monetário do plano
--   currency                 (varchar(3))       : Moeda (padrão: 'BRL')
--   billing_cycle            (varchar(20))      : Frequência de cobrança: monthly, yearly, lifetime
--   gateway_id               (varchar(255))     : ID correspondente ao plano no Stripe ou outro provedor
--   trial_days               (int4)             : Dias de teste grátis (padrão: 0)
--   updated_at               (timestamptz)      : Última atualização
--   description              (text)             : Descrição textual do plano
--   is_active                (bool)             : Se o plano está ativo para novos assinantes
-- ----------------------------------------------------------------------------
-- DROP TABLE "plans";

CREATE TABLE "plans" ( plan_id uuid DEFAULT uuid_generate_v4() NOT NULL, "name" varchar(255) NOT NULL, details jsonb DEFAULT '{}'::jsonb NULL, created_at timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL, deleted bool DEFAULT false NOT NULL, personilized_for_client bool DEFAULT false NOT NULL, personilized_client varchar(50) COLLATE "pg_c_utf8" NULL, plan_value float8 DEFAULT 0 NULL, currency varchar(3) DEFAULT 'BRL'::character varying NOT NULL, billing_cycle varchar(20) DEFAULT 'monthly'::character varying NOT NULL, gateway_id varchar(255) NULL, trial_days int4 DEFAULT 0 NULL, updated_at timestamptz DEFAULT now() NOT NULL, description text NULL, is_active bool DEFAULT true NOT NULL, CONSTRAINT plans_pkey PRIMARY KEY (plan_id));

-- Column comments

COMMENT ON COLUMN public."plans".billing_cycle IS 'Frequência de cobrança: monthly, yearly, lifetime';
COMMENT ON COLUMN public."plans".gateway_id IS 'ID correspondente ao plano no Stripe ou outro provedor';

-- Permissions

ALTER TABLE "plans" OWNER TO avnadmin;
GRANT ALL ON TABLE "plans" TO avnadmin;


-- ----------------------------------------------------------------------------
-- TABELA: sessions
-- ----------------------------------------------------------------------------
-- Armazena sessões HTTP do servidor Express (connect-pg-simple).
-- Usado pelo middleware express-session para persistir sessões no PostgreSQL.
--
-- Colunas:
--   sid    (PK, varchar)    : ID da sessão (gerado pelo express-session)
--   sess   (json, NOT NULL) : Dados serializados da sessão (cookies, user info, etc.)
--   expire (timestamp)      : Data de expiração da sessão
--
-- Nota: Esta tabela é gerenciada automaticamente pelo express-session.
-- Sessões expiradas são limpas periodicamente.
-- ----------------------------------------------------------------------------
-- DROP TABLE sessions;

CREATE TABLE sessions ( sid varchar NOT NULL, sess json NOT NULL, expire timestamp(6) NOT NULL, CONSTRAINT session_pkey PRIMARY KEY (sid));

-- Permissions

ALTER TABLE sessions OWNER TO avnadmin;
GRANT ALL ON TABLE sessions TO avnadmin;


-- ============================================================================
-- 5. TABELAS DEPENDENTES DE USERS
-- ============================================================================
-- Tabela central de usuários e tabelas diretamente associadas.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- TABELA: aiservermessages
-- ----------------------------------------------------------------------------
-- Armazena o histórico de mensagens das sessões de IA do servidor legado.
-- Cada mensagem pertence a uma sessão (aisessions) e tem um papel (role).
--
-- Relacionamentos:
--   session_id → aisessions.session_id (ON DELETE CASCADE)
--
-- Colunas:
--   id         (PK, serial4)       : ID auto-incremental da mensagem
--   session_id (varchar(255), FK)  : Referência para a sessão de IA
--   role       (varchar(20))       : Papel da mensagem: 'system', 'user' ou 'assistant'
--   content    (text)              : Conteúdo textual da mensagem
--   metadata   (jsonb, NULL)       : Dados adicionais em formato JSON (ex: citations)
--   created_at (timestamp)         : Momento de criação da mensagem
--
-- Constraints:
--   aiservermessages_role_check : role IN ('system', 'user', 'assistant')
--
-- Índices:
--   idx_messages_created_at : Ordenação cronológica
--   idx_messages_role       : Filtro por tipo de mensagem
--   idx_messages_session_id : Busca por sessão
-- ----------------------------------------------------------------------------
-- DROP TABLE aiservermessages;

CREATE TABLE aiservermessages ( id serial4 NOT NULL, session_id varchar(255) NOT NULL, "role" varchar(20) NOT NULL, "content" text NOT NULL, metadata jsonb NULL, created_at timestamp DEFAULT now() NOT NULL, CONSTRAINT aiservermessages_pkey PRIMARY KEY (id), CONSTRAINT aiservermessages_role_check CHECK (((role)::text = ANY ((ARRAY['system'::character varying, 'user'::character varying, 'assistant'::character varying])::text[]))), CONSTRAINT aiservermessages_session_id_fkey FOREIGN KEY (session_id) REFERENCES aisessions(session_id) ON DELETE CASCADE);
CREATE INDEX idx_messages_created_at ON public.aiservermessages USING btree (created_at);
CREATE INDEX idx_messages_role ON public.aiservermessages USING btree (role);
CREATE INDEX idx_messages_session_id ON public.aiservermessages USING btree (session_id);
COMMENT ON TABLE public.aiservermessages IS 'Armazena o histórico de mensagens de cada sessão';

-- Column comments

COMMENT ON COLUMN public.aiservermessages.session_id IS 'Referência para a sessão';
COMMENT ON COLUMN public.aiservermessages."role" IS 'Papel da mensagem: system, user ou assistant';
COMMENT ON COLUMN public.aiservermessages."content" IS 'Conteúdo textual da mensagem';
COMMENT ON COLUMN public.aiservermessages.metadata IS 'Dados adicionais em formato JSON (ex: citations)';

-- Permissions

ALTER TABLE aiservermessages OWNER TO avnadmin;
GRANT ALL ON TABLE aiservermessages TO avnadmin;


-- ----------------------------------------------------------------------------
-- TABELA: system_admins
-- ----------------------------------------------------------------------------
-- Administradores internos do sistema (painel administrativo).
-- Separados dos usuários regulares (tabela users) por segurança.
-- Possuem papéis definidos pelo enum system_users_roles.
--
-- Relacionamentos:
--   created_by → system_admins.id (auto-referência: quem criou o admin)
--
-- Colunas:
--   id            (PK, uuid)         : ID único do administrador
--   email         (text, UNIQUE)     : Email (validado por regex)
--   name          (text)             : Nome completo
--   role          (system_users_roles): Papel no sistema (padrão: 'read_only')
--   user_function (text, NULL)       : Função/cargo do administrador
--   is_active     (bool)             : Se a conta está ativa
--   is_suspended  (bool)             : Se a conta está suspensa
--   is_deleted    (bool)             : Soft delete
--   created_at    (timestamptz)      : Data de criação
--   updated_at    (timestamptz)      : Última atualização (auto-update via trigger)
--   deleted_at    (timestamptz)      : Data de exclusão (soft delete)
--   created_by    (uuid, FK, NULL)   : Admin que criou este registro
--
-- Constraints:
--   email_format_check : Validação de formato de email via regex
--
-- Índices:
--   idx_system_admins_active : Busca admins ativos (exclui deletados)
--   idx_system_admins_email  : Busca por email (exclui deletados)
--
-- Triggers:
--   update_system_admins_updated_at : Atualiza updated_at automaticamente
-- ----------------------------------------------------------------------------
-- DROP TABLE system_admins;

CREATE TABLE system_admins ( id uuid DEFAULT gen_random_uuid() NOT NULL, email text NOT NULL, "name" text NOT NULL, "role" public."system_users_roles" DEFAULT 'read_only'::system_users_roles NOT NULL, user_function text NULL, is_active bool DEFAULT true NOT NULL, is_suspended bool DEFAULT false NOT NULL, is_deleted bool DEFAULT false NOT NULL, created_at timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL, updated_at timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL, deleted_at timestamptz NULL, created_by uuid NULL, CONSTRAINT email_format_check CHECK ((email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$'::text)), CONSTRAINT system_admins_email_unique UNIQUE (email), CONSTRAINT system_admins_pk PRIMARY KEY (id), CONSTRAINT system_admins_system_admins_fk FOREIGN KEY (created_by) REFERENCES system_admins(id));
CREATE INDEX idx_system_admins_active ON public.system_admins USING btree (is_active) WHERE (NOT is_deleted);
CREATE INDEX idx_system_admins_email ON public.system_admins USING btree (email) WHERE (NOT is_deleted);

-- Table Triggers

create trigger update_system_admins_updated_at before
update
    on
    public.system_admins for each row execute function update_updated_at_column();

-- Permissions

ALTER TABLE system_admins OWNER TO avnadmin;
GRANT ALL ON TABLE system_admins TO avnadmin;


-- ----------------------------------------------------------------------------
-- TABELA: users
-- ----------------------------------------------------------------------------
-- Tabela principal de usuários da plataforma Weave Notes.
-- Centraliza dados de autenticação, perfil e preferências.
-- É a tabela mais referenciada do banco (FK em quase todas as outras tabelas).
--
-- Relacionamentos:
--   plan_id → plans.plan_id (ON DELETE SET NULL)
--   Referenciada por: tokens, users_logs, jobs, ai_chat_sessions, ai_user_agent,
--     ai_chat_messages, ai_agent_actions, organizations, organizations_areas,
--     organizations_members, invite_org_members, projects, projects_logs,
--     projects_members, notes, blocks, note_collaborators, note_collaborators_logs,
--     plans_usage
--
-- Colunas:
--   user_id          (PK, uuid)           : ID único do usuário
--   name             (varchar(255))       : Nome completo
--   email            (varchar(255), UNIQUE): Email (usado para login)
--   username         (varchar(20), UNIQUE) : Nome de usuário único
--   password         (varchar(255))       : Hash da senha (bcrypt)
--   avatar_url       (varchar, NULL)      : URL do avatar (S3/Spaces)
--   created_at       (timestamp)          : Data de registro
--   updated_at       (timestamp, NULL)    : Última atualização do perfil
--   last_login       (timestamp, NULL)    : Último login realizado
--   email_verified   (bool)              : Se o email foi verificado
--   deleted          (bool)              : Soft delete
--   auth_with_google (bool, NULL)        : Se autenticou via Google OAuth
--   google_id        (varchar(255), UNIQUE): ID do Google (para OAuth)
--   auth_with_github (bool, NULL)        : Se autenticou via GitHub OAuth
--   github_id        (varchar(255), UNIQUE): ID do GitHub (para OAuth)
--   theme_mode       (theme_mode_pattern) : Preferência de tema (padrão: 'dark')
--   phone_number     (varchar(20), UNIQUE): Telefone (opcional)
--   birth_date       (date, NULL)        : Data de nascimento (opcional)
--   private_profile  (bool)              : Se o perfil é privado
--   email_verified_at(timestamptz, NULL) : Quando o email foi verificado
--   timezone         (varchar(100), NULL): Timezone do usuário (ex: America/Sao_Paulo)
--   org_id           (uuid, NULL)        : Organização ativa/principal do usuário
--   plan_id          (uuid, FK, NULL)    : Plano de assinatura ativo
--   user_preference  (jsonb)             : Preferências gerais do usuário em JSON
-- ----------------------------------------------------------------------------
-- DROP TABLE users;

CREATE TABLE users ( user_id uuid DEFAULT uuid_generate_v4() NOT NULL, "name" varchar(255) NOT NULL, email varchar(255) NOT NULL, username varchar(20) NOT NULL, "password" varchar(255) NOT NULL, avatar_url varchar NULL, created_at timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL, updated_at timestamp NULL, last_login timestamp NULL, email_verified bool DEFAULT false NOT NULL, deleted bool DEFAULT false NOT NULL, auth_with_google bool DEFAULT false NULL, google_id varchar(255) NULL, auth_with_github bool NULL, github_id varchar(255) NULL, theme_mode public."theme_mode_pattern" DEFAULT 'dark'::theme_mode_pattern NOT NULL, phone_number varchar(20) NULL, birth_date date NULL, private_profile bool DEFAULT false NOT NULL, email_verified_at timestamptz NULL, timezone varchar(100) NULL, org_id uuid NULL, plan_id uuid NULL, user_preference jsonb DEFAULT '{}'::jsonb NOT NULL, CONSTRAINT phone_number UNIQUE (phone_number), CONSTRAINT users_email_key UNIQUE (email), CONSTRAINT users_pkey PRIMARY KEY (user_id), CONSTRAINT users_username_key UNIQUE (username), CONSTRAINT users_plan_id_fkey FOREIGN KEY (plan_id) REFERENCES "plans"(plan_id) ON DELETE SET NULL);
CREATE UNIQUE INDEX users_github_id_idx ON public.users USING btree (github_id);
CREATE UNIQUE INDEX users_google_id_idx ON public.users USING btree (google_id);

-- Permissions

ALTER TABLE users OWNER TO avnadmin;
GRANT ALL ON TABLE users TO avnadmin;


-- ----------------------------------------------------------------------------
-- TABELA: users_logs
-- ----------------------------------------------------------------------------
-- Registra logs de atividade dos usuários para auditoria e segurança.
-- Cada entrada é categorizada pelo enum user_log_category.
--
-- Relacionamentos:
--   user_id → users.user_id (sem ON DELETE CASCADE - logs são preservados)
--
-- Colunas:
--   id         (PK, uuid)             : ID único do log
--   user_id    (uuid, FK, NOT NULL)   : Usuário associado
--   log_type   (user_log_category)    : Categoria do evento (auth_login, profile_update, etc.)
--   log        (jsonb, NULL)          : Detalhes do evento em JSON (IP, user-agent, etc.)
--   created_at (timestamptz)          : Momento do evento
--
-- Índices:
--   idx_users_logs_created_at : Consultas por período
--   idx_users_logs_type       : Filtro por categoria de evento
--   idx_users_logs_user_id    : Busca por usuário
-- ----------------------------------------------------------------------------
-- DROP TABLE users_logs;

CREATE TABLE users_logs ( id uuid DEFAULT uuid_generate_v4() NOT NULL, user_id uuid NOT NULL, log_type public."user_log_category" NOT NULL, log jsonb NULL, created_at timestamptz DEFAULT now() NOT NULL, CONSTRAINT users_logs_pkey PRIMARY KEY (id), CONSTRAINT ulogs_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(user_id));
CREATE INDEX idx_users_logs_created_at ON public.users_logs USING btree (created_at);
CREATE INDEX idx_users_logs_type ON public.users_logs USING btree (log_type);
CREATE INDEX idx_users_logs_user_id ON public.users_logs USING btree (user_id);

-- Permissions

ALTER TABLE users_logs OWNER TO avnadmin;
GRANT ALL ON TABLE users_logs TO avnadmin;


-- ----------------------------------------------------------------------------
-- TABELA: ai_chat_sessions
-- ----------------------------------------------------------------------------
-- Sessões de conversa com IA associadas a um usuário específico.
-- Evolução do sistema legado (aisessions) com vinculação por usuário.
--
-- Relacionamentos:
--   user_id → users.user_id (ON DELETE CASCADE)
--   Referenciada por: ai_chat_messages, ai_agent_actions
--
-- Colunas:
--   id         (PK, uuid)           : ID único da sessão
--   user_id    (uuid, FK, NOT NULL) : Usuário dono da sessão
--   title      (varchar(255))       : Título da conversa (padrão: 'Nova Conversa')
--   created_at (timestamptz)        : Data de criação
--   updated_at (timestamptz)        : Última atualização
--
-- Índices:
--   idx_chat_sessions_updated_at : Ordenação por atividade recente (DESC)
--   idx_chat_sessions_user_id    : Busca por usuário
-- ----------------------------------------------------------------------------
-- DROP TABLE ai_chat_sessions;

CREATE TABLE ai_chat_sessions ( id uuid DEFAULT uuid_generate_v4() NOT NULL, user_id uuid NOT NULL, title varchar(255) DEFAULT 'Nova Conversa'::character varying NOT NULL, created_at timestamptz DEFAULT now() NOT NULL, updated_at timestamptz DEFAULT now() NOT NULL, CONSTRAINT ai_chat_sessions_pkey PRIMARY KEY (id), CONSTRAINT ai_chat_sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE, CONSTRAINT fk_chat_session_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE);
CREATE INDEX idx_chat_sessions_updated_at ON public.ai_chat_sessions USING btree (updated_at DESC);
CREATE INDEX idx_chat_sessions_user_id ON public.ai_chat_sessions USING btree (user_id);
COMMENT ON TABLE public.ai_chat_sessions IS 'Sessões de conversa com IA';

-- Permissions

ALTER TABLE ai_chat_sessions OWNER TO avnadmin;
GRANT ALL ON TABLE ai_chat_sessions TO avnadmin;


-- ----------------------------------------------------------------------------
-- TABELA: ai_user_agent
-- ----------------------------------------------------------------------------
-- Configuração personalizada do agente de IA para cada usuário.
-- Armazena a "personalidade" e preferências do assistente virtual.
--
-- Relacionamentos:
--   user_id → users.user_id (ON DELETE CASCADE)
--
-- Colunas:
--   id          (PK, uuid)           : ID único do agente
--   user_id     (uuid, FK, NOT NULL) : Usuário dono da configuração
--   personality (jsonb)              : Configuração de personalidade em JSON
--                                      (tom, estilo, preferências, contexto)
--   created_at  (timestamptz)        : Data de criação
--   updated_at  (timestamptz)        : Última atualização (auto-update via trigger)
--
-- Índices:
--   idx_ai_user_agent_metadata : Índice GIN para busca dentro do JSON personality
--   idx_ai_user_agent_user_id  : Busca por usuário
--
-- Triggers:
--   trg_ai_user_agent_updated_at : Atualiza updated_at automaticamente
-- ----------------------------------------------------------------------------
-- DROP TABLE ai_user_agent;

CREATE TABLE ai_user_agent ( id uuid DEFAULT uuid_generate_v4() NOT NULL, user_id uuid NOT NULL, personality jsonb DEFAULT '{}'::jsonb NOT NULL, created_at timestamptz DEFAULT now() NOT NULL, updated_at timestamptz DEFAULT now() NOT NULL, CONSTRAINT ai_user_agent_pkey PRIMARY KEY (id), CONSTRAINT fk_ai_user_agent_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE);
CREATE INDEX idx_ai_user_agent_metadata ON public.ai_user_agent USING gin (personality);
CREATE INDEX idx_ai_user_agent_user_id ON public.ai_user_agent USING btree (user_id);

-- Table Triggers

create trigger trg_ai_user_agent_updated_at before
update
    on
    public.ai_user_agent for each row execute function update_updated_at_column();

-- Permissions

ALTER TABLE ai_user_agent OWNER TO avnadmin;
GRANT ALL ON TABLE ai_user_agent TO avnadmin;


-- ----------------------------------------------------------------------------
-- TABELA: jobs
-- ----------------------------------------------------------------------------
-- Armazena informações sobre jobs assíncronos executados em background.
-- Usado para operações demoradas como backups, exports de dados, etc.
-- O frontend pode consultar o status e progresso via polling.
--
-- Relacionamentos:
--   user_id → users.user_id (sem CASCADE)
--
-- Colunas:
--   job_id       (PK, uuid)           : ID único do job
--   type         (varchar(50))        : Tipo do job (backup_export, data_import, etc.)
--   status       (varchar(20))        : Status: 'pending', 'processing', 'completed', 'failed'
--   created_at   (timestamp)          : Data de criação do job
--   started_at   (timestamp, NULL)    : Quando a execução começou
--   completed_at (timestamp, NULL)    : Quando a execução terminou
--   progress     (int4)               : Progresso de 0 a 100 (porcentagem)
--   error        (text, NULL)         : Mensagem de erro (se status = 'failed')
--   result       (jsonb, NULL)        : Resultado do job em formato JSON
--   metadata     (jsonb, NULL)        : Metadados adicionais (parâmetros de entrada, etc.)
--   user_id      (uuid, FK, NOT NULL) : Usuário que solicitou o job
--
-- Índices:
--   idx_jobs_created_at : Ordenação cronológica
--   idx_jobs_status     : Filtro por status (buscar jobs pendentes, etc.)
-- ----------------------------------------------------------------------------
-- DROP TABLE jobs;

CREATE TABLE jobs ( job_id uuid DEFAULT uuid_generate_v4() NOT NULL, "type" varchar(50) NOT NULL, status varchar(20) DEFAULT 'pending'::character varying NOT NULL, created_at timestamp DEFAULT now() NULL, started_at timestamp NULL, completed_at timestamp NULL, progress int4 DEFAULT 0 NULL, "error" text NULL, "result" jsonb NULL, metadata jsonb NULL, user_id uuid NOT NULL, CONSTRAINT jobs_pkey PRIMARY KEY (job_id), CONSTRAINT jobs_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(user_id));
CREATE INDEX idx_jobs_created_at ON public.jobs USING btree (created_at);
CREATE INDEX idx_jobs_status ON public.jobs USING btree (status);
COMMENT ON TABLE public.jobs IS 'Armazena informações sobre jobs assíncronos (backups, exports, etc)';

-- Column comments

COMMENT ON COLUMN public.jobs.job_id IS 'ID único do job';
COMMENT ON COLUMN public.jobs."type" IS 'Tipo do job (backup_export, etc)';
COMMENT ON COLUMN public.jobs.status IS 'Status: pending, processing, completed, failed';
COMMENT ON COLUMN public.jobs.progress IS 'Progresso de 0 a 100';
COMMENT ON COLUMN public.jobs."result" IS 'Resultado do job em formato JSON';
COMMENT ON COLUMN public.jobs.metadata IS 'Metadados adicionais em formato JSON';

-- Permissions

ALTER TABLE jobs OWNER TO avnadmin;
GRANT ALL ON TABLE jobs TO avnadmin;


-- ============================================================================
-- 6. TABELAS DE ORGANIZAÇÕES
-- ============================================================================
-- Organizações são workspaces compartilhados que agrupam usuários, projetos
-- e notas. Possuem membros com papéis definidos e sistema de convites.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- TABELA: organizations
-- ----------------------------------------------------------------------------
-- Organizações/workspaces da plataforma. Cada organização é criada por um
-- usuário e pode ter múltiplos membros, projetos e notas.
--
-- Relacionamentos:
--   user_id → users.user_id (ON DELETE CASCADE) - criador/dono da org
--   plan_id → plans.plan_id - plano da organização
--   Referenciada por: organizations_areas, organizations_members,
--     invite_org_members, projects, notes, plans_usage
--
-- Colunas:
--   id                   (PK, uuid)       : ID único da organização
--   org_name             (varchar(50))    : Nome de exibição (padrão: 'New Organization')
--   unique_name          (varchar(30))    : Nome único/slug da organização
--   logo_url             (varchar, NULL)  : URL do logo (S3/Spaces)
--   banner_url           (varchar, NULL)  : URL do banner (S3/Spaces)
--   description          (text, NULL)     : Descrição da organização
--   basic_properties     (jsonb)          : Propriedades básicas em JSON
--   created_at           (timestamptz)    : Data de criação
--   updated_at           (timestamptz)    : Última atualização
--   deleted              (bool)           : Soft delete
--   org_domains          (text[])         : Domínios de email associados
--   settings             (jsonb)          : Configurações da organização
--   plan                 (jsonb)          : Dados do plano (cache/snapshot)
--   address              (jsonb, NULL)    : Endereço da organização
--   user_id              (uuid, FK)       : Criador/dono da organização
--   delete_at            (timestamptz, NULL): Data programada para exclusão
--   deleted_by           (uuid, NULL)     : Quem solicitou a exclusão
--   plan_id              (uuid, FK)       : Plano ativo (padrão: plano free)
--   branding_properties  (jsonb, NULL)    : Configurações de branding (cores, fontes)
--   integrations         (jsonb, NULL)    : Configurações de integrações externas
-- ----------------------------------------------------------------------------
-- DROP TABLE organizations;

CREATE TABLE organizations ( id uuid DEFAULT uuid_generate_v4() NOT NULL, org_name varchar(50) DEFAULT 'New Organization'::text NOT NULL, unique_name varchar(30) NOT NULL, logo_url varchar NULL, banner_url varchar NULL, description text DEFAULT 'Type description here...'::text NULL, basic_properties jsonb DEFAULT '{}'::jsonb NOT NULL, created_at timestamptz DEFAULT now() NOT NULL, updated_at timestamptz DEFAULT now() NOT NULL, deleted bool DEFAULT false NOT NULL, org_domains _text NULL, settings jsonb DEFAULT '{}'::jsonb NOT NULL, "plan" jsonb DEFAULT '{}'::jsonb NOT NULL, address jsonb DEFAULT '{}'::jsonb NULL, user_id uuid NOT NULL, delete_at timestamptz NULL, deleted_by uuid NULL, plan_id uuid DEFAULT '4227a4fe-11bd-4a73-a78a-334543076891'::uuid NOT NULL, branding_properties jsonb DEFAULT '{}'::jsonb NULL, integrations jsonb DEFAULT '{}'::jsonb NULL, CONSTRAINT organizations_pkey PRIMARY KEY (id), CONSTRAINT fk_organizations_user_id FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE, CONSTRAINT org_plan_id_fkey FOREIGN KEY (plan_id) REFERENCES "plans"(plan_id));

-- Column comments

COMMENT ON COLUMN public.organizations.plan_id IS 'By pattern, free plan id';

-- Permissions

ALTER TABLE organizations OWNER TO avnadmin;
GRANT ALL ON TABLE organizations TO avnadmin;


-- ----------------------------------------------------------------------------
-- TABELA: organizations_areas
-- ----------------------------------------------------------------------------
-- Áreas/departamentos dentro de uma organização.
-- Permite segmentar a organização em divisões lógicas.
--
-- Relacionamentos:
--   organization_id → organizations.id (ON DELETE CASCADE, ON UPDATE CASCADE)
--   created_by → users.user_id (ON DELETE CASCADE, ON UPDATE CASCADE)
--
-- Colunas:
--   id              (PK, uuid)           : ID único da área
--   organization_id (uuid, FK, NOT NULL) : Organização à qual pertence
--   area_name       (text)               : Nome da área/departamento
--   active          (bool)               : Se a área está ativa
--   created_at      (timestamp)          : Data de criação
--   updated_at      (timestamp)          : Última atualização
--   description     (text, NULL)         : Descrição da área
--   properties      (jsonb)              : Propriedades customizáveis em JSON
--   deleted         (bool)               : Soft delete
--   created_by      (uuid, FK)           : Usuário que criou a área
-- ----------------------------------------------------------------------------
-- DROP TABLE organizations_areas;

CREATE TABLE organizations_areas ( id uuid DEFAULT uuid_generate_v4() NOT NULL, organization_id uuid NOT NULL, area_name text NOT NULL, active bool DEFAULT true NOT NULL, created_at timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL, updated_at timestamp NOT NULL, description text DEFAULT 'Area description here'::text NULL, properties jsonb DEFAULT '{}'::jsonb NOT NULL, deleted bool DEFAULT false NOT NULL, created_by uuid NOT NULL, CONSTRAINT organizations_areas_pk PRIMARY KEY (id), CONSTRAINT organizations_areas_org_id_fk FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE ON UPDATE CASCADE, CONSTRAINT organizations_areas_user_creator_id_fk FOREIGN KEY (created_by) REFERENCES users(user_id) ON DELETE CASCADE ON UPDATE CASCADE);

-- Permissions

ALTER TABLE organizations_areas OWNER TO avnadmin;
GRANT ALL ON TABLE organizations_areas TO avnadmin;


-- ----------------------------------------------------------------------------
-- TABELA: organizations_members
-- ----------------------------------------------------------------------------
-- Membros de uma organização com seus respectivos papéis.
-- Controla acesso e permissões dentro de cada organização.
-- Constraint UNIQUE garante que um usuário não pode ser membro duplicado.
--
-- Relacionamentos:
--   org_id  → organizations.id (ON DELETE CASCADE)
--   user_id → users.user_id (ON DELETE CASCADE)
--
-- Colunas:
--   id         (PK, uuid)           : ID único do registro de membro
--   org_id     (uuid, FK, NOT NULL) : Organização
--   user_id    (uuid, FK, NOT NULL) : Usuário membro
--   role       (user_role)          : Papel na org (admin, super_admin, member, guest)
--   status     (varchar(50))        : Status do membro (padrão: 'active')
--   created_at (timestamp)          : Data de entrada na organização
--   updated_at (timestamp, NULL)    : Última atualização (auto-update via trigger)
--   invited_by (uuid, NOT NULL)     : Quem convidou este membro
--   deleted    (bool)               : Soft delete
--   suspended  (bool)               : Se o membro está suspenso
--
-- Constraints:
--   uq_organization_user : Um usuário só pode ser membro uma vez por org
--
-- Índices:
--   idx_org_members_org_id  : Busca membros de uma org
--   idx_org_members_user_id : Busca organizações de um usuário
--
-- Triggers:
--   update_organizations_members_modtime : Atualiza updated_at automaticamente
-- ----------------------------------------------------------------------------
-- DROP TABLE organizations_members;

CREATE TABLE organizations_members ( id uuid DEFAULT uuid_generate_v4() NOT NULL, org_id uuid NOT NULL, user_id uuid NOT NULL, "role" public."user_role" NOT NULL, status varchar(50) DEFAULT 'active'::character varying NOT NULL, created_at timestamp DEFAULT now() NOT NULL, updated_at timestamp NULL, invited_by uuid NOT NULL, deleted bool DEFAULT false NOT NULL, suspended bool DEFAULT false NOT NULL, CONSTRAINT organizations_members_pkey PRIMARY KEY (id), CONSTRAINT uq_organization_user UNIQUE (org_id, user_id), CONSTRAINT fk_organization FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE, CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE);
CREATE INDEX idx_org_members_org_id ON public.organizations_members USING btree (org_id);
CREATE INDEX idx_org_members_user_id ON public.organizations_members USING btree (user_id);

-- Table Triggers

create trigger update_organizations_members_modtime before
update
    on
    public.organizations_members for each row execute function update_updated_at_column();

-- Permissions

ALTER TABLE organizations_members OWNER TO avnadmin;
GRANT ALL ON TABLE organizations_members TO avnadmin;


-- ----------------------------------------------------------------------------
-- TABELA: teams
-- ----------------------------------------------------------------------------
-- Equipes dentro de uma organização.
-- Agrupamento de usuários para facilitar distribuição de tarefas e permissões.
--
-- Relacionamentos:
--   org_id     → organizations.id (ON DELETE CASCADE)
--   created_by → users.user_id
-- ----------------------------------------------------------------------------
-- DROP TABLE teams;

CREATE TABLE teams ( id uuid DEFAULT uuid_generate_v4() NOT NULL, org_id uuid NOT NULL, created_by uuid NOT NULL, "name" varchar(255) NOT NULL, description text NULL, created_at timestamptz DEFAULT now() NOT NULL, updated_at timestamptz DEFAULT now() NOT NULL, deleted bool DEFAULT false NOT NULL, CONSTRAINT teams_pkey PRIMARY KEY (id), CONSTRAINT fk_teams_creator FOREIGN KEY (created_by) REFERENCES users(user_id), CONSTRAINT fk_teams_organization FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE);
CREATE INDEX idx_teams_org_id ON public.teams USING btree (org_id);

-- Permissions

ALTER TABLE teams OWNER TO avnadmin;
GRANT ALL ON TABLE teams TO avnadmin;


-- ----------------------------------------------------------------------------
-- TABELA: teams_members
-- ----------------------------------------------------------------------------
-- Membros de uma equipe.
--
-- Relacionamentos:
--   team_id → teams.id (ON DELETE CASCADE)
--   user_id → users.user_id (ON DELETE CASCADE)
-- ----------------------------------------------------------------------------
-- DROP TABLE teams_members;

CREATE TABLE teams_members ( id uuid DEFAULT uuid_generate_v4() NOT NULL, team_id uuid NOT NULL, user_id uuid NOT NULL, "role" public."user_role" DEFAULT 'member'::user_role NOT NULL, added_at timestamptz DEFAULT now() NOT NULL, CONSTRAINT teams_members_pkey PRIMARY KEY (id), CONSTRAINT uq_team_user UNIQUE (team_id, user_id), CONSTRAINT fk_tm_team FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE, CONSTRAINT fk_tm_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE);
CREATE INDEX idx_tm_team_id ON public.teams_members USING btree (team_id);
CREATE INDEX idx_tm_user_id ON public.teams_members USING btree (user_id);

-- Permissions

ALTER TABLE teams_members OWNER TO avnadmin;
GRANT ALL ON TABLE teams_members TO avnadmin;


-- ----------------------------------------------------------------------------
-- TABELA: plans_usage
-- ----------------------------------------------------------------------------
-- Rastreia o uso atual do plano para cada usuário ou organização.
-- Os contadores mensais (usage_details) são resetados a cada ciclo.
-- Estatísticas de toda a vida útil são mantidas em lifetime_stats.
--
-- Relacionamentos:
--   plan_id → plans.plan_id
--   user_id → users.user_id (NULL se for uso de org)
--   org_id  → organizations.id (NULL se for uso pessoal)
--   Referenciada por: plan_usage_history
--
-- Colunas:
--   id                    (PK, uuid)         : ID único do registro de uso
--   plan_id               (uuid, FK)         : Plano associado
--   client_type           (text)             : Tipo de cliente ('user' ou 'organization')
--   user_id               (uuid, FK, NULL)   : Usuário (se uso pessoal)
--   org_id                (uuid, FK, NULL)   : Organização (se uso organizacional)
--   usage_details         (jsonb)            : Dados do ciclo mensal atual (reseta todo mês)
--   created_at            (timestamp)        : Data de criação
--   updated_at            (timestamptz)      : Última atualização
--   last_reset_at         (timestamptz)      : Data da última vez que os contadores foram zerados
--   lifetime_stats        (jsonb)            : Estatísticas agregadas de toda a vida útil
--                                              (peak_usage_month, total_notes_ever,
--                                               first_activity_at, total_months_active,
--                                               total_projects_ever, total_storage_used_mb,
--                                               total_ai_messages_ever)
--   is_trial              (bool, NULL)       : Se está em período de teste
--   trial_ends_at         (timestamptz, NULL): Quando o trial expira
--   downgrade_scheduled_to(uuid, NULL)       : Plano para o qual será rebaixado
--   downgrade_effective_at(timestamptz, NULL): Quando o downgrade será efetivado
--   period_start          (timestamptz, NULL): Início do período de faturamento atual
--   period_end            (timestamptz, NULL): Fim do período de faturamento atual
-- ----------------------------------------------------------------------------
-- DROP TABLE plans_usage;

CREATE TABLE plans_usage ( id uuid DEFAULT uuid_generate_v4() NOT NULL, plan_id uuid NOT NULL, client_type text NOT NULL, user_id uuid NULL, org_id uuid NULL, usage_details jsonb DEFAULT '{}'::jsonb NULL, created_at timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL, updated_at timestamptz DEFAULT now() NOT NULL, last_reset_at timestamptz DEFAULT now() NULL, lifetime_stats jsonb DEFAULT '{"peak_usage_month": null, "total_notes_ever": 0, "first_activity_at": null, "total_months_active": 0, "total_projects_ever": 0, "total_storage_used_mb": 0, "total_ai_messages_ever": 0}'::jsonb NULL, is_trial bool DEFAULT false NULL, trial_ends_at timestamptz NULL, downgrade_scheduled_to uuid NULL, downgrade_effective_at timestamptz NULL, period_start timestamptz NULL, period_end timestamptz NULL, CONSTRAINT plans_usage_pkey PRIMARY KEY (id), CONSTRAINT fk_org_id FOREIGN KEY (org_id) REFERENCES organizations(id), CONSTRAINT fk_plan_usage_plan FOREIGN KEY (plan_id) REFERENCES "plans"(plan_id), CONSTRAINT fk_plan_usage_user FOREIGN KEY (user_id) REFERENCES users(user_id));

-- Column comments

COMMENT ON COLUMN public.plans_usage.usage_details IS 'Dados do ciclo mensal atual (reseta todo mês)';
COMMENT ON COLUMN public.plans_usage.last_reset_at IS 'Data da última vez que os contadores mensais foram zerados';
COMMENT ON COLUMN public.plans_usage.lifetime_stats IS 'Estatísticas agregadas de toda a vida útil do usuário';

-- Permissions

ALTER TABLE plans_usage OWNER TO avnadmin;
GRANT ALL ON TABLE plans_usage TO avnadmin;


-- ============================================================================
-- 8. TABELAS DE PROJETOS
-- ============================================================================
-- Projetos são contêineres que agrupam notas dentro de uma organização
-- ou para uso pessoal. Possuem membros com papéis e logs de auditoria.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- TABELA: projects
-- ----------------------------------------------------------------------------
-- Projetos que agrupam notas. Podem ser pessoais (apenas user_id) ou
-- pertencer a uma organização (user_id + org_id).
--
-- Relacionamentos:
--   user_id → users.user_id (ON DELETE CASCADE, ON UPDATE CASCADE) - criador
--   org_id  → organizations.id (ON DELETE CASCADE) - org (opcional)
--   Referenciada por: projects_logs, projects_members, notes
--
-- Colunas:
--   id          (PK, uuid)           : ID único do projeto
--   user_id     (uuid, FK, NOT NULL) : Criador/dono do projeto
--   title       (text)               : Título do projeto (padrão: 'The new project')
--   description (text, NULL)         : Descrição do projeto
--   properties  (jsonb, NULL)        : Propriedades customizáveis em JSON
--   status      (project_status)     : Status do projeto (padrão: 'open')
--   created_at  (timestamptz)        : Data de criação
--   updated_at  (timestamptz)        : Última atualização
--   deleted     (bool)               : Soft delete
--   org_id      (uuid, FK, NULL)     : Organização (se projeto organizacional)
--   active      (bool)               : Se o projeto está ativo
--   methodology (project_methodology): Metodologia (kanban, scrum, etc.)
--   default_view(project_view_type)  : Visualização padrão (board, list, etc.)
--   projects_files (jsonb)           : Arquivos anexados ao projeto
--   parent_project_id (uuid, FK)     : Projeto pai (para subprojetos)
-- ----------------------------------------------------------------------------
-- DROP TABLE projects;

CREATE TABLE projects ( id uuid DEFAULT uuid_generate_v4() NOT NULL, user_id uuid NOT NULL, title text DEFAULT 'The new project'::text NOT NULL, description text DEFAULT 'Type description here...'::text NULL, properties jsonb DEFAULT '{}'::jsonb NULL, status public."project_status" DEFAULT 'open'::project_status NOT NULL, created_at timestamptz DEFAULT now() NOT NULL, updated_at timestamptz DEFAULT now() NOT NULL, deleted bool DEFAULT false NOT NULL, org_id uuid NULL, active bool DEFAULT true NOT NULL, methodology public."project_methodology" DEFAULT 'kanban'::project_methodology NOT NULL, default_view public."project_view_type" DEFAULT 'board'::project_view_type NOT NULL, projects_files jsonb DEFAULT '{}'::jsonb NOT NULL, parent_project_id uuid NULL, CONSTRAINT projects_pkey PRIMARY KEY (id), CONSTRAINT fk_org_id FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE, CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE ON UPDATE CASCADE, CONSTRAINT parent_project_id_fk FOREIGN KEY (parent_project_id) REFERENCES projects(id) ON DELETE CASCADE);
CREATE INDEX idx_projects_org_active ON public.projects USING btree (org_id) WHERE ((deleted = false) AND (active = true));
CREATE INDEX idx_projects_parent_project_id ON public.projects USING btree (parent_project_id) WHERE (parent_project_id IS NOT NULL);
CREATE INDEX idx_projects_user_active ON public.projects USING btree (user_id) WHERE ((deleted = false) AND (active = true));

-- Permissions

ALTER TABLE projects OWNER TO avnadmin;
GRANT ALL ON TABLE projects TO avnadmin;


-- ----------------------------------------------------------------------------
-- TABELA: projects_logs
-- ----------------------------------------------------------------------------
-- Log de auditoria para operações em projetos.
-- Registra INSERT, UPDATE e DELETE com snapshots dos dados.
--
-- Relacionamentos:
--   project_id → projects.id (sem CASCADE - preserva logs)
--   user_id    → users.user_id (sem CASCADE)
--
-- Colunas:
--   log_id     (PK, uuid)           : ID único do log
--   project_id (uuid, FK, NOT NULL) : Projeto alterado
--   user_id    (uuid, FK, NULL)     : Usuário que fez a alteração
--   operation  (text, NOT NULL)     : Tipo de operação (INSERT, UPDATE, DELETE)
--   old_data   (jsonb, NULL)        : Dados antes da mudança
--   new_data   (jsonb, NULL)        : Dados depois da mudança
--   changed_at (timestamptz)        : Momento da alteração
--
-- Índices:
--   idx_projects_logs_changed_at  : Consultas por período
--   idx_projects_logs_project_id  : Busca por projeto
-- ----------------------------------------------------------------------------
-- DROP TABLE projects_logs;

CREATE TABLE projects_logs ( log_id uuid DEFAULT uuid_generate_v4() NOT NULL, project_id uuid NOT NULL, user_id uuid NULL, operation text NOT NULL, old_data jsonb NULL, new_data jsonb NULL, changed_at timestamptz DEFAULT now() NOT NULL, CONSTRAINT projects_logs_pkey PRIMARY KEY (log_id), CONSTRAINT fk_project_id FOREIGN KEY (project_id) REFERENCES projects(id), CONSTRAINT fk_user_id FOREIGN KEY (user_id) REFERENCES users(user_id));
CREATE INDEX idx_projects_logs_changed_at ON public.projects_logs USING btree (changed_at);
CREATE INDEX idx_projects_logs_project_id ON public.projects_logs USING btree (project_id);

-- Permissions

ALTER TABLE projects_logs OWNER TO avnadmin;
GRANT ALL ON TABLE projects_logs TO avnadmin;


-- ----------------------------------------------------------------------------
-- TABELA: projects_members
-- ----------------------------------------------------------------------------
-- Membros de um projeto com seus respectivos papéis.
-- Permite colaboração dentro de projetos com controle de acesso.
--
-- Relacionamentos:
--   project_id → projects.id (sem CASCADE)
--   user_id    → users.user_id (sem CASCADE)
--   added_by   → users.user_id (sem CASCADE) - quem adicionou o membro
--
-- Colunas:
--   id         (PK, uuid)           : ID único do registro
--   project_id (uuid, FK, NOT NULL) : Projeto
--   user_id    (uuid, FK, NOT NULL) : Usuário membro
--   role       (user_role)          : Papel no projeto (admin, member, guest, etc.)
--   deleted    (bool)               : Soft delete
--   suspended  (bool)               : Se o membro está suspenso
--   created_at (timestamptz)        : Data de adição ao projeto
--   updated_at (timestamptz)        : Última atualização
--   added_by   (uuid, FK)           : Quem adicionou este membro
-- ----------------------------------------------------------------------------
-- DROP TABLE projects_members;

CREATE TABLE projects_members ( id uuid DEFAULT uuid_generate_v4() NOT NULL, project_id uuid NOT NULL, user_id uuid NOT NULL, "role" public."user_role" NOT NULL, deleted bool DEFAULT false NOT NULL, suspended bool DEFAULT false NOT NULL, created_at timestamptz DEFAULT now() NOT NULL, updated_at timestamptz DEFAULT now() NOT NULL, added_by uuid NOT NULL, CONSTRAINT projects_members_pkey PRIMARY KEY (id), CONSTRAINT members_projects_fkey FOREIGN KEY (project_id) REFERENCES projects(id), CONSTRAINT projects_members_addedby_fkey FOREIGN KEY (added_by) REFERENCES users(user_id), CONSTRAINT projects_members_user_fkey FOREIGN KEY (user_id) REFERENCES users(user_id));

-- Permissions

ALTER TABLE projects_members OWNER TO avnadmin;
GRANT ALL ON TABLE projects_members TO avnadmin;


-- ----------------------------------------------------------------------------
-- TABELA: tokens
-- ----------------------------------------------------------------------------
-- Tokens temporários para operações seguras como reset de senha,
-- verificação de email, download de backup, etc.
-- Cada token tem um tipo (token_type_enum), expiração e flag de atividade.
--
-- Relacionamentos:
--   user_id → users.user_id (ON DELETE CASCADE, ON UPDATE CASCADE)
--
-- Colunas:
--   token_id       (PK, serial4)       : ID auto-incremental
--   user_id        (uuid, FK, NOT NULL): Usuário associado
--   token          (varchar(255))      : Valor do token (hash ou string aleatória)
--   type           (token_type_enum)   : Tipo do token
--   created_at     (timestamp)         : Quando foi criado
--   expires_at     (timestamp)         : Quando expira
--   active         (bool)              : Se o token ainda é válido
--   data_to_update (jsonb, NULL)       : Dados que serão aplicados ao usar o token
--                                        (ex: novo email para verificação)
--
-- Índices:
--   idx_token      : Busca rápida por valor de token
--   idx_user_token : Busca composta por user_id + type + active
-- ----------------------------------------------------------------------------
-- DROP TABLE tokens;

CREATE TABLE tokens ( token_id serial4 NOT NULL, user_id uuid NOT NULL, "token" varchar(255) NOT NULL, "type" public."token_type_enum" NOT NULL, created_at timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL, expires_at timestamp NOT NULL, active bool DEFAULT true NULL, data_to_update jsonb DEFAULT '{}'::jsonb NULL, CONSTRAINT tokens_pkey PRIMARY KEY (token_id), CONSTRAINT tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE ON UPDATE CASCADE);
CREATE INDEX idx_token ON public.tokens USING btree (token);
CREATE INDEX idx_user_token ON public.tokens USING btree (user_id, type, active);

-- Permissions

ALTER TABLE tokens OWNER TO avnadmin;
GRANT ALL ON TABLE tokens TO avnadmin;


-- ----------------------------------------------------------------------------
-- TABELA: user_oauth_tokens
-- ----------------------------------------------------------------------------
-- Tokens de autenticação OAuth (Google, GitHub, etc.) dos usuários.
-- Armazena access_token e refresh_token para integrações.
--
-- Relacionamentos:
--   user_id → users.user_id (ON DELETE CASCADE, ON UPDATE CASCADE)
-- ----------------------------------------------------------------------------
-- DROP TABLE user_oauth_tokens;

CREATE TABLE user_oauth_tokens ( id uuid DEFAULT uuid_generate_v4() NOT NULL, user_id uuid NOT NULL, provider varchar(50) DEFAULT 'google'::character varying NULL, access_token text NOT NULL, refresh_token text NULL, expires_at timestamptz NULL, created_at timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL, updated_at timestamptz DEFAULT now() NULL, deleted bool DEFAULT false NOT NULL, CONSTRAINT user_oauth_tokens_pkey PRIMARY KEY (id), CONSTRAINT "user_oauth_tokens_userId_fk" FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE ON UPDATE CASCADE);

-- Permissions

ALTER TABLE user_oauth_tokens OWNER TO avnadmin;
GRANT ALL ON TABLE user_oauth_tokens TO avnadmin;


-- ----------------------------------------------------------------------------
-- TABELA: google_calendar_webhooks
-- ----------------------------------------------------------------------------
-- Webhooks para integração com Google Calendar.
-- Armazena identificadores de canal e expiração para sincronização.
--
-- Relacionamentos:
--   user_id → users.user_id
-- ----------------------------------------------------------------------------
-- DROP TABLE google_calendar_webhooks;

CREATE TABLE google_calendar_webhooks ( id uuid DEFAULT gen_random_uuid() NOT NULL, user_id uuid NOT NULL, calendar_id varchar(255) NOT NULL, channel_id uuid NOT NULL, resource_id varchar(255) NULL, sync_token varchar(255) NULL, expires_at timestamptz NULL, is_active bool DEFAULT true NOT NULL, created_at timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL, updated_at timestamptz DEFAULT now() NOT NULL, deleted bool DEFAULT false NOT NULL, CONSTRAINT google_calendar_webhooks_pkey PRIMARY KEY (id), CONSTRAINT google_calendar_webhooks_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(user_id));

-- Permissions

ALTER TABLE google_calendar_webhooks OWNER TO avnadmin;
GRANT ALL ON TABLE google_calendar_webhooks TO avnadmin;


-- ============================================================================
-- 10. TABELAS DE IA (MENSAGENS E AÇÕES)
-- ============================================================================
-- Tabelas que armazenam interações entre usuários e o sistema de IA,
-- incluindo mensagens de chat e ações executadas pelo agente.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- TABELA: ai_agent_actions
-- ----------------------------------------------------------------------------
-- Histórico de ações executadas pelo agente de IA em nome do usuário.
-- Registra operações como criação de notas, atualização de projetos, etc.
-- Cada ação tem status de execução e dados de entrada/saída.
--
-- Relacionamentos:
--   user_id    → users.user_id (ON DELETE CASCADE)
--   session_id → ai_chat_sessions.id (ON DELETE SET NULL)
--
-- Colunas:
--   id            (PK, uuid)           : ID único da ação
--   user_id       (uuid, FK, NOT NULL) : Usuário que solicitou a ação
--   session_id    (uuid, FK, NULL)     : Sessão de chat onde a ação foi iniciada
--   action_type   (varchar(50))        : Tipo de ação (create_note, update_project, etc.)
--   status        (varchar(20))        : 'pending' (em andamento), 'success', 'failed'
--   input_data    (jsonb, NOT NULL)    : Dados de entrada fornecidos para a ação
--   output_data   (jsonb, NULL)        : Resultado da execução da ação
--   error_message (text, NULL)         : Mensagem de erro (se status = 'failed')
--   entity_type   (varchar(50), NULL)  : Tipo da entidade afetada (note, project, etc.)
--   entity_id     (uuid, NULL)         : ID da entidade afetada
--   model         (varchar(50))        : Modelo de IA usado (gemini, etc.)
--   created_at    (timestamptz)        : Momento de criação
--   completed_at  (timestamptz, NULL)  : Momento de conclusão
--
-- Constraints:
--   ai_agent_actions_status_check : status IN ('pending', 'success', 'failed')
--
-- Índices:
--   idx_agent_actions_action_type : Filtro por tipo de ação
--   idx_agent_actions_created_at  : Ordenação cronológica (DESC)
--   idx_agent_actions_entity      : Busca por entidade (type + id)
--   idx_agent_actions_session_id  : Busca por sessão
--   idx_agent_actions_status      : Filtro por status
--   idx_agent_actions_user_id     : Busca por usuário
-- ----------------------------------------------------------------------------
-- DROP TABLE ai_agent_actions;

CREATE TABLE ai_agent_actions ( id uuid DEFAULT uuid_generate_v4() NOT NULL, user_id uuid NOT NULL, session_id uuid NULL, action_type varchar(50) NOT NULL, status varchar(20) DEFAULT 'pending'::character varying NOT NULL, input_data jsonb NOT NULL, output_data jsonb DEFAULT '{}'::jsonb NULL, error_message text NULL, entity_type varchar(50) NULL, entity_id uuid NULL, model varchar(50) NOT NULL, created_at timestamptz DEFAULT now() NOT NULL, completed_at timestamptz NULL, CONSTRAINT ai_agent_actions_pkey PRIMARY KEY (id), CONSTRAINT ai_agent_actions_status_check CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'success'::character varying, 'failed'::character varying])::text[]))), CONSTRAINT ai_agent_actions_session_id_fkey FOREIGN KEY (session_id) REFERENCES ai_chat_sessions(id) ON DELETE SET NULL, CONSTRAINT ai_agent_actions_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE, CONSTRAINT fk_agent_action_session FOREIGN KEY (session_id) REFERENCES ai_chat_sessions(id) ON DELETE SET NULL, CONSTRAINT fk_agent_action_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE);
CREATE INDEX idx_agent_actions_action_type ON public.ai_agent_actions USING btree (action_type);
CREATE INDEX idx_agent_actions_created_at ON public.ai_agent_actions USING btree (created_at DESC);
CREATE INDEX idx_agent_actions_entity ON public.ai_agent_actions USING btree (entity_type, entity_id);
CREATE INDEX idx_agent_actions_session_id ON public.ai_agent_actions USING btree (session_id);
CREATE INDEX idx_agent_actions_status ON public.ai_agent_actions USING btree (status);
CREATE INDEX idx_agent_actions_user_id ON public.ai_agent_actions USING btree (user_id);
COMMENT ON TABLE public.ai_agent_actions IS 'Histórico de ações executadas pelo agente de IA';

-- Column comments

COMMENT ON COLUMN public.ai_agent_actions.action_type IS 'Tipo de ação: create_note, update_project, etc';
COMMENT ON COLUMN public.ai_agent_actions.status IS 'pending: em andamento, success: concluída, failed: falhou';
COMMENT ON COLUMN public.ai_agent_actions.input_data IS 'Dados de entrada fornecidos para a ação';
COMMENT ON COLUMN public.ai_agent_actions.output_data IS 'Resultado da execução da ação';

-- Permissions

ALTER TABLE ai_agent_actions OWNER TO avnadmin;
GRANT ALL ON TABLE ai_agent_actions TO avnadmin;


-- ----------------------------------------------------------------------------
-- TABELA: ai_chat_messages
-- ----------------------------------------------------------------------------
-- Mensagens trocadas entre usuário e IA nas sessões de chat.
-- Cada mensagem pertence a uma sessão e tem um papel (user ou assistant).
--
-- Relacionamentos:
--   session_id → ai_chat_sessions.id (ON DELETE CASCADE)
--   user_id    → users.user_id (ON DELETE CASCADE)
--
-- Colunas:
--   id         (PK, uuid)           : ID único da mensagem
--   session_id (uuid, FK, NOT NULL) : Sessão de chat
--   user_id    (uuid, FK, NOT NULL) : Usuário participante
--   role       (varchar(20))        : 'user' (mensagem do usuário) ou 'assistant' (resposta da IA)
--   content    (text)               : Conteúdo textual da mensagem
--   model      (varchar(50))        : Modelo de IA usado (gemini, perplexity, etc.)
--   metadata   (jsonb, NULL)        : Dados adicionais: citações, contexto, tokens usados, etc.
--   created_at (timestamptz)        : Momento de criação
--
-- Constraints:
--   ai_chat_messages_role_check : role IN ('user', 'assistant')
--
-- Índices:
--   idx_chat_messages_session_id : Busca mensagens de uma sessão
--   idx_chat_messages_user_id    : Busca mensagens de um usuário
-- ----------------------------------------------------------------------------
-- DROP TABLE ai_chat_messages;

CREATE TABLE ai_chat_messages ( id uuid DEFAULT uuid_generate_v4() NOT NULL, session_id uuid NOT NULL, user_id uuid NOT NULL, "role" varchar(20) NOT NULL, "content" text NOT NULL, model varchar(50) NOT NULL, metadata jsonb DEFAULT '{}'::jsonb NULL, created_at timestamptz DEFAULT now() NOT NULL, CONSTRAINT ai_chat_messages_pkey PRIMARY KEY (id), CONSTRAINT ai_chat_messages_role_check CHECK (((role)::text = ANY ((ARRAY['user'::character varying, 'assistant'::character varying])::text[]))), CONSTRAINT ai_chat_messages_session_id_fkey FOREIGN KEY (session_id) REFERENCES ai_chat_sessions(id) ON DELETE CASCADE, CONSTRAINT ai_chat_messages_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE, CONSTRAINT fk_chat_message_session FOREIGN KEY (session_id) REFERENCES ai_chat_sessions(id) ON DELETE CASCADE, CONSTRAINT fk_chat_message_user FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE);
CREATE INDEX idx_chat_messages_session_id ON public.ai_chat_messages USING btree (session_id);
CREATE INDEX idx_chat_messages_user_id ON public.ai_chat_messages USING btree (user_id);
COMMENT ON TABLE public.ai_chat_messages IS 'Mensagens trocadas entre usuário e IA';

-- Column comments

COMMENT ON COLUMN public.ai_chat_messages."role" IS 'user: mensagem do usuário, assistant: resposta da IA';
COMMENT ON COLUMN public.ai_chat_messages.model IS 'Modelo de IA usado: gemini, perplexity, etc';
COMMENT ON COLUMN public.ai_chat_messages.metadata IS 'Dados adicionais: citações, contexto, etc';

-- Permissions

ALTER TABLE ai_chat_messages OWNER TO avnadmin;
GRANT ALL ON TABLE ai_chat_messages TO avnadmin;


-- ----------------------------------------------------------------------------
-- TABELA: invite_org_members
-- ----------------------------------------------------------------------------
-- Convites pendentes para novos membros de organizações.
-- O convite é enviado por email e pode ser aceito ou expirar.
--
-- Relacionamentos:
--   org_id     → organizations.id (ON DELETE CASCADE)
--   invited_by → users.user_id (ON DELETE SET NULL)
--
-- Colunas:
--   invite_id       (PK, uuid)          : ID único do convite
--   org_id          (uuid, FK, NOT NULL): Organização
--   name            (varchar(255), NULL): Nome do convidado (se conhecido)
--   email           (varchar(255))      : Email do usuário convidado
--   username        (varchar(255), NULL): Username do convidado (se conhecido)
--   role            (varchar(50))       : Papel que o usuário terá (owner, admin, member, viewer)
--   invite_verified (bool)              : Se o convite foi aceito/verificado
--   deleted         (bool)              : Soft delete
--   invited_by      (uuid, FK)          : Usuário que enviou o convite
--   expires_at      (timestamp, NULL)   : Data de expiração do convite
--   created_at      (timestamp)         : Data de criação
--   updated_at      (timestamp)         : Última atualização (auto-update via trigger)
--
-- Constraints:
--   check_valid_role : role IN ('owner', 'admin', 'member', 'viewer')
--
-- Índices:
--   idx_invite_org_members_active   : Busca convites não deletados e não verificados
--   idx_invite_org_members_email    : Busca por email
--   idx_invite_org_members_org_id   : Busca por organização
--   idx_invite_org_members_verified : Filtro por status de verificação
--
-- Triggers:
--   trigger_update_invite_org_members_updated_at : Auto-update de updated_at
-- ----------------------------------------------------------------------------
-- DROP TABLE invite_org_members;

CREATE TABLE invite_org_members ( invite_id uuid DEFAULT uuid_generate_v4() NOT NULL, org_id uuid NOT NULL, "name" varchar(255) NULL, email varchar(255) NOT NULL, username varchar(255) NULL, "role" varchar(50) DEFAULT 'member'::character varying NOT NULL, invite_verified bool DEFAULT false NOT NULL, deleted bool DEFAULT false NOT NULL, invited_by uuid NOT NULL, expires_at timestamp NULL, created_at timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL, updated_at timestamp DEFAULT CURRENT_TIMESTAMP NULL, CONSTRAINT check_valid_role CHECK (((role)::text = ANY ((ARRAY['owner'::character varying, 'admin'::character varying, 'member'::character varying, 'viewer'::character varying])::text[]))), CONSTRAINT invite_org_members_pkey PRIMARY KEY (invite_id), CONSTRAINT fk_invite_org FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE, CONSTRAINT fk_invited_by FOREIGN KEY (invited_by) REFERENCES users(user_id) ON DELETE SET NULL);
CREATE INDEX idx_invite_org_members_active ON public.invite_org_members USING btree (deleted, invite_verified);
CREATE INDEX idx_invite_org_members_email ON public.invite_org_members USING btree (email);
CREATE INDEX idx_invite_org_members_org_id ON public.invite_org_members USING btree (org_id);
CREATE INDEX idx_invite_org_members_verified ON public.invite_org_members USING btree (invite_verified);
COMMENT ON TABLE public.invite_org_members IS 'Armazena convites pendentes para membros de organização';

-- Column comments

COMMENT ON COLUMN public.invite_org_members.invite_id IS 'ID único do convite';
COMMENT ON COLUMN public.invite_org_members.org_id IS 'ID da organização';
COMMENT ON COLUMN public.invite_org_members.email IS 'Email do usuário convidado';
COMMENT ON COLUMN public.invite_org_members."role" IS 'Papel que o usuário terá na organização';
COMMENT ON COLUMN public.invite_org_members.invite_verified IS 'Se o convite foi aceito/verificado';
COMMENT ON COLUMN public.invite_org_members.invited_by IS 'ID do usuário que enviou o convite';
COMMENT ON COLUMN public.invite_org_members.expires_at IS 'Data de expiração do convite';

-- Table Triggers

create trigger trigger_update_invite_org_members_updated_at before
update
    on
    public.invite_org_members for each row execute function update_invite_org_members_updated_at();

-- Permissions

ALTER TABLE invite_org_members OWNER TO avnadmin;
GRANT ALL ON TABLE invite_org_members TO avnadmin;


-- ============================================================================
-- 9. TABELAS DE NOTAS E CONTEÚDO
-- ============================================================================
-- Notas são o recurso principal do Weave Notes. Cada nota pode conter
-- múltiplos blocos de conteúdo (editor block-based) e ter colaboradores.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- TABELA: notes
-- ----------------------------------------------------------------------------
-- Notas dos usuários - recurso central da aplicação.
-- Cada nota pertence a um usuário e opcionalmente a um projeto e/ou org.
-- O conteúdo é armazenado na tabela blocks (editor block-based).
--
-- Relacionamentos:
--   user_id    → users.user_id (ON DELETE CASCADE)
--   project_id → projects.id (ON DELETE CASCADE)
--   org_id     → organizations.id (ON DELETE CASCADE)
--   Referenciada por: blocks, note_collaborators, note_collaborators_logs
--
-- Colunas:
--   id          (PK, uuid)           : ID único da nota
--   user_id     (uuid, FK, NOT NULL) : Dono da nota
--   title       (text)               : Título (padrão: 'Set note title')
--   description (text, NULL)         : Descrição/resumo da nota
--   tags        (text[], NULL)       : Array de tags para categorização
--   deleted     (bool)               : Soft delete
--   created_at  (timestamptz)        : Data de criação
--   updated_at  (timestamptz)        : Última atualização
--   properties  (jsonb, NULL)        : Propriedades customizáveis (cor, ícone, etc.)
--   project_id  (uuid, FK, NULL)     : Projeto ao qual pertence (opcional)
--   org_id      (uuid, FK, NULL)     : Organização (opcional)
--   deleted_at  (timestamptz, NULL)  : Data de exclusão (para lixeira com prazo)
--   status      (notes_status, NULL) : Status: 'archived', 'visible', 'secure'
--
-- Índices:
--   idx_notes_user : Busca notas de um usuário
-- ----------------------------------------------------------------------------
-- DROP TABLE notes;

CREATE TABLE notes ( id uuid DEFAULT uuid_generate_v4() NOT NULL, user_id uuid NOT NULL, title text DEFAULT 'Set note title'::text NOT NULL, description text DEFAULT 'Write note description here'::text NULL, tags _text NULL, deleted bool DEFAULT false NULL, created_at timestamptz DEFAULT now() NOT NULL, updated_at timestamptz DEFAULT now() NOT NULL, properties jsonb DEFAULT '{}'::jsonb NULL, project_id uuid NULL, org_id uuid NULL, deleted_at timestamptz(6) NULL, status public."notes_status" NULL, CONSTRAINT notes_pkey PRIMARY KEY (id), CONSTRAINT notes_org_id_fkey FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE, CONSTRAINT notes_project_id_fkey FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE, CONSTRAINT notes_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE);
CREATE INDEX idx_notes_user ON public.notes USING btree (user_id);

-- Permissions

ALTER TABLE notes OWNER TO avnadmin;
GRANT ALL ON TABLE notes TO avnadmin;


-- ----------------------------------------------------------------------------
-- TABELA: plan_usage_history
-- ----------------------------------------------------------------------------
-- Snapshots mensais de uso salvos ao final de cada ciclo de faturamento.
-- Permite análise histórica de consumo e geração de relatórios.
--
-- Relacionamentos:
--   plan_usage_id → plans_usage.id (ON DELETE CASCADE)
--
-- Colunas:
--   id                    (PK, uuid)         : ID único do registro
--   plan_usage_id         (uuid, FK)         : Referência ao registro de uso ativo
--   user_id               (uuid, NOT NULL)   : Usuário
--   org_id                (uuid, NULL)       : Organização (se aplicável)
--   plan_id               (uuid, NOT NULL)   : Plano que estava ativo no período
--   period_start          (timestamptz)      : Início do período
--   period_end            (timestamptz)      : Fim do período
--   final_usage_details   (jsonb, NOT NULL)  : Snapshot completo dos dados de uso
--   total_notes_created   (int4)             : Total de notas criadas no período
--   total_projects_created(int4)             : Total de projetos criados no período
--   total_ai_messages     (int4)             : Total de mensagens de IA no período
--   total_storage_mb      (numeric(10,2))    : Armazenamento usado em MB
--   total_exports         (int4)             : Total de exportações no período
--   created_at            (timestamptz)      : Quando o snapshot foi salvo
--
-- Índices:
--   idx_usage_history_period     : Busca por período (DESC)
--   idx_usage_history_plan_usage : Busca por registro de uso
--   idx_usage_history_user       : Busca por usuário
-- ----------------------------------------------------------------------------
-- DROP TABLE plan_usage_history;

CREATE TABLE plan_usage_history ( id uuid DEFAULT uuid_generate_v4() NOT NULL, plan_usage_id uuid NOT NULL, user_id uuid NOT NULL, org_id uuid NULL, plan_id uuid NOT NULL, period_start timestamptz NOT NULL, period_end timestamptz NOT NULL, final_usage_details jsonb NOT NULL, total_notes_created int4 DEFAULT 0 NULL, total_projects_created int4 DEFAULT 0 NULL, total_ai_messages int4 DEFAULT 0 NULL, total_storage_mb numeric(10, 2) DEFAULT 0 NULL, total_exports int4 DEFAULT 0 NULL, created_at timestamptz DEFAULT now() NULL, CONSTRAINT plan_usage_history_pkey PRIMARY KEY (id), CONSTRAINT fk_plan_usage FOREIGN KEY (plan_usage_id) REFERENCES plans_usage(id) ON DELETE CASCADE);
CREATE INDEX idx_usage_history_period ON public.plan_usage_history USING btree (period_end DESC);
CREATE INDEX idx_usage_history_plan_usage ON public.plan_usage_history USING btree (plan_usage_id);
CREATE INDEX idx_usage_history_user ON public.plan_usage_history USING btree (user_id);
COMMENT ON TABLE public.plan_usage_history IS 'Snapshots mensais de uso salvos ao final de cada ciclo';

-- Permissions

ALTER TABLE plan_usage_history OWNER TO avnadmin;
GRANT ALL ON TABLE plan_usage_history TO avnadmin;


-- ----------------------------------------------------------------------------
-- TABELA: blocks
-- ----------------------------------------------------------------------------
-- Blocos de conteúdo das notas - o editor usa arquitetura block-based.
-- Cada bloco é uma unidade de conteúdo (parágrafo, heading, todo, etc.)
-- Suporta hierarquia via parent_id (blocos aninhados).
--
-- Relacionamentos:
--   note_id   → notes.id (ON DELETE CASCADE)
--   user_id   → users.user_id (ON DELETE CASCADE)
--   parent_id → blocks.id (ON DELETE CASCADE) - auto-referência para aninhamento
--
-- Colunas:
--   id         (PK, uuid)           : ID único do bloco
--   note_id    (uuid, FK, NOT NULL) : Nota à qual pertence
--   user_id    (uuid, FK, NOT NULL) : Usuário que criou o bloco
--   parent_id  (uuid, FK, NULL)     : Bloco pai (para aninhamento)
--   type       (text, NULL)         : Tipo do bloco (ver constraint abaixo)
--   text       (text, NULL)         : Conteúdo textual do bloco
--   properties (jsonb, NULL)        : Propriedades específicas do tipo (cor, alinhamento, etc.)
--   done       (bool, NULL)         : Estado de conclusão (para blocos tipo 'todo')
--   deleted    (bool)               : Soft delete
--   position   (int4, NULL)         : Posição ordinal dentro da nota/bloco pai
--   created_at (timestamptz)        : Data de criação
--   updated_at (timestamptz)        : Última atualização
--
-- Constraints:
--   blocks_type_check : type IN ('text', 'todo', 'list', 'page', 'heading',
--                                'paragraph', 'quote', 'code')
-- ----------------------------------------------------------------------------
-- DROP TABLE blocks;

CREATE TABLE blocks ( id uuid DEFAULT uuid_generate_v4() NOT NULL, note_id uuid NOT NULL, user_id uuid NOT NULL, parent_id uuid NULL, "type" text NULL, "text" text NULL, properties jsonb DEFAULT '{}'::jsonb NULL, done bool NULL, deleted bool DEFAULT false NULL, "position" int4 NULL, created_at timestamptz DEFAULT now() NULL, updated_at timestamptz DEFAULT now() NULL, CONSTRAINT blocks_pkey PRIMARY KEY (id), CONSTRAINT blocks_type_check CHECK ((type = ANY (ARRAY['text'::text, 'todo'::text, 'list'::text, 'page'::text, 'heading'::text, 'paragraph'::text, 'quote'::text, 'code'::text]))), CONSTRAINT blocks_note_id_fkey FOREIGN KEY (note_id) REFERENCES notes(id) ON DELETE CASCADE, CONSTRAINT blocks_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES blocks(id) ON DELETE CASCADE, CONSTRAINT blocks_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE);

-- Permissions

ALTER TABLE blocks OWNER TO avnadmin;
GRANT ALL ON TABLE blocks TO avnadmin;


-- ----------------------------------------------------------------------------
-- TABELA: note_collaborators
-- ----------------------------------------------------------------------------
-- Registro de colaboradores de uma nota. Permite compartilhamento de notas
-- entre usuários. Usa chave composta (note_id + user_id) como PK.
--
-- Relacionamentos:
--   note_id → notes.id (ON DELETE CASCADE)
--   user_id → users.user_id (ON DELETE CASCADE)
--
-- Colunas:
--   note_id    (PK, uuid, FK)       : Nota compartilhada
--   user_id    (PK, uuid, FK)       : Usuário colaborador
--   added_at   (timestamp)          : Quando foi adicionado como colaborador
--   removed_at (timestamp, NULL)    : Quando foi removido (se aplicável)
--   removed    (bool, NULL)         : Se foi removido da colaboração
--   removed_by (varchar(6), NULL)   : Quem removeu (código/identificador curto)
-- ----------------------------------------------------------------------------
-- DROP TABLE note_collaborators;

CREATE TABLE note_collaborators ( note_id uuid NOT NULL, user_id uuid NOT NULL, added_at timestamp DEFAULT now() NOT NULL, removed_at timestamp(6) NULL, removed bool DEFAULT false NULL, removed_by varchar(6) NULL, CONSTRAINT note_collaborators_pkey PRIMARY KEY (note_id, user_id), CONSTRAINT note_collaborators_note_id_fkey FOREIGN KEY (note_id) REFERENCES notes(id) ON DELETE CASCADE, CONSTRAINT note_collaborators_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE);

-- Permissions

ALTER TABLE note_collaborators OWNER TO avnadmin;
GRANT ALL ON TABLE note_collaborators TO avnadmin;


-- ----------------------------------------------------------------------------
-- TABELA: note_collaborators_logs
-- ----------------------------------------------------------------------------
-- Log de auditoria para operações de colaboração em notas.
-- Registra adições, remoções e alterações de permissão de colaboradores.
--
-- Relacionamentos:
--   note_id        → notes.id (sem CASCADE)
--   target_user_id → users.user_id (sem CASCADE)
--
-- Colunas:
--   log_id         (PK, uuid)           : ID único do log
--   note_id        (uuid, FK, NOT NULL) : Nota afetada
--   target_user_id (uuid, FK, NOT NULL) : Colaborador afetado
--   operation      (text, NOT NULL)     : Tipo de operação (add, remove, update)
--   data_snapshot  (jsonb, NOT NULL)    : Snapshot dos dados no momento da operação
--   changed_at     (timestamptz)        : Momento da alteração
--
-- Índices:
--   idx_note_collab_logs_composite : Busca composta por nota + colaborador
-- ----------------------------------------------------------------------------
-- DROP TABLE note_collaborators_logs;

CREATE TABLE note_collaborators_logs ( log_id uuid DEFAULT uuid_generate_v4() NOT NULL, note_id uuid NOT NULL, target_user_id uuid NOT NULL, operation text NOT NULL, data_snapshot jsonb NOT NULL, changed_at timestamptz DEFAULT now() NOT NULL, CONSTRAINT note_collaborators_logs_pkey PRIMARY KEY (log_id), CONSTRAINT notes_collab_note_fkey FOREIGN KEY (note_id) REFERENCES notes(id), CONSTRAINT user_id_fkey FOREIGN KEY (target_user_id) REFERENCES users(user_id));
CREATE INDEX idx_note_collab_logs_composite ON public.note_collaborators_logs USING btree (note_id, target_user_id);

-- Permissions

ALTER TABLE note_collaborators_logs OWNER TO avnadmin;
GRANT ALL ON TABLE note_collaborators_logs TO avnadmin;


-- ============================================================================
-- 11. FUNÇÕES (FUNCTIONS)
-- ============================================================================
-- Funções armazenadas no banco para lógica de negócios, triggers e
-- utilitários. Inclui funções da extensão uuid-ossp.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- FUNÇÃO: trigger_audit_log()
-- ----------------------------------------------------------------------------
-- Função genérica de trigger para auditoria de operações em tabelas.
-- Insere registros na tabela de logs correspondente ({tabela}_logs)
-- para operações INSERT, UPDATE e DELETE.
--
-- Uso: Pode ser vinculada como trigger a qualquer tabela que tenha
-- uma tabela de logs correspondente com coluna project_id.
--
-- Nota: Atualmente configurada para tabela projects_logs.
-- A variável `target_table` usa `projects || '_logs'` que provavelmente
-- deveria ser `TG_TABLE_NAME || '_logs'` para ser verdadeiramente genérica.
-- ----------------------------------------------------------------------------
-- DROP FUNCTION public.trigger_audit_log();

CREATE OR REPLACE FUNCTION public.trigger_audit_log()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
    target_table text;
BEGIN
    -- Define o nome da tabela de log baseado na tabela de origem
    target_table := projects || '_logs';

    IF (TG_OP = 'DELETE') THEN
        EXECUTE format('INSERT INTO %I (project_id, operation, old_data, changed_at) VALUES ($1, $2, $3, $4)', target_table)
        USING OLD.id, 'DELETE', row_to_json(OLD), now();
        RETURN OLD;
    ELSIF (TG_OP = 'UPDATE') THEN
        EXECUTE format('INSERT INTO %I (project_id, operation, old_data, new_data, changed_at) VALUES ($1, $2, $3, $4, $5)', target_table)
        USING NEW.id, 'UPDATE', row_to_json(OLD), row_to_json(NEW), now();
        RETURN NEW;
    ELSIF (TG_OP = 'INSERT') THEN
        EXECUTE format('INSERT INTO %I (project_id, operation, new_data, changed_at) VALUES ($1, $2, $3, $4)', target_table)
        USING NEW.id, 'INSERT', row_to_json(NEW), now();
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$function$
;

-- Permissions

ALTER FUNCTION public.trigger_audit_log() OWNER TO avnadmin;
GRANT ALL ON FUNCTION public.trigger_audit_log() TO avnadmin;

-- ----------------------------------------------------------------------------
-- FUNÇÃO: update_invite_org_members_updated_at()
-- ----------------------------------------------------------------------------
-- Trigger function que atualiza automaticamente a coluna updated_at
-- na tabela invite_org_members sempre que um registro é atualizado.
-- Vinculada via trigger: trigger_update_invite_org_members_updated_at
-- ----------------------------------------------------------------------------
-- DROP FUNCTION public.update_invite_org_members_updated_at();

CREATE OR REPLACE FUNCTION public.update_invite_org_members_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$function$
;

-- Permissions

ALTER FUNCTION public.update_invite_org_members_updated_at() OWNER TO avnadmin;
GRANT ALL ON FUNCTION public.update_invite_org_members_updated_at() TO avnadmin;

-- ----------------------------------------------------------------------------
-- FUNÇÃO: update_updated_at_column()
-- ----------------------------------------------------------------------------
-- Trigger function genérica que atualiza a coluna updated_at para
-- CURRENT_TIMESTAMP em qualquer tabela. Reutilizada por múltiplos triggers:
--   - update_system_admins_updated_at (system_admins)
--   - trg_ai_user_agent_updated_at (ai_user_agent)
--   - update_organizations_members_modtime (organizations_members)
-- ----------------------------------------------------------------------------
-- DROP FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$function$
;

-- Permissions

ALTER FUNCTION public.update_updated_at_column() OWNER TO avnadmin;
GRANT ALL ON FUNCTION public.update_updated_at_column() TO avnadmin;

-- ============================================================================
-- FUNÇÕES DA EXTENSÃO uuid-ossp
-- ============================================================================
-- Funções fornecidas pela extensão uuid-ossp do PostgreSQL para geração
-- de UUIDs. Amplamente usadas como valores DEFAULT em colunas PK.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- uuid_generate_v1() : Gera UUID v1 baseado em timestamp + MAC address
-- uuid_generate_v1mc(): Gera UUID v1 com MAC address aleatório
-- uuid_generate_v3() : Gera UUID v3 (namespace + name com hash MD5)
-- uuid_generate_v4() : Gera UUID v4 totalmente aleatório (mais usado)
-- uuid_generate_v5() : Gera UUID v5 (namespace + name com hash SHA-1)
-- uuid_nil()         : Retorna UUID nil (00000000-0000-0000-0000-000000000000)
-- uuid_ns_dns()      : Retorna UUID do namespace DNS
-- uuid_ns_oid()      : Retorna UUID do namespace OID
-- uuid_ns_url()      : Retorna UUID do namespace URL
-- uuid_ns_x500()     : Retorna UUID do namespace X500
-- ----------------------------------------------------------------------------

-- DROP FUNCTION public.uuid_generate_v1();

CREATE OR REPLACE FUNCTION public.uuid_generate_v1()
 RETURNS uuid
 LANGUAGE c
 PARALLEL SAFE STRICT
AS '$libdir/uuid-ossp', $function$uuid_generate_v1$function$
;

-- Permissions

ALTER FUNCTION public.uuid_generate_v1() OWNER TO postgres;
GRANT ALL ON FUNCTION public.uuid_generate_v1() TO postgres;

-- DROP FUNCTION public.uuid_generate_v1mc();

CREATE OR REPLACE FUNCTION public.uuid_generate_v1mc()
 RETURNS uuid
 LANGUAGE c
 PARALLEL SAFE STRICT
AS '$libdir/uuid-ossp', $function$uuid_generate_v1mc$function$
;

-- Permissions

ALTER FUNCTION public.uuid_generate_v1mc() OWNER TO postgres;
GRANT ALL ON FUNCTION public.uuid_generate_v1mc() TO postgres;

-- DROP FUNCTION public.uuid_generate_v3(uuid, text);

CREATE OR REPLACE FUNCTION public.uuid_generate_v3(namespace uuid, name text)
 RETURNS uuid
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/uuid-ossp', $function$uuid_generate_v3$function$
;

-- Permissions

ALTER FUNCTION public.uuid_generate_v3(uuid, text) OWNER TO postgres;
GRANT ALL ON FUNCTION public.uuid_generate_v3(uuid, text) TO postgres;

-- DROP FUNCTION public.uuid_generate_v4();

CREATE OR REPLACE FUNCTION public.uuid_generate_v4()
 RETURNS uuid
 LANGUAGE c
 PARALLEL SAFE STRICT
AS '$libdir/uuid-ossp', $function$uuid_generate_v4$function$
;

-- Permissions

ALTER FUNCTION public.uuid_generate_v4() OWNER TO postgres;
GRANT ALL ON FUNCTION public.uuid_generate_v4() TO postgres;

-- DROP FUNCTION public.uuid_generate_v5(uuid, text);

CREATE OR REPLACE FUNCTION public.uuid_generate_v5(namespace uuid, name text)
 RETURNS uuid
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/uuid-ossp', $function$uuid_generate_v5$function$
;

-- Permissions

ALTER FUNCTION public.uuid_generate_v5(uuid, text) OWNER TO postgres;
GRANT ALL ON FUNCTION public.uuid_generate_v5(uuid, text) TO postgres;

-- DROP FUNCTION public.uuid_nil();

CREATE OR REPLACE FUNCTION public.uuid_nil()
 RETURNS uuid
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/uuid-ossp', $function$uuid_nil$function$
;

-- Permissions

ALTER FUNCTION public.uuid_nil() OWNER TO postgres;
GRANT ALL ON FUNCTION public.uuid_nil() TO postgres;

-- DROP FUNCTION public.uuid_ns_dns();

CREATE OR REPLACE FUNCTION public.uuid_ns_dns()
 RETURNS uuid
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/uuid-ossp', $function$uuid_ns_dns$function$
;

-- Permissions

ALTER FUNCTION public.uuid_ns_dns() OWNER TO postgres;
GRANT ALL ON FUNCTION public.uuid_ns_dns() TO postgres;

-- DROP FUNCTION public.uuid_ns_oid();

CREATE OR REPLACE FUNCTION public.uuid_ns_oid()
 RETURNS uuid
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/uuid-ossp', $function$uuid_ns_oid$function$
;

-- Permissions

ALTER FUNCTION public.uuid_ns_oid() OWNER TO postgres;
GRANT ALL ON FUNCTION public.uuid_ns_oid() TO postgres;

-- DROP FUNCTION public.uuid_ns_url();

CREATE OR REPLACE FUNCTION public.uuid_ns_url()
 RETURNS uuid
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/uuid-ossp', $function$uuid_ns_url$function$
;

-- Permissions

ALTER FUNCTION public.uuid_ns_url() OWNER TO postgres;
GRANT ALL ON FUNCTION public.uuid_ns_url() TO postgres;

-- DROP FUNCTION public.uuid_ns_x500();

CREATE OR REPLACE FUNCTION public.uuid_ns_x500()
 RETURNS uuid
 LANGUAGE c
 IMMUTABLE PARALLEL SAFE STRICT
AS '$libdir/uuid-ossp', $function$uuid_ns_x500$function$
;

-- Permissions

ALTER FUNCTION public.uuid_ns_x500() OWNER TO postgres;
GRANT ALL ON FUNCTION public.uuid_ns_x500() TO postgres;


-- ============================================================================
-- 12. PERMISSÕES DO SCHEMA
-- ============================================================================

GRANT ALL ON SCHEMA public TO pg_database_owner;
GRANT USAGE ON SCHEMA public TO public;
