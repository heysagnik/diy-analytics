import { tool } from 'ai';
import { z } from 'zod';
import { TOOL_DEFINITIONS, ToolError } from '@/app/api/mcp/toolDefinitions';
import { ToolAccessError } from '@/app/api/mcp/toolHelpers';

// Bounds how much of a tool's result the model ever sees, so one large result can't blow the context window.
const MAX_RESULT_CHARS = 12_000;

function boundResult(result: unknown): unknown {
  const serialized = JSON.stringify(result);
  if (serialized === undefined || serialized.length <= MAX_RESULT_CHARS) return result;
  return {
    _truncated: true,
    note: 'Result exceeded the size limit and was truncated. Narrow the query — a smaller dateRange, a lower limit, or added filters — and try again rather than reading past this preview.',
    preview: serialized.slice(0, MAX_RESULT_CHARS),
  };
}

export function buildAgentTools(userId: string) {
  // biome-ignore lint/suspicious/noExplicitAny: heterogeneous input schemas across tools, mirrors TOOL_DEFINITIONS' own erasure
  const tools: Record<string, any> = {};

  for (const def of TOOL_DEFINITIONS) {
    tools[def.name] = tool({
      description: def.description,
      inputSchema: z.object(def.inputSchema),
      async execute(args: Record<string, unknown>) {
        try {
          const result = await def.handler(args, { userId });
          return boundResult(result);
        } catch (error) {
          if (error instanceof ToolError || error instanceof ToolAccessError) {
            return { error: error.message };
          }
          console.error(`Tool "${def.name}" failed unexpectedly:`, error);
          return { error: 'This tool failed unexpectedly. You can try again or tell the user it is unavailable.' };
        }
      },
    });
  }

  return tools;
}
