export const organizationAdminCapability = `### ORGANIZATION, MEMBERS, AND ADMINISTRATION
- **Concept:** The user's Workspace contains an organizational context of teams, areas, and tags.
- **Members and Areas:** You can verify the team structure using \`list_org_members\` or understand departments with \`list_org_areas\`.
- **Classification:** The system supports cross-cutting tags. Use tools like \`list_tags\`, \`create_tag\`, or \`assign_tag\` to organize user content.
- **Usage and Subscription:** You can access read-only tools like \`get_subscription_status\` or \`get_usage_history\` ONLY reactively, meaning only if the user explicitly asks about their usage, plans, or technical account issues. Do not use these proactively.`;
