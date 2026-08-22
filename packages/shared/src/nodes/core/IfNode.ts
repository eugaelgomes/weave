import { IWeaveNode, INodeDescription, IExecutionContext, IExecutionNodeData } from '../interfaces';

export class IfNode implements IWeaveNode {
  public description: INodeDescription = {
    displayName: 'If',
    name: 'core.if',
    group: ['core', 'logic'],
    version: 1,
    description: 'Routes the workflow based on a condition.',
    icon: 'git-branch',
    properties: [
      {
        displayName: 'Value 1',
        name: 'value1',
        type: 'string',
        default: '',
        required: true,
        description: 'The first value to compare.',
      },
      {
        displayName: 'Operation',
        name: 'operation',
        type: 'options',
        options: [
          { name: 'Equal', value: 'equal' },
          { name: 'Not Equal', value: 'notEqual' },
          { name: 'Larger', value: 'larger' },
          { name: 'Smaller', value: 'smaller' },
          { name: 'Contains', value: 'contains' },
        ],
        default: 'equal',
        required: true,
      },
      {
        displayName: 'Value 2',
        name: 'value2',
        type: 'string',
        default: '',
        required: true,
        description: 'The second value to compare.',
      },
    ],
  };

  public async execute(context: IExecutionContext): Promise<IExecutionNodeData[][]> {
    const value1 = context.getNodeParameter('value1');
    const operation = context.getNodeParameter('operation') as string;
    const value2 = context.getNodeParameter('value2');

    // Fetch the incoming data
    const items = context.getInputData(0);
    
    const trueItems: IExecutionNodeData[] = [];
    const falseItems: IExecutionNodeData[] = [];

    // Evaluate the condition (MVP: assuming single evaluation or evaluating per incoming item)
    // For simplicity, we evaluate it once based on the resolved parameters.
    let isTrue = false;

    switch (operation) {
      case 'equal':
        isTrue = String(value1) === String(value2);
        break;
      case 'notEqual':
        isTrue = String(value1) !== String(value2);
        break;
      case 'larger':
        isTrue = Number(value1) > Number(value2);
        break;
      case 'smaller':
        isTrue = Number(value1) < Number(value2);
        break;
      case 'contains':
        isTrue = String(value1).includes(String(value2));
        break;
      default:
        isTrue = false;
    }

    if (isTrue) {
      // Pass the data to the "true" branch (index 0)
      trueItems.push(...(items.length > 0 ? items : [{ json: {} }]));
    } else {
      // Pass the data to the "false" branch (index 1)
      falseItems.push(...(items.length > 0 ? items : [{ json: {} }]));
    }

    // Return two branches
    return [trueItems, falseItems];
  }
}
