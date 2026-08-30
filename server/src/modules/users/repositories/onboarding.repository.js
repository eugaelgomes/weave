const BaseRepository = require("./base.repository");

class OnboardingRepository extends BaseRepository {
  /**
   * Updates the onboarding state of a user preserving the completed_steps array
   * @param {string} userId
   * @param {string} stepName
   * @param {string} stepKeyToAppend
   * @param {import('pg').PoolClient} client
   */
  async appendOnboardingStep(userId, stepName, stepKeyToAppend, client) {
    const query = `
      UPDATE users 
      SET onboarding_state = jsonb_set(
          jsonb_set(COALESCE(onboarding_state, '{}'::jsonb), '{step}', $1::jsonb),
          '{completed_steps}', (COALESCE(onboarding_state->'completed_steps', '[]'::jsonb) - $2::text) || $3::jsonb
      )
      WHERE user_id = $4
    `;

    // We pass JSON strings that postgres will cast to jsonb
    const stepValue = `"${stepName}"`;
    const appendValue = `["${stepKeyToAppend}"]`;

    return await client.query(query, [stepValue, stepKeyToAppend, appendValue, userId]);
  }

  /**
   * Overwrites the entire onboarding state
   * @param {string} userId
   * @param {Object} state
   * @param {import('pg').PoolClient} client
   */
  async setOnboardingState(userId, state, client) {
    const query = `
      UPDATE users 
      SET onboarding_state = $1::jsonb 
      WHERE user_id = $2
    `;
    return await client.query(query, [state, userId]);
  }

  /**
   * Updates terms metadata and sets state to TERMS_ACCEPTED
   */
  async acceptTerms(userId, metadata, client) {
    const query = `
      UPDATE users 
      SET onboarding_state = jsonb_set(
        jsonb_set(
          jsonb_set(COALESCE(onboarding_state, '{}'::jsonb), '{step}', '"TERMS_ACCEPTED"'),
          '{completed_steps}', (COALESCE(onboarding_state->'completed_steps', '[]'::jsonb) - 'terms') || '["terms"]'::jsonb
        ),
        '{metadata}', COALESCE(onboarding_state->'metadata', '{}'::jsonb) || $2::jsonb
      )
      WHERE user_id = $1
    `;
    return await client.query(query, [userId, metadata]);
  }

  /**
   * Updates basic profile fields for the user
   */
  async updateProfile(userId, { name, username, timezone }, client) {
    const query = `UPDATE users SET name = $1, username = $2, timezone = $3 WHERE user_id = $4`;
    return await client.query(query, [name, username, timezone || null, userId]);
  }

  /**
   * Finds a pending invite in workspace_members
   */
  async findPendingInvite(inviteToken, client) {
    const query = `SELECT id, workspace_id, role_id FROM workspace_members WHERE user_id = $1 LIMIT 1`;
    const res = await client.query(query, [inviteToken]);
    return res.rows[0];
  }

  /**
   * Transfers a pending invite to the actual authenticated user and deletes the dummy user
   */
  async claimInvite(pendingMemberId, newUserId, inviteToken, client) {
    await client.query(
      `UPDATE workspace_members SET user_id = $1, status = 'ACTIVE' WHERE id = $2`,
      [newUserId, pendingMemberId]
    );
    await client.query(`DELETE FROM users WHERE user_id = $1 AND status = 'PENDING_INVITE'`, [
      inviteToken,
    ]);
  }

  /**
   * Activates an invite if the user was already authenticated during invite creation
   */
  async activateInvite(pendingMemberId, client) {
    await client.query(`UPDATE workspace_members SET status = 'ACTIVE' WHERE id = $1`, [
      pendingMemberId,
    ]);
  }
}

module.exports = new OnboardingRepository();
