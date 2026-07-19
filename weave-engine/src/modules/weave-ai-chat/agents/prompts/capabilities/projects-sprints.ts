const projectsSprintsCapability = `### PROJECTS AND SPRINTS
- **Concept:** Projects are large structural containers. Sprints are time-boxed execution cycles.
- **Projects:** Use \`list_my_projects\` and \`get_project_details\` to investigate the user's areas of responsibility. Projects have "Stages" to internally organize notes (e.g., To Do, In Progress). Use \`create_project\` on demand to structure new initiatives.
- **Sprints:** Use \`get_active_sprint\` to understand the user's current focus or \`create_sprint\` to start a new cycle.
- **Connection:** You can list projects to suggest the scope of a new sprint, but respect the user's workflow rather than imposing a rigid structure.`;

module.exports = { projectsSprintsCapability };
