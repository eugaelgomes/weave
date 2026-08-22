import { IWeaveNode, INodeDescription, IExecutionContext, IExecutionNodeData } from '../interfaces';

export class JavaScriptNode implements IWeaveNode {
  public description: INodeDescription = {
    displayName: 'JavaScript Code',
    name: 'core.javascript',
    group: ['core', 'transformation'],
    version: 1,
    description: 'Executes custom JavaScript code to transform data or implement custom logic.',
    icon: 'code',
    properties: [
      {
        displayName: 'JavaScript Code',
        name: 'code',
        type: 'code',
        default: 'return [[{ json: { message: "Hello from JS Node!" } }]];',
        required: true,
        description: 'The JavaScript code to execute. Must return an array of arrays of IExecutionNodeData.',
      },
    ],
  };

  public async execute(context: IExecutionContext): Promise<IExecutionNodeData[][]> {
    const code = context.getNodeParameter('code') as string;

    try {
      // Basic sandbox using Function constructor
      const func = new Function(
        'context',
        `return (async function() {
          ${code}
        })();`
      );

      const result = await func(context);

      if (Array.isArray(result) && (result.length === 0 || Array.isArray(result[0]))) {
        return result as IExecutionNodeData[][];
      }
      return [[{ json: { result } }]];
    } catch (error: any) {
      throw new Error(`JavaScript execution failed: ${error.message}`);
    }
  }
}
