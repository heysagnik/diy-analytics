import { tool } from 'ai';
import { z } from 'zod';
import { TOOL_DEFINITIONS, ToolError } from '@/app/api/mcp/toolDefinitions';
import { ToolAccessError } from '@/app/api/mcp/toolHelpers';

export function buildAgentTools(userId: string) {
  // biome-ignore lint/suspicious/noExplicitAny: heterogeneous input schemas across tools, mirrors TOOL_DEFINITIONS' own erasure
  const tools: Record<string, any> = {};

  for (const def of TOOL_DEFINITIONS) {
    tools[def.name] = tool({
      description: def.description,
      inputSchema: z.object(def.inputSchema),
      async execute(args: Record<string, unknown>) {
        try {
          return await def.handler(args, { userId });
        } catch (error) {
          if (error instanceof ToolError || error instanceof ToolAccessError) {
            return { error: error.message };
          }
          throw error;
        }
      },
    });
  }

  return tools;
}
