const ReadSlackIntegrationsRepository = require("@/modules/slack/repositories/read-slack-integrations.repository");
const { chatPostMessage } = require("./slack-client.util");

/**
 * Sends a plain-text notification to the organization's default Slack channel when configured.
 * Fail-open: logs errors and never throws to callers.
 *
 * @param {object} params
 * @param {string|null|undefined} params.organizationId Weave organization UUID
 * @param {string} params.text Message body (Slack mrkdwn-friendly plain text)
 * @returns {Promise<void>}
 */
async function notifyOrganizationDefaultChannel({ organizationId, text }) {
  if (!organizationId || !text) {
    return;
  }
  try {
    const row = await ReadSlackIntegrationsRepository.findActiveByOrganizationId(organizationId);
    if (!row || !row.is_active || row.deleted || !row.default_channel_id || !row.bot_access_token) {
      return;
    }

    const result = await chatPostMessage({
      channel: row.default_channel_id,
      text,
      token: row.bot_access_token,
    });
    if (!result?.ok) {
      console.error("[SlackNotify] chat.postMessage failed:", result?.error || "unknown");
    }
  } catch (err) {
    console.error("[SlackNotify] notifyOrganizationDefaultChannel:", err);
  }
}

module.exports = {
  notifyOrganizationDefaultChannel,
};
