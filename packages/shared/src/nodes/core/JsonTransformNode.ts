import { IWeaveNode, INodeDescription, IExecutionContext, IExecutionNodeData } from '../interfaces';

export class JsonTransformNode implements IWeaveNode {
  public description: INodeDescription = {
    displayName: 'JSON Transform',
    name: 'core.jsonTransform',
    group: ['core', 'transformation'],
    version: 1,
    description: 'Parses a JSON string into an object or stringifies an object into a JSON string.',
    icon: 'file-text',
    properties: [
      {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        options: [
          { name: 'Parse String to JSON', value: 'parse' },
          { name: 'Stringify JSON to String', value: 'stringify' },
        ],
        default: 'parse',
        required: true,
      },
      {
        displayName: 'Target Property',
        name: 'targetProperty',
        type: 'string',
        default: 'data',
        required: true,
        description: 'The property name containing the data to transform.',
      },
      {
        displayName: 'Destination Property',
        name: 'destinationProperty',
        type: 'string',
        default: 'data',
        description: 'The property name to write the output to (leaves original intact if different).',
      },
    ],
  };

  public async execute(context: IExecutionContext): Promise<IExecutionNodeData[][]> {
    const items = context.getInputData(0);
    const operation = context.getNodeParameter('operation') as string;
    const targetProperty = context.getNodeParameter('targetProperty') as string;
    const destinationProperty = (context.getNodeParameter('destinationProperty') as string) || targetProperty;

    const resultItems: IExecutionNodeData[] = items.map(item => {
      const newItemJson = { ...item.json };
      const sourceData = newItemJson[targetProperty];

      if (sourceData !== undefined) {
        try {
          if (operation === 'parse') {
            newItemJson[destinationProperty] = typeof sourceData === 'string' ? JSON.parse(sourceData) : sourceData;
          } else if (operation === 'stringify') {
            newItemJson[destinationProperty] = typeof sourceData === 'object' ? JSON.stringify(sourceData) : String(sourceData);
          }
        } catch (error) {
          // Leave intact on parsing failure
        }
      }

      return { ...item, json: newItemJson };
    });

    return [resultItems];
  }
}
