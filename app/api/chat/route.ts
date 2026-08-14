import {
  convertToModelMessages,
  generateObject,
  InvalidToolInputError,
  NoSuchToolError,
  stepCountIs,
  streamText,
  type UIMessage,
} from 'ai';
import { type NextRequest, NextResponse } from 'next/server';
import { DATE_RANGES } from '@/app/api/analytics/types';
import { getChatModelSelection } from '@/lib/ai/providerRouter';
import { requireUser } from '@/lib/serverAuth';
import { buildAgentTools } from './services/agentTools';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const MAX_HISTORY_MESSAGES = 3;
const MAX_STEPS = 10;
const TEMPERATURE = 0.4;

interface ChatRequestBody {
  messages: UIMessage[];
  projectId?: string;
  workspaceId?: string;
  projectName?: string;
}

function isValidChatRequestBody(body: unknown): body is ChatRequestBody {
  if (!body || typeof body !== 'object') return false;
  const { messages, projectId, workspaceId, projectName } = body as Record<string, unknown>;
  if (!Array.isArray(messages)) return false;
  if (projectId !== undefined && typeof projectId !== 'string') return false;
  if (workspaceId !== undefined && typeof workspaceId !== 'string') return false;
  if (projectName !== undefined && typeof projectName !== 'string') return false;
  return true;
}

function buildSystemPrompt(context: { projectId?: string; workspaceId?: string; projectName?: string }): string {
  const dateRangeKeys = Object.keys(DATE_RANGES).join(', ');
  const lines = [
    'You are the in-app analytics assistant for DIY Analytics, a privacy-friendly website analytics product.',
    "Answer questions about the user's sites using the available tools — call them rather than guessing at numbers. Never invent a metric, count, or trend that didn't come from a tool result.",
    `Today's date is ${new Date().toISOString().slice(0, 10)}.`,
    '',
    'Tool selection:',
    "- Start from list_workspaces/list_projects only if you need to resolve a project the user named that isn't the current one.",
    '- get_analytics is the default for traffic/pageview/visitor questions (top pages, sources, countries, devices, etc.) — it takes one of these exact `dateRange` values (case-sensitive): ' +
      `${dateRangeKeys}. Never invent a different date range string.`,
    '- For error questions: call list_errors first. If the user asks "why"/"how many people"/"which browsers"/"is it trending" about a specific error, follow up with get_error_occurrences using that error\'s id — list_errors alone cannot answer those.',
    '- explore is for ad-hoc session-level questions (e.g. "sessions that visited X and fired Y") that don\'t fit a goal/funnel — prefer list_funnels/get_funnel_analysis or list_goals when a funnel/goal already covers the question.',
    "- Call the minimum number of tools needed to answer confidently. Don't call a tool \"just in case\" if the user's question is conversational and doesn't need live data.",
    '',
    'Handling tool results:',
    "- If a tool call returns `{ error: ... }`, don't retry the same call with the same arguments — either fix the argument that caused it (e.g. a bad dateRange or an unresolved projectId) or tell the user plainly what went wrong. Never present a tool error as if it were a zero or empty result.",
    '- If a number is genuinely zero (e.g. no errors in range), say so directly — that is a real answer, not a failure.',
  ];
  if (context.projectId) {
    const named = context.projectName ? `"${context.projectName}"` : 'the current project';
    lines.push(
      '',
      `The user is currently viewing ${named} (projectId=${context.projectId}${context.workspaceId ? `, workspaceId=${context.workspaceId}` : ''}). Use these ids when calling tools for it unless the user names a different project. Never mention raw project/workspace/error/session ids in your reply — use the project's name (call list_projects if you need a name for an id you don't already have).`,
    );
  }
  lines.push(
    '',
    'Response style:',
    '- Lead with the number or finding, then at most one or two short supporting details. No preamble like "Based on the data...".',
    '- Pick one format and stick to it: either a short list/table of the items that matter, or a couple of prose sentences — never both. Do not restate the same numbers twice in different formats.',
    '- If a list has more than 3-4 items, don\'t dump all of them — call out the one or two that actually matter (the worst offender, the biggest outlier) and summarize the rest as "and N more, similar" unless the user asked for the full breakdown.',
    '- Always include units (ms, s, KB, MB, %) next to raw numbers — a bare number like "4790.25" is meaningless on its own.',
    '- Judge each number against what it actually means, not a generic scale: a multi-second load time or a multi-MB asset is a real problem worth flagging, not "relatively fast". When something is bad, say what\'s likely causing it (e.g. an uncompressed video, an unoptimized image) and what would fix it — a flat list of stats with no read on which of them matter is not a useful answer.',
    '- Write in full, natural sentences, not clipped fragments or bare stats — being brief means fewer sentences, not terse ones.',
    '- Keep it to a few sentences unless the user explicitly asks for a detailed breakdown.',
    '- Refer to projects, workspaces, and other resources by name, never by their raw id.',
  );
  return lines.join('\n');
}

export async function GET(request: NextRequest) {
  const user = await requireUser(request);
  if (user instanceof NextResponse) return user;
  const selection = getChatModelSelection();
  return NextResponse.json({
    configured: selection !== null,
    provider: selection?.provider ?? null,
    model: selection?.modelId ?? null,
  });
}

export async function POST(request: NextRequest) {
  const user = await requireUser(request);
  if (user instanceof NextResponse) return user;

  const selection = getChatModelSelection();
  if (!selection) {
    return NextResponse.json(
      {
        error:
          'The AI assistant is not configured. Set a provider API key (e.g. ANTHROPIC_API_KEY) in your environment.',
      },
      { status: 503 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  if (!isValidChatRequestBody(body)) {
    return NextResponse.json({ error: 'messages must be an array' }, { status: 400 });
  }
  const { messages, projectId, workspaceId, projectName } = body;

  const recentMessages = messages.slice(-MAX_HISTORY_MESSAGES);
  const system = buildSystemPrompt({ projectId, workspaceId, projectName });
  const tools = buildAgentTools(user.id);

  const result = streamText({
    model: selection.model,
    system,
    messages: convertToModelMessages(recentMessages),
    tools,
    stopWhen: stepCountIs(MAX_STEPS),
    temperature: TEMPERATURE,
    experimental_repairToolCall: async ({ toolCall, tools: availableTools, error, inputSchema }) => {
      if (NoSuchToolError.isInstance(error)) return null;
      if (!InvalidToolInputError.isInstance(error)) return null;

      const tool = availableTools[toolCall.toolName as keyof typeof availableTools];
      if (!tool) return null;

      try {
        const { object: repairedInput } = await generateObject({
          model: selection.model,
          schema: tool.inputSchema,
          prompt: [
            `You called the tool "${toolCall.toolName}" with these inputs:`,
            toolCall.input,
            `That failed validation against the tool's schema:`,
            JSON.stringify(inputSchema({ toolName: toolCall.toolName })),
            `Error: ${error.message}`,
            'Return corrected inputs that satisfy the schema, preserving the original intent.',
          ].join('\n'),
        });
        return { ...toolCall, input: JSON.stringify(repairedInput) };
      } catch {
        return null;
      }
    },
    onError({ error }) {
      console.error('Chat stream error:', error);
    },
  });

  return result.toUIMessageStreamResponse({
    onError: (error) => (error instanceof Error ? error.message : 'The assistant hit an unexpected error.'),
  });
}
