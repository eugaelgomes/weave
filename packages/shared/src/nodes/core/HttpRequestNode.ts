import { IWeaveNode, INodeDescription, IExecutionContext, IExecutionNodeData } from '../interfaces';

export class HttpRequestNode implements IWeaveNode {
  public description: INodeDescription = {
    displayName: 'HTTP Request',
    name: 'core.httpRequest',
    group: ['core', 'network'],
    version: 1,
    description: 'Makes an HTTP request to any API or Webhook.',
    icon: 'globe',
    properties: [
      {
        displayName: 'URL',
        name: 'url',
        type: 'string',
        default: '',
        required: true,
        description: 'The URL to make the request to.',
      },
      {
        displayName: 'Method',
        name: 'method',
        type: 'options',
        options: [
          { name: 'GET', value: 'GET' },
          { name: 'POST', value: 'POST' },
          { name: 'PUT', value: 'PUT' },
          { name: 'PATCH', value: 'PATCH' },
          { name: 'DELETE', value: 'DELETE' },
        ],
        default: 'GET',
        required: true,
      },
      {
        displayName: 'Headers (JSON)',
        name: 'headers',
        type: 'json',
        default: '{}',
        description: 'Headers to send with the request in JSON format.',
      },
      {
        displayName: 'Body (JSON)',
        name: 'body',
        type: 'json',
        default: '{}',
        description: 'The payload to send. Only applicable for POST, PUT, PATCH.',
        displayOptions: {
          hide: {
            method: ['GET', 'DELETE'],
          },
        },
      },
    ],
  };

  public async execute(context: IExecutionContext): Promise<IExecutionNodeData[][]> {
    const url = context.getNodeParameter('url') as string;
    const method = context.getNodeParameter('method') as string;
    const headersRaw = context.getNodeParameter('headers');
    const bodyRaw = context.getNodeParameter('body');

    let headers: Record<string, string> = {};
    if (typeof headersRaw === 'string' && headersRaw.trim() !== '') {
      try {
        headers = JSON.parse(headersRaw);
      } catch (e) {
        throw new Error('Headers must be a valid JSON object string.');
      }
    } else if (typeof headersRaw === 'object' && headersRaw !== null) {
      headers = headersRaw;
    }

    let bodyData: any = null;
    if (['POST', 'PUT', 'PATCH'].includes(method)) {
      if (typeof bodyRaw === 'string' && bodyRaw.trim() !== '') {
        try {
          bodyData = JSON.parse(bodyRaw);
        } catch (e) {
          bodyData = bodyRaw; // Fallback to raw string
        }
      } else if (typeof bodyRaw === 'object' && bodyRaw !== null) {
        bodyData = bodyRaw;
      }
    }

    const fetchOptions: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
    };

    if (bodyData) {
      fetchOptions.body = typeof bodyData === 'string' ? bodyData : JSON.stringify(bodyData);
    }

    try {
      // In Node.js 18+, fetch is available globally.
      const response = await fetch(url, fetchOptions);
      
      const responseContentType = response.headers.get('content-type') || '';
      let responseData: any;

      if (responseContentType.includes('application/json')) {
        responseData = await response.json();
      } else {
        responseData = await response.text();
      }

      const result: IExecutionNodeData = {
        json: {
          statusCode: response.status,
          statusText: response.statusText,
          headers: Object.fromEntries(response.headers.entries()),
          body: responseData,
        },
      };

      // Return a single item flowing to the main output (index 0)
      return [[result]];
    } catch (error: any) {
      throw new Error(`HTTP Request failed: ${error.message}`);
    }
  }
}
