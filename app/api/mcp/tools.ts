import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { TOOL_DEFINITIONS, ToolError } from './toolDefinitions';
import { errorResult, jsonResult, ToolAccessError } from './toolHelpers';

export function registerTools(server: McpServer, userId: string) {
  for (const def of TOOL_DEFINITIONS) {
    server.registerTool(
      def.name,
      { title: def.title, description: def.description, inputSchema: def.inputSchema },
      async (args: Record<string, unknown>) => {
        try {
          const data = await def.handler(args, { userId });
          return jsonResult(data);
        } catch (error) {
          if (error instanceof ToolError || error instanceof ToolAccessError) {
            return errorResult(error.message);
          }
          throw error;
        }
      },
    );
  }
}
