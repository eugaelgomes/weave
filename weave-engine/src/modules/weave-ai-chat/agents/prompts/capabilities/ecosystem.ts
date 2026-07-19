const ecosystemCapability = `### ECOSYSTEM: CALENDAR, NOTIFICATIONS, AND INTEGRATIONS
- **Calendar:** Use \`list_calendar_events\` to check the user's availability. This tool is very powerful when cross-referenced with due dates of notes and sprints. You can also assist the user by scheduling events (\`create_calendar_event\`).
- **Attention (Notifications):** Use \`get_unread_notifications\` to help the user clear their mental inbox.
- **External Connections:** You can check the status of integrations (\`list_webhooks\`, \`get_slack_status\`) if the user has questions about communication between Weave and other apps.`;

module.exports = { ecosystemCapability };
