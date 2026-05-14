/* eslint-disable no-console -- best-effort notification logging */
const OrganizationSlackIntegrationsRepository = require("@/modules/slack/repositories/organization-slack-integrations.repository");
const { chatPostMessage } = require("@/services/slack/slack.client");

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
    const row =
      await OrganizationSlackIntegrationsRepository.findActiveByOrganizationId(
        organizationId
      );
    if (
      !row ||
      !row.is_active ||
      row.deleted ||
      !row.default_channel_id ||
      !row.bot_access_token
    ) {
      return;
    }

    const result = await chatPostMessage({
      channel: row.default_channel_id,
      text,
      token: row.bot_access_token,
    });
    if (!result?.ok) {
      console.error(
        "[SlackNotify] chat.postMessage failed:",
        result?.error || "unknown"
      );
    }
  } catch (err) {
    console.error("[SlackNotify] notifyOrganizationDefaultChannel:", err);
  }
}

module.exports = {
  notifyOrganizationDefaultChannel,
};
