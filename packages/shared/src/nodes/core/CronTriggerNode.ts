import { IWeaveNode, INodeDescription, IExecutionContext, IExecutionNodeData } from '../interfaces';

export class CronTriggerNode implements IWeaveNode {
  public description: INodeDescription = {
    displayName: 'Schedule Trigger',
    name: 'core.cron',
    group: ['core', 'trigger'],
    version: 1,
    description: 'Starts the workflow at regular intervals.',
    icon: 'clock',
    properties: [
      {
        displayName: 'Cron Expression',
        name: 'cronExpression',
        type: 'string',
        default: '* * * * *',
        required: true,
        description: 'The cron expression to define the schedule.',
      },
    ],
  };

  public async execute(context: IExecutionContext): Promise<IExecutionNodeData[][]> {
    const items = context.getInputData(0);
    return [items.length > 0 ? items : [{ json: { timestamp: new Date().toISOString() } }]];
  }
}
