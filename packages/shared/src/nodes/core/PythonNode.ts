import { IWeaveNode, INodeDescription, IExecutionContext, IExecutionNodeData } from '../interfaces';
import { spawn } from 'child_process';

export class PythonNode implements IWeaveNode {
  public description: INodeDescription = {
    displayName: 'Python Code',
    name: 'core.python',
    group: ['core', 'transformation'],
    version: 1,
    description: 'Executes custom Python code to transform data or implement custom logic.',
    icon: 'terminal',
    properties: [
      {
        displayName: 'Python Code',
        name: 'code',
        type: 'code',
        default: 'return [[{"json": {"message": "Hello from Python Node!"}}]]',
        required: true,
        description: 'The Python code to execute. Must return a JSON-serializable list of lists of dictionaries.',
      },
    ],
  };

  public async execute(context: IExecutionContext): Promise<IExecutionNodeData[][]> {
    const code = context.getNodeParameter('code') as string;

    return new Promise((resolve, reject) => {
      // We pass the incoming data as "context" to the python script via stdin
      const inputData = context.getInputData(0);
      const inputJsonString = JSON.stringify(inputData);

      // Indent user code by 4 spaces to fit inside the wrapper function
      const indentedCode = code
        .split('\n')
        .map((line) => '    ' + line)
        .join('\n');

      const pythonScript = `
import sys
import json

def __weave_execute(context):
${indentedCode}

if __name__ == "__main__":
    try:
        input_data = json.loads(sys.stdin.read())
        res = __weave_execute(input_data)
        print(json.dumps(res))
    except Exception as e:
        print(str(e), file=sys.stderr)
        sys.exit(1)
`;

      const pythonProcess = spawn('python3', ['-c', pythonScript]);

      let outputData = '';
      let errorData = '';

      pythonProcess.stdout.on('data', (data) => {
        outputData += data.toString();
      });

      pythonProcess.stderr.on('data', (data) => {
        errorData += data.toString();
      });

      pythonProcess.on('close', (exitCode) => {
        if (exitCode !== 0) {
          return reject(new Error(`Python execution failed: ${errorData}`));
        }

        try {
          const result = JSON.parse(outputData);
          if (Array.isArray(result) && (result.length === 0 || Array.isArray(result[0]))) {
            resolve(result as IExecutionNodeData[][]);
          } else {
            resolve([[{ json: { result } }]]);
          }
        } catch (e) {
          // Fallback if the user printed non-JSON data
          resolve([[{ json: { result: outputData.trim() } }]]);
        }
      });

      // Write context to stdin
      pythonProcess.stdin.write(inputJsonString);
      pythonProcess.stdin.end();
    });
  }
}
