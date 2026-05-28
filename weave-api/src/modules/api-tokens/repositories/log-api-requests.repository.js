const BaseRepository = require("./base.repository");

/**
 * Write-only repository for `public_api_request_logs`.
 * Designed for fire-and-forget inserts — never throws to callers.
 */
class LogApiRequestsRepository extends BaseRepository {
  /**
   * Inserts one audit row for a Public API request.
   *
   * @param {object} params
   * @param {string}   params.apiTokenId
   * @param {string}   params.userId
   * @param {string|null} params.organizationId
   * @param {string}   params.httpMethod
   * @param {string}   params.path
   * @param {string}   params.apiVersion
   * @param {string[]|null} params.scopesRequired
   * @param {number}   params.statusCode
   * @param {number|null} params.durationMs
   * @param {string|null} params.errorCode
   * @param {string|null} params.requestId
   * @param {string|null} params.ipAddress
   * @param {string|null} params.userAgent
   * @param {string|null} params.originHeader
   * @param {string|null} params.refererHeader
   * @returns {Promise<void>}
   */
  async insert({
    apiTokenId,
    userId,
    organizationId,
    httpMethod,
    path,
    apiVersion,
    scopesRequired,
    statusCode,
    durationMs,
    errorCode,
    requestId,
    ipAddress,
    userAgent,
    originHeader,
    refererHeader,
  }) {
    const sql = `
      INSERT INTO public_api_request_logs (
        api_token_id,
        user_id,
        organization_id,
        http_method,
        path,
        api_version,
        scopes_required,
        status_code,
        duration_ms,
        error_code,
        request_id,
        ip_address,
        user_agent,
        origin_header,
        referer_header
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15
      )
    `;

    await this.executeQuery(sql, [
      apiTokenId,
      userId,
      organizationId ?? null,
      httpMethod.toUpperCase(),
      path,
      apiVersion ?? "v1",
      scopesRequired ?? null,
      statusCode,
      durationMs ?? null,
      errorCode ?? null,
      requestId ?? null,
      ipAddress ?? null,
      userAgent ? userAgent.substring(0, 512) : null, // guard against huge UA strings
      originHeader ?? null,
      refererHeader ?? null,
    ]);
  }
}

module.exports = new LogApiRequestsRepository();
