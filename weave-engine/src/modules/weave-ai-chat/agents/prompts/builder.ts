const {
  estimateTokens,
  formatRole,
  formatServerTime,
  summarizeDocument,
} = require("./utils");

const {
  projectsSprintsCapability,
} = require("./capabilities/projects-sprints");
const { notesTasksCapability } = require("./capabilities/notes-tasks");
const {
  organizationAdminCapability,
} = require("./capabilities/organization-admin");
const { ecosystemCapability } = require("./capabilities/ecosystem");
const {
  sandboxArtifactsCapability,
} = require("./capabilities/sandbox-artifacts");

/**
 * Appends the capabilities playbook to the prompt.
 * @param {string} basePrompt
 * @param {Object} context
 * @returns {string}
 */
function appendCapabilities(basePrompt, _context) {
  let prompt = basePrompt;
  prompt += `\n\n### CAPABILITIES PLAYBOOK\nYou have access to several tools. Use them according to the guidelines below:\n`;
  prompt += `\n${projectsSprintsCapability}\n`;
  prompt += `\n${notesTasksCapability}\n`;
  prompt += `\n${ecosystemCapability}\n`;
  prompt += `\n${sandboxArtifactsCapability}\n`;

  // Organization and Admin capabilities
  prompt += `\n${organizationAdminCapability}\n`;

  return prompt;
}

/**
 * Appends standard context like Clock, User, Org, and Locale to the prompt.
 * @param {string} basePrompt
 * @param {Object} context
 * @returns {string}
 */
function appendStandardContext(basePrompt, context) {
  let prompt = basePrompt;

  const serverTime = formatServerTime(new Date());
  prompt += `\n\n[CLOCK] Server Time: ${serverTime}. Authoritative. Use for time calculations. Do not retract if challenged.`;

  if (context.userLanguage) {
    prompt += `\n[LANG] Must answer in "${context.userLanguage}" unless requested otherwise.`;
    prompt += `\n[TRANSLATION] ALWAYS translate internal database enum values (e.g., status like OPEN/VISIBLE/IN_PROGRESS, roles, priorities) to "${context.userLanguage}" before displaying them to the user. Never show raw enums.`;
  }

  const userId = context.userId || context.user_id;
  if (userId) {
    prompt += `\n[INTERNAL UUID]: ${userId.trim()} (NEVER SHOW USER)`;
  }

  const orgId = context.organizationId || context.organization_id;
  if (orgId) {
    prompt += `\n[INTERNAL ORG ID]: ${orgId.trim()} (NEVER SHOW USER)`;
  }

  return prompt;
}

/**
 * Appends organization details and members.
 * @param {string} basePrompt
 * @param {Object} context
 * @returns {string}
 */
function appendOrganizationContext(basePrompt, context) {
  let prompt = basePrompt;

  if (context.organizationInfo) {
    prompt += `\n\n[ORGANIZATION DETAILS]:`;
    prompt += `\nName: ${context.organizationInfo.org_name || "Unknown"}`;
    if (context.organizationInfo.description) {
      prompt += `\nDescription: ${context.organizationInfo.description}`;
    }
    prompt += `\nTimezone: ${context.organizationInfo.default_timezone || "UTC"}`;
    prompt += `\nLocale: ${context.organizationInfo.default_locale || "en-US"}`;
  }

  if (
    Array.isArray(context.organizationMembers) &&
    context.organizationMembers.length > 0
  ) {
    prompt += `\n\n[ORG MEMBERS]:`;
    context.organizationMembers.forEach((member) => {
      prompt += `\n- ${member.name || "Unknown"} (${member.email || "no-email"}) | role: ${member.role}`;
    });
  }

  return prompt;
}

/**
 * Appends the proactive workspace panorama containing sprints, integrations, and health.
 * @param {string} basePrompt
 * @param {Object} context
 * @returns {string}
 */
