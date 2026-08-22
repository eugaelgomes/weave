/**
 * Core interfaces for the Weave Flow Node System.
 */

export interface INodePropertyOptions {
  name: string;
  value: string | number | boolean;
  description?: string;
}

export interface INodeProperties {
  displayName: string;
  name: string;
  type: 'string' | 'number' | 'boolean' | 'options' | 'json' | 'code' | 'collection' | 'notice';
  default: any;
  description?: string;
  options?: INodePropertyOptions[];
  required?: boolean;
  displayOptions?: {
    show?: Record<string, any[]>;
    hide?: Record<string, any[]>;
  };
}

export interface INodeDescription {
  displayName: string;
  name: string;
  group: string[];
  version: number;
  description: string;
  icon?: string;
  properties: INodeProperties[];
}

export interface IExecutionNodeData {
  json: Record<string, any>;
  binary?: Record<string, any>;
}

export interface IExecutionContext {
  // Methods to resolve input data for the current node based on its connections
  getInputData(inputIndex?: number): IExecutionNodeData[];
  
  // Methods to resolve node parameter values (replacing expressions with actual data)
  getNodeParameter(parameterName: string, itemIndex?: number): any;
  
  // Methods to retrieve credentials safely
  getCredentials(credentialName: string): Promise<Record<string, any>>;
  
  // Reference to the active workflow and execution state
  getWorkflowId(): string;
  getExecutionId(): string;
}

export interface IWeaveNode {
  description: INodeDescription;
  
  /**
   * Executes the node logic.
   * Returns an array of node data, where each array represents an output branch.
   */
  execute(context: IExecutionContext): Promise<IExecutionNodeData[][]>;
}
