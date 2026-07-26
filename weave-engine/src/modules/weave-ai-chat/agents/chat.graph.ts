/**
 * @module weave-engine/modules/weave-ai-chat/agents/chat.graph
 * @description Compiles the multi-agent StateGraph for Chat interactions.
 */
import { StateGraph, END } from "../../../utils/state-graph";
import { orchestratorNode } from "./nodes/orchestrator.node";
import { contextualizerNode } from "./nodes/contextualizer.node";
import { projectManagerNode } from "./nodes/project-manager.node";
import { generalAssistantNode } from "./nodes/general-assistant.node";
import { toolExecutorNode } from "./nodes/tool-executor.node";
import { dynamicAgentNode } from "./nodes/dynamic-agent.node";

// Conditional routing function from the orchestrator
const routeFromOrchestrator = (state: Record<string, unknown>) => {
  const s = state as any;
  if (s.errors && s.errors.length > 0) return END;

  // The orchestrator sets the activeAgent property
  if (s.activeAgent === "contextualizer") return "contextualizer";
  if (s.activeAgent === "project_manager") return "project_manager";
  if (s.activeAgent === "general_assistant") return "general_assistant";

  // If the active agent is something else, it's a dynamic agent
  return "dynamic_agent";
};

// Conditional routing function from agents
const routeFromAgent = (state: Record<string, unknown>) => {
  const s = state as any;
  if (s.errors && s.errors.length > 0) return END;

  // If the agent requested a tool call that hasn't been executed yet
  if (s.pendingToolCalls && s.pendingToolCalls.length > 0) {
    return "tool_executor";
  }

  // If there's a final response, end the execution
  if (s.finalResponse) {
    return END;
  }

  // Fallback to end
  return END;
};

// Tool executor routes back to the active agent
const routeFromToolExecutor = (state: Record<string, unknown>) => {
  const s = state as any;
  if (s.errors && s.errors.length > 0) return END;

  // Route back to whoever called the tools
  if (s.activeAgent === "contextualizer") return "contextualizer";
  if (s.activeAgent === "project_manager") return "project_manager";
  if (s.activeAgent === "general_assistant") return "general_assistant";

  return "dynamic_agent";
};

/**
 * Builds and returns the compiled StateGraph for chat processing.
 */
export function buildChatGraph() {
  const graph = new StateGraph();

  // 1. Add Nodes
  graph.addNode("orchestrator", orchestratorNode);
  graph.addNode("contextualizer", contextualizerNode);
  graph.addNode("project_manager", projectManagerNode);
  graph.addNode("general_assistant", generalAssistantNode);
  graph.addNode("dynamic_agent", dynamicAgentNode);
  graph.addNode("tool_executor", toolExecutorNode);

  // 2. Define Entry Point
  graph.setEntryPoint("orchestrator");

  // 3. Define Edges (Transitions)
  graph.addConditionalEdge("orchestrator", routeFromOrchestrator);

  graph.addConditionalEdge("contextualizer", routeFromAgent);
  graph.addConditionalEdge("project_manager", routeFromAgent);
  graph.addConditionalEdge("general_assistant", routeFromAgent);
  graph.addConditionalEdge("dynamic_agent", routeFromAgent);

  graph.addConditionalEdge("tool_executor", routeFromToolExecutor);

  return graph.compile();
}


