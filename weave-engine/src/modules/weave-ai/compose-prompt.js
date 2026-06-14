/**
 * @module weave-engine/modules/weave-ai/compose-prompt
 * @description System prompt overlay and context resolution for the Weave Engine composer chat surface.
 *
 * Dependencies:
 * - None (utility module)
 *
 * Used by:
 * - `weave-engine/modules/weave-ai/chat.processor.js`: To apply context-specific system prompts.
 */

/**
 * System prompt overlay for Weave Engine composer chat surface.
 */

const ENGINE_COMPOSE_PROMPT = `
## Weave Engine Composer (orchestrator mode)

You are the Weave Engine composer assistant — not a generic chat bot.

Your job:
- Greet the user briefly and help them choose ONE path: publish a manual insight, or tune proactive AI instructions for a project.
- Never present numbered steps, wizards, or "step 1 of N".
- Ask which project applies before they publish or save, when it is missing from context.
- Keep replies short (2–4 sentences). Offer at most 3 clear options when the user is unsure.
- In v1 you cannot publish insights or save instructions yourself — guide the user to use the workspace panel below the conversation when it appears.
- When the user picks a path, confirm what they should fill in the workspace (project, type, title, body, or instruction scope).
- Prefer the user's language when known from context (userLanguage / userDisplayName locale).

Do not mention internal APIs, queues, or engine workers.
`.trim();

/**
 * Merges server wrapper context with client-provided compose context to form a unified state.
 *
 * @param {object} [context={}] - Base server context.
 * @returns {object} Merged context combining server and client parameters.
 */
function resolveComposeContext(context = {}) {
  const client =
    context.clientContext && typeof context.clientContext === "object"
      ? context.clientContext
      : {};
  return { ...context, ...client };
}

/**
 * Determines if the current chat session is operating within the 'engine_compose' surface.
 *
 * @param {object} [context={}] - The unified execution context.
 * @returns {boolean} True if the surface is 'engine_compose', false otherwise.
 */
function isEngineComposeSurface(context = {}) {
  const merged = resolveComposeContext(context);
  return (
    merged.surface === "engine_compose" ||
    merged.composeSurface === "engine_compose"
  );
}

/**
 * Builds a supplementary system prompt string containing composer-specific metadata.
 *
 * @param {object} [context={}] - The unified execution context.
 * @returns {string} The formatted prompt overlay text.
 */
function buildEngineComposePromptOverlay(context = {}) {
  const merged = resolveComposeContext(context);
  const intent = merged.composeIntent
    ? String(merged.composeIntent)
    : "undecided";
  const projectId = merged.projectId ? String(merged.projectId) : "none";
  const from = merged.from ? String(merged.from) : "engine";

  return `${ENGINE_COMPOSE_PROMPT}

## Composer session context
- composeIntent: ${intent}
- projectId: ${projectId}
- entryFrom: ${from}
- userDisplayName: ${merged.userDisplayName || "unknown"}
`;
}

module.exports = {
  ENGINE_COMPOSE_PROMPT,
  resolveComposeContext,
  isEngineComposeSurface,
  buildEngineComposePromptOverlay,
};
