import { logger } from "../services/logger";

export const END = "__END__";

export type StateNodeAction<State extends Record<string, any> = Record<string, any>> = (
  state: State
) => Promise<Partial<State>> | Partial<State>;

export type StateConditionFn<State extends Record<string, any> = Record<string, any>> = (
  state: State
) => Promise<string> | string;

export class StateGraph<State extends Record<string, any> = Record<string, any>> {
  private nodes: Map<string, StateNodeAction<State>>;
  private edges: Map<string, string>;
  private conditionalEdges: Map<string, StateConditionFn<State>>;
  private entryPoint: string | null;

  constructor() {
    this.nodes = new Map();
    this.edges = new Map(); // fromNode -> toNode
    this.conditionalEdges = new Map(); // fromNode -> conditionFunction(state) => toNode
    this.entryPoint = null;
  }

  /**
   * Add a node to the graph.
   * @param name - Name of the node.
   * @param action - Async function that takes the current state and returns a partial state update.
   * @returns The StateGraph instance.
   */
  addNode(name: string, action: StateNodeAction<State>): this {
    this.nodes.set(name, action);
    return this;
  }

  /**
   * Add a static edge from one node to another.
   * @param fromNode - The starting node.
   * @param toNode - The destination node.
   * @returns The StateGraph instance.
   */
  addEdge(fromNode: string, toNode: string): this {
    this.edges.set(fromNode, toNode);
    return this;
  }

  /**
   * Add a dynamic, conditional edge from one node to another.
   * @param fromNode - The starting node.
   * @param conditionFn - Function that takes the current state and returns the name of the next node.
   * @returns The StateGraph instance.
   */
  addConditionalEdge(fromNode: string, conditionFn: StateConditionFn<State>): this {
    this.conditionalEdges.set(fromNode, conditionFn);
    return this;
  }

  /**
   * Set the starting node of the graph.
   * @param nodeName - The name of the entry node.
   * @returns The StateGraph instance.
   */
  setEntryPoint(nodeName: string): this {
    this.entryPoint = nodeName;
    return this;
  }

  /**
   * Compile the graph (for now, just a basic validation).
   * @returns The StateGraph instance.
   */
  compile(): this {
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
   * @param initialState - The starting state.
   * @param options - Execution options.
   * @param options.maxIterations - Maximum number of node executions to prevent infinite loops.
   * @returns The final state after the graph finishes.
   */
  async run(initialState: State, options: { maxIterations?: number } = {}): Promise<State> {
    const maxIterations = options.maxIterations || 20;
    let currentState = { ...initialState };
    let currentNode = this.entryPoint as string;
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
        iterations,
        node: currentNode,
      });
      const action = this.nodes.get(currentNode)!;

      try {
        const stateUpdate = await action(currentState);

        // Merge state
        currentState = {
          ...currentState,
          ...stateUpdate,
          iterations,
        };
      } catch (error: any) {
        logger.error(`StateGraph execution error at node '${currentNode}'`, {
          error: error.message,
        });
        const stateWithErrors = currentState as any;
        stateWithErrors.errors = stateWithErrors.errors || [];
        stateWithErrors.errors.push(`[Node: ${currentNode}] ${error.message}`);
        break; // Stop execution on error
      }

      // Determine next node
      let nextNode = END;
      if (this.conditionalEdges.has(currentNode)) {
        const conditionFn = this.conditionalEdges.get(currentNode)!;
        nextNode = await conditionFn(currentState);
      } else if (this.edges.has(currentNode)) {
        nextNode = this.edges.get(currentNode)!;
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
      const stateWithErrors = currentState as any;
      stateWithErrors.errors = stateWithErrors.errors || [];
      stateWithErrors.errors.push(
        `Execution stopped after ${maxIterations} iterations (max limit).`
      );
    }

    logger.info("StateGraph run completed", {
      endNode: currentNode,
      iterations,
    });
    return currentState;
  }
}
