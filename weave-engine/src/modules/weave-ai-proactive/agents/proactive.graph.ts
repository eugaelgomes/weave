/**
 * @module weave-engine/modules/weave-engine/proactive-agents/proactive.graph
 * @description Compiles the proactive multi-agent StateGraph.
 */
import { StateGraph, END } from "@/utils/state-graph";
import { orchestratorNode } from "./nodes/orchestrator.node";
import { researcherNode } from "./nodes/researcher.node";
import { analystNode } from "./nodes/analyst.node";
import { writerNode } from "./nodes/writer.node";


// Conditional routing function from the orchestrator
const routeFromOrchestrator = (state: Record<string, unknown>) => {
  const s = state as any;
  return s.nextNode || "writer"; // Default to writer if something is missing
};

// Compile the graph
const proactiveGraph = new StateGraph()
  // Add nodes
  .addNode("orchestrator", orchestratorNode as any)
  .addNode("researcher", researcherNode as any)
  .addNode("analyst", analystNode as any)
  .addNode("writer", writerNode as any)

  // Add edges
  .setEntryPoint("orchestrator")
  .addConditionalEdge("orchestrator", routeFromOrchestrator)
  .addEdge("researcher", "analyst") // After research, always analyze
  .addEdge("analyst", "writer") // After analysis, format it
  .addEdge("writer", END) // Writer is the final step
  .compile();

export { proactiveGraph };
