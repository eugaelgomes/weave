-- =============================================================================
-- Public API Observability
-- Table: public_api_request_logs
-- =============================================================================

CREATE TABLE public_api_request_logs (
  id               BIGSERIAL        PRIMARY KEY,

  -- Who made the request
  api_token_id     UUID             REFERENCES api_tokens(id)      ON DELETE SET NULL,
  user_id          UUID             REFERENCES users(id)            ON DELETE SET NULL,
  organization_id  UUID             REFERENCES organizations(id)    ON DELETE SET NULL,

  -- What was accessed
  http_method      VARCHAR(10)      NOT NULL,                        -- GET | POST | PUT | DELETE | PATCH
  path             TEXT             NOT NULL,                        -- /api/public/v1/notes?...
  api_version      VARCHAR(10)      NOT NULL DEFAULT 'v1',
  scopes_required  TEXT[],                                           -- ['notes:read'] declared by requireScope

  -- How we responded
  status_code      SMALLINT         NOT NULL,                        -- 200 | 401 | 403 | 429 | 500
  duration_ms      INTEGER,                                          -- response time in ms
  error_code       VARCHAR(64),                                      -- AppError.code on failure; NULL on success
  request_id       UUID,                                             -- correlates with x-request-id / APM

  -- Where the request came from
  ip_address       INET,
  user_agent       TEXT,
  origin_header    TEXT,
  referer_header   TEXT,

  created_at       TIMESTAMPTZ      NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  public_api_request_logs IS 'Audit log for every authenticated Public API request (Bearer wn_*).';
COMMENT ON COLUMN public_api_request_logs.api_token_id     IS 'Token used in this request (SET NULL on token deletion to preserve history).';
COMMENT ON COLUMN public_api_request_logs.scopes_required  IS 'Scopes declared as required by the requireScope middleware on the matched route.';
COMMENT ON COLUMN public_api_request_logs.error_code       IS 'AppError.code when the request failed; NULL on success.';
COMMENT ON COLUMN public_api_request_logs.request_id       IS 'Correlates with x-request-id response header and APM/Sentry traces.';
COMMENT ON COLUMN public_api_request_logs.duration_ms      IS 'Wall-clock time from request start to res.finish, measured in the Node.js process.';

-- =============================================================================
-- Indexes
-- =============================================================================

-- Most common query: audit a specific token (abuse detection, usage dashboards)
CREATE INDEX idx_parl_token_id
  ON public_api_request_logs (api_token_id, created_at DESC);

-- Usage per user (billing, quotas)
CREATE INDEX idx_parl_user_id
  ON public_api_request_logs (user_id, created_at DESC);

-- Usage per organization (org-level dashboards)
CREATE INDEX idx_parl_org_id
  ON public_api_request_logs (organization_id, created_at DESC);

-- Error monitoring: filter by HTTP status
CREATE INDEX idx_parl_status
  ON public_api_request_logs (status_code, created_at DESC);

-- Endpoint popularity / latency analysis
CREATE INDEX idx_parl_path
  ON public_api_request_logs (path, created_at DESC);

-- APM / Sentry trace correlation (partial — only rows that have a request_id)
CREATE INDEX idx_parl_request_id
  ON public_api_request_logs (request_id)
  WHERE request_id IS NOT NULL;

-- =============================================================================
-- Retention policy — run monthly via pg_cron or external job
-- =============================================================================

-- DELETE FROM public_api_request_logs
-- WHERE created_at < NOW() - INTERVAL '90 days';
