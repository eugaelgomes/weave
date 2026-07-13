/**
 * @module weave-engine/modules/weave-engine/proactive-agents/proactive.graph
 * @description Compiles the proactive multi-agent StateGraph.
 */
const { StateGraph, END } = require("../../../utils/state-graph");
const { orchestratorNode } = require("./nodes/orchestrator.node");
const { researcherNode } = require("./nodes/researcher.node");
const { analystNode } = require("./nodes/analyst.node");
const { writerNode } = require("./nodes/writer.node");

// Conditional routing function from the orchestrator
const routeFromOrchestrator = (state) => {
  return state.nextNode || "writer"; // Default to writer if something is missing
};

// Compile the graph
const proactiveGraph = new StateGraph()
  // Add nodes
  .addNode("orchestrator", orchestratorNode)
  .addNode("researcher", researcherNode)
  .addNode("analyst", analystNode)
  .addNode("writer", writerNode)

  // Add edges
  .setEntryPoint("orchestrator")
  .addConditionalEdge("orchestrator", routeFromOrchestrator)
  .addEdge("researcher", "analyst") // After research, always analyze
  .addEdge("analyst", "writer") // After analysis, format it
  .addEdge("writer", END) // Writer is the final step
  .compile();

module.exports = {
  proactiveGraph,
};
