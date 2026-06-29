/**
 * Agent Prompts Module
 * Centralized point of export for Weave AI personality and system prompts.
 */

const persona = require("./persona");
const builder = require("./builder");
const utils = require("./utils");

module.exports = {
  // Export functions from builder
  buildSystemMessage: builder.buildSystemMessage,
  buildChatSystemMessage: builder.buildChatSystemMessage,
  buildEngineSystemMessage: builder.buildEngineSystemMessage,

  // Export static prompts and persona
  basePersonality: persona.basePersonality,

  chatSystemPrompt: persona.chatSystemPrompt,
  engineSystemPrompt: persona.engineSystemPrompt,

  // Backwards compatibility
  behaviorInstructions: persona.behaviorInstructions,
  defaultSystemPrompt: persona.defaultSystemPrompt,
  systemContext: persona.systemContext,

  // Export utilities that might be needed outside
  summarizeDocument: utils.summarizeDocument,
};
