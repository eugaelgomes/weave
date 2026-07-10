/**
 * @module weave-engine/modules/core/orchestration/multi-agent/state-graph
 * @description A lightweight, in-memory state graph execution engine.
 * Allows defining a graph of nodes (functions) and edges (transitions) to orchestrate complex multi-step AI workflows.
 */
const { logger } = require("../../../services/logger");

const END = "__END__";

class StateGraph {
  constructor() {
    this.nodes = new Map();
    this.edges = new Map(); // fromNode -> toNode
    this.conditionalEdges = new Map(); // fromNode -> conditionFunction(state) => toNode
    this.entryPoint = null;
  }

  /**
   * Add a node to the graph.
   * @param {string} name - Name of the node.
   * @param {function} action - Async function that takes the current state and returns a partial state update.
   * @returns {StateGraph}
   */
  addNode(name, action) {
    this.nodes.set(name, action);
    return this;
  }

  /**
   * Add a static edge from one node to another.
   * @param {string} fromNode - The starting node.
   * @param {string} toNode - The destination node.
   * @returns {StateGraph}
   */
  addEdge(fromNode, toNode) {
    this.edges.set(fromNode, toNode);
    return this;
  }

  /**
   * Add a dynamic, conditional edge from one node to another.
   * @param {string} fromNode - The starting node.
   * @param {function} conditionFn - Function that takes the current state and returns the name of the next node.
   * @returns {StateGraph}
   */
  addConditionalEdge(fromNode, conditionFn) {
    this.conditionalEdges.set(fromNode, conditionFn);
    return this;
  }

  /**
   * Set the starting node of the graph.
   * @param {string} nodeName - The name of the entry node.
   * @returns {StateGraph}
   */
  setEntryPoint(nodeName) {
    this.entryPoint = nodeName;
    return this;
  }

  /**
   * Compile the graph (for now, just a basic validation).
   * @returns {StateGraph}
   */
  compile() {
    if (!this.entryPoint) {
      throw new Error("StateGraph compilation failed: No entry point defined.");
    }
    if (!this.nodes.has(this.entryPoint)) {
      throw new Error(
        `StateGraph compilation failed: Entry point '${this.entryPoint}' is not a registered node.`
      );
    }
    return this;
  }

  /**
   * Run the graph to completion.
   * @param {object} initialState - The starting state.
   * @param {object} options - Execution options.
   * @param {number} [options.maxIterations=20] - Maximum number of node executions to prevent infinite loops.
   * @returns {Promise<object>} The final state after the graph finishes.
   */
  async run(initialState, options = {}) {
    const maxIterations = options.maxIterations || 20;
    let currentState = { ...initialState };
    let currentNode = this.entryPoint;
    let iterations = 0;

    logger.info("StateGraph run started", { entryPoint: this.entryPoint });

    while (currentNode !== END && iterations < maxIterations) {
      iterations++;

      if (!this.nodes.has(currentNode)) {
        throw new Error(
          `StateGraph execution failed: Node '${currentNode}' not found.`
        );
      }

      logger.debug("StateGraph executing node", {
        node: currentNode,
        iterations,
      });
      const action = this.nodes.get(currentNode);

      try {
        const stateUpdate = await action(currentState);

        // Merge state
        currentState = {
          ...currentState,
          ...stateUpdate,
          iterations,
        };
      } catch (error) {
        logger.error(`StateGraph execution error at node '${currentNode}'`, {
          error: error.message,
        });
        currentState.errors = currentState.errors || [];
        currentState.errors.push(`[Node: ${currentNode}] ${error.message}`);
        break; // Stop execution on error
      }

      // Determine next node
      let nextNode = END;
      if (this.conditionalEdges.has(currentNode)) {
        const conditionFn = this.conditionalEdges.get(currentNode);
        nextNode = await conditionFn(currentState);
      } else if (this.edges.has(currentNode)) {
        nextNode = this.edges.get(currentNode);
      }

      logger.debug("StateGraph transition", {
        from: currentNode,
        to: nextNode,
      });
      currentNode = nextNode;
    }

    if (iterations >= maxIterations) {
      logger.warn("StateGraph execution hit max iterations limit", {
        maxIterations,
      });
      currentState.errors = currentState.errors || [];
      currentState.errors.push(
        `Execution stopped after ${maxIterations} iterations (max limit).`
      );
    }

    logger.info("StateGraph run completed", {
      iterations,
      endNode: currentNode,
    });
    return currentState;
  }
}

module.exports = {
  StateGraph,
  END,
};
