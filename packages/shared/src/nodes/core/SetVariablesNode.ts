import { IWeaveNode, INodeDescription, IExecutionContext, IExecutionNodeData } from '../interfaces';

export class SetVariablesNode implements IWeaveNode {
  public description: INodeDescription = {
    displayName: 'Set',
    name: 'core.set',
    group: ['core', 'transformation'],
    version: 1,
    description: 'Sets or overrides values in the workflow data.',
    icon: 'edit',
    properties: [
      {
        displayName: 'Values to Set',
        name: 'values',
        type: 'collection',
        default: [],
        description: 'List of key/value pairs to set.',
      },
    ],
  };

  public async execute(context: IExecutionContext): Promise<IExecutionNodeData[][]> {
    // Retrieve incoming items
    const items = context.getInputData(0);
    // Retrieve the values collection set by the user
    const valuesToSet = context.getNodeParameter('values') as Array<{ key: string, value: any }> || [];

    const resultItems: IExecutionNodeData[] = items.map(item => {
      // Shallow clone json
      const newItemJson = { ...item.json };

      // Apply defined properties
      valuesToSet.forEach(val => {
        if (val.key) {
          newItemJson[val.key] = val.value;
        }
      });

      return { ...item, json: newItemJson };
    });

    if (resultItems.length === 0) {
      // If no input data, just return the defined variables as a single item
      const newJson: Record<string, any> = {};
      valuesToSet.forEach(val => {
        if (val.key) newJson[val.key] = val.value;
      });
      resultItems.push({ json: newJson });
    }

    return [resultItems];
  }
}
