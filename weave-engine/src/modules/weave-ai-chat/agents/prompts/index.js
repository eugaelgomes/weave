/**
 * Agent Prompts Module
 * Centralized point of export for Weave AI personality and system prompts.
 */

const persona = require("./persona");
const builder = require("./builder");
const utils = require("./utils");

module.exports = {
  // Export static prompts and persona
  basePersonality: persona.basePersonality,

  // Backwards compatibility
  behaviorInstructions: persona.behaviorInstructions,

  buildChatSystemMessage: builder.buildChatSystemMessage,

  buildEngineSystemMessage: builder.buildEngineSystemMessage,

  // Export functions from builder
  buildSystemMessage: builder.buildSystemMessage,

  chatSystemPrompt: persona.chatSystemPrompt,

  defaultSystemPrompt: persona.defaultSystemPrompt,
  engineSystemPrompt: persona.engineSystemPrompt,
  // Export utilities that might be needed outside
  summarizeDocument: utils.summarizeDocument,

  systemContext: persona.systemContext,
};
