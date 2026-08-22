import { IWeaveNode } from './interfaces';

export class NodeRegistry {
  private static instance: NodeRegistry;
  private nodes: Map<string, IWeaveNode> = new Map();

  private constructor() {}

  public static getInstance(): NodeRegistry {
    if (!NodeRegistry.instance) {
      NodeRegistry.instance = new NodeRegistry();
    }
    return NodeRegistry.instance;
  }

  /**
   * Registers a single node in the registry.
   */
  public registerNode(node: IWeaveNode): void {
    const nodeName = node.description.name;
    const version = node.description.version;
    const nodeIdentifier = `${nodeName}@v${version}`;

    if (this.nodes.has(nodeIdentifier)) {
      console.warn(`[NodeRegistry] Node ${nodeIdentifier} is already registered. Overwriting.`);
    }

    this.nodes.set(nodeIdentifier, node);
    // Also set as default (latest version) when fetched without version tag
    this.nodes.set(nodeName, node);
  }

  /**
   * Registers multiple nodes at once.
   */
  public registerNodes(nodes: IWeaveNode[]): void {
    nodes.forEach((node) => this.registerNode(node));
  }

  /**
   * Retrieves a node by its identifier (e.g. 'slack.sendMessage' or 'slack.sendMessage@v1').
   */
  public getNode(identifier: string): IWeaveNode | undefined {
    return this.nodes.get(identifier);
  }

  /**
   * Returns all registered nodes (useful for sending definitions to the frontend Canvas).
   */
  public getAllNodes(): IWeaveNode[] {
    // We filter by removing the versioned keys just to send unique latest nodes to the UI,
    // or we can just send everything. For now, we return unique descriptions.
    const uniqueNodes = new Map<string, IWeaveNode>();
    for (const [key, node] of this.nodes.entries()) {
      // Only keep the standard unversioned keys or latest.
      if (!key.includes('@v')) {
        uniqueNodes.set(key, node);
      }
    }
    return Array.from(uniqueNodes.values());
  }
}