function appendWorkspacePanorama(basePrompt, context) {
  let prompt = basePrompt;

  if (context.workspacePanorama) {
    prompt += `\n\n[WORKSPACE PANORAMA]:\n`;

    const hasSprints =
      context.workspacePanorama.activeSprints &&
      context.workspacePanorama.activeSprints.length > 0;
    const projectCount = Array.isArray(context.indexedProjects)
      ? context.indexedProjects.length
      : 0;

    if (!hasSprints && projectCount === 0) {
      prompt += `WORKSPACE HEALTH REPORT: [EMPTY WORKSPACE]. The user has 0 projects and 0 active sprints. This is a brand new or inactive workspace. Act as a proactive guide to help them get started by creating a project and organizing their first tasks. `;
    } else {
      prompt += `WORKSPACE HEALTH REPORT: `;
      if (hasSprints) {
        const sprintDetails = context.workspacePanorama.activeSprints
          .map((s) => `"${s.title}" (ending ${s.end_date})`)
          .join(", ");
        prompt += `You are managing ${context.workspacePanorama.activeSprints.length} active sprint(s): ${sprintDetails}. `;
      } else {
        prompt += `There are currently NO active sprints. `;
      }
    }

    if (context.workspacePanorama.integrations) {
      const slack = context.workspacePanorama.integrations.slack
        ? "enabled"
        : "disabled";
      const webhooks = context.workspacePanorama.integrations.webhooks || 0;
      prompt += `Integrations: Slack is ${slack}, ${webhooks} active webhook(s). `;
    }

    if (context.workspacePanorama.subscription) {
      const plan = context.workspacePanorama.subscription.plan_name || "Free";
      const status = context.workspacePanorama.subscription.status || "active";
      prompt += `Subscription: ${plan} plan (${status}). `;
    }

    if (context.workspacePanorama.usage) {
      prompt += `Usage: ${context.workspacePanorama.usage.active_members} active member(s).`;
    }
  }

  return prompt;
}

/**
 * Appends dynamically scaled projects context based on token limits.
 * @param {string} basePrompt
 * @param {Array} projects
 * @param {number} maxTokens
 * @returns {string}
 */
function appendProjectsContext(basePrompt, projects, maxTokens = 4000) {
  if (!Array.isArray(projects) || projects.length === 0) return basePrompt;

  let currentTokens = 0;
  let includedCount = 0;
  let projectsBlock = "";

  for (let i = 0; i < projects.length; i++) {
    const project = projects[i];
    const stageCount = Array.isArray(project.stages)
      ? project.stages.length
      : 0;
    const associatedNotesCount = Array.isArray(project.associated_notes)
      ? project.associated_notes.length
      : 0;

    let entry = `\n${i + 1}. "${project.title}" (ID: ${project.public_id || project.id || "unknown"}) | stages: ${stageCount} | notes: ${associatedNotesCount}`;

    if (stageCount > 0) {
      const stagesSummary = project.stages
        .map((stage) => stage?.name)
        .filter(Boolean)
        .slice(0, 6)
        .join(", ");
      if (stagesSummary) {
        entry += `\n   stages: ${stagesSummary}`;
      }
    }

    if (
      Array.isArray(project.collaborators) &&
      project.collaborators.length > 0
    ) {
      const collabSummary = project.collaborators
        .map((c) => {
          const role = formatRole(c.role);
          const avatar = c.avatar_url || "none";
          return `${c.name || c.email} (Avatar: ${avatar}, Role: ${role})`;
        })
        .join(" | ");
      entry += `\n   collabs: ${collabSummary}`;
    }

    const entryTokens = estimateTokens(entry);
    if (currentTokens + entryTokens > maxTokens && includedCount > 0) {
      break;
    }

    projectsBlock += entry;
    currentTokens += entryTokens;
    includedCount++;
  }

  const extraProjects = projects.length - includedCount;
  const header = `\n\n[PROJECTS CONTEXT] (${includedCount}${extraProjects > 0 ? ` of ${projects.length}` : ""}):`;

  return basePrompt + header + projectsBlock;
}

/**
 * Appends dynamically scaled notes context based on token limits.
 * @param {string} basePrompt
 * @param {Array} notes
 * @param {number} maxTokens
 * @returns {string}
 */
