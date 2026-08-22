import { IWeaveNode, INodeDescription, IExecutionContext, IExecutionNodeData } from '../interfaces';

export class WebhookTriggerNode implements IWeaveNode {
  public description: INodeDescription = {
    displayName: 'Webhook Trigger',
    name: 'core.webhook',
    group: ['core', 'trigger'],
    version: 1,
    description: 'Starts the workflow when a webhook URL is called.',
    icon: 'link',
    properties: [
      {
        displayName: 'HTTP Method',
        name: 'method',
        type: 'options',
        options: [
          { name: 'GET', value: 'GET' },
          { name: 'POST', value: 'POST' },
          { name: 'PUT', value: 'PUT' },
          { name: 'DELETE', value: 'DELETE' },
          { name: 'PATCH', value: 'PATCH' },
        ],
        default: 'POST',
        required: true,
      },
      {
        displayName: 'Path',
        name: 'path',
        type: 'string',
        default: '',
        description: 'The unique path for this webhook (e.g., my-webhook).',
        required: true,
      },
    ],
  };

  public async execute(context: IExecutionContext): Promise<IExecutionNodeData[][]> {
    // A trigger node's execute function usually just passes along the payload
    // it received from the external system (which is injected as inputData 0).
    const items = context.getInputData(0);
    return [items.length > 0 ? items : [{ json: { message: "Webhook triggered" } }]];
  }
}
