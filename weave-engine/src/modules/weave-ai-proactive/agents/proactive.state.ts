/**
 * @module weave-engine/modules/weave-engine/proactive-agents/proactive.state
 * @description Defines the initial state structure for the proactive multi-agent graph.
 */

/**
 * Creates the initial state object for a proactive job.
 * @param {object} jobContext - The raw job payload from Redis.
 * @returns {object} The initialized state.
 */
export interface ProactiveState {
  analysisResult: string;
  collectedData: unknown[];
  errors: string[];
  finalOutput: string;
  iterations: number;
  jobContext: Record<string, unknown>;
  nextNode: string;
  providerUsed: string | null;
}

export function createInitialState(jobContext: Record<string, unknown>): ProactiveState {
  return {
    analysisResult: "",

    // Intermediate state
    collectedData: [],

    errors: [],

    // Output
    finalOutput: "",

    // Engine metadata
    iterations: 0,

    // Input
    jobContext: jobContext || {},
    nextNode: "orchestrator", // Used for routing
    providerUsed: null,
  };
}