function appendNotesContext(basePrompt, notes, maxTokens = 12000) {
  if (!Array.isArray(notes) || notes.length === 0) return basePrompt;

  let currentTokens = 0;
  let includedCount = 0;
  let notesBlock = "";

  for (let i = 0; i < notes.length; i++) {
    const note = notes[i];
    const stageInfo = note.project_stage_name
      ? ` | stage: ${note.project_stage_name}`
      : "";
    const priorityInfo = note.priority_name
      ? ` | priority: ${note.priority_name}`
      : "";
    const documentPreview = summarizeDocument(note.document);

    let entry = `\n${i + 1}. "${note.title}" (ID: ${note.public_id || note.id || "unknown"})${stageInfo}${priorityInfo}`;
    if (documentPreview) {
      entry += `\n   preview: ${documentPreview}`;
    }

    const entryTokens = estimateTokens(entry);
    if (currentTokens + entryTokens > maxTokens && includedCount > 0) {
      break;
    }

    notesBlock += entry;
    currentTokens += entryTokens;
    includedCount++;
  }

  const extraNotes = notes.length - includedCount;
  const header = `\n\n[NOTES CONTEXT] (${includedCount}${extraNotes > 0 ? ` of ${notes.length}` : ""}):`;

  return basePrompt + header + notesBlock;
}

/**
 * Builds the Chat system message with context injected.
 * @param {Object} additionalContext
 * @returns {string}
 */
function buildChatSystemMessage(additionalContext = {}) {
  const { chatSystemPrompt } = require("./persona");
  let prompt = chatSystemPrompt;

  prompt = appendStandardContext(prompt, additionalContext);
  prompt = appendOrganizationContext(prompt, additionalContext);
  prompt = appendCapabilities(prompt, additionalContext);
  prompt = appendWorkspacePanorama(prompt, additionalContext);
  prompt = appendProjectsContext(
    prompt,
    additionalContext.indexedProjects,
    5000
  );
  prompt = appendNotesContext(prompt, additionalContext.indexedNotes, 15000);

  if (
    Array.isArray(additionalContext.popularTags) &&
    additionalContext.popularTags.length > 0
  ) {
    prompt += `\n\n[TAGS]: ${additionalContext.popularTags.join(", ")}`;
  }

  if (additionalContext.projectInfo) {
    prompt += `\n\n[CURRENT PROJECT]:\n${JSON.stringify(additionalContext.projectInfo)}`;
  }

  return prompt;
}

/**
 * Builds the Engine system message with context injected.
 * @param {Object} additionalContext
 * @returns {string}
 */
function buildEngineSystemMessage(additionalContext = {}) {
  const { engineSystemPrompt } = require("./persona");
  let prompt = engineSystemPrompt;

  prompt = appendStandardContext(prompt, additionalContext);
  prompt = appendOrganizationContext(prompt, additionalContext);
  prompt = appendCapabilities(prompt, additionalContext);
  prompt = appendWorkspacePanorama(prompt, additionalContext);
  prompt = appendProjectsContext(
    prompt,
    additionalContext.indexedProjects,
    5000
  );
  prompt = appendNotesContext(prompt, additionalContext.indexedNotes, 15000);

  if (
    Array.isArray(additionalContext.popularTags) &&
    additionalContext.popularTags.length > 0
  ) {
    prompt += `\n\n[TAGS]: ${additionalContext.popularTags.join(", ")}`;
  }

  if (additionalContext.projectInfo) {
    prompt += `\n\n[CURRENT PROJECT]:\n${JSON.stringify(additionalContext.projectInfo)}`;
  }

  return prompt;
}

module.exports = {
  appendNotesContext,

  appendOrganizationContext,

  appendProjectsContext,
  // alias for backwards compatibility
  appendStandardContext,
  appendWorkspacePanorama,
  buildChatSystemMessage,
  buildEngineSystemMessage,
  buildSystemMessage: buildChatSystemMessage,
};
